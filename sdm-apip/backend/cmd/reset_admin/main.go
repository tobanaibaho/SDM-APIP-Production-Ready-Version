package main

import (
	"flag"
	"fmt"
	"os"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	// Parse command-line flags
	emergencyReset := flag.Bool("emergency-reset", false, "REQUIRED: Confirm this is an emergency password reset")
	flag.Parse()

	// PARANOID SAFETY SWITCH: Require explicit environment variable
	if os.Getenv("ALLOW_EMERGENCY_RESET") != "true" {
		logger.Fatal("❌ Emergency reset disabled (ALLOW_EMERGENCY_RESET=true required)")
		os.Exit(1)
	}

	// Require explicit emergency flag
	if !*emergencyReset {
		logger.Error("❌ EMERGENCY FLAG REQUIRED")
		logger.Error("❌ This tool is for EMERGENCY USE ONLY")
		logger.Error("❌ Usage: ALLOW_EMERGENCY_RESET=true go run cmd/reset_admin/main.go --emergency-reset")
		logger.Error("❌ For normal admin resets, use the secure API endpoint:")
		logger.Error("❌   POST /api/admin/secure-reset/request")
		logger.Error("❌   POST /api/admin/secure-reset/confirm")
		os.Exit(1)
	}

	// ⚠️  DEPRECATION WARNING ⚠️
	// This CLI tool is DEPRECATED and should ONLY be used for emergency/disaster recovery
	// For normal admin password resets, use the secure API endpoint:
	// POST /api/admin/secure-reset/request (protected by JWT + MFA)
	// POST /api/admin/secure-reset/confirm
	logger.Warn("⚠️  ========== DEPRECATION WARNING ==========")
	logger.Warn("⚠️  This CLI reset tool is DEPRECATED!")
	logger.Warn("⚠️  Use the secure API endpoint instead:")
	logger.Warn("⚠️    POST /api/admin/secure-reset/request")
	logger.Warn("⚠️    POST /api/admin/secure-reset/confirm")
	logger.Warn("⚠️  ==========================================")
	logger.Info("")
	logger.Info("⚠️  This tool should ONLY be used in emergency situations.")
	logger.Info("⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...")
	logger.Info("")

	// Give user time to cancel
	time.Sleep(5 * time.Second)

	// 1. Load Config & Connect DB
	if err := config.LoadConfig(); err != nil {
		logger.Fatal("❌ Configuration error: %v", err)
	}

	if err := config.ConnectDatabase(); err != nil {
		logger.Fatal("❌ Database connection failed: %v", err)
	}
	db := config.DB

	logger.Info("🔧 Starting Admin Password Reset Tool...")

	// 2. Load Admin Data from Environment Variables (NO HARDCODED CREDENTIALS)
	adminNIP := os.Getenv("EMERGENCY_RESET_NIP")
	username := os.Getenv("EMERGENCY_RESET_USERNAME")
	email := os.Getenv("EMERGENCY_RESET_EMAIL")
	newPassword := os.Getenv("EMERGENCY_RESET_PASSWORD")

	// Validate required environment variables
	if adminNIP == "" || username == "" || email == "" || newPassword == "" {
		logger.Fatal("❌ Missing required environment variables:")
		logger.Fatal("   EMERGENCY_RESET_NIP")
		logger.Fatal("   EMERGENCY_RESET_USERNAME")
		logger.Fatal("   EMERGENCY_RESET_EMAIL")
		logger.Fatal("   EMERGENCY_RESET_PASSWORD")
		logger.Fatal("")
		logger.Fatal("Example usage:")
		logger.Fatal("   EMERGENCY_RESET_NIP=000000000000000001 \\")
		logger.Fatal("   EMERGENCY_RESET_USERNAME=admin \\")
		logger.Fatal("   EMERGENCY_RESET_EMAIL=admin@example.com \\")
		logger.Fatal("   EMERGENCY_RESET_PASSWORD='YourSecurePassword123!' \\")
		logger.Fatal("   go run cmd/reset_admin/main.go --emergency-reset")
	}

	logger.Info("📋 Target Admin:")
	logger.Info("   NIP: %s", adminNIP)
	logger.Info("   Username: %s", username)
	logger.Info("   Email: %s", email)
	// ❌ DO NOT PRINT PASSWORD
	logger.Info("   Password: [REDACTED FOR SECURITY]")

	// 3. Hash New Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		logger.Fatal("❌ Failed to hash password: %v", err)
	}

	// 4. Update or Create Admin User
	var user models.User
	result := db.Where("nip = ?", adminNIP).First(&user)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			logger.Warn("⚠️ Admin user not found, creating new one...")
			// Must ensure SDM entry exists first
			var sdm models.SDM
			if err := db.Where("nip = ?", adminNIP).First(&sdm).Error; err != nil {
				// Create SDM if not exists
				sdm = models.SDM{
					NIP:       adminNIP,
					Nama:      "Administrator",
					Email:     email,
					Jabatan:   "System Administrator",
					UnitKerja: "IT Department",
				}
				if err := db.Create(&sdm).Error; err != nil {
					logger.Fatal("❌ Failed to create SDM record: %v", err)
				}
			}

			user = models.User{
				NIP:      &adminNIP,
				Username: &username,
				Email:    email,
				Password: string(hashedPassword),
				RoleID:   models.RoleSuperAdmin,
				Status:   models.StatusActive,
			}
			if err := db.Create(&user).Error; err != nil {
				logger.Fatal("❌ Failed to create admin user: %v", err)
			}
			logger.Info("✅ Admin user created successfully")
		} else {
			logger.Fatal("❌ Database error: %v", result.Error)
		}
	} else {
		// User exists, update password
		user.Password = string(hashedPassword)
		user.RoleID = models.RoleSuperAdmin
		user.Status = models.StatusActive

		if err := db.Save(&user).Error; err != nil {
			logger.Fatal("❌ Failed to update admin user: %v", err)
		}
		logger.Info("✅ Admin password updated successfully")
	}

	// AUDIT LOGGING: Record emergency reset
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}

	auditLog := models.AuditLog{
		UserID:       nil, // CLI has no authenticated user
		Action:       "PASSWORD_RESET_CLI",
		TargetUserID: &user.ID,
		IPAddress:    hostname,
		UserAgent:    "EMERGENCY_CLI",
		Status:       models.AuditStatusSuccess,
		Details:      fmt.Sprintf("Emergency password reset via CLI for NIP: %s, Username: %s, Hostname: %s", adminNIP, username, hostname),
	}

	if err := db.Create(&auditLog).Error; err != nil {
		logger.Warn("⚠️ Failed to create audit log: %v", err)
	} else {
		logger.Info("📋 Audit log created successfully")
	}

	// ❌ DO NOT PRINT PASSWORD
	logger.Info("✅ Emergency password reset completed successfully")
	logger.Info("⚠️  Password has been set (not displayed for security)")
	logger.Warn("⚠️  IMPORTANT: Change this password immediately using the secure API endpoint")
}
