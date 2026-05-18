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
	// Flag CLI
	migrate := flag.Bool("migrate", false, "Run database migrations and exit")
	flag.Parse()

	// Muat konfigurasi (gagal cepat jika error)
	if err := config.LoadConfig(); err != nil {
		logger.Fatal("❌ Configuration error: %v", err)
	}

	// Inisialisasi Logger dengan dukungan file
	if err := logger.SetupLogger(config.AppConfig.LogFilePath); err != nil {
		logger.Warn("⚠️ Failed to initialize file logging: %v", err)
	}

	// Hubungkan ke database (gagal cepat jika error)
	if err := config.ConnectDatabase(); err != nil {
		logger.Fatal("❌ Database connection failed: %v", err)
	}

	// Jalankan migrasi database jika flag diberikan
	if *migrate {
		logger.Info("🔄 Running database migrations (SQL-based)...")

		// Jalankan migrasi SQL dari file
		migrationPath := config.AppConfig.DBMigrationPath
		if err := config.RunSQLFile(migrationPath); err != nil {
			logger.Fatal("❌ Migration failed: %v", err)
		}

		logger.Info("✅ Database migrations completed successfully!")
		os.Exit(0)
	}

	// Atur mode Gin
	gin.SetMode(config.AppConfig.GinMode)

	// Buat router
	router := gin.Default()

	// Percayai proxy (untuk deployment di balik reverse proxy)
	if err := router.SetTrustedProxies(nil); err != nil {
		logger.Warn("⚠️ Warning: Failed to set trusted proxies: %v", err)
	}

	// Konfigurasi rute
	routes.SetupRoutes(router)

	// Pastikan Pengguna Admin ada (Bootstrap)
	bootstrapAdmin(config.DB)

	// Jalankan server
	logger.Info("🚀 SDM APIP Backend starting on port %s", config.AppConfig.ServerPort)
	logger.Info("📚 API Documentation: http://localhost:%s/api/health", config.AppConfig.ServerPort)

	if err := router.Run(":" + config.AppConfig.ServerPort); err != nil {
		logger.Fatal("Failed to start server: %v", err)
	}
}

// bootstrapAdmin memastikan setidaknya satu SuperAdmin ada saat server pertama kali dijalankan.
// Seluruh kredensial (username, email, password) WAJIB dimuat dari environment variable.
// Tidak ada credential yang boleh di-hardcode di kode sumber atau file SQL.
func bootstrapAdmin(db *gorm.DB) {
	logger.Info("🛣️ Checking admin bootstrap status...")

	// Ambil seluruh konfigurasi admin dari ENV — tidak ada hardcode
	plainPassword := config.AppConfig.AdminDefaultPassword
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminEmail := os.Getenv("ADMIN_EMAIL")

	// Fallback username & email hanya untuk mode dev
	if adminUsername == "" {
		if config.AppConfig.GinMode == "release" {
			logger.Warn("⚠️ SECURITY: ADMIN_USERNAME is not set. Admin bootstrap skipped for safety.")
			return
		}
		adminUsername = "admin"
		logger.Warn("⚠️ DEV MODE: ADMIN_USERNAME not set, using 'admin' as fallback.")
	}
	if adminEmail == "" {
		if config.AppConfig.GinMode == "release" {
			logger.Warn("⚠️ SECURITY: ADMIN_EMAIL is not set. Admin bootstrap skipped for safety.")
			return
		}
		// Di dev mode, gunakan SMTP_FROM jika tersedia, jika tidak pakai placeholder
		if config.AppConfig.SMTPFrom != "" {
			adminEmail = config.AppConfig.SMTPFrom
		} else {
			adminEmail = "admin@sdm-apip.local"
		}
		logger.Warn("⚠️ DEV MODE: ADMIN_EMAIL not set, using '%s' as fallback.", adminEmail)
	}
	if plainPassword == "" {
		if config.AppConfig.GinMode == "release" {
			logger.Warn("⚠️ SECURITY: ADMIN_DEFAULT_PASSWORD is not set. Admin bootstrap skipped for safety.")
			return
		}
		// Cadangan untuk pengembangan saja — DILARANG di production
		plainPassword = "admin123"
		logger.Warn("⚠️ DEV MODE: Using default admin password 'admin123'. Set ADMIN_DEFAULT_PASSWORD in .env!")
	}

	// Hash password saat runtime (jangan simpan teks biasa atau hash yang di-hardcode)
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		logger.Warn("⚠️ Failed to hash admin password: %v", err)
		return
	}
	hashedPassword := string(hashedBytes)

	var admin models.User
	err = db.Where("username = ? OR role_id = ?", adminUsername, models.RoleSuperAdmin).First(&admin).Error
	if err != nil {
		logger.Info("👤 Admin not found. Creating SuperAdmin from environment variables...")
		admin = models.User{
			Username: &adminUsername,
			Email:    adminEmail,
			Password: hashedPassword,
			RoleID:   models.RoleSuperAdmin,
			Status:   models.StatusActive,
		}
		if err := db.Create(&admin).Error; err != nil {
			logger.Warn("⚠️ Failed to bootstrap admin: %v", err)
		} else {
			logger.Info("✅ SuperAdmin '%s' created successfully.", adminUsername)
		}
	} else {
		// Admin sudah ada — hanya pastikan status & role benar
		updates := map[string]interface{}{
			"status":  models.StatusActive,
			"role_id": models.RoleSuperAdmin,
		}
		// Isi password hanya jika kolom kosong (misalnya DB baru tanpa password)
		if admin.Password == "" {
			updates["password"] = hashedPassword
		}
		db.Model(&admin).Updates(updates)
		logger.Info("✅ Admin status verified (username: %s).", adminUsername)
	}
}
