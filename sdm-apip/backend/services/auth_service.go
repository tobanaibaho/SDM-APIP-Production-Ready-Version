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
// AUTH SERVICE INTERFACE
// =======================

type IAuthService interface {
	Login(nip, password, totp, ip, ua string) (*models.LoginResponse, error)
	SuperAdminLogin(username, password, totp, ip, ua string) (*models.LoginResponse, error)

	// User Registration Flow (4 Steps)
	Register(nip, email, ip, ua string) (*models.User, string, string, string, error)      // Step 1 (returns user, token, otp, name, err)
	VerifyEmail(token, otp, ip, ua string) error                                           // Step 3
	SetPassword(token, otp, password, ip, ua string) error                                 // Step 4
	ResendVerification(email, ip, ua string) (*models.User, string, string, string, error) // New Method (returns user, token, otp, name, err)

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

	// MFA Methods
	GenerateMFASecret(userID uint) (string, string, error) // Returns Secret and QR URL
	EnableMFA(userID uint, otp string) error
	DisableMFA(userID uint) error
}

// =======================
// AUTH SERVICE IMPLEMENTATION
// =======================

type AuthService struct {
	db *gorm.DB
}

// CONSTRUCTOR
func NewAuthService() IAuthService {
	return &AuthService{
		db: config.DB,
	}
}

// =======================
// IMPLEMENTATION
// =======================

