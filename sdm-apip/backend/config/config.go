package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sdm-apip-backend/logger"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

type Config struct {
	DBHost          string
	DBPort          string
	DBUser          string
	DBPassword      string
	DBName          string
	DBSSLMode       string
	DBMigrationPath string

	JWTSecret             string
	JWTExpiryHours        int
	JWTRefreshSecret      string
	JWTRefreshExpiryHours int

	ServerPort     string
	GinMode        string
	AllowedOrigins []string

	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
	SMTPFromName string
	SMTPInsecure bool
	LogFilePath  string

	FrontendURL string

	AdminDefaultPassword string // Dimuat dari variabel lingkungan ADMIN_DEFAULT_PASSWORD

	// SSO Internal Instansi (Kemenko Infra)
	SSOEnabled      bool
	SSOClientID     string
	SSOClientSecret string
	SSOIssuerURL    string
	SSORedirectURL  string
}

var AppConfig *Config
var DB *gorm.DB

func LoadConfig() error {
	err := godotenv.Load()
	if err != nil {
		logger.Warn("Peringatan: file .env tidak ditemukan, menggunakan environment variables bawaan")
	}

	// Parsing aman untuk masa kedaluwarsa JWT beserta validasinya
	jwtExpiry, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil || jwtExpiry <= 0 {
		logger.Warn("⚠️ JWT_EXPIRY_HOURS tidak valid, menggunakan default 24 jam")
		jwtExpiry = 24
	}

	// Parsing aman untuk masa kedaluwarsa Refresh Token JWT beserta validasinya
	jwtRefreshExpiry, err := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_HOURS", "168"))
	if err != nil || jwtRefreshExpiry <= 0 {
		logger.Warn("⚠️ JWT_REFRESH_EXPIRY_HOURS tidak valid, menggunakan default 168 jam (7 hari)")
		jwtRefreshExpiry = 168
	}

	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	AppConfig = &Config{
		DBHost:          getEnv("DB_HOST", ""),
		DBPort:          getEnv("DB_PORT", "5432"),
		DBUser:          getEnv("DB_USER", ""),
		DBPassword:      getEnv("DB_PASSWORD", ""),
		DBName:          getEnv("DB_NAME", ""),
		DBSSLMode:       getEnv("DB_SSLMODE", "disable"),
		DBMigrationPath: getEnv("DB_MIGRATION_PATH", "../database/migrations/init.sql"),

		JWTSecret:             getEnv("JWT_SECRET", ""),
		JWTExpiryHours:        jwtExpiry,
		JWTRefreshSecret:      getEnv("JWT_REFRESH_SECRET", ""),
		JWTRefreshExpiryHours: jwtRefreshExpiry,

		ServerPort:     getEnv("SERVER_PORT", "8080"),
		GinMode:        getEnv("GIN_MODE", "debug"),
		AllowedOrigins: strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"), ","),

		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     smtpPort,
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", "noreply@kemenkoinfra.go.id"),
		SMTPFromName: getEnv("SMTP_FROM_NAME", "SDM APIP System"),
		SMTPInsecure: getEnv("SMTP_INSECURE", "false") == "true",
		LogFilePath:  getEnv("LOG_FILE_PATH", "logs/app.log"),

		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),

		AdminDefaultPassword: getEnv("ADMIN_DEFAULT_PASSWORD", ""),

		// SSO Internal Instansi
		SSOEnabled:      getEnv("SSO_ENABLED", "false") == "true",
		SSOClientID:     getEnv("SSO_CLIENT_ID", ""),
		SSOClientSecret: getEnv("SSO_CLIENT_SECRET", ""),
		SSOIssuerURL:    getEnv("SSO_ISSUER_URL", ""),
		SSORedirectURL:  getEnv("SSO_REDIRECT_URL", "http://localhost:5173/api/auth/sso/oidc-callback"),
	}

	// Validasi konfigurasi terpusat
	return ValidateConfig()
}

