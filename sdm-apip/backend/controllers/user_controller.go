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

// UserController menangani operasi manajemen pengguna
type UserController struct {
	userService services.IUserService
}

// NewUserController membuat controller pengguna baru
func NewUserController(us services.IUserService) *UserController {
	return &UserController{
		userService: us,
	}
}

// GetAll mengembalikan semua pengguna dengan paginasi
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

	// PANGGIL SERVICE (Yang sudah berisi perbaikan penggabungan nama)
	users, total, err := uc.userService.GetAll(page, perPage, search, status, sortBy, order)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil pengguna", err.Error())
		return
	}

	// Konversi ke respons
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

// GetByID mengembalikan satu pengguna berdasarkan ID
// GET /api/admin/users/:id
func (uc *UserController) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID tidak valid", "ID pengguna tidak valid")
		return
	}

	var user models.User
	if err := config.DB.Preload("Role").First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Pengguna tidak ditemukan", "Tidak ada pengguna yang ditemukan dengan ID tersebut")
		return
	}

	// Ambil data SDM
	var sdm models.SDM
	if user.NIP != nil {
		if err := config.DB.Where("TRIM(nip) = TRIM(?)", *user.NIP).First(&sdm).Error; err == nil {
			user.Name = sdm.Nama
			user.Foto = sdm.Foto
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		user.Name = *user.Username
	}

	utils.SuccessResponse(c, http.StatusOK, "User retrieved", gin.H{
		"user": user.ToResponse(),
		"sdm":  sdm.ToResponse(),
	})
}

// UpdateStatus memperbarui status pengguna
// PATCH /api/admin/users/:id/status
func (uc *UserController) UpdateStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID tidak valid", "ID pengguna tidak valid")
		return
	}

	var user models.User
	if err := config.DB.First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Pengguna tidak ditemukan", "Tidak ada pengguna yang ditemukan dengan ID tersebut")
		return
	}

	var req struct {
		Status models.UserStatus `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	// Validasi status menggunakan konstanta
	if req.Status != models.StatusPendingVerification && req.Status != models.StatusEmailVerified && req.Status != models.StatusActive && req.Status != models.StatusInactive {
		utils.ErrorResponse(c, http.StatusBadRequest, "Status tidak valid", "Status harus pending_verification, email_verified, active, atau inactive")
		return
	}

	if err := config.DB.Model(&user).Update("status", req.Status).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memperbarui status", err.Error())
		return
	}

	config.DB.Preload("Role").First(&user, id)
	if user.NIP != nil {
		var sdm models.SDM
		if err := config.DB.Where("nip = ?", *user.NIP).First(&sdm).Error; err == nil {
			user.Name = sdm.Nama
			user.Foto = sdm.Foto
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		user.Name = *user.Username
	}
	utils.SuccessResponse(c, http.StatusOK, "User status updated successfully", user.ToResponse())
}

// UpdateRole memperbarui peran pengguna
// PATCH /api/super-admin/users/:id/role
func (uc *UserController) UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID tidak valid", "ID pengguna tidak valid")
		return
	}

	var user models.User
	if err := config.DB.First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Pengguna tidak ditemukan", "Tidak ada pengguna yang ditemukan dengan ID tersebut")
		return
	}

	var req struct {
		RoleID models.RoleID `json:"role_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	// KRITIS: Cegah pembuatan Super Admin tambahan
	// Peran Super Admin (role_id = 1) hanya boleh ada untuk pemilik sistem
	if req.RoleID == models.RoleSuperAdmin {
		utils.ErrorResponse(c, http.StatusForbidden, "Dilarang", "Tidak dapat menetapkan peran admin melalui API. Admin dipesan untuk pemilik sistem.")
		return
	}

	// Validasi peran ada
	var role models.Role
	if err := config.DB.First(&role, req.RoleID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Peran tidak valid", "Peran tidak ditemukan")
		return
	}

	if err := config.DB.Model(&user).Update("role_id", req.RoleID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memperbarui peran", err.Error())
		return
	}

	config.DB.Preload("Role").First(&user, id)
	if user.NIP != nil {
		var sdm models.SDM
		if err := config.DB.Where("nip = ?", *user.NIP).First(&sdm).Error; err == nil {
			user.Name = sdm.Nama
			user.Foto = sdm.Foto
		}
	} else if user.RoleID == models.RoleSuperAdmin && user.Username != nil {
		user.Name = *user.Username
	}
	utils.SuccessResponse(c, http.StatusOK, "User role updated successfully", user.ToResponse())
}

// Delete menghapus pengguna
// DELETE /api/admin/users/:id
func (uc *UserController) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID tidak valid", "ID pengguna tidak valid")
		return
	}

	var user models.User
	if err := config.DB.First(&user, uint(id)).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Pengguna tidak ditemukan", "Tidak ada pengguna yang ditemukan dengan ID tersebut")
		return
	}

	// Cegah penghapusan pengguna admin
	if user.RoleID == models.RoleSuperAdmin {
		// Cek apakah ini admin terakhir
		var adminCount int64
		config.DB.Model(&models.User{}).Where("role_id = ?", models.RoleSuperAdmin).Count(&adminCount)
		if adminCount <= 1 {
			utils.ErrorResponse(c, http.StatusForbidden, "Tidak dapat menghapus pengguna", "Tidak dapat menghapus pengguna admin terakhir")
			return
		}
	}

	// Mulai transaksi
	tx := config.DB.Begin()
	defer tx.Rollback() // Rollback aman jika ada kegagalan

	// Log untuk debugging menggunakan logger terpusat
	nipStr := "N/A"
	if user.NIP != nil {
		nipStr = *user.NIP
	}
	logger.Info("🗑️ Deleting user ID: %d, NIP: '%s'", id, nipStr)

	// 1. Hapus email di tabel master SDM (jika NIP ada)
	if user.NIP != nil && *user.NIP != "" {
		if err := tx.Exec("UPDATE sdm_apip SET email = '-' WHERE nip = ?", *user.NIP).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus email SDM", err.Error())
			return
		}
	}

	// 2. Hapus token verifikasi
	if err := tx.Where("user_id = ?", user.ID).Delete(&models.VerificationToken{}).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus token", err.Error())
		return
	}

	// 3. Hapus pengguna
	if err := tx.Delete(&user).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus pengguna", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal melakukan commit transaksi", err.Error())
		return
	}
	logger.Info("✅ User %s deleted", nipStr)

	utils.SuccessResponse(c, http.StatusOK, "User deleted successfully", nil)
}