func (s *AuthService) Login(
	nip, password, totpCode, ip, ua string,
) (*models.LoginResponse, error) {
	// 1. Find user by NIP
	var user models.User
	if err := s.db.Preload("Role").Where("nip = ?", nip).First(&user).Error; err != nil {
		models.CreateAuditLog(s.db, nil, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Login failed: NIP not found %s", nip), nil)
		return nil, ErrInvalidCredentials
	}

	// 2. Role Check (Must be User)
	if user.RoleID != models.RoleUser {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Unauthorized role (Admin using User form)", &user.ID)
		return nil, ErrUnauthorizedRole
	}

	// 3. Status Check
	if user.Status == models.StatusPendingVerification {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Email unverified", &user.ID)
		return nil, ErrUnverifiedEmail
	}

	if user.Status == models.StatusEmailVerified {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Password not set", &user.ID)
		return nil, errors.New("silakan atur kata sandi Anda sebelum masuk")
	}

	if user.Status != models.StatusActive {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Login failed: Account status %s", user.Status), &user.ID)
		return nil, ErrAccountDisabled
	}

	// 4. Lockout Check
	if user.LockoutUntil != nil {
		if user.LockoutUntil.After(time.Now()) {
			return nil, fmt.Errorf("akun terkunci. silakan coba lagi setelah %s", user.LockoutUntil.Format("15:04:05"))
		}
		// Reset login attempts if the lockout period has finished
		s.db.Model(&user).Updates(map[string]interface{}{
			"login_attempts": 0,
			"lockout_until":  nil,
		})
	}

	// 5. Password Check
	if user.Password == "" || !utils.CheckPasswordHash(password, user.Password) {
		// Increment attempts
		s.db.Model(&user).UpdateColumn("login_attempts", gorm.Expr("login_attempts + ?", 1))

		var updatedUser models.User
		s.db.First(&updatedUser, user.ID)

		if updatedUser.LoginAttempts >= 5 {
			lockout := time.Now().Add(15 * time.Minute)
			s.db.Model(&updatedUser).Update("lockout_until", lockout)
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Account locked due to multiple failed attempts", &user.ID)
			return nil, fmt.Errorf("akun terkunci karena terlalu banyak percobaan. silakan coba lagi dalam 15 menit")
		}

		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Invalid password", &user.ID)
		return nil, ErrInvalidCredentials
	}

	// 6. Reset attempts on success
	if user.LoginAttempts > 0 || user.LockoutUntil != nil {
		s.db.Model(&user).Updates(map[string]interface{}{
			"login_attempts": 0,
			"lockout_until":  nil,
		})
	}

	// 7. MFA Check
	if user.MFAEnabled && user.MFASecret != nil {
		if totpCode == "" {
			return nil, errors.New("mfa_required")
		}
		if !totp.Validate(totpCode, *user.MFASecret) {
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Login failed: Invalid MFA code", &user.ID)
			return nil, errors.New("kode mfa tidak valid")
		}
	}

	// 8. Generate Tokens
	token, err := utils.GenerateJWT(&user)
	if err != nil {
		return nil, ErrInternalServer
	}

	refreshToken, err := utils.GenerateRefreshToken(&user)
	if err != nil {
		return nil, ErrInternalServer
	}

	// 9. Save Refresh Token
	rt := models.RefreshToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(refreshToken),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := s.db.Create(&rt).Error; err != nil {
		return nil, ErrInternalServer
	}

	// 10. Update Activity
	now := time.Now()
	s.db.Model(&user).Updates(map[string]interface{}{
		"last_login_at":    &now,
		"last_activity_at": &now,
		"last_ip":          ip,
	})

	// 11. Audit Log Success
	models.CreateAuditLog(s.db, &user.ID, models.AuditActionLogin, models.AuditStatusSuccess, ip, ua, "User login successful", &user.ID)

	// 11. Fetch SDM Data for Name, Foto, and Jabatan
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
	// 1. Find user by Username (Case Insensitive)
	var user models.User

	if err := s.db.Preload("Role").Where("LOWER(username) = LOWER(?)", username).First(&user).Error; err != nil {
		models.CreateAuditLog(s.db, nil, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Admin login failed: Username not found %s", username), nil)
		return nil, ErrInvalidCredentials
	}

	// 2. Role Check (Must be Super Admin)
	if user.RoleID != models.RoleSuperAdmin {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin login failed: Unauthorized role", &user.ID)
		return nil, ErrUnauthorizedRole
	}

	// 3. Status Check
	if user.Status != models.StatusActive {
		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, fmt.Sprintf("Admin login failed: Account status %s", user.Status), &user.ID)
		return nil, ErrAccountDisabled
	}

	// 4. Lockout Check
	if user.LockoutUntil != nil {
		if user.LockoutUntil.After(time.Now()) {
			return nil, fmt.Errorf("akun terkunci. silakan coba lagi setelah %s", user.LockoutUntil.Format("15:04:05"))
		}
		// Reset login attempts if the lockout period has finished
		s.db.Model(&user).Updates(map[string]interface{}{
			"login_attempts": 0,
			"lockout_until":  nil,
		})
	}

	// 5. Password Check
	if user.Password == "" || !utils.CheckPasswordHash(password, user.Password) {
		// Increment attempts
		s.db.Model(&user).UpdateColumn("login_attempts", gorm.Expr("login_attempts + ?", 1))

		var updatedUser models.User
		s.db.First(&updatedUser, user.ID)

		if updatedUser.LoginAttempts >= 5 {
			lockout := time.Now().Add(15 * time.Minute)
			s.db.Model(&updatedUser).Update("lockout_until", lockout)
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin account locked due to multiple failed attempts", &user.ID)
			return nil, fmt.Errorf("akun terkunci karena terlalu banyak percobaan. silakan coba lagi dalam 15 menit")
		}

		models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin login failed: Invalid password", &user.ID)
		return nil, ErrInvalidCredentials
	}

	// 6. Reset attempts on success
	if user.LoginAttempts > 0 || user.LockoutUntil != nil {
		s.db.Model(&user).Updates(map[string]interface{}{
			"login_attempts": 0,
			"lockout_until":  nil,
		})
	}

	// 7. MFA Check
	if user.MFAEnabled && user.MFASecret != nil {
		if totpCode == "" {
			return nil, errors.New("mfa_required")
		}
		if !totp.Validate(totpCode, *user.MFASecret) {
			models.CreateAuditLog(s.db, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed, ip, ua, "Admin login failed: Invalid MFA code", &user.ID)
			return nil, errors.New("kode mfa tidak valid")
		}
	}

	// 8. Generate Tokens
	token, err := utils.GenerateJWT(&user)
	if err != nil {
		return nil, ErrInternalServer
	}

	refreshToken, err := utils.GenerateRefreshToken(&user)
	if err != nil {
		return nil, ErrInternalServer
	}

	// 9. Save Refresh Token
	rt := models.RefreshToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(refreshToken),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := s.db.Create(&rt).Error; err != nil {
		return nil, ErrInternalServer
	}

	// 11. Update Activity
	now := time.Now()
	s.db.Model(&user).Updates(map[string]interface{}{
		"last_login_at":    &now,
		"last_activity_at": &now,
		"last_ip":          ip,
	})

	// 12. Audit Log Success
	models.CreateAuditLog(s.db, &user.ID, models.AuditActionLogin, models.AuditStatusSuccess, ip, ua, "Super Admin login successful", &user.ID)

	// 11. Fetch SDM Data for Name and Foto
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
	// 1. Validate NIP in Master Data
	var sdm models.SDM
	if err := s.db.Where("nip = ?", nip).First(&sdm).Error; err != nil {
		return nil, "", "", "", ErrNIPNotFound
	}

	// 2. Check if user already exists (including soft-deleted)
	var existingUser models.User
	err := s.db.Unscoped().Where("nip = ?", nip).First(&existingUser).Error

	var user models.User
	tx := s.db.Begin()

	switch err {
	case nil:
		// User found (active or soft-deleted)
		if existingUser.DeletedAt.Valid {
			// User was soft-deleted, restore it
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
			// User exists and is not deleted
			if existingUser.Status == models.StatusActive {
				tx.Rollback()
				return nil, "", "", "", ErrUserAlreadyExists
			}
			// If not active, allow email update (e.g. fixed typo)
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
		// No user found, create new
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

	// 3. Generate Token and 6-digit OTP
	tokenString, _ := utils.GenerateRandomToken(32)
	otp, _ := utils.GenerateOTP(6)

	// Clean old tokens
	tx.Where("user_id = ? AND token_type = ?", user.ID, models.TokenTypeEmailVerification).Delete(&models.VerificationToken{})

	// Save token (3 minutes expiry as requested)
	verificationToken := models.VerificationToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(tokenString),
		TokenType: models.TokenTypeEmailVerification,
		OTP:       otp,
		ExpiresAt: time.Now().Add(3 * time.Minute),
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
	// 1. Find User
	var user models.User
	if err := s.db.Where("email = ? AND role_id = ?", email, models.RoleUser).First(&user).Error; err != nil {
		return nil, "", "", "", ErrInvalidCredentials // Generic error to prevent enumeration? Or specific?
	}

	// 2. Check Status
	if user.Status == models.StatusActive || user.Status == models.StatusEmailVerified {
		return nil, "", "", "", errors.New("Account already verified. Please login.")
	}

	// 3. Generate New Token & OTP
	tokenString, _ := utils.GenerateRandomToken(32)
	otp, _ := utils.GenerateOTP(6)

	tx := s.db.Begin()

	// 4. Invalidate old tokens
	if err := tx.Where("user_id = ? AND token_type = ?", user.ID, models.TokenTypeEmailVerification).Delete(&models.VerificationToken{}).Error; err != nil {
		tx.Rollback()
		return nil, "", "", "", ErrInternalServer
	}

	// 5. Create New Token
	verificationToken := models.VerificationToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(tokenString),
		TokenType: models.TokenTypeEmailVerification,
		OTP:       otp,
		ExpiresAt: time.Now().Add(3 * time.Minute),
	}

	if err := tx.Create(&verificationToken).Error; err != nil {
		tx.Rollback()
		return nil, "", "", "", ErrInternalServer
	}

	if err := tx.Commit().Error; err != nil {
		return nil, "", "", "", ErrInternalServer
	}

	// Log
	models.CreateAuditLog(s.db, &user.ID, models.AuditActionUserUpdate, models.AuditStatusSuccess, ip, ua, "Verification email resent", &user.ID)

	// Get Name from SDM
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

	// Change status to EMAIL_VERIFIED
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

	// Hash password
	hashedPassword, _ := utils.HashPassword(password)

	tx := s.db.Begin()

	// Update user status and password
	if err := tx.Model(&models.User{}).Where("id = ?", vt.UserID).Updates(map[string]interface{}{
		"password": hashedPassword,
		"status":   models.StatusActive,
	}).Error; err != nil {
		tx.Rollback()
		return ErrInternalServer
	}

	// Mark token used
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

// MFA Methods Implementation

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

	// Store secret temporarily but don't enable yet
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
		return errors.New("mfa secret not generated")
	}

	if !totp.Validate(otp, *user.MFASecret) {
		return errors.New("kode mfa tidak valid")
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
