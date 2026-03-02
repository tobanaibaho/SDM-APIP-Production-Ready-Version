package controllers

import (
	"fmt"
	"net/http"
	"time"

	"sdm-apip-backend/config"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// AuthController handles authentication endpoints.
type AuthController struct {
	authService  services.IAuthService
	emailService *services.EmailService
}

func NewAuthController(authService services.IAuthService) *AuthController {
	return &AuthController{
		authService:  authService,
		emailService: services.NewEmailService(),
	}
}

// mapAuthError translates service errors to HTTP responses.
func (ac *AuthController) mapAuthError(c *gin.Context, err error, action string) {
	switch err {
	case services.ErrInvalidCredentials:
		utils.ErrorResponse(c, http.StatusUnauthorized, action, "Username atau password salah. Silakan periksa kembali.")
	case services.ErrUnverifiedEmail:
		utils.ErrorResponse(c, http.StatusUnauthorized, action, "Akun belum diverifikasi. Silakan periksa email Anda.")
	case services.ErrAccountDisabled:
		utils.ErrorResponse(c, http.StatusUnauthorized, action, "Akun dinonaktifkan. Silakan hubungi administrator.")
	case services.ErrUnauthorizedRole:
		utils.ErrorResponse(c, http.StatusForbidden, action, "Anda tidak memiliki izin untuk mengakses portal ini.")
	case services.ErrNIPNotFound:
		utils.ErrorResponse(c, http.StatusNotFound, action, "NIP tidak ditemukan dalam database pegawai.")
	case services.ErrUserAlreadyExists:
		utils.ErrorResponse(c, http.StatusConflict, action, "Pengguna sudah terdaftar. Silakan login atau gunakan fitur Lupa Password.")
	case services.ErrEmailMismatch:
		utils.ErrorResponse(c, http.StatusBadRequest, action, "Email tidak sesuai dengan data pendaftaran.")
	case services.ErrInvalidToken:
		utils.ErrorResponse(c, http.StatusBadRequest, action, "Token verifikasi tidak valid atau sudah kedaluwarsa.")
	case services.ErrInvalidOTP:
		utils.ErrorResponse(c, http.StatusBadRequest, action, "Kode OTP tidak valid atau sudah kedaluwarsa.")
	case services.ErrPasswordNotSet:
		utils.ErrorResponse(c, http.StatusUnauthorized, action, "Silakan atur password Anda terlebih dahulu.")
	case services.ErrInternalServer:
		utils.ErrorResponse(c, http.StatusInternalServerError, action, "An internal server error occurred.")
	default:
		utils.ErrorResponse(c, http.StatusInternalServerError, action, err.Error())
	}
}

// Login handles regular user login (NIP-based).
// POST /api/login
func (ac *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	resp, err := ac.authService.Login(req.NIP, req.Password, req.TOTP, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		if err.Error() == "mfa_required" {
			utils.SuccessResponse(c, http.StatusOK, "MFA required", gin.H{"requires_mfa": true})
			return
		}
		ac.mapAuthError(c, err, "Login failed")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Login successful", resp)
}

// SuperAdminLogin handles site administrator login (username-based).
// POST /api/super-admin/login
func (ac *AuthController) SuperAdminLogin(c *gin.Context) {
	var req models.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	resp, err := ac.authService.SuperAdminLogin(req.Username, req.Password, req.TOTP, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		if err.Error() == "mfa_required" {
			utils.SuccessResponse(c, http.StatusOK, "MFA required", gin.H{"requires_mfa": true})
			return
		}
		ac.mapAuthError(c, err, "Admin login failed")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Login successful", resp)
}

// Register handles user self-registration.
// POST /api/register
func (ac *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	user, token, otp, nama, err := ac.authService.Register(req.NIP, req.Email, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		ac.mapAuthError(c, err, "Registration failed")
		return
	}
	if err := ac.emailService.SendVerificationEmailWithOTP(user.Email, nama, token, otp); err != nil {
		if user.Status == models.StatusPendingVerification {
			config.DB.Unscoped().Delete(&user)
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Registration failed: Could not send verification email. Please check your email address and try again.", err.Error())
		return
	}
	resp := gin.H{"nip": user.NIP, "email": user.Email, "token": token}
	if config.AppConfig.GinMode == "debug" {
		resp["debug_otp"] = otp
		resp["debug_token"] = token
		resp["debug_verification_url"] = fmt.Sprintf("%s/verify-email?token=%s", config.AppConfig.FrontendURL, token)
	}
	utils.SuccessResponse(c, http.StatusCreated, "Registration successful. Please check your email for verification link.", resp)
}

// ResendVerification resends the verification email.
// POST /api/auth/resend-verification
func (ac *AuthController) ResendVerification(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	user, token, otp, nama, err := ac.authService.ResendVerification(req.Email, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		ac.mapAuthError(c, err, "Resend verification failed")
		return
	}
	if err := ac.emailService.SendVerificationEmailWithOTP(user.Email, nama, token, otp); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to send email", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Verification email resent successfully.", nil)
}

// VerifyEmail confirms the user's email address.
// POST /api/verify-email
func (ac *AuthController) VerifyEmail(c *gin.Context) {
	var req models.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	if err := ac.authService.VerifyEmail(req.Token, req.OTP, c.ClientIP(), c.GetHeader("User-Agent")); err != nil {
		ac.mapAuthError(c, err, "Verification failed")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Email verified. Please set your password.", gin.H{
		"token": req.Token, "otp": req.OTP,
	})
}

// SetPassword sets the user password after email verification.
// POST /api/set-password
func (ac *AuthController) SetPassword(c *gin.Context) {
	var req models.SetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	if req.Password != req.ConfirmPassword {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid password", "Passwords do not match")
		return
	}
	if valid, msg := utils.ValidatePassword(req.Password); !valid {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid password", msg)
		return
	}
	if err := ac.authService.SetPassword(req.Token, req.OTP, req.Password, c.ClientIP(), c.GetHeader("User-Agent")); err != nil {
		ac.mapAuthError(c, err, "Failed to set password")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Password set successfully. You can now login.", nil)
}

// ForgotPassword sends a password-reset link to the user's email.
// POST /api/auth/forgot-password
func (ac *AuthController) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	var user models.User
	if err := config.DB.Where("email = ? AND role_id = ?", req.Email, models.RoleUser).First(&user).Error; err != nil {
		utils.SuccessResponse(c, http.StatusOK, "If your email is registered, we will send password reset instructions.", nil)
		return
	}
	config.DB.Where("user_id = ? AND token_type = ?", user.ID, models.TokenTypePasswordReset).Delete(&models.VerificationToken{})
	tokenString, _ := utils.GenerateRandomToken(32)
	otp, _ := utils.GenerateOTP(6)
	config.DB.Create(&models.VerificationToken{
		UserID: user.ID, TokenHash: utils.HashToken(tokenString),
		TokenType: models.TokenTypePasswordReset, OTP: otp,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	})
	tpl := utils.GetPasswordResetEmailTemplate(user.Email, fmt.Sprintf("%s/reset-password?token=%s", config.AppConfig.FrontendURL, tokenString), otp)
	ac.emailService.AsyncSendEmail(user.Email, tpl.Subject, tpl.Body)

	resp := gin.H{}
	if config.AppConfig.GinMode == "debug" {
		resp["debug_token"] = tokenString
		resp["debug_otp"] = otp
	}
	utils.SuccessResponse(c, http.StatusOK, "If your email is registered, we will send password reset instructions.", resp)
}

// ResetPassword completes the password-reset flow.
// POST /api/auth/reset-password
func (ac *AuthController) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	if req.NewPassword != req.ConfirmPassword {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid password", "Passwords do not match")
		return
	}
	if valid, msg := utils.ValidatePassword(req.NewPassword); !valid {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid password", msg)
		return
	}
	var token models.VerificationToken
	if err := config.DB.Where("token_hash = ? AND token_type = ?", utils.HashToken(req.Token), models.TokenTypePasswordReset).
		First(&token).Error; err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid or expired token", "Session invalid")
		return
	}
	if !token.IsValid() {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid or expired token", "Session expired or already used")
		return
	}
	if token.OTP != req.OTP {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid OTP", "OTP verification failed")
		return
	}
	hashed, _ := utils.HashPassword(req.NewPassword)
	tx := config.DB.Begin()
	if err := tx.Model(&models.User{}).Where("id = ?", token.UserID).
		Updates(map[string]interface{}{"password": hashed, "status": models.StatusActive}).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to reset password", "")
		return
	}
	if err := token.MarkUsed(tx); err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "System error", "Failed to invalidate token")
		return
	}
	tx.Model(&models.RefreshToken{}).Where("user_id = ?", token.UserID).Update("revoked_at", time.Now())
	tx.Commit()
	utils.SuccessResponse(c, http.StatusOK, "Password reset successfully. You can now login.", nil)
}

