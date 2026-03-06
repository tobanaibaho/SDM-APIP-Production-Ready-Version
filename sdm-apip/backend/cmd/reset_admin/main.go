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
	// Parse flag baris perintah (command-line)
	emergencyReset := flag.Bool("emergency-reset", false, "WAJIB: Konfirmasi bahwa ini adalah reset password darurat")
	flag.Parse()

	// SAKLAR KEAMANAN TINGKAT TINGGI: Membutuhkan environment variable secara eksplisit
	if os.Getenv("ALLOW_EMERGENCY_RESET") != "true" {
		logger.Fatal("❌ Reset darurat dinonaktifkan (Membutuhkan ALLOW_EMERGENCY_RESET=true)")
		os.Exit(1)
	}

	// Membutuhkan flag darurat secara eksplisit
	if !*emergencyReset {
		logger.Error("❌ FLAG DARURAT (EMERGENCY FLAG) DIBUTUHKAN")
		logger.Error("❌ Perangkat ini HANYA UNTUK KEADAAN DARURAT (EMERGENCY USE ONLY)")
		logger.Error("❌ Cara Pakai: ALLOW_EMERGENCY_RESET=true go run cmd/reset_admin/main.go --emergency-reset")
		logger.Error("❌ Untuk reset admin secara normal, gunakan endpoint API yang aman:")
		logger.Error("❌   POST /api/admin/secure-reset/request")
		logger.Error("❌   POST /api/admin/secure-reset/confirm")
		os.Exit(1)
	}

	// ⚠️  PERINGATAN PENGHENTIAN PENGGUNAAN (DEPRECATION WARNING) ⚠️
	// Perangkat CLI ini SUDAH USANG (DEPRECATED) dan HANYA boleh digunakan untuk keadaan darurat / pemulihan bencana
	// Untuk mereset password admin pada kondisi normal, gunakan endpoint API yang aman:
	// POST /api/admin/secure-reset/request (dilindungi oleh JWT + MFA)
	// POST /api/admin/secure-reset/confirm
	logger.Warn("⚠️  ========== PERINGATAN PENGHENTIAN PENGGUNAAN ==========")
	logger.Warn("⚠️  Perangkat reset lewat CLI ini SUDAH USANG!")
	logger.Warn("⚠️  Gunakan saja endpoint API yang lebih aman:")
	logger.Warn("⚠️    POST /api/admin/secure-reset/request")
	logger.Warn("⚠️    POST /api/admin/secure-reset/confirm")
	logger.Warn("⚠️  =======================================================")
	logger.Info("")
	logger.Info("⚠️  Perangkat ini HANYA boleh digunakan dalam situasi darurat penuh.")
	logger.Info("⚠️  Tekan Ctrl+C untuk membatalkan, atau tunggu 5 detik untuk melanjutkan...")
	logger.Info("")

	// Beri jeda waktu bagi pengguna untuk membatalkan jika terjadi kesalahan
	time.Sleep(5 * time.Second)

	// 1. Muat Konfigurasi Sistem & Sambungkan ke Database
	if err := config.LoadConfig(); err != nil {
		logger.Fatal("❌ Terjadi kesalahan konfigurasi: %v", err)
	}

	if err := config.ConnectDatabase(); err != nil {
		logger.Fatal("❌ Gagal menyambungkan ke Database: %v", err)
	}
	db := config.DB

	logger.Info("🔧 Memulai Perangkat Reset Password Admin...")

	// 2. Muat Data Admin dari Environment Variables (JANGAN PERNAH HARDCODE KREDENSIAL)
	adminNIP := os.Getenv("EMERGENCY_RESET_NIP")
	username := os.Getenv("EMERGENCY_RESET_USERNAME")
	email := os.Getenv("EMERGENCY_RESET_EMAIL")
	newPassword := os.Getenv("EMERGENCY_RESET_PASSWORD")

	// Validasi apakah Environment Variables wajib sudah terisi
	if adminNIP == "" || username == "" || email == "" || newPassword == "" {
		logger.Fatal("❌ Ada Environment Variables wajib yang hilang:")
		logger.Fatal("   EMERGENCY_RESET_NIP")
		logger.Fatal("   EMERGENCY_RESET_USERNAME")
		logger.Fatal("   EMERGENCY_RESET_EMAIL")
		logger.Fatal("   EMERGENCY_RESET_PASSWORD")
		logger.Fatal("")
		logger.Fatal("Contoh penggunaan:")
		logger.Fatal("   EMERGENCY_RESET_NIP=000000000000000001 \\")
		logger.Fatal("   EMERGENCY_RESET_USERNAME=admin \\")
		logger.Fatal("   EMERGENCY_RESET_EMAIL=admin@example.com \\")
		logger.Fatal("   EMERGENCY_RESET_PASSWORD='PasswordAmanAnda123!' \\")
		logger.Fatal("   go run cmd/reset_admin/main.go --emergency-reset")
	}

	logger.Info("📋 Admin Target:")
	logger.Info("   NIP: %s", adminNIP)
	logger.Info("   Username: %s", username)
	logger.Info("   Email: %s", email)
	// ❌ JANGAN PERNAH MENCETAK PASSWORD KE LOG
	logger.Info("   Password: [DISEMBUNYIKAN UNTUK KEAMANAN]")

	// 3. Hash Password Baru
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		logger.Fatal("❌ Gagal melakukan hashing password: %v", err)
	}

	// 4. Update atau Buat User Admin Baru di Database
	var user models.User
	result := db.Where("nip = ?", adminNIP).First(&user)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			logger.Warn("⚠️ User admin tidak ditemukan, sedang membuat user baru...")
			// Harus memastikan bahwa data SDM sudah ada terlebih dahulu
			var sdm models.SDM
			if err := db.Where("nip = ?", adminNIP).First(&sdm).Error; err != nil {
				// Buat data SDM jika belum ada
				sdm = models.SDM{
					NIP:       adminNIP,
					Nama:      "Administrator",
					Email:     email,
					Jabatan:   "System Administrator",
					UnitKerja: "IT Department",
				}
				if err := db.Create(&sdm).Error; err != nil {
					logger.Fatal("❌ Gagal membuat rekaman SDM: %v", err)
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
				logger.Fatal("❌ Gagal membuat user admin: %v", err)
			}
			logger.Info("✅ User admin berhasil dibuat")
		} else {
			logger.Fatal("❌ Terjadi error pada database: %v", result.Error)
		}
	} else {
		// Jika User sudah ada, perbarui password-nya
		user.Password = string(hashedPassword)
		user.RoleID = models.RoleSuperAdmin
		user.Status = models.StatusActive

		if err := db.Save(&user).Error; err != nil {
			logger.Fatal("❌ Gagal membarui/mereset user admin: %v", err)
		}
		logger.Info("✅ Password admin berhasil diperbarui")
	}

	// AUDIT LOGGING: Mencatat log aktivitas reset darurat ini
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "tidak.diketahui"
	}

	auditLog := models.AuditLog{
		UserID:       nil, // Mode CLI tidak memiliki user yang terotentikasi (JWT)
		Action:       "PASSWORD_RESET_CLI",
		TargetUserID: &user.ID,
		IPAddress:    hostname,
		UserAgent:    "EMERGENCY_CLI",
		Status:       models.AuditStatusSuccess,
		Details:      fmt.Sprintf("Reset password darurat lewat CLI untuk NIP: %s, Username: %s, Hostname: %s", adminNIP, username, hostname),
	}

	if err := db.Create(&auditLog).Error; err != nil {
		logger.Warn("⚠️ Gagal membuat catatan audit log: %v", err)
	} else {
		logger.Info("📋 Catatan Audit log berhasil dibuat di Database")
	}

	// ❌ SEKALI LAGI, JANGAN PERNAH MENCETAK PASSWORD
	logger.Info("✅ Reset password darurat telah berhasil diselesaikan")
	logger.Info("⚠️  Password baru telah ditetapkan (tidak ditampilkan demi keamanan)")
	logger.Warn("⚠️  SANGAT PENTING: Segera ubah password ini untuk keamanan menggunakan endpoint API yang semestinya")
}
