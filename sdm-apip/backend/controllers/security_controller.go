package controllers

import (
	"fmt"
	"net/http"
	"time"

	"sdm-apip-backend/config"
	"sdm-apip-backend/models"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// SuperAdminForgotPassword sends an admin password reset token via email.
// POST /api/auth/super-admin/forgot-password
func (ac *AuthController) SuperAdminForgotPassword(c *gin.Context) {
	var req models.AdminForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	var user models.User
	if err := config.DB.Where("username = ? AND role_id = ?", req.Username, models.RoleSuperAdmin).First(&user).Error; err != nil {
		// Avoid user enumeration — always return 200
		utils.SuccessResponse(c, http.StatusOK, "Jika akun ditemukan, instruksi reset telah dikirim ke email Admin", nil)
		return
	}

	// Hapus token lama yang belum dipakai
	config.DB.Where("user_id = ? AND token_type = ?", user.ID, "admin_reset").Delete(&models.VerificationToken{})

	// Buat token reset baru (berlaku 1 jam)
	tokenString, err := utils.GenerateRandomToken(32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat token reset", "")
		return
	}
	config.DB.Create(&models.VerificationToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(tokenString),
		TokenType: "admin_reset",
		ExpiresAt: time.Now().Add(1 * time.Hour),
	})

	// Kirim email reset ke Admin
	resetURL := fmt.Sprintf("%s/super-admin/reset-password?token=%s", config.AppConfig.FrontendURL, tokenString)
	adminName := "Administrator"
	if user.Username != nil {
		adminName = *user.Username
	}
	ac.emailService.AsyncSendAdminPasswordResetEmail(user.Email, adminName, resetURL)

	utils.SuccessResponse(c, http.StatusOK, "Instruksi reset password telah dikirim ke email Admin", nil)
}

// SuperAdminResetToDefault completes admin password reset via token.
// POST /api/auth/super-admin/reset-to-default
func (ac *AuthController) SuperAdminResetToDefault(c *gin.Context) {
	var req models.AdminResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if req.NewPassword == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password baru wajib diisi", "")
		return
	}
	if valid, msg := utils.ValidatePassword(req.NewPassword); !valid {
		utils.ErrorResponse(c, http.StatusBadRequest, msg, "")
		return
	}
	if req.NewPassword != req.ConfirmPassword {
		utils.ErrorResponse(c, http.StatusBadRequest, "Konfirmasi password tidak cocok", "")
		return
	}

	var token models.VerificationToken
	if err := config.DB.Where("token_hash = ? AND token_type = ?", utils.HashToken(req.Token), "admin_reset").
		First(&token).Error; err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Token tidak valid atau sudah kadaluwarsa", "")
		return
	}
	if token.IsExpired() || token.IsUsed() {
		utils.ErrorResponse(c, http.StatusBadRequest, "Token sudah kadaluwarsa atau sudah digunakan", "")
		return
	}

	hashed, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memproses password", "")
		return
	}

	tx := config.DB.Begin()
	if err := tx.Model(&models.User{}).Where("id = ?", token.UserID).Update("password", hashed).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mereset password", "")
		return
	}
	if err := token.MarkUsed(tx); err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memvalidasi token", "")
		return
	}
	// Cabut semua sesi aktif admin untuk keamanan
	tx.Model(&models.RefreshToken{}).Where("user_id = ?", token.UserID).Update("revoked_at", time.Now())
	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Transaksi gagal", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password Administrator berhasil direset. Semua sesi aktif telah dicabut.", nil)
}

