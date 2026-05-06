package utils

import (
	"fmt"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
)

// SeedUsersFromSDM membuat akun pengguna yang terverifikasi dari data SDM yang sudah ada
func SeedUsersFromSDM() error {
	db := config.DB

	// Ambil semua data SDM
	var sdmList []models.SDM
	if err := db.Find(&sdmList).Error; err != nil {
		return fmt.Errorf("Gagal mengambil data SDM: %w", err)
	}

	if len(sdmList) == 0 {
		logger.Warn("⚠️  No SDM data found. Please import SDM data first.")
		return nil
	}

	successCount := 0
	skipCount := 0

	logger.Info("🌱 Starting user account seeding from SDM data...")

	for _, sdm := range sdmList {
		// Cek apakah pengguna sudah ada
		var existingUser models.User
		if err := db.Where("nip = ?", sdm.NIP).First(&existingUser).Error; err == nil {
			// Pengguna sudah ada, lewati
			skipCount++
			continue
		}

		// Create new user account
		nip := sdm.NIP
		user := models.User{
			NIP:    &nip,
			Email:  sdm.Email,
			RoleID: models.RoleUser,     // Peran bawaan: pengguna (bukan admin)
			Status: models.StatusActive, // Aktifkan (terverifikasi)
		}

		if err := db.Create(&user).Error; err != nil {
			logger.Error("❌ Failed to create user for NIP %s: %v", sdm.NIP, err)
			continue
		}

		successCount++
	}

	logger.Info("✅ User seeding completed!")
	logger.Info("   - Created: %d users", successCount)
	logger.Info("   - Skipped: %d users (already exist)", skipCount)
	logger.Info("   - Total SDM records: %d", len(sdmList))
	logger.Info("")
	logger.Info("📋 User Account Summary:")
	logger.Info("   - Semua akun diatur ke status 'aktif' (terverifikasi)")
	logger.Info("   - Semua akun memiliki peran 'user' (bukan admin)")
	logger.Info("   - Pengguna dibuat tanpa kata sandi (harus diatur via Lupa Password)")

	return nil
}

// ClearAllUsers menghapus semua pengguna non-admin (untuk keperluan pengujian)
func ClearAllUsers() error {
	db := config.DB

	// Hapus hanya pengguna dengan role_id = 2 (pengguna biasa, bukan admin)
	result := db.Where("role_id = ?", models.RoleUser).Delete(&models.User{})
	if result.Error != nil {
		return fmt.Errorf("Gagal menghapus pengguna: %w", result.Error)
	}

	logger.Info("🗑️  Cleared %d user accounts (admins preserved)", result.RowsAffected)
	return nil
}

// GetUserAccountStats mengembalikan statistik tentang akun pengguna
func GetUserAccountStats() {
	db := config.DB

	var totalUsers int64
	var activeUsers int64
	var pendingUsers int64
	var inactiveUsers int64

	db.Model(&models.User{}).Where("role_id = ?", models.RoleUser).Count(&totalUsers)
	db.Model(&models.User{}).Where("role_id = ? AND status = ?", models.RoleUser, models.StatusActive).Count(&activeUsers)
	db.Model(&models.User{}).Where("role_id = ? AND status = ?", models.RoleUser, models.StatusPendingVerification).Count(&pendingUsers)
	db.Model(&models.User{}).Where("role_id = ? AND status = ?", models.RoleUser, models.StatusInactive).Count(&inactiveUsers)

	logger.Info("📊 User Account Statistics:")
	logger.Info("   - Total Users: %d", totalUsers)
	logger.Info("   - Active (Verified): %d", activeUsers)
	logger.Info("   - Pending: %d", pendingUsers)
	logger.Info("   - Inactive: %d", inactiveUsers)
}
