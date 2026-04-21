package services

import (
	"errors"
	"fmt"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
	"time"

	"gorm.io/gorm"
)

// --- Period Management ---

func (s *AssessmentService) CreatePeriod(req models.CreatePeriodRequest) (*models.AssessmentPeriod, error) {
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start date format")
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end date format")
	}
	end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, end.Location())

	// Periode hanya aktif jika hari ini masih dalam rentang tanggal
	now := time.Now()
	isActive := !now.Before(start) && now.Before(end)

	period := models.AssessmentPeriod{
		Name:      req.Name,
		StartDate: start,
		EndDate:   end,
		Frequency: req.Frequency,
		IsActive:  isActive,
	}
	if err := s.db.Create(&period).Error; err != nil {
		return nil, ErrInternalServer
	}
	return &period, nil
}

func (s *AssessmentService) GetAllPeriods() ([]models.AssessmentPeriod, error) {
	var periods []models.AssessmentPeriod
	if err := s.db.Order("start_date DESC, id DESC").Find(&periods).Error; err != nil {
		return nil, ErrInternalServer
	}
	return periods, nil
}

func (s *AssessmentService) UpdatePeriod(id uint, req models.UpdatePeriodRequest) error {
	var period models.AssessmentPeriod
	if err := s.db.First(&period, id).Error; err != nil {
		return ErrPeriodNotFound
	}
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return errors.New("invalid start date format")
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return errors.New("invalid end date format")
	}
	end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, end.Location())

	// Re-evaluate if it should be active based on dates (optional logic, but typically if they set future/past it updates active state)
	// We'll trust the admin override. Let's just update the period.
	period.Name = req.Name
	period.StartDate = start
	period.EndDate = end

	if err := s.db.Save(&period).Error; err != nil {
		return ErrInternalServer
	}
	return nil
}

func (s *AssessmentService) UpdatePeriodStatus(id uint, isActive bool) error {
	var period models.AssessmentPeriod
	if err := s.db.First(&period, id).Error; err != nil {
		return ErrPeriodNotFound
	}

	if isActive {
		// Deactivate other periods first (only one active)
		if err := s.db.Model(&models.AssessmentPeriod{}).
			Where("id != ? AND is_active = ?", id, true).
			Update("is_active", false).Error; err != nil {
			return ErrInternalServer
		}

		// Jika admin melakukan "Override" (mengaktifkan periode yang sudah kedaluwarsa),
		// secara intervensi sistem akan memperpanjang masa periodenya (grace period) selama 7 Hari.
		if time.Now().After(period.EndDate) {
			newEnd := time.Now().AddDate(0, 0, 7)
			s.db.Model(&period).Update("end_date", newEnd)
		}
	}
	
	result := s.db.Model(&period).Update("is_active", isActive)
	if result.Error != nil {
		return ErrInternalServer
	}
	return nil
}

func (s *AssessmentService) DeletePeriod(id uint) error {
	// Pastikan periode ada
	var period models.AssessmentPeriod
	if err := s.db.First(&period, id).Error; err != nil {
		return ErrPeriodNotFound
	}

	// Jalankan dalam satu transaksi: hapus relasi, penilaian, lalu periode
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Hard-delete semua assessment_relations yang terkait
		if err := tx.Unscoped().Where("period_id = ?", id).Delete(&models.AssessmentRelation{}).Error; err != nil {
			return ErrInternalServer
		}

		// 2. Soft-delete semua peer_assessments yang terkait
		if err := tx.Where("period_id = ?", id).Delete(&models.PeerAssessment{}).Error; err != nil {
			return ErrInternalServer
		}

		// 3. Hapus periode itu sendiri
		if err := tx.Delete(&models.AssessmentPeriod{}, id).Error; err != nil {
			return ErrInternalServer
		}

		return nil
	})
}

func (s *AssessmentService) GetActivePeriod() (*models.AssessmentPeriod, error) {
	var period models.AssessmentPeriod
	err := s.db.Where("is_active = ?", true).
		Order("start_date DESC").First(&period).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		logger.Error("Database error in GetActivePeriod: %v", err)
		return nil, ErrInternalServer
	}

	// Auto-lock: jika end_date sudah lewat, nonaktifkan otomatis di database
	if time.Now().After(period.EndDate) {
		logger.Info("Period '%s' (ID:%d) telah melewati end_date — otomatis dinonaktifkan.", period.Name, period.ID)
		s.db.Model(&period).Update("is_active", false)
		
		// Audit Log (System Event)
		details := fmt.Sprintf("System auto-locked period '%s' (ID %d) because current date passed end_date (%v)", 
			period.Name, period.ID, period.EndDate.Format("2006-01-02"))
		models.CreateAuditLog(s.db, nil, models.AuditActionPeriodLock, models.AuditStatusSuccess, 
			"SYSTEM", "INTERNAL_SERVICE", details, nil)

		period.IsActive = false
		return nil, nil
	}

	return &period, nil
}

// periodMaxMonths returns the number of assessment months required by a given frequency.
func periodMaxMonths(frequency string) int {
	switch frequency {
	case "monthly":
		return 1
	case "quarterly":
		return 3
	case "semi_annual":
		return 6
	case "annual":
		return 12
	default:
		return 1
	}
}
