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

// JWTAuthMiddleware memvalidasi token JWT
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Tidak diizinkan", "Header otorisasi diperlukan")
			c.Abort()
			return
		}

		// Periksa format token Bearer
		parts := strings.Fields(authHeader)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Tidak diizinkan", "Format header otorisasi tidak valid")
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Tidak diizinkan", "Token tidak valid atau sudah kedaluwarsa")
			c.Abort()
			return
		}

		// Simpan informasi pengguna di dalam context
		c.Set("user_id", claims.UserID)
		c.Set("nip", claims.NIP)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		// Manajemen Sesi: Update LastActivityAt dan cek inaktivitas (8 jam = 1 hari kerja)
		var user models.User
		if err := config.DB.First(&user, claims.UserID).Error; err == nil {
			if user.LastActivityAt != nil && time.Since(*user.LastActivityAt) > 8*time.Hour {
				utils.ErrorResponse(c, http.StatusUnauthorized, "Sesi kedaluwarsa", "Waktu tidak aktif habis. Harap login kembali.")
				c.Abort()
				return
			}

			// Perbarui aktivitas terakhir
			now := time.Now()
			config.DB.Model(&user).Update("last_activity_at", &now)
		}

		c.Next()
	}
}

// GetUserIDFromContext mengambil ID pengguna dari gin context dengan aman
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

// GetRoleFromContext mengambil peran (role) dari gin context dengan aman
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
