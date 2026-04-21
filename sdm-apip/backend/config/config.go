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

	AdminDefaultPassword string // Loaded from ADMIN_DEFAULT_PASSWORD env
}

var AppConfig *Config
var DB *gorm.DB

func LoadConfig() error {
	err := godotenv.Load()
	if err != nil {
		logger.Warn("Warning: .env file not found, using environment variables")
	}

	// Safe JWT Expiry parsing with validation
	jwtExpiry, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil || jwtExpiry <= 0 {
		logger.Warn("⚠️ Invalid JWT_EXPIRY_HOURS, defaulting to 24 hours")
		jwtExpiry = 24
	}

	// Safe JWT Refresh Expiry parsing with validation
	jwtRefreshExpiry, err := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_HOURS", "168"))
	if err != nil || jwtRefreshExpiry <= 0 {
		logger.Warn("⚠️ Invalid JWT_REFRESH_EXPIRY_HOURS, defaulting to 168 hours (7 days)")
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
	}

	// Centralized configuration validation
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

	// Dynamic GORM logging level based on GIN_MODE
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

	// === CONNECTION POOLING CONFIGURATION ===
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB from gorm: %v", err)
	}

	sqlDB.SetMaxIdleConns(10)               // Minimum idle connections
	sqlDB.SetMaxOpenConns(100)              // Maximum concurrent open connections
	sqlDB.SetConnMaxLifetime(time.Hour)     // Maximum recycle time for a connection

	log.Println("✅ Database connected successfully! (Connection Pool Initialized)")
	return nil
}

// RunSQLFile executes SQL commands from a file
func RunSQLFile(filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read SQL file: %v", err)
	}

	// Clean path for logging
	absPath, _ := filepath.Abs(filePath)
	logger.Info("📄 Executing SQL from: %s", absPath)

	// Execute the entire SQL as a single transaction or batch
	// Note: PostgreSQL handles multiple statements in one query
	if err := DB.Exec(string(content)).Error; err != nil {
		return fmt.Errorf("failed to execute SQL: %v", err)
	}

	return nil
}

// ValidateConfig performs centralized configuration validation
func ValidateConfig() error {
	// Validate mandatory database fields
	if AppConfig.DBHost == "" || AppConfig.DBUser == "" || AppConfig.DBName == "" {
		return fmt.Errorf("mandatory database configuration missing (DB_HOST, DB_USER, DB_NAME)")
	}

	// Validate JWT Secret
	if AppConfig.JWTSecret == "" {
		if AppConfig.GinMode == "release" {
			return fmt.Errorf("JWT_SECRET MUST be set in release mode")
		}
		logger.Warn("WARNING: JWT_SECRET is not set, using insecure default for development")
		AppConfig.JWTSecret = "default-insecure-secret-key-change-me"
	}

	// Validate JWT Refresh Secret
	if AppConfig.JWTRefreshSecret == "" {
		if AppConfig.GinMode == "release" {
			logger.Warn("⚠️ JWT_REFRESH_SECRET not set in release mode, using JWT_SECRET as fallback")
		}
		AppConfig.JWTRefreshSecret = AppConfig.JWTSecret
	}

	// Security Hardening: Prevent Insecure SMTP in release mode
	if AppConfig.GinMode == "release" && AppConfig.SMTPInsecure {
		logger.Warn("⚠️ SECURITY WARNING: SMTP_INSECURE is set to true in release mode. Forcing to false.")
		AppConfig.SMTPInsecure = false
	}

	// Validate SMTP configuration in release mode
	if AppConfig.GinMode == "release" {
		if AppConfig.SMTPHost == "" || AppConfig.SMTPUsername == "" || AppConfig.SMTPPassword == "" {
			logger.Warn("⚠️ SMTP configuration incomplete in release mode (SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD)")
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
