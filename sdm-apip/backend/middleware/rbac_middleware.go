package middleware

import (
	"net/http"

	"sdm-apip-backend/models"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// RBACMiddleware validates user role access
func RBACMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRoleFromContext(c)

		if role == "" {
			utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "Role not found in token")
			c.Abort()
			return
		}

		// Check if user role is in allowed roles
		allowed := false
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				allowed = true
				break
			}
		}

		if !allowed {
			utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "You don't have permission to access this resource")
			c.Abort()
			return
		}

		c.Next()
	}
}

// SuperAdminOnly is a shortcut for super admin access only
func SuperAdminOnly() gin.HandlerFunc {
	return RBACMiddleware(models.RoleNameSuperAdmin)
}

// UserOnly is a shortcut for user-only access
func UserOnly() gin.HandlerFunc {
	return RBACMiddleware(models.RoleNameUser, models.RoleNameSuperAdmin)
}

// HasRole checks if user has a specific role
func HasRole(role string) gin.HandlerFunc {
	return RBACMiddleware(role)
}

// HasAnyRole checks if user has any of the specified roles
func HasAnyRole(roles ...string) gin.HandlerFunc {
	return RBACMiddleware(roles...)
}
