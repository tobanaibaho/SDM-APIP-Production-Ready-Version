package middleware

import (
	"net/http"
	"sdm-apip-backend/config"
	"sdm-apip-backend/models"
	"sdm-apip-backend/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// JWTAuthMiddleware validates JWT tokens
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "Authorization header required")
			c.Abort()
			return
		}

		// Check Bearer token format
		parts := strings.Fields(authHeader)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "Invalid or expired token")
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("nip", claims.NIP)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		// Session Management: Update LastActivityAt dan cek inaktivitas (8 jam = 1 hari kerja)
		var user models.User
		if err := config.DB.First(&user, claims.UserID).Error; err == nil {
			if user.LastActivityAt != nil && time.Since(*user.LastActivityAt) > 8*time.Hour {
				utils.ErrorResponse(c, http.StatusUnauthorized, "Session Expired", "Inactivity timeout. Please login again.")
				c.Abort()
				return
			}

			// Update last activity
			now := time.Now()
			config.DB.Model(&user).Update("last_activity_at", &now)
		}

		c.Next()
	}
}

// GetUserIDFromContext gets user ID from gin context safely
func GetUserIDFromContext(c *gin.Context) uint {
	val, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	userID, ok := val.(uint)
	if !ok {
		return 0
	}
	return userID
}

// GetRoleFromContext gets role from gin context safely
func GetRoleFromContext(c *gin.Context) string {
	val, exists := c.Get("role")
	if !exists {
		return ""
	}
	role, ok := val.(string)
	if !ok {
		return ""
	}
	return role
}
