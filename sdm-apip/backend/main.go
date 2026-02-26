package main

import (
	"flag"
	"os"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
	"sdm-apip-backend/routes"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	// CLI Flags
	migrate := flag.Bool("migrate", false, "Run database migrations and exit")
	flag.Parse()

	// Load configuration (Fail-fast)
	if err := config.LoadConfig(); err != nil {
		logger.Fatal("❌ Configuration error: %v", err)
	}

	// Initialize Logger with file support
	if err := logger.SetupLogger(config.AppConfig.LogFilePath); err != nil {
		logger.Warn("⚠️ Failed to initialize file logging: %v", err)
	}

	// Connect to database (Fail-fast)
	if err := config.ConnectDatabase(); err != nil {
		logger.Fatal("❌ Database connection failed: %v", err)
	}

	// Migrate database if flag is provided
	if *migrate {
		logger.Info("🔄 Running database migrations (SQL-based)...")

		// Run SQL migration from file
		migrationPath := config.AppConfig.DBMigrationPath
		if err := config.RunSQLFile(migrationPath); err != nil {
			logger.Fatal("❌ Migration failed: %v", err)
		}

		logger.Info("✅ Database migrations completed successfully!")
		os.Exit(0)
	}

	// Set Gin mode
	gin.SetMode(config.AppConfig.GinMode)

	// Create router
	router := gin.Default()

	// Trust proxies (for deployment behind reverse proxy)
	if err := router.SetTrustedProxies(nil); err != nil {
		logger.Warn("⚠️ Warning: Failed to set trusted proxies: %v", err)
	}

	// Setup routes
	routes.SetupRoutes(router)

	// Ensure Admin User exists (Bootstrap)
	bootstrapAdmin(config.DB)

	// Start server
	logger.Info("🚀 SDM APIP Backend starting on port %s", config.AppConfig.ServerPort)
	logger.Info("📚 API Documentation: http://localhost:%s/api/health", config.AppConfig.ServerPort)

	if err := router.Run(":" + config.AppConfig.ServerPort); err != nil {
		logger.Fatal("Failed to start server: %v", err)
	}
}

// bootstrapAdmin ensures that at least one SuperAdmin exists.
// Password is loaded from ADMIN_DEFAULT_PASSWORD env var and hashed at runtime.
func bootstrapAdmin(db *gorm.DB) {
	logger.Info("🛡️ Checking admin status...")

	// Load password from ENV — never hardcode credentials in source code
	plainPassword := config.AppConfig.AdminDefaultPassword
	if plainPassword == "" {
		if config.AppConfig.GinMode == "release" {
			logger.Warn("⚠️ SECURITY: ADMIN_DEFAULT_PASSWORD is not set. Admin bootstrap skipped for safety.")
			return
		}
		// Development fallback only
		plainPassword = "admin123"
		logger.Warn("⚠️ DEV MODE: Using default admin password 'admin123'. Set ADMIN_DEFAULT_PASSWORD in production!")
	}

	// Hash password at runtime (never store plaintext or hardcoded hashes)
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		logger.Warn("⚠️ Failed to hash admin password: %v", err)
		return
	}
	hashedPassword := string(hashedBytes)

	var admin models.User
	err = db.Where("username = ? OR role_id = ?", "admin", models.RoleSuperAdmin).First(&admin).Error
	if err != nil {
		logger.Info("👤 Admin not found. Creating default SuperAdmin...")
		username := "admin"
		admin = models.User{
			Username: &username,
			Password: hashedPassword,
			RoleID:   models.RoleSuperAdmin,
			Status:   models.StatusActive,
			Email:    config.AppConfig.SMTPFrom,
		}
		if err := db.Create(&admin).Error; err != nil {
			logger.Warn("⚠️ Failed to bootstrap admin: %v", err)
		} else {
			logger.Info("✅ Default admin created.")
		}
	} else {
		// Ensure the 'admin' user is active and has the correct role
		updates := map[string]interface{}{
			"status":  models.StatusActive,
			"role_id": models.RoleSuperAdmin,
		}
		// Only update password if it's empty (e.g. fresh DB)
		if admin.Password == "" {
			updates["password"] = hashedPassword
		}
		db.Model(&admin).Updates(updates)
		logger.Info("✅ Admin status verified.")
	}
}
