package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// UserController handles user management operations
type UserController struct {
	userService services.IUserService
}

// NewUserController creates a new user controller
func NewUserController(us services.IUserService) *UserController {
	return &UserController{
		userService: us,
	}
}

// GetAll returns all users with pagination
// GET /api/admin/users
func (uc *UserController) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPageStr := c.Query("limit")
	if perPageStr == "" {
		perPageStr = c.Query("per_page")
	}
	perPage, _ := strconv.Atoi(perPageStr)
	if perPage == 0 {
		perPage = 10
	}
	search := c.Query("search")
	status := c.Query("status")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	order := strings.ToLower(c.DefaultQuery("order", "desc"))

	// CALL THE SERVICE (Which contains the name-joining fix)
	users, total, err := uc.userService.GetAll(page, perPage, search, status, sortBy, order)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get users", err.Error())
		return
	}

	// Convert to response
	responseList := []models.UserResponse{}
	for _, u := range users {
		responseList = append(responseList, u.ToResponse())
	}

	totalPages := 0
	if perPage > 0 {
		totalPages = int(total) / perPage
		if int(total)%perPage > 0 {
			totalPages++
		}
	}

	utils.PaginatedSuccessResponse(c, http.StatusOK, "Users retrieved successfully", responseList, utils.Pagination{
		CurrentPage: page,
		PerPage:     perPage,
		TotalItems:  total,
		TotalPages:  totalPages,
	})
}

// GetByID returns a single user by ID
// GET /api/admin/users/:id
func (uc *UserController) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID", "Invalid user ID")
		return
	}

	var user models.User
	if err := config.DB.Preload("Role").First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", "No user found with the given ID")
		return
	}

	// Get SDM data
	var sdm models.SDM
	userResp := user.ToResponse()
	if user.NIP != nil {
		if err := config.DB.Where("nip = ?", *user.NIP).First(&sdm).Error; err == nil {
			userResp.Name = sdm.Nama
			userResp.Foto = sdm.Foto
			userResp.Jabatan = sdm.Jabatan
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		userResp.Name = *user.Username
	}

	utils.SuccessResponse(c, http.StatusOK, "User retrieved", gin.H{
		"user": userResp,
		"sdm":  sdm.ToResponse(),
	})
}

// UpdateStatus updates user status
// PATCH /api/admin/users/:id/status
func (uc *UserController) UpdateStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID", "Invalid user ID")
		return
	}

	var user models.User
	if err := config.DB.First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", "No user found with the given ID")
		return
	}

	var req struct {
		Status models.UserStatus `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Validate status using constants
	if req.Status != models.StatusPendingVerification && req.Status != models.StatusEmailVerified && req.Status != models.StatusActive && req.Status != models.StatusInactive {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid status", "Status must be pending_verification, email_verified, active, or inactive")
		return
	}

	if err := config.DB.Model(&user).Update("status", req.Status).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update status", err.Error())
		return
	}

	config.DB.Preload("Role").First(&user, id)

	userResp := user.ToResponse()
	if user.NIP != nil {
		var sdm models.SDM
		if err := config.DB.Where("nip = ?", *user.NIP).First(&sdm).Error; err == nil {
			userResp.Name = sdm.Nama
			userResp.Foto = sdm.Foto
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		userResp.Name = *user.Username
	}

	utils.SuccessResponse(c, http.StatusOK, "User status updated successfully", userResp)
}

// UpdateRole updates user role
// PATCH /api/super-admin/users/:id/role
func (uc *UserController) UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID", "Invalid user ID")
		return
	}

	var user models.User
	if err := config.DB.First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", "No user found with the given ID")
		return
	}

	var req struct {
		RoleID models.RoleID `json:"role_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// CRITICAL: Prevent creating additional Super Admins
	// Super Admin role (role_id = 1) should only exist for the system owner
	if req.RoleID == models.RoleSuperAdmin {
		utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "Cannot assign Admin role through API. Admin is reserved for the system owner.")
		return
	}

	// Validate role exists
	var role models.Role
	if err := config.DB.First(&role, req.RoleID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid role", "Role not found")
		return
	}

	if err := config.DB.Model(&user).Update("role_id", req.RoleID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update role", err.Error())
		return
	}

	config.DB.Preload("Role").First(&user, id)

	userResp := user.ToResponse()
	if user.NIP != nil {
		var sdm models.SDM
		if err := config.DB.Where("nip = ?", *user.NIP).First(&sdm).Error; err == nil {
			userResp.Name = sdm.Nama
			userResp.Foto = sdm.Foto
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		userResp.Name = *user.Username
	}

	utils.SuccessResponse(c, http.StatusOK, "User role updated successfully", userResp)
}

// Delete deletes a user
// DELETE /api/admin/users/:id
func (uc *UserController) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID", "Invalid user ID")
		return
	}

	var user models.User
	if err := config.DB.First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", "No user found with the given ID")
		return
	}

	// Prevent deleting admin users
	if user.RoleID == models.RoleSuperAdmin {
		// Check if this is the last admin
		var adminCount int64
		config.DB.Model(&models.User{}).Where("role_id = ?", models.RoleSuperAdmin).Count(&adminCount)
		if adminCount <= 1 {
			utils.ErrorResponse(c, http.StatusForbidden, "Cannot delete user", "Cannot delete the last admin user")
			return
		}
	}

	// Start transaction
	tx := config.DB.Begin()
	defer tx.Rollback() // Safe rollback on any failure

	// Log for debugging using centralized logger
	nipStr := "N/A"
	if user.NIP != nil {
		nipStr = *user.NIP
	}
	logger.Info("🗑️ Deleting user ID: %d, NIP: '%s'", id, nipStr)

	// 1. Clear email in SDM master table (if NIP exists)
	if user.NIP != nil && *user.NIP != "" {
		if err := tx.Exec("UPDATE sdm_apip SET email = '-' WHERE nip = ?", *user.NIP).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to clear SDM email", err.Error())
			return
		}
	}

	// 2. Delete verification tokens
	if err := tx.Where("user_id = ?", user.ID).Delete(&models.VerificationToken{}).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete tokens", err.Error())
		return
	}

	// 3. Delete user
	if err := tx.Delete(&user).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete user", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to commit transaction", err.Error())
		return
	}
	logger.Info("✅ User %s deleted", nipStr)

	utils.SuccessResponse(c, http.StatusOK, "User deleted successfully", nil)
}
