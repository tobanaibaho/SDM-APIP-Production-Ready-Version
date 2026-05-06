package routes

import (
	"time"

	"sdm-apip-backend/controllers"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/services"

	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(api *gin.RouterGroup) {
	authService := services.NewAuthService()
	authController := controllers.NewAuthController(authService)
	loginLimit := middleware.RateLimiter(5, 10*time.Second)

	auth := api.Group("/auth")
	{
		// Autentikasi Pengguna
		auth.POST("/login", loginLimit, authController.Login)
		auth.GET("/sso/login", authController.SSOInitiate)                  // SSO Bawaan (Kemenko)
		auth.GET("/sso/login/:provider", authController.SSOInitiate)        // SSO Multi-penyedia (Google, Microsoft)
		auth.GET("/sso/oidc-callback", authController.SSOOIDCCallback)      // Callback OIDC Bawaan
		auth.GET("/sso/callback/:provider", authController.SSOOIDCCallback) // Callback Multi-penyedia
		auth.POST("/sso/callback", loginLimit, authController.SSOCallback)  // Mock SSO (Hanya untuk tahap pengembangan/Dev)
		auth.POST("/register", loginLimit, authController.Register)
		auth.POST("/resend-verification", loginLimit, authController.ResendVerification)
		auth.POST("/verify-email", loginLimit, authController.VerifyEmail)
		auth.POST("/set-password", loginLimit, authController.SetPassword)
		auth.POST("/refresh-token", loginLimit, authController.RefreshToken)
		auth.POST("/forgot-password", loginLimit, authController.ForgotPassword)
		auth.POST("/reset-password", loginLimit, authController.ResetPassword)
		auth.POST("/logout", authController.Logout)

		// Autentikasi Super Admin
		superAdmin := auth.Group("/super-admin")
		{
			superAdmin.POST("/login", loginLimit, authController.SuperAdminLogin)
			superAdmin.POST("/forgot-password", loginLimit, authController.SuperAdminForgotPassword)
			superAdmin.POST("/reset-to-default", loginLimit, authController.SuperAdminResetToDefault)
		}

		// Rute MFA yang dilindungi
		mfa := auth.Group("/mfa")
		mfa.Use(middleware.JWTAuthMiddleware())
		{
			mfa.GET("/setup", authController.SetupMFA)
			mfa.POST("/enable", authController.EnableMFA)
			mfa.POST("/disable", authController.DisableMFA)
		}
	}
}
