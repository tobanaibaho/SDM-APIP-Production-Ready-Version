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
	Login(nip, password, totp, ip, ua string) (*models.LoginResponse, error)
	SuperAdminLogin(username, password, totp, ip, ua string) (*models.LoginResponse, error)

	// Alur Pendaftaran Pengguna (4 Langkah)
	Register(nip, email, ip, ua string) (*models.User, string, string, string, error)      // Langkah 1 (mengembalikan user, token, otp, name, err)
	VerifyEmail(token, otp, ip, ua string) error                                           // Langkah 3
	SetPassword(token, otp, password, ip, ua string) error                                 // Langkah 4
	ResendVerification(email, ip, ua string) (*models.User, string, string, string, error) // Metode Baru (mengembalikan user, token, otp, name, err)

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

func (s *AuthService) Login(
	nip, password, totpCode, ip, ua string,
) (*models.LoginResponse, error) {
	// 1. Cari pengguna berdasarkan NIP
	var user models.User
	if err := s.db.Preload("Role").Where("nip = ?", nip).First(&user).Error; err != nil {
		models.CreateAuditLog(s.db, nil, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Login failed: NIP not found %s", nip), nil)
		return nil, ErrInvalidCredentials
	}

	// 2. Cek Peran (Harus Pengguna/User)
	if user.RoleID != models.RoleUser {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Unauthorized role (Admin using User form)", &user.ID)
		return nil, ErrUnauthorizedRole
	}

	// 3. Cek Status
	if user.Status == models.StatusPendingVerification {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Email unverified", &user.ID)
		return nil, ErrUnverifiedEmail
	}

	if user.Status == models.StatusEmailVerified {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Password not set", &user.ID)
		return nil, errors.New("Silakan atur kata sandi Anda sebelum masuk")
	}

	if user.Status != models.StatusActive {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Login failed: Account status %s", user.Status), &user.ID)
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
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Account locked due to multiple failed attempts", &user.ID)
			return nil, fmt.Errorf("Akun terkunci karena terlalu banyak percobaan. Silakan coba lagi dalam 3 menit")
		}

		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Invalid password", &user.ID)
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
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Invalid MFA code", &user.ID)
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
	models.CreateAuditLog(s.db, &user.ID, models.AuditActionLogin, models.AuditStatusSuccess, ip, ua, "User login successful", &user.ID)

	// 12. Ambil data SDM untuk Nama, Foto, dan Jabatan
	userResp := user.ToResponse()
	if user.NIP != nil {
		var sdm models.SDM
		s.db.Where("TRIM(nip) = TRIM(?)", *user.NIP).First(&sdm)
		userResp.Name = sdm.Nama
		userResp.Foto = sdm.Foto
		userResp.Jabatan = sdm.Jabatan
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		userResp.Name = *user.Username
	}

	return &models.LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         userResp,
	}, nil
}

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

func (s *AuthService) Register(nip, email, ip, ua string) (*models.User, string, string, string, error) {
	// 1. Validasi NIP di Master Data
	var sdm models.SDM
	if err := s.db.Where("nip = ?", nip).First(&sdm).Error; err != nil {
		return nil, "", "", "", ErrNIPNotFound
	}

	// 2. Cek apakah pengguna sudah ada (termasuk yang dihapus sementara/soft-deleted)
	var existingUser models.User
	err := s.db.Unscoped().Where("nip = ?", nip).First(&existingUser).Error

	var user models.User
	tx := s.db.Begin()

	switch err {
	case nil:
		// Pengguna ditemukan (aktif atau dihapus sementara)
		if existingUser.DeletedAt.Valid {
			// Pengguna dihapus sementara, pulihkan (restore)
			existingUser.DeletedAt = gorm.DeletedAt{}
			existingUser.Email = email
			existingUser.Status = models.StatusPendingVerification
			existingUser.Password = ""

			if err := tx.Unscoped().Save(&existingUser).Error; err != nil {
				tx.Rollback()
				return nil, "", "", "", ErrInternalServer
			}
			user = existingUser
		} else {
			// Pengguna ada dan tidak dihapus
			if existingUser.Status == models.StatusActive {
				tx.Rollback()
				return nil, "", "", "", ErrUserAlreadyExists
			}
			// Jika tidak aktif, izinkan pembaruan email (mis. perbaikan salah ketik)
			if existingUser.Email != email {
				existingUser.Email = email
				existingUser.Status = models.StatusPendingVerification
				if err := tx.Save(&existingUser).Error; err != nil {
					tx.Rollback()
					return nil, "", "", "", ErrInternalServer
				}
			}
			user = existingUser
		}
	case gorm.ErrRecordNotFound:
		// Pengguna tidak ditemukan, buat baru
		user = models.User{
			NIP:    &nip,
			Email:  email,
			RoleID: models.RoleUser,
			Status: models.StatusPendingVerification,
		}
		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			return nil, "", "", "", ErrInternalServer
		}
	default:
		tx.Rollback()
		return nil, "", "", "", ErrInternalServer
	}

	// 3. Buat Token dan OTP 6 digit
	tokenString, _ := utils.GenerateRandomToken(32)
	otp, _ := utils.GenerateOTP(6)

	// Bersihkan token lama
	tx.Where("user_id = ? AND token_type = ?", user.ID, models.TokenTypeEmailVerification).Delete(&models.VerificationToken{})

	// Simpan token (kedaluwarsa 3 menit seperti yang diminta)
	verificationToken := models.VerificationToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(tokenString),
		TokenType: models.TokenTypeEmailVerification,
		OTP:       otp,
		ExpiresAt: time.Now().UTC().Add(3 * time.Minute),
	}

	if err := tx.Create(&verificationToken).Error; err != nil {
		tx.Rollback()
		return nil, "", "", "", ErrInternalServer
	}

	if err := tx.Commit().Error; err != nil {
		return nil, "", "", "", ErrInternalServer
	}

	models.CreateAuditLog(s.db, &user.ID, models.AuditActionUserCreate, models.AuditStatusSuccess, ip, ua, "Registration initial step success", &user.ID)

	return &user, tokenString, otp, sdm.Nama, nil
}

