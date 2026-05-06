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
	// Flag baris perintah (Command line)
	clearFlag := flag.Bool("clear", false, "Hapus semua pengguna non-admin sebelum seeding (MEMBUTUHKAN CONFIRM_CLEAR_USERS=YES)")
	clearOnlyFlag := flag.Bool("clear-only", false, "Hapus semua pengguna non-admin TANPA melakukan seeding (MEMBUTUHKAN CONFIRM_CLEAR_USERS=YES)")
	statsFlag := flag.Bool("stats", false, "Tampilkan statistik akun pengguna saja")
	flag.Parse()

	// 1️⃣ SAKLAR KEAMANAN TINGKAT TINGGI (WAJIB)
	if os.Getenv("ALLOW_USER_SEEDING") != "true" {
		logger.Fatal("❌ Fitur seeding pengguna dinonaktifkan (set ALLOW_USER_SEEDING=true)")
	}

	// 2️⃣ Periksa flag berbahaya
	if (*clearFlag || *clearOnlyFlag) && os.Getenv("CONFIRM_CLEAR_USERS") != "YES" {
		logger.Fatal("❌ Untuk menggunakan --clear atau --clear-only, Anda WAJIB mengatur environment variable CONFIRM_CLEAR_USERS=YES")
	}

	// Muat konfigurasi
	config.LoadConfig()

	// Hubungkan ke database
	config.ConnectDatabase()
	db := config.DB

	// 3️⃣ Jeda waktu + Peringatan
	if !*statsFlag {
		logger.Warn("⚠️  ===================================================")
		logger.Warn("⚠️  PERINGATAN: MEMULAI OPERASI SEEDING PENGGUNA")
		if *clearFlag || *clearOnlyFlag {
			logger.Warn("⚠️  BAHAYA: FLAG CLEAR TERDETEKSI! INI AKAN MENGHAPUS DATA!")
		}
		logger.Warn("⚠️  Operasi ini dapat memodifikasi data pada database")
		logger.Warn("⚠️  Tekan Ctrl+C dalam waktu 5 detik untuk membatalkan")
		logger.Warn("⚠️  ===================================================")
		time.Sleep(5 * time.Second)
	}

	logger.Info("═══════════════════════════════════════════════════")
	logger.Info("     SDM APIP - User Account Seeder")
	logger.Info("═══════════════════════════════════════════════════")
	log.Println()

	// Hanya tampilkan statistik
	if *statsFlag {
		utils.GetUserAccountStats()
		return
	}

	// MEMULAI CATATAN AUDIT
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "tidak_diketahui"
	}

	// Hapus pengguna yang sudah ada jika flag disetel
	if *clearFlag || *clearOnlyFlag {
		logger.Warn("⚠️  Menghapus akun pengguna yang sudah ada...")
		if err := utils.ClearAllUsers(); err != nil {
			// Catat kegagalan
			models.CreateAuditLog(db, nil, models.AuditActionUserSeed, models.AuditStatusFailed, hostname, "SEED_CLI", fmt.Sprintf("Gagal menghapus pengguna: %v", err), nil)
			logger.Fatal("Gagal menghapus pengguna: %v", err)
		}

		if *clearOnlyFlag {
			logger.Info("🧹 Mode clear-only (hanya hapus) aktif. Melewati proses seeding.")

			// Catatan Audit (Sukses - Hanya Hapus)
			models.CreateAuditLog(
				db,
				nil,
				models.AuditActionUserSeed,
				models.AuditStatusSuccess,
				hostname,
				"SEED_CLI",
				fmt.Sprintf("Pembersihan pengguna selesai (Clear Only). Hostname: %s", hostname),
				nil,
			)

			log.Println()
			utils.GetUserAccountStats()
			return
		}
	}

	// Lakukan seeding pengguna dari data SDM
	if err := utils.SeedUsersFromSDM(); err != nil {
		models.CreateAuditLog(db, nil, models.AuditActionUserSeed, models.AuditStatusFailed, hostname, "SEED_CLI", fmt.Sprintf("Gagal melakukan seeding pengguna: %v", err), nil)
		logger.Fatal("Gagal melakukan seeding pengguna: %v", err)
	}

	log.Println()
	log.Println("═══════════════════════════════════════════════════")

	// 4️⃣ Catatan Audit (Sukses)
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
		fmt.Sprintf("Seeding pengguna selesai lewat CLI. Flags: %s, Hostname: %s", flagsUsed, hostname),
		nil,
	)
	logger.Info("📋 Catatan audit berhasil dibuat untuk operasi seeding")

	// Tampilkan statistik akhir
	log.Println()
	utils.GetUserAccountStats()
}
