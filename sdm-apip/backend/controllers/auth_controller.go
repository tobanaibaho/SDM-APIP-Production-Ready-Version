package controllers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	oidc "github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	"sdm-apip-backend/config"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// AuthController menangani endpoint autentikasi.
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

// mapAuthError menerjemahkan error dari service menjadi respons HTTP.
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
		utils.ErrorResponse(c, http.StatusInternalServerError, action, "Terjadi kesalahan server internal.")
	default:
		utils.ErrorResponse(c, http.StatusInternalServerError, action, err.Error())
	}
}



// SuperAdminLogin menangani login administrator sistem (berbasis username).
// POST /api/super-admin/login
func (ac *AuthController) SuperAdminLogin(c *gin.Context) {
	var req models.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
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

	// Tetapkan Refresh Token sebagai HTTP-Only Cookie
	isProd := config.AppConfig.GinMode == "release"
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("refresh_token", resp.RefreshToken, 7*24*3600, "/", "", isProd, true)

	// Jangan kirim refresh token di respons JSON
	resp.RefreshToken = ""

	utils.SuccessResponse(c, http.StatusOK, "Login successful", resp)
}



// GetProfile mengembalikan profil pengguna yang sedang aktif.
// GET /api/profile
func (ac *AuthController) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user models.User
	if err := config.DB.Preload("Role").First(&user, userID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Pengguna tidak ditemukan", "Gagal mengambil profil pengguna")
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

// UpdateProfileRequest untuk memperbarui profil pengguna.
type UpdateProfileRequest struct {
	Email   string `json:"email" binding:"omitempty,email"`
	NomorHP string `json:"nomor_hp"`
	Foto    string `json:"foto"`
}

// UpdateProfile memperbarui profil pengguna yang sedang aktif.
// PUT /api/profile
func (ac *AuthController) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Pengguna tidak ditemukan", "")
		return
	}
	var sdm models.SDM
	hasSDM := user.NIP != nil && config.DB.Where("TRIM(nip) = TRIM(?)", *user.NIP).First(&sdm).Error == nil
	if !hasSDM && user.RoleID != models.RoleSuperAdmin {
		utils.ErrorResponse(c, http.StatusNotFound, "SDM tidak ditemukan", "Rekam SDM tidak ditemukan untuk pengguna ini")
		return
	}

	updates, sdmUpdates := map[string]interface{}{}, map[string]interface{}{}
	if req.Email != "" && req.Email != user.Email {
		if !utils.ValidateEmail(req.Email) {
			utils.ErrorResponse(c, http.StatusBadRequest, "Email tidak valid", "Format email tidak valid")
			return
		}
		var cnt int64
		config.DB.Model(&models.User{}).Where("email = ? AND id != ?", req.Email, user.ID).Count(&cnt)
		if cnt > 0 {
			utils.ErrorResponse(c, http.StatusConflict, "Email sudah ada", "Email sudah digunakan oleh akun lain")
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
			utils.ErrorResponse(c, http.StatusInternalServerError, "Pembaruan gagal", "")
			return
		}
	}
	if len(sdmUpdates) > 0 && hasSDM {
		if err := tx.Model(&sdm).Updates(sdmUpdates).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, http.StatusInternalServerError, "Pembaruan gagal", "")
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

// RefreshToken melakukan rotasi refresh-token yang aman.
// POST /api/auth/refresh-token
func (ac *AuthController) RefreshToken(c *gin.Context) {
	cookieToken, err := c.Cookie("refresh_token")
	if err != nil || cookieToken == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Permintaan tidak valid", "Token penyegaran tidak ada")
		return
	}

	var stored models.RefreshToken
	if err := config.DB.Preload("User.Role").Where("token_hash = ?", utils.HashToken(cookieToken)).
		First(&stored).Error; err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Token penyegaran tidak valid", "Sesi tidak ditemukan atau kedaluwarsa")
		return
	}
	if stored.IsRevoked() {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Token dicabut", "Sesi ini telah dibatalkan")
		return
	}
	if stored.IsExpired() {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Token kedaluwarsa", "Sesi kedaluwarsa, harap login kembali")
		return
	}
	if stored.User.Status != models.StatusActive {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Akun dibatasi", "Akun Anda tidak lagi aktif")
		return
	}

	now := time.Now()
	tx := config.DB.Begin()
	if err := tx.Model(&stored).Update("revoked_at", &now).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotasi gagal", "Gagal membatalkan sesi lama")
		return
	}
	newAccess, err := utils.GenerateJWT(&stored.User)
	if err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotasi gagal", "Gagal membuat token akses")
		return
	}
	newRefresh, err := utils.GenerateRefreshToken(&stored.User)
	if err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotasi gagal", "Gagal membuat token penyegaran")
		return
	}
	if err := tx.Create(&models.RefreshToken{
		UserID:    stored.UserID,
		TokenHash: utils.HashToken(newRefresh),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotasi gagal", "Gagal menyimpan sesi baru")
		return
	}
	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Rotasi gagal", "Transaksi gagal")
		return
	}
	isProd := config.AppConfig.GinMode == "release"
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("refresh_token", newRefresh, 7*24*3600, "/", "", isProd, true)

	utils.SuccessResponse(c, http.StatusOK, "Token refreshed", gin.H{
		"token": newAccess,
	})
}