// GetProfile returns current user's profile.
// GET /api/profile
func (ac *AuthController) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user models.User
	if err := config.DB.Preload("Role").First(&user, userID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", "Failed to get user profile")
		return
	}
	var sdm models.SDM
	if user.NIP != nil {
		if err := config.DB.Where("TRIM(nip) = TRIM(?)", *user.NIP).First(&sdm).Error; err == nil {
			user.Name = sdm.Nama
			user.Foto = sdm.Foto
			user.Jabatan = sdm.Jabatan
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		user.Name = *user.Username
	}
	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved", gin.H{"user": user.ToResponse(), "sdm": sdm.ToResponse()})
}

// UpdateProfileRequest for updating user profile.
type UpdateProfileRequest struct {
	Email   string `json:"email" binding:"omitempty,email"`
	NomorHP string `json:"nomor_hp"`
	Foto    string `json:"foto"`
}

// UpdateProfile updates the current user's profile.
// PUT /api/profile
func (ac *AuthController) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", "")
		return
	}
	var sdm models.SDM
	hasSDM := user.NIP != nil && config.DB.Where("TRIM(nip) = TRIM(?)", *user.NIP).First(&sdm).Error == nil
	if !hasSDM && user.RoleID != models.RoleSuperAdmin {
		utils.ErrorResponse(c, http.StatusNotFound, "SDM not found", "SDM record not found for this user")
		return
	}

	updates, sdmUpdates := map[string]interface{}{}, map[string]interface{}{}
	if req.Email != "" && req.Email != user.Email {
		if !utils.ValidateEmail(req.Email) {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid email", "Invalid email format")
			return
		}
		var cnt int64
		config.DB.Model(&models.User{}).Where("email = ? AND id != ?", req.Email, user.ID).Count(&cnt)
		if cnt > 0 {
			utils.ErrorResponse(c, http.StatusConflict, "Email exists", "Email already used by another account")
			return
		}
		updates["email"] = req.Email
		sdmUpdates["email"] = req.Email
	}
	if req.NomorHP != "" {
		sdmUpdates["nomor_hp"] = utils.SanitizeString(req.NomorHP)
	}
	if req.Foto != "" {
		sdmUpdates["foto"] = req.Foto
	}

	tx := config.DB.Begin()
	if len(updates) > 0 {
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, http.StatusInternalServerError, "Update failed", "")
			return
		}
	}
	if len(sdmUpdates) > 0 && hasSDM {
		if err := tx.Model(&sdm).Updates(sdmUpdates).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, http.StatusInternalServerError, "Update failed", "")
			return
		}
	}
	tx.Commit()

	config.DB.First(&user, userID)
	if user.NIP != nil {
		if err := config.DB.Where("TRIM(nip) = TRIM(?)", *user.NIP).First(&sdm).Error; err == nil {
			user.Name = sdm.Nama
			user.Foto = sdm.Foto
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		user.Name = *user.Username
	}
	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", gin.H{"user": user.ToResponse(), "sdm": sdm.ToResponse()})
}

