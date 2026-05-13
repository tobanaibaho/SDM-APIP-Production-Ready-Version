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

// SuperAdminForgotPassword mengirimkan token reset kata sandi admin via email.
// POST /api/auth/super-admin/forgot-password
func (ac *AuthController) SuperAdminForgotPassword(c *gin.Context) {
	var req models.AdminForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	var user models.User
	if err := config.DB.Where("username = ? AND role_id = ?", req.Username, models.RoleSuperAdmin).First(&user).Error; err != nil {
		// Hindari enumerasi pengguna — selalu kembalikan 200
		utils.SuccessResponse(c, http.StatusOK, "Jika akun ditemukan, instruksi reset telah dikirim ke email Admin", nil)
		return
	}

	// Hapus token lama yang belum dipakai
	config.DB.Where("user_id = ? AND token_type = ?", user.ID, "admin_reset").Delete(&models.VerificationToken{})

	// Buat token reset baru (berlaku 5 menit)
	tokenString, err := utils.GenerateRandomToken(32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat token reset", "")
		return
	}
	config.DB.Create(&models.VerificationToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(tokenString),
		TokenType: "admin_reset",
		ExpiresAt: time.Now().Add(5 * time.Minute),
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

// SuperAdminResetPassword menyelesaikan alur reset kata sandi admin menggunakan token tautan tanpa OTP.
// POST /api/auth/super-admin/reset-password
func (ac *AuthController) SuperAdminResetPassword(c *gin.Context) {
	var req struct {
		Token           string `json:"token" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
		ConfirmPassword string `json:"confirm_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}
	if req.NewPassword != req.ConfirmPassword {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password tidak cocok", "Konfirmasi password tidak sama.")
		return
	}
	if valid, msg := utils.ValidatePassword(req.NewPassword); !valid {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password tidak valid", msg)
		return
	}

	var token models.VerificationToken
	if err := config.DB.Where("token_hash = ? AND token_type = ?", utils.HashToken(req.Token), "admin_reset").First(&token).Error; err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Tautan reset tidak valid atau sudah kedaluwarsa", "Token tidak ditemukan")
		return
	}
	if token.IsExpired() || token.IsUsed() {
		utils.ErrorResponse(c, http.StatusBadRequest, "Tautan reset telah kedaluwarsa atau sudah pernah digunakan", "")
		return
	}

	hashed, _ := utils.HashPassword(req.NewPassword)
	tx := config.DB.Begin()
	
	// Update password
	if err := tx.Model(&models.User{}).Where("id = ?", token.UserID).Update("password", hashed).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mereset kata sandi", "")
		return
	}
	
	// Tandai token terpakai
	if err := token.MarkUsed(tx); err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengakhiri sesi reset", "")
		return
	}

	// Cabut semua sesi aktif (keamanan)
	tx.Model(&models.RefreshToken{}).Where("user_id = ?", token.UserID).Update("revoked_at", time.Now())
	
	// Catat audit log
	ip, ua := c.ClientIP(), c.GetHeader("User-Agent")
	models.CreateAuditLog(tx, &token.UserID, models.AuditActionAdminReset, models.AuditStatusSuccess, ip, ua, "Admin berhasil mereset password via tautan email", &token.UserID)

	tx.Commit()

	utils.SuccessResponse(c, http.StatusOK, "Kata sandi Admin berhasil direset. Silakan login menggunakan kata sandi baru.", nil)
}



