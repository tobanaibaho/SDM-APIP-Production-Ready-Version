package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
	"sdm-apip-backend/utils"
	"time"
)

func main() {
	// Command line flags
	clearFlag := flag.Bool("clear", false, "Clear all non-admin users before seeding (REQUIRES CONFIRM_CLEAR_USERS=YES)")
	clearOnlyFlag := flag.Bool("clear-only", false, "Clear all non-admin users WITHOUT reseeding (REQUIRES CONFIRM_CLEAR_USERS=YES)")
	statsFlag := flag.Bool("stats", false, "Show user account statistics only")
	flag.Parse()

	// 1️⃣ PARANOID SAFETY SWITCH (WAJIB)
	if os.Getenv("ALLOW_USER_SEEDING") != "true" {
		logger.Fatal("❌ User seeding disabled (set ALLOW_USER_SEEDING=true)")
	}

	// 2️⃣ Check dangerous flags
	if (*clearFlag || *clearOnlyFlag) && os.Getenv("CONFIRM_CLEAR_USERS") != "YES" {
		logger.Fatal("❌ To use --clear or --clear-only, you MUST set CONFIRM_CLEAR_USERS=YES environment variable")
	}

	// Load configuration
	config.LoadConfig()

	// Connect to database
	config.ConnectDatabase()
	db := config.DB

	// 3️⃣ Delay + Warning
	if !*statsFlag {
		logger.Warn("⚠️  ===================================================")
		logger.Warn("⚠️  WARNING: STARTING USER SEEDING OPERATION")
		if *clearFlag || *clearOnlyFlag {
			logger.Warn("⚠️  DANGER: CLEAR FLAG DETECTED! THIS WILL DELETE DATA!")
		}
		logger.Warn("⚠️  This operation may modify database records")
		logger.Warn("⚠️  Press Ctrl+C within 5 seconds to abort")
		logger.Warn("⚠️  ===================================================")
		time.Sleep(5 * time.Second)
	}

	logger.Info("═══════════════════════════════════════════════════")
	logger.Info("     SDM APIP - User Account Seeder")
	logger.Info("═══════════════════════════════════════════════════")
	log.Println()

	// Show stats only
	if *statsFlag {
		utils.GetUserAccountStats()
		return
	}

	// AUDIT LOG START
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}

	// Clear existing users if flag is set
	if *clearFlag || *clearOnlyFlag {
		logger.Warn("⚠️  Clearing existing user accounts...")
		if err := utils.ClearAllUsers(); err != nil {
			// Log failure
			models.CreateAuditLog(db, nil, models.AuditActionUserSeed, models.AuditStatusFailed, hostname, "SEED_CLI", fmt.Sprintf("Failed to clear users: %v", err), nil)
			logger.Fatal("Failed to clear users: %v", err)
		}

		if *clearOnlyFlag {
			logger.Info("🧹 Clear-only mode active. Skipping seeding.")

			// Audit Log (Success - Clear Only)
			models.CreateAuditLog(
				db,
				nil,
				models.AuditActionUserSeed,
				models.AuditStatusSuccess,
				hostname,
				"SEED_CLI",
				fmt.Sprintf("User clearing completed (Clear Only). Hostname: %s", hostname),
				nil,
			)

			log.Println()
			utils.GetUserAccountStats()
			return
		}
	}

	// Seed users from SDM data
	if err := utils.SeedUsersFromSDM(); err != nil {
		models.CreateAuditLog(db, nil, models.AuditActionUserSeed, models.AuditStatusFailed, hostname, "SEED_CLI", fmt.Sprintf("Failed to seed users: %v", err), nil)
		logger.Fatal("Failed to seed users: %v", err)
	}

	log.Println()
	log.Println("═══════════════════════════════════════════════════")

	// 4️⃣ Audit Log (Success)
	flagsUsed := "none"
	if *clearFlag {
		flagsUsed = "clear"
	}

	models.CreateAuditLog(
		db,
		nil,
		models.AuditActionUserSeed,
		models.AuditStatusSuccess,
		hostname,
		"SEED_CLI",
		fmt.Sprintf("User seeding completed via CLI. Flags: %s, Hostname: %s", flagsUsed, hostname),
		nil,
	)
	logger.Info("📋 Audit log created for seeding operation")

	// Show final statistics
	log.Println()
	utils.GetUserAccountStats()
}