// RefreshToken performs secure refresh-token rotation.
// POST /api/auth/refresh-token
func (ac *AuthController) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	var stored models.RefreshToken
	if err := config.DB.Preload("User.Role").Where("token_hash = ?", utils.HashToken(req.RefreshToken)).
		First(&stored).Error; err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid refresh token", "Session not found or expired")
		return
	}
	if stored.IsRevoked() {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Token revoked", "This session has been invalidated")
		return
	}
	if stored.IsExpired() {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Token expired", "Session expired, please login again")
		return
	}
	if stored.User.Status != models.StatusActive {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Account restricted", "Your account is no longer active")
		return
	}

	now := time.Now()
	tx := config.DB.Begin()
	if err := tx.Model(&stored).Update("revoked_at", &now).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotation failed", "Failed to invalidate old session")
		return
	}
	newAccess, err := utils.GenerateJWT(&stored.User)
	if err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotation failed", "Failed to generate access token")
		return
	}
	newRefresh, err := utils.GenerateRefreshToken(&stored.User)
	if err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotation failed", "Failed to generate refresh token")
		return
	}
	if err := tx.Create(&models.RefreshToken{
		UserID:    stored.UserID,
		TokenHash: utils.HashToken(newRefresh),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotation failed", "Failed to save new session")
		return
	}
	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotation failed", "Transaction failed")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Token refreshed", gin.H{
		"token":         newAccess,
		"refresh_token": newRefresh,
	})
}

// TestEmailConnection tests the email configuration.
// POST /api/test-email
func (ac *AuthController) TestEmailConnection(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	otp, err := utils.GenerateOTP(6)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate test OTP", err.Error())
		return
	}
	if err := ac.emailService.SendVerificationEmailWithOTP(req.Email, "Test User", "test-token-123", otp); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Email test failed", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Email test successful", gin.H{"test_otp": otp, "recipient": req.Email})
}