// SecureAdminResetRequest memulai reset kata sandi admin yang aman (JWT + MFA).
// POST /api/admin/secure-reset/request
func (ac *AuthController) SecureAdminResetRequest(c *gin.Context) {
	var req models.SecureAdminResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}
	callerID := c.MustGet("user_id").(uint)
	ip, ua := c.ClientIP(), c.GetHeader("User-Agent")

	var target models.User
	if err := config.DB.Where("username = ? AND role_id = ?", req.TargetUsername, models.RoleSuperAdmin).
		First(&target).Error; err != nil {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua,
			fmt.Sprintf("Target user not found: %s", req.TargetUsername), nil)
		utils.ErrorResponse(c, http.StatusNotFound, "Reset admin gagal", "Pengguna admin target tidak ditemukan")
		return
	}

	otp, err := utils.GenerateOTP(6)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat OTP", err.Error())
		return
	}
	config.DB.Where("user_id = ? AND token_type = ?", target.ID, "secure_admin_reset").Delete(&models.VerificationToken{})
	tokenString, _ := utils.GenerateRandomToken(32)
	if err := config.DB.Create(&models.VerificationToken{
		UserID: target.ID, TokenHash: utils.HashToken(tokenString),
		TokenType: "secure_admin_reset", OTP: otp,
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat token reset", "")
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

// SecureAdminResetConfirm mengkonfirmasi reset kata sandi admin dengan OTP.
// POST /api/admin/secure-reset/confirm
func (ac *AuthController) SecureAdminResetConfirm(c *gin.Context) {
	var req models.SecureAdminResetConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}
	callerID := c.MustGet("user_id").(uint)
	ip, ua := c.ClientIP(), c.GetHeader("User-Agent")

	var target models.User
	if err := config.DB.Where("username = ? AND role_id = ?", req.TargetUsername, models.RoleSuperAdmin).
		First(&target).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Reset admin gagal", "Pengguna admin target tidak ditemukan")
		return
	}

	var token models.VerificationToken
	if err := config.DB.Where("user_id = ? AND token_type = ?", target.ID, "secure_admin_reset").
		Order("created_at DESC").First(&token).Error; err != nil {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua, "No active reset token found", &target.ID)
		utils.ErrorResponse(c, http.StatusBadRequest, "Sesi reset tidak valid atau kedaluwarsa", "")
		return
	}
	if token.IsExpired() || token.IsUsed() {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua, "Token expired or already used", &target.ID)
		utils.ErrorResponse(c, http.StatusBadRequest, "Sesi reset kedaluwarsa atau sudah digunakan", "")
		return
	}
	if token.OTP != req.OTP {
		models.CreateAuditLog(config.DB, &callerID, models.AuditActionAdminReset, models.AuditStatusFailed, ip, ua, "Invalid OTP provided", &target.ID)
		utils.ErrorResponse(c, http.StatusBadRequest, "Kode OTP tidak valid", "")
		return
	}
	if valid, msg := utils.ValidatePassword(req.NewPassword); !valid {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password tidak valid", msg)
		return
	}
	hashed, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal melakukan hash password", "")
		return
	}

	tx := config.DB.Begin()
	if err := tx.Model(&models.User{}).Where("id = ?", target.ID).Update("password", hashed).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mereset password", "")
		return
	}
	if err := token.MarkUsed(tx); err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menandai token sebagai digunakan", "")
		return
	}
	models.CreateAuditLog(tx, &callerID, models.AuditActionAdminReset, models.AuditStatusSuccess, ip, ua,
		fmt.Sprintf("Admin password reset successful for %s", *target.Username), &target.ID)
	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Transaksi gagal", "")
		return
	}

	config.DB.Model(&models.RefreshToken{}).Where("user_id = ?", target.ID).Update("revoked_at", time.Now())
	utils.SuccessResponse(c, http.StatusOK, "Admin password has been reset successfully. All active sessions have been revoked.", gin.H{
		"target_user": *target.Username,
	})
}

// SetupMFA memulai pendaftaran MFA.
// GET /api/auth/mfa/setup
func (ac *AuthController) SetupMFA(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	secret, qrURL, err := ac.authService.GenerateMFASecret(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengatur MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "MFA Setup initiated", gin.H{"secret": secret, "qr_url": qrURL})
}

// EnableMFA menyelesaikan pendaftaran MFA.
// POST /api/auth/mfa/enable
func (ac *AuthController) EnableMFA(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		OTP string `json:"otp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}
	if err := ac.authService.EnableMFA(userID, req.OTP); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal mengaktifkan MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "MFA enabled successfully", nil)
}

// DisableMFA menonaktifkan MFA untuk pengguna saat ini.
// POST /api/auth/mfa/disable
func (ac *AuthController) DisableMFA(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	if err := ac.authService.DisableMFA(userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menonaktifkan MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "MFA disabled successfully", nil)
}

// AdminDisableMFA memungkinkan admin untuk menonaktifkan paksa MFA pengguna manapun.
// POST /api/admin/users/:id/mfa/disable
func (ac *AuthController) AdminDisableMFA(c *gin.Context) {
	var userID uint
	fmt.Sscanf(c.Param("id"), "%d", &userID)
	if userID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengguna tidak valid", "")
		return
	}
	if err := ac.authService.DisableMFA(userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menonaktifkan MFA", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User MFA disabled successfully", nil)
}
