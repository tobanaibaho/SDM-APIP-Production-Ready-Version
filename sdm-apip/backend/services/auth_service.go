package services

import (
	"errors"
	"fmt"
	"time"

	"sdm-apip-backend/config"
	"sdm-apip-backend/models"
	"sdm-apip-backend/utils"

	"github.com/pquerna/otp/totp"
	"gorm.io/gorm"
)

// =======================
// ANTARMUKA LAYANAN AUTENTIKASI (AUTH SERVICE INTERFACE)
// =======================

type IAuthService interface {
	SuperAdminLogin(username, password, totp, ip, ua string) (*models.LoginResponse, error)

	SecureAdminResetRequest(
		currentAdminID uint,
		targetUsername string,
		ip, ua string,
	) error

	SecureAdminResetConfirm(
		currentAdminID uint,
		req models.SecureAdminResetConfirmRequest,
		ip, ua string,
	) error

	// Metode MFA
	GenerateMFASecret(userID uint) (string, string, error) // Mengembalikan Secret dan URL QR
	EnableMFA(userID uint, otp string) error
	DisableMFA(userID uint) error
}

// =======================
// IMPLEMENTASI LAYANAN AUTENTIKASI
// =======================

type AuthService struct {
	db *gorm.DB
}

// KONSTRUKTOR
func NewAuthService() IAuthService {
	return &AuthService{
		db: config.DB,
	}
}

// =======================
// IMPLEMENTASI
// =======================



func (s *AuthService) SuperAdminLogin(
	username, password, totpCode, ip, ua string,
) (*models.LoginResponse, error) {
	// 1. Cari pengguna berdasarkan Username (Tidak peka huruf besar/kecil)
	var user models.User

	if err := s.db.Preload("Role").Where("LOWER(username) = LOWER(?)", username).First(&user).Error; err != nil {
		models.CreateAuditLog(s.db, nil, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Admin login failed: Username not found %s", username), nil)
		return nil, ErrInvalidCredentials
	}

	// 2. Cek Peran (Harus Super Admin)
	if user.RoleID != models.RoleSuperAdmin {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin login failed: Unauthorized role", &user.ID)
		return nil, ErrUnauthorizedRole
	}

	// 3. Cek Status
	if user.Status != models.StatusActive {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Admin login failed: Account status %s", user.Status), &user.ID)
		return nil, ErrAccountDisabled
	}

	// 4. Cek Penguncian (Lockout)
	if user.LockoutUntil != nil {
		if user.LockoutUntil.After(time.Now()) {
			return nil, fmt.Errorf("Akun terkunci. Silakan coba lagi setelah %s", user.LockoutUntil.Local().Format("15:04:05"))
		}
		// Reset jumlah percobaan masuk jika masa penguncian sudah selesai
		s.db.Model(&user).Updates(map[string]interface{}{
			"login_attempts": 0,
			"lockout_until":  gorm.Expr("NULL"),
		})
	}

	// 5. Cek Kata Sandi
	if user.Password == "" || !utils.CheckPasswordHash(password, user.Password) {
		// Tambah jumlah percobaan
		s.db.Model(&user).UpdateColumn("login_attempts", gorm.Expr("login_attempts + ?", 1))

		var updatedUser models.User
		s.db.First(&updatedUser, user.ID)

		if updatedUser.LoginAttempts >= 5 {
			lockout := time.Now().UTC().Add(3 * time.Minute)
			s.db.Model(&updatedUser).Update("lockout_until", lockout)
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin account locked due to multiple failed attempts", &user.ID)
			return nil, fmt.Errorf("Akun terkunci karena terlalu banyak percobaan. Silakan coba lagi dalam 3 menit")
		}

		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin login failed: Invalid password", &user.ID)
		return nil, ErrInvalidCredentials
	}

	// 6. Reset jumlah percobaan jika berhasil
	if user.LoginAttempts > 0 || user.LockoutUntil != nil {
		s.db.Model(&user).Updates(map[string]interface{}{
			"login_attempts": 0,
			"lockout_until":  gorm.Expr("NULL"),
		})
	}

	// 7. Cek MFA
	if user.MFAEnabled && user.MFASecret != nil {
		if totpCode == "" {
			return nil, errors.New("mfa_required")
		}
		if !totp.Validate(totpCode, *user.MFASecret) {
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin login failed: Invalid MFA code", &user.ID)
			return nil, errors.New("Kode MFA tidak valid")
		}
	}

	// 8. Buat Token
	token, err := utils.GenerateJWT(&user)
	if err != nil {
		return nil, ErrInternalServer
	}

	refreshToken, err := utils.GenerateRefreshToken(&user)
	if err != nil {
		return nil, ErrInternalServer
	}

	// 9. Simpan Refresh Token
	rt := models.RefreshToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(refreshToken),
		ExpiresAt: time.Now().UTC().Add(7 * 24 * time.Hour),
	}
	if err := s.db.Create(&rt).Error; err != nil {
		return nil, ErrInternalServer
	}

	// 10. Perbarui Aktivitas
	now := time.Now()
	s.db.Model(&user).Updates(map[string]interface{}{
		"last_login_at":    &now,
		"last_activity_at": &now,
		"last_ip":          ip,
	})

	// 11. Catat Log Audit Berhasil
	models.CreateAuditLog(s.db, &user.ID, models.AuditActionLogin, models.AuditStatusSuccess, ip, ua, "Super Admin login successful", &user.ID)

	// 12. Ambil data SDM untuk Nama dan Foto
	userResp := user.ToResponse()
	if user.NIP != nil {
		var sdm models.SDM
		s.db.Where("nip = ?", *user.NIP).First(&sdm)
		userResp.Name = sdm.Nama
		userResp.Foto = sdm.Foto
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		userResp.Name = *user.Username
	}

	return &models.LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         userResp,
	}, nil
}



func (s *AuthService) SecureAdminResetRequest(
	currentAdminID uint,
	targetUsername string,
	ip, ua string,
) error {
	return nil
}

func (s *AuthService) SecureAdminResetConfirm(
	currentAdminID uint,
	req models.SecureAdminResetConfirmRequest,
	ip, ua string,
) error {
	return nil
}

// Implementasi Metode MFA

func (s *AuthService) GenerateMFASecret(userID uint) (string, string, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return "", "", err
	}

	label := "SDM-APIP"
	if user.NIP != nil {
		label = fmt.Sprintf("SDM-APIP:%s", *user.NIP)
	} else if user.Username != nil {
		label = fmt.Sprintf("SDM-APIP:%s", *user.Username)
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "SDM-APIP",
		AccountName: label,
	})
	if err != nil {
		return "", "", err
	}

	secret := key.Secret()
	qrURL := key.URL()

	// Simpan secret sementara tapi jangan diaktifkan dulu
	if err := s.db.Model(&user).Update("mfa_secret", secret).Error; err != nil {
		return "", "", err
	}

	return secret, qrURL, nil
}

func (s *AuthService) EnableMFA(userID uint, otp string) error {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return err
	}

	if user.MFASecret == nil {
		return errors.New("MFA secret belum dibuat")
	}

	if !totp.Validate(otp, *user.MFASecret) {
		return errors.New("Kode MFA tidak valid")
	}

	return s.db.Model(&user).Updates(map[string]interface{}{
		"mfa_enabled": true,
	}).Error
}

func (s *AuthService) DisableMFA(userID uint) error {
	return s.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"mfa_enabled": false,
		"mfa_secret":  nil,
	}).Error
}
