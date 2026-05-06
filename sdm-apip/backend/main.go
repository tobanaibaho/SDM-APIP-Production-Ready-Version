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

// bootstrapAdmin memastikan setidaknya satu SuperAdmin ada.
// Password dimuat dari variabel lingkungan ADMIN_DEFAULT_PASSWORD dan di-hash saat runtime.
func bootstrapAdmin(db *gorm.DB) {
	logger.Info("🛡️ Checking admin status...")

	// Muat password dari ENV — jangan pernah menyimpan kredensial di kode sumber
	plainPassword := config.AppConfig.AdminDefaultPassword
	if plainPassword == "" {
		if config.AppConfig.GinMode == "release" {
			logger.Warn("⚠️ SECURITY: ADMIN_DEFAULT_PASSWORD is not set. Admin bootstrap skipped for safety.")
			return
		}
		// Cadangan untuk pengembangan saja
		plainPassword = "admin123"
		logger.Warn("⚠️ DEV MODE: Using default admin password 'admin123'. Set ADMIN_DEFAULT_PASSWORD in production!")
	}

	// Hash password saat runtime (jangan simpan teks biasa atau hash yang di-hardcode)
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
		// Pastikan pengguna 'admin' aktif dan memiliki peran yang benar
		updates := map[string]interface{}{
			"status":  models.StatusActive,
			"role_id": models.RoleSuperAdmin,
		}
		// Perbarui password hanya jika kosong (misalnya DB baru)
		if admin.Password == "" {
			updates["password"] = hashedPassword
		}
		db.Model(&admin).Updates(updates)
		logger.Info("✅ Admin status verified.")
	}
}