func (s *AuthService) ResendVerification(email, ip, ua string) (*models.User, string, string, string, error) {
	// 1. Cari Pengguna
	var user models.User
	if err := s.db.Where("email = ? AND role_id = ?", email, models.RoleUser).First(&user).Error; err != nil {
		return nil, "", "", "", ErrInvalidCredentials // Error generik untuk mencegah pencacahan (enumeration)? Atau spesifik?
	}

	// 2. Cek Status
	if user.Status == models.StatusActive || user.Status == models.StatusEmailVerified {
		return nil, "", "", "", errors.New("Akun sudah terverifikasi. Silakan Login.")
	}

	// 3. Buat Token & OTP Baru
	tokenString, _ := utils.GenerateRandomToken(32)
	otp, _ := utils.GenerateOTP(6)

	tx := s.db.Begin()

	// 4. Batalkan token lama
	if err := tx.Where("user_id = ? AND token_type = ?", user.ID, models.TokenTypeEmailVerification).Delete(&models.VerificationToken{}).Error; err != nil {
		tx.Rollback()
		return nil, "", "", "", ErrInternalServer
	}

	// 5. Buat Token Baru
	verificationToken := models.VerificationToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(tokenString),
		TokenType: models.TokenTypeEmailVerification,
		OTP:       otp,
		ExpiresAt: time.Now().UTC().Add(3 * time.Minute),
	}

	if err := tx.Create(&verificationToken).Error; err != nil {
		tx.Rollback()
		return nil, "", "", "", ErrInternalServer
	}

	if err := tx.Commit().Error; err != nil {
		return nil, "", "", "", ErrInternalServer
	}

	// Catat Log
	models.CreateAuditLog(s.db, &user.ID, models.AuditActionUserUpdate, models.AuditStatusSuccess, ip, ua, "Verification email resent", &user.ID)

	// Ambil Nama dari SDM
	nama := "User"
	if user.NIP != nil {
		var sdm models.SDM
		s.db.Where("TRIM(nip) = TRIM(?)", *user.NIP).First(&sdm)
		nama = sdm.Nama
	}

	return &user, tokenString, otp, nama, nil
}

func (s *AuthService) VerifyEmail(token, otp, ip, ua string) error {
	var vt models.VerificationToken
	tokenHash := utils.HashToken(token)

	if err := s.db.Where("token_hash = ? AND token_type = ?", tokenHash, models.TokenTypeEmailVerification).First(&vt).Error; err != nil {
		return ErrInvalidToken
	}

	if !vt.IsValid() {
		return ErrInvalidToken
	}

	if vt.OTP != otp {
		return ErrInvalidOTP
	}

	// Ubah status menjadi EMAIL_VERIFIED
	if err := s.db.Model(&models.User{}).Where("id = ?", vt.UserID).Update("status", models.StatusEmailVerified).Error; err != nil {
		return ErrInternalServer
	}

	models.CreateAuditLog(s.db, &vt.UserID, models.AuditActionUserUpdate, models.AuditStatusSuccess, ip, ua, "Email verified successfully", &vt.UserID)

	return nil
}

func (s *AuthService) SetPassword(token, otp, password, ip, ua string) error {
	var vt models.VerificationToken
	tokenHash := utils.HashToken(token)

	if err := s.db.Where("token_hash = ? AND token_type = ?", tokenHash, models.TokenTypeEmailVerification).First(&vt).Error; err != nil {
		return ErrInvalidToken
	}

	if !vt.IsValid() {
		return ErrInvalidToken
	}

	if vt.OTP != otp {
		return ErrInvalidOTP
	}

	// Hash kata sandi
	hashedPassword, _ := utils.HashPassword(password)

	tx := s.db.Begin()

	// Perbarui status dan kata sandi pengguna
	if err := tx.Model(&models.User{}).Where("id = ?", vt.UserID).Updates(map[string]interface{}{
		"password": hashedPassword,
		"status":   models.StatusActive,
	}).Error; err != nil {
		tx.Rollback()
		return ErrInternalServer
	}

	// Tandai token sebagai telah digunakan
	if err := vt.MarkUsed(tx); err != nil {
		tx.Rollback()
		return ErrInternalServer
	}

	if err := tx.Commit().Error; err != nil {
		return ErrInternalServer
	}

	models.CreateAuditLog(s.db, &vt.UserID, models.AuditActionPasswordChange, models.AuditStatusSuccess, ip, ua, "Password set and account activated", &vt.UserID)

	return nil
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
