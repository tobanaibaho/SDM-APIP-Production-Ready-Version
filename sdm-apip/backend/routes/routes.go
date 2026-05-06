package routes

import (
	"sdm-apip-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine) {
	// Middleware global
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.SecurityHeaders())

	api := router.Group("/api")
	{
		// Pengecekan status (Health check)
		api.GET("/health", HealthCheck)
		api.GET("/health/email", TestEmailConnection)

		RegisterAuthRoutes(api)
		RegisterUserRoutes(api)
		RegisterAdminRoutes(api)
	}
}