// Logout menghapus cookie refresh token
// POST /api/auth/logout
func (ac *AuthController) Logout(c *gin.Context) {
	cookieToken, err := c.Cookie("refresh_token")
	if err == nil && cookieToken != "" {
		// Opsional: Cabut di DB
		config.DB.Model(&models.RefreshToken{}).Where("token_hash = ?", utils.HashToken(cookieToken)).Update("revoked_at", time.Now())
	}

	// Selalu hapus cookie
	isProd := config.AppConfig.GinMode == "release"
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("refresh_token", "", -1, "/", "", isProd, true)

	utils.SuccessResponse(c, http.StatusOK, "Logged out successfully", nil)
}

// ChangePassword memungkinkan pengguna yang sudah masuk (admin atau biasa) mengubah kata sandinya sendiri.
// POST /api/user/change-password atau /api/admin/change-password
func (ac *AuthController) ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
		ConfirmPassword string `json:"confirm_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	// 1. Validasi password baru cocok dengan konfirmasi
	if req.NewPassword != req.ConfirmPassword {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password tidak cocok", "Password baru dan konfirmasi password tidak sama")
		return
	}

	// 2. Validasi kekuatan password baru
	if valid, msg := utils.ValidatePassword(req.NewPassword); !valid {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password tidak valid", msg)
		return
	}

	// 3. Pastikan password baru berbeda dengan yang lama
	if req.CurrentPassword == req.NewPassword {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password tidak valid", "Password baru tidak boleh sama dengan password lama")
		return
	}

	// 4. Ambil data user yang sedang login
	userID := middleware.GetUserIDFromContext(c)
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Pengguna tidak ditemukan", "")
		return
	}

	// 5. Verifikasi password lama
	if !utils.CheckPasswordHash(req.CurrentPassword, user.Password) {
		models.CreateAuditLog(config.DB, &user.ID, models.AuditActionLoginFailed, models.AuditStatusFailed,
			c.ClientIP(), c.GetHeader("User-Agent"), "User change password failed: incorrect current password", &user.ID)
		utils.ErrorResponse(c, http.StatusUnauthorized, "Password lama salah", "Password saat ini tidak cocok")
		return
	}

	// 6. Hash password baru dan simpan
	hashed, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memproses password", "")
		return
	}

	tx := config.DB.Begin()
	if err := tx.Model(&user).Update("password", hashed).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan password", "")
		return
	}

	// 7. Cabut semua sesi aktif (paksa login ulang dengan password baru)
	tx.Model(&models.RefreshToken{}).Where("user_id = ?", user.ID).Update("revoked_at", time.Now())

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyelesaikan operasi", "")
		return
	}

	// 8. Audit log
	models.CreateAuditLog(config.DB, &user.ID, "password_changed", models.AuditStatusSuccess,
		c.ClientIP(), c.GetHeader("User-Agent"), "User password changed successfully", &user.ID)

	utils.SuccessResponse(c, http.StatusOK, "Password berhasil diubah. Silakan login ulang.", nil)
}

// TestEmailConnection menguji konfigurasi email.
// POST /api/test-email
func (ac *AuthController) TestEmailConnection(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}
	otp, err := utils.GenerateOTP(6)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat OTP tes", err.Error())
		return
	}
	if err := ac.emailService.SendVerificationEmailWithOTP(req.Email, "Test User", "test-token-123", otp); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Tes email gagal", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Email test successful", gin.H{"test_otp": otp, "recipient": req.Email})
}

// Helper untuk mendapatkan kredensial SSO Internal Instansi
func getSSOProviderConfig(providerName string) (bool, string, string, string, string) {
	// Hanya menggunakan SSO internal instansi (Kemenko Infra)
	return config.AppConfig.SSOEnabled, config.AppConfig.SSOClientID, config.AppConfig.SSOClientSecret, config.AppConfig.SSOIssuerURL, config.AppConfig.SSORedirectURL
}

// ============================================================
// SSO - TAHAP 3: Endpoint Keberangkatan (Memulai Alur SSO)
// GET /api/auth/sso/login/:provider
// Mengalihkan pengguna ke IdP asli ATAU mengembalikan info mock jika SSO_ENABLED=false.
// ============================================================
func (ac *AuthController) SSOInitiate(c *gin.Context) {
	providerName := c.Param("provider")
	enabled, clientID, clientSecret, issuerURL, redirectURL := getSSOProviderConfig(providerName)

	if !enabled {
		// Mode Dev: Beri tahu frontend untuk menggunakan halaman mock
		c.JSON(http.StatusOK, gin.H{
			"sso_enabled": false,
			"redirect_url": "/mock-sso",
			"message":     "SSO provider not configured. Redirecting to mock SSO for development.",
		})
		return
	}

	// Mode Produksi: Konfigurasi provider OIDC
	provider, err := oidc.NewProvider(context.Background(), issuerURL)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghubungi server SSO", err.Error())
		return
	}

	oauth2Config := oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}

	// Buat token 'state' acak untuk perlindungan CSRF
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)

	// Simpan state dalam cookie sementara yang aman
	isProd := config.AppConfig.GinMode == "release"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sso_state", state, 300, "/", "", isProd, true)

	// Alihkan pengguna ke halaman login IdP
	c.Redirect(http.StatusFound, oauth2Config.AuthCodeURL(state))
}

// ============================================================
// SSO - TAHAP 4: Endpoint Kedatangan / OIDC Callback
// GET /api/auth/sso/oidc-callback
// Memvalidasi token OIDC, mengekstrak NIP, menjalankan JIT provisioning.
// ============================================================
func (ac *AuthController) SSOOIDCCallback(c *gin.Context) {
	// 1. Validasi 'state' untuk mencegah serangan CSRF
	cookieState, err := c.Cookie("sso_state")
	if err != nil || cookieState != c.Query("state") {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=invalid_state")
		return
	}
	c.SetCookie("sso_state", "", -1, "/", "", false, true) // Hapus cookie state

	providerName := c.Param("provider")
	enabled, clientID, clientSecret, issuerURL, redirectURL := getSSOProviderConfig(providerName)

	if !enabled {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=provider_disabled")
		return
	}

	// 2. Konfigurasi provider OIDC
	provider, err := oidc.NewProvider(context.Background(), issuerURL)
	if err != nil {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=sso_unavailable")
		return
	}

	oauth2Config := oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}

	// 3. Tukarkan authorization code dengan token
	oauth2Token, err := oauth2Config.Exchange(context.Background(), c.Query("code"))
	if err != nil {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=token_exchange_failed")
		return
	}

	// 4. Ekstrak dan verifikasi ID Token
	verifier := provider.Verifier(&oidc.Config{ClientID: clientID})
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=no_id_token")
		return
	}
	idToken, err := verifier.Verify(context.Background(), rawIDToken)
	if err != nil {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=token_invalid")
		return
	}

	// 5. Ekstrak klaim pengguna (NIP harus disediakan oleh IdP)
	var claims struct {
		NIP   string `json:"nip"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := idToken.Claims(&claims); err != nil {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=claims_failed")
		return
	}
	if claims.NIP == "" && claims.Email == "" {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=identity_not_found")
		return
	}

	// 6. Jalankan logika JIT Provisioning yang sama (dibagi dengan Mock SSO)
	nip := claims.NIP
	token, err := ac.processSSO(c, nip, claims.Email)
	if err != nil {
		c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/login?error=access_denied")
		return
	}

	// 7. Arahkan kembali ke dashboard frontend dengan token JWT
	c.Redirect(http.StatusFound, config.AppConfig.FrontendURL+"/dashboard?sso_token="+token)
}

