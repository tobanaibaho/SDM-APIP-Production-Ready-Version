package utils

import (
	"fmt"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
)

// SeedUsersFromSDM creates verified user accounts from existing SDM data
func SeedUsersFromSDM() error {
	db := config.DB

	// Get all SDM records
	var sdmList []models.SDM
	if err := db.Find(&sdmList).Error; err != nil {
		return fmt.Errorf("failed to fetch SDM data: %w", err)
	}

	if len(sdmList) == 0 {
		logger.Warn("⚠️  No SDM data found. Please import SDM data first.")
		return nil
	}

	successCount := 0
	skipCount := 0

	logger.Info("🌱 Starting user account seeding from SDM data...")

	for _, sdm := range sdmList {
		// Check if user already exists
		var existingUser models.User
		if err := db.Where("nip = ?", sdm.NIP).First(&existingUser).Error; err == nil {
			// User already exists, skip
			skipCount++
			continue
		}

		// Create new user account
		nip := sdm.NIP
		user := models.User{
			NIP:    &nip,
			Email:  sdm.Email,
			RoleID: models.RoleUser,     // Default role: user (not admin)
			Status: models.StatusActive, // Set as active (verified)
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
	logger.Info("   - All accounts are set to 'active' status (verified)")
	logger.Info("   - All accounts have role 'user' (not admin)")
	logger.Info("   - Users created without password (must set via Forgot Password)")

	return nil
}

// ClearAllUsers removes all non-admin users (for testing purposes)
func ClearAllUsers() error {
	db := config.DB

	// Delete only users with role_id = 2 (regular users, not admins)
	result := db.Where("role_id = ?", models.RoleUser).Delete(&models.User{})
	if result.Error != nil {
		return fmt.Errorf("failed to clear users: %w", result.Error)
	}

	logger.Info("🗑️  Cleared %d user accounts (admins preserved)", result.RowsAffected)
	return nil
}

// GetUserAccountStats returns statistics about user accounts
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
