package middleware

import (
	"net/http"

	"sdm-apip-backend/models"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// RBACMiddleware memvalidasi akses peran (role) pengguna
func RBACMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRoleFromContext(c)

		if role == "" {
			utils.ErrorResponse(c, http.StatusForbidden, "Dilarang", "Peran tidak ditemukan dalam token")
			c.Abort()
			return
		}

		// Periksa apakah peran pengguna ada di dalam daftar peran yang diizinkan
		allowed := false
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				allowed = true
				break
			}
		}

		if !allowed {
			utils.ErrorResponse(c, http.StatusForbidden, "Dilarang", "Anda tidak memiliki izin untuk mengakses sumber daya ini")
			c.Abort()
			return
		}

		c.Next()
	}
}

// SuperAdminOnly adalah pintasan untuk akses khusus super admin
func SuperAdminOnly() gin.HandlerFunc {
	return RBACMiddleware(models.RoleNameSuperAdmin)
}

// UserOnly adalah pintasan untuk akses pengguna biasa (termasuk super admin)
func UserOnly() gin.HandlerFunc {
	return RBACMiddleware(models.RoleNameUser, models.RoleNameSuperAdmin)
}

// HasRole memeriksa apakah pengguna memiliki peran spesifik tertentu
func HasRole(role string) gin.HandlerFunc {
	return RBACMiddleware(role)
}

// HasAnyRole memeriksa apakah pengguna memiliki salah satu dari peran yang ditentukan
func HasAnyRole(roles ...string) gin.HandlerFunc {
	return RBACMiddleware(roles...)
}
