package main

import (
	"log"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
)

func main() {
	// Load configuration
	err := config.LoadConfig()
	if err != nil {
		log.Fatal(err)
	}

	// Connect to database
	err = config.ConnectDatabase()
	if err != nil {
		log.Fatal(err)
	}

	db := config.DB
	logger.Info("🧹 Memulai pembersihan data transaksional sistem...")

	// 1. Clear Peer Assessments
	if err := db.Unscoped().Where("1=1").Delete(&models.PeerAssessment{}).Error; err != nil {
		logger.Fatal("Gagal menghapus peer_assessments: %v", err)
	}
	logger.Info("✅ peer_assessments dihapus.")

	// 2. Clear Assessment Relations
	if err := db.Unscoped().Where("1=1").Delete(&models.AssessmentRelation{}).Error; err != nil {
		logger.Fatal("Gagal menghapus assessment_relations: %v", err)
	}
	logger.Info("✅ assessment_relations dihapus.")

	// 3. Clear Assessment Periods
	if err := db.Unscoped().Where("1=1").Delete(&models.AssessmentPeriod{}).Error; err != nil {
		logger.Fatal("Gagal menghapus assessment_periods: %v", err)
	}
	logger.Info("✅ assessment_periods dihapus.")

	// 4. Clear User Groups (Many-to-Many bridge table)
	if err := db.Exec("DELETE FROM user_groups").Error; err != nil {
		logger.Fatal("Gagal menghapus user_groups: %v", err)
	}
	logger.Info("✅ user_groups (anggota tim) dihapus.")

	// 5. Clear Groups
	if err := db.Unscoped().Where("1=1").Delete(&models.Group{}).Error; err != nil {
		logger.Fatal("Gagal menghapus groups: %v", err)
	}
	logger.Info("✅ groups (tim) dihapus.")

	// 6. Optionally clear audit logs to start totally fresh
	if err := db.Unscoped().Where("1=1").Delete(&models.AuditLog{}).Error; err != nil {
		logger.Fatal("Gagal menghapus audit_logs: %v", err)
	}
	logger.Info("✅ audit_logs dihapus.")

	// Reset sequences if PostgreSQL (Optional, but good for clean IDs)
	db.Exec("ALTER SEQUENCE peer_assessments_id_seq RESTART WITH 1")
	db.Exec("ALTER SEQUENCE assessment_relations_id_seq RESTART WITH 1")
	db.Exec("ALTER SEQUENCE assessment_periods_id_seq RESTART WITH 1")
	db.Exec("ALTER SEQUENCE groups_id_seq RESTART WITH 1")
	db.Exec("ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1")

	logger.Info("🎉 Sistem berhasil dibersihkan! Akun User dan Data SDM tetap utuh dan siap digunakan di Production.")
}