// SecureAdminResetRequest initiates secure admin password reset (JWT + MFA).
// POST /api/admin/secure-reset/request
func (ac *AuthController) SecureAdminResetRequest(c *gin.Context) {
	var req models.SecureAdminResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	callerID := c.MustGet("user_id").(uint)
	ip, ua := c.ClientIP(), c.GetHeader("User-Agent")

	var target models.User
	if err := config.DB.Where("username = ? AND role_id = ?", req.TargetUsername, models.RoleSuperAdmin).
		First(&target).Error; err != nil {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua,
			fmt.Sprintf("Target user not found: %s", req.TargetUsername), nil)
		utils.ErrorResponse(c, http.StatusNotFound, "Admin reset failed", "Target admin user not found")
		return
	}

	otp, err := utils.GenerateOTP(6)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate OTP", err.Error())
		return
	}
	config.DB.Where("user_id = ? AND token_type = ?", target.ID, "secure_admin_reset").Delete(&models.VerificationToken{})
	tokenString, _ := utils.GenerateRandomToken(32)
	if err := config.DB.Create(&models.VerificationToken{
		UserID: target.ID, TokenHash: utils.HashToken(tokenString),
		TokenType: "secure_admin_reset", OTP: otp,
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create reset token", "")
		return
	}

	ac.emailService.AsyncSendEmail(target.Email, "Admin Password Reset - OTP Verification",
		fmt.Sprintf("Your OTP for admin password reset is: %s. Expires in 15 minutes.", otp))

	models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusPending, ip, ua,
		fmt.Sprintf("MFA OTP sent to %s for password reset", target.Email), &target.ID)

	utils.SuccessResponse(c, http.StatusOK, "MFA verification code sent to admin's email", gin.H{
		"target_email": target.Email,
		"expires_in":   "15 minutes",
	})
}

// SecureAdminResetConfirm confirms admin password reset with OTP.
// POST /api/admin/secure-reset/confirm
func (ac *AuthController) SecureAdminResetConfirm(c *gin.Context) {
	var req models.SecureAdminResetConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	callerID := c.MustGet("user_id").(uint)
	ip, ua := c.ClientIP(), c.GetHeader("User-Agent")

	var target models.User
	if err := config.DB.Where("username = ? AND role_id = ?", req.TargetUsername, models.RoleSuperAdmin).
		First(&target).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Admin reset failed", "Target admin user not found")
		return
	}

	var token models.VerificationToken
	if err := config.DB.Where("user_id = ? AND token_type = ?", target.ID, "secure_admin_reset").
		Order("created_at DESC").First(&token).Error; err != nil {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua, "No active reset token found", &target.ID)
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid or expired reset session", "")
		return
	}
	if token.IsExpired() || token.IsUsed() {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua, "Token expired or already used", &target.ID)
		utils.ErrorResponse(c, http.StatusBadRequest, "Reset session expired or already used", "")
		return
	}
	if token.OTP != req.OTP {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua, "Invalid OTP provided", &target.ID)
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid OTP code", "")
		return
	}
	if valid, msg := utils.ValidatePassword(req.NewPassword); !valid {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid password", msg)
		return
	}
	hashed, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to hash password", "")
		return
	}

	tx := config.DB.Begin()
	if err := tx.Model(&models.User{}).Where("id = ?", target.ID).Update("password", hashed).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to reset password", "")
		return
	}
	if err := token.MarkUsed(tx); err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to mark token used", "")
		return
	}
	models.CreateAuditLog(tx, &callerID, models.AuditActionAdminReset, models.AuditStatusSuccess, ip, ua,
		fmt.Sprintf("Admin password reset successful for %s", *target.Username), &target.ID)
	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Transaction failed", "")
		return
	}

	config.DB.Model(&models.RefreshToken{}).Where("user_id = ?", target.ID).Update("revoked_at", time.Now())
	utils.SuccessResponse(c, http.StatusOK, "Admin password has been reset successfully. All active sessions have been revoked.", gin.H{
		"target_user": *target.Username,
	})
}

// SetupMFA initiates MFA registration.
// GET /api/auth/mfa/setup
func (ac *AuthController) SetupMFA(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	secret, qrURL, err := ac.authService.GenerateMFASecret(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to setup MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "MFA Setup initiated", gin.H{"secret": secret, "qr_url": qrURL})
}

// EnableMFA completes MFA registration.
// POST /api/auth/mfa/enable
func (ac *AuthController) EnableMFA(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		OTP string `json:"otp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	if err := ac.authService.EnableMFA(userID, req.OTP); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to enable MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "MFA enabled successfully", nil)
}

// DisableMFA disables MFA for the current user.
// POST /api/auth/mfa/disable
func (ac *AuthController) DisableMFA(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	if err := ac.authService.DisableMFA(userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to disable MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "MFA disabled successfully", nil)
}

// AdminDisableMFA allows admin to force-disable MFA for any user.
// POST /api/admin/users/:id/mfa/disable
func (ac *AuthController) AdminDisableMFA(c *gin.Context) {
	var userID uint
	fmt.Sscanf(c.Param("id"), "%d", &userID)
	if userID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", "")
		return
	}
	if err := ac.authService.DisableMFA(userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to disable MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User MFA disabled successfully", nil)
}
