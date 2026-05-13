package routes

import (
	"net/http"
	"time"

	"sdm-apip-backend/controllers"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// ssoOnly adalah handler yang menolak akses ke endpoint yang sudah dinonaktifkan.
// Endpoint login manual & registrasi ditutup — sistem hanya menggunakan SSO.
func ssoOnly(c *gin.Context) {
	utils.ErrorResponse(c, http.StatusForbidden,
		"Metode login ini dinonaktifkan",
		"Sistem hanya mengizinkan login melalui SSO (Single Sign-On). Silakan gunakan tombol login SSO di halaman utama.",
	)
	c.Abort()
}

func RegisterAuthRoutes(api *gin.RouterGroup) {
	authService := services.NewAuthService()
	authController := controllers.NewAuthController(authService)
	loginLimit := middleware.RateLimiter(5, 10*time.Second)

	auth := api.Group("/auth")
	{
		// ─── LOGIN MANUAL DINONAKTIFKAN ────────────────────────────────────────
		// Sistem sepenuhnya menggunakan SSO. Endpoint berikut ditutup dengan 403
		// agar tidak ada backdoor melalui API langsung.
		auth.POST("/login", ssoOnly)
		auth.POST("/register", ssoOnly)
		auth.POST("/verify-email", ssoOnly)
		auth.POST("/set-password", ssoOnly)
		auth.POST("/forgot-password", ssoOnly)
		auth.POST("/reset-password", ssoOnly)
		auth.POST("/resend-verification", ssoOnly)

		// ─── SSO (SATU-SATUNYA JALUR LOGIN UNTUK PEGAWAI) ─────────────────────
		// Hanya menggunakan SSO Internal Kemenko Infra
		auth.GET("/sso/login", authController.SSOInitiate)             // Memulai alur SSO
		auth.GET("/sso/oidc-callback", authController.SSOOIDCCallback) // Menerima callback dari IdP

		// ─── SESI ─────────────────────────────────────────────────────────────
		auth.POST("/refresh-token", loginLimit, authController.RefreshToken)
		auth.POST("/logout", authController.Logout)

		// ─── SUPER ADMIN (Jalur darurat terpisah — tidak terpengaruh SSO) ─────
		superAdmin := auth.Group("/super-admin")
		{
			superAdmin.POST("/login", loginLimit, authController.SuperAdminLogin)
			superAdmin.POST("/forgot-password", loginLimit, authController.SuperAdminForgotPassword)
			superAdmin.POST("/reset-password", loginLimit, authController.SuperAdminResetPassword)
		}

		// ─── MFA ──────────────────────────────────────────────────────────────
		mfa := auth.Group("/mfa")
		mfa.Use(middleware.JWTAuthMiddleware())
		{
			mfa.GET("/setup", authController.SetupMFA)
			mfa.POST("/enable", authController.EnableMFA)
			mfa.POST("/disable", authController.DisableMFA)
		}
	}
}