func ConnectDatabase() error {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		AppConfig.DBHost,
		AppConfig.DBUser,
		AppConfig.DBPassword,
		AppConfig.DBName,
		AppConfig.DBPort,
		AppConfig.DBSSLMode,
	)

	// Tingkat logging GORM dinamis berdasarkan GIN_MODE
	logLevel := gormlogger.Warn
	if AppConfig.GinMode == "debug" {
		logLevel = gormlogger.Info
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(logLevel),
	})

	if err != nil {
		return err
	}

	// === KONFIGURASI PENGELOMPOKAN KONEKSI (CONNECTION POOLING) ===
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("Gagal mendapatkan sql.DB dari gorm: %v", err)
	}

	sqlDB.SetMaxIdleConns(10)               // Jumlah minimum koneksi yang diam (idle)
	sqlDB.SetMaxOpenConns(100)              // Jumlah maksimum koneksi terbuka secara bersamaan
	sqlDB.SetConnMaxLifetime(time.Hour)     // Waktu maksimum daur ulang untuk sebuah koneksi

	log.Println("✅ Database connected successfully! (Connection Pool Initialized)")
	return nil
}

// RunSQLFile menjalankan perintah SQL dari sebuah file
func RunSQLFile(filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("Gagal membaca file SQL: %v", err)
	}

	// Bersihkan path untuk keperluan logging
	absPath, _ := filepath.Abs(filePath)
	logger.Info("📄 Executing SQL from: %s", absPath)

	// Eksekusi seluruh SQL sebagai satu transaksi atau batch tunggal
	// Catatan: PostgreSQL dapat menangani beberapa pernyataan dalam satu query
	if err := DB.Exec(string(content)).Error; err != nil {
		return fmt.Errorf("Gagal mengeksekusi SQL: %v", err)
	}

	return nil
}

// ValidateConfig melakukan validasi konfigurasi terpusat
func ValidateConfig() error {
	// Validasi field database yang wajib diisi
	if AppConfig.DBHost == "" || AppConfig.DBUser == "" || AppConfig.DBName == "" {
		return fmt.Errorf("Konfigurasi database wajib tidak ada (DB_HOST, DB_USER, DB_NAME)")
	}

	// Validasi Rahasia (Secret) JWT
	if AppConfig.JWTSecret == "" {
		if AppConfig.GinMode == "release" {
			return fmt.Errorf("JWT_SECRET HARUS diatur dalam mode rilis")
		}
		logger.Warn("PERINGATAN: JWT_SECRET tidak diatur, menggunakan default yang tidak aman untuk tahap pengembangan (development)")
		AppConfig.JWTSecret = "default-insecure-secret-key-change-me"
	}

	// Validasi Rahasia (Secret) Refresh JWT
	if AppConfig.JWTRefreshSecret == "" {
		if AppConfig.GinMode == "release" {
			logger.Warn("⚠️ JWT_REFRESH_SECRET tidak diatur dalam mode rilis, menggunakan JWT_SECRET sebagai cadangan")
		}
		AppConfig.JWTRefreshSecret = AppConfig.JWTSecret
	}

	// Penguatan Keamanan: Mencegah SMTP tidak aman dalam mode rilis
	if AppConfig.GinMode == "release" && AppConfig.SMTPInsecure {
		logger.Warn("⚠️ PERINGATAN KEAMANAN: SMTP_INSECURE diatur ke true dalam mode rilis. Memaksa menjadi false.")
		AppConfig.SMTPInsecure = false
	}

	// Validasi konfigurasi SMTP dalam mode rilis
	if AppConfig.GinMode == "release" {
		if AppConfig.SMTPHost == "" || AppConfig.SMTPUsername == "" || AppConfig.SMTPPassword == "" {
			logger.Warn("⚠️ Konfigurasi SMTP tidak lengkap dalam mode rilis (SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD)")
		}
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