// SSOCallback menangani respons balik dari provider SSO mock


// processSSO adalah helper bersama yang menjalankan JIT provisioning.
// Dipanggil oleh SSOOIDCCallback (Produksi).
//
// KEBIJAKAN AKSES SSO (Verifikasi Utama via Email):
//  1. Email dari IdP HARUS ada di tabel Master SDM (sdm_apip)
//  2. Jika email cocok, NIP ditarik secara otomatis dari data Master SDM
//  3. Jika email tidak terdaftar → akses ditolak
func (ac *AuthController) processSSO(c *gin.Context, nip, email string) (string, error) {
	// Guard: Email wajib ada dari IdP (karena kita menggunakan Email-First Verification)
	if email == "" {
		models.CreateAuditLog(config.DB, nil, models.AuditActionLogin, models.AuditStatusFailed,
			c.ClientIP(), c.GetHeader("User-Agent"),
			"SSO: Tidak ada klaim identitas email yang dikirimkan oleh IdP", nil)
		return "", fmt.Errorf("identitas email tidak ditemukan dari SSO")
	}

	// ─── LAYER 1: Verifikasi Email di Master SDM ──────────────────────────────
	// Kita mengandalkan email dari SSO sebagai acuan utama
	var sdm models.SDM
	if err := config.DB.Where("TRIM(LOWER(email)) = TRIM(LOWER(?))", email).First(&sdm).Error; err != nil {
		models.CreateAuditLog(config.DB, nil, models.AuditActionLogin, models.AuditStatusFailed,
			c.ClientIP(), c.GetHeader("User-Agent"),
			fmt.Sprintf("SSO Ditolak: Email '%s' tidak terdaftar di data master pegawai", email), nil)
		return "", fmt.Errorf("email Anda tidak terdaftar sebagai pegawai APIP")
	}

	// Ambil NIP yang sah dari data master (mengabaikan NIP dari IdP jika ada)
	masterNip := sdm.NIP
	masterEmail := sdm.Email

	// ─── LAYER 2: JIT Provisioning ────────────────────────────────────────────
	var user models.User
	if err := config.DB.Where("TRIM(nip) = TRIM(?)", masterNip).First(&user).Error; err != nil {
		// Login pertama: provisi akun secara otomatis menggunakan data master
		user = models.User{
			NIP:      &masterNip,
			Email:    masterEmail, // Selalu gunakan email dari data master
			RoleID:   models.RoleUser,
			Status:   models.StatusActive,
			Password: "", // Tanpa password — login hanya via SSO
		}
		if err := config.DB.Create(&user).Error; err != nil {
			return "", fmt.Errorf("gagal membuat akun SSO: %v", err)
		}
		models.CreateAuditLog(config.DB, &user.ID, models.AuditActionUserCreate, models.AuditStatusSuccess,
			c.ClientIP(), c.GetHeader("User-Agent"),
			fmt.Sprintf("SSO JIT Provisioning: NIP=%s, Email=%s", masterNip, masterEmail), nil)
	} else {
		// Login berikutnya: pastikan akun aktif dan email sinkron dengan data master
		updates := map[string]interface{}{}
		if user.Status != models.StatusActive {
			updates["status"] = models.StatusActive
		}
		// Sinkronisasi email akun dengan data master jika berbeda
		if !strings.EqualFold(user.Email, masterEmail) {
			updates["email"] = masterEmail
		}
		if len(updates) > 0 {
			config.DB.Model(&user).Updates(updates)
		}
	}

	// ─── Buat JWT ────────────────────────────────────────────────────────────
	config.DB.Preload("Role").First(&user, user.ID)
	token, err := utils.GenerateJWT(&user)
	if err != nil {
		return "", fmt.Errorf("gagal generate token: %v", err)
	}
	refreshToken, err := utils.GenerateRefreshToken(&user)
	if err != nil {
		return "", fmt.Errorf("gagal generate refresh token: %v", err)
	}

	// ─── Perbarui metadata login ──────────────────────────────────────────────
	now := time.Now()
	config.DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at":    now,
		"last_activity_at": now,
		"last_ip":          c.ClientIP(),
	})
	config.DB.Create(&models.RefreshToken{
		UserID:    user.ID,
		TokenHash: utils.HashToken(refreshToken),
		ExpiresAt: now.Add(7 * 24 * time.Hour),
	})

	isProd := config.AppConfig.GinMode == "release"
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("refresh_token", refreshToken, 7*24*3600, "/", "", isProd, true)

	models.CreateAuditLog(config.DB, &user.ID, models.AuditActionLogin, models.AuditStatusSuccess,
		c.ClientIP(), c.GetHeader("User-Agent"),
		fmt.Sprintf("SSO Login berhasil: NIP=%s, Email=%s", masterNip, masterEmail), nil)

	return token, nil
}
