package services

import (
	"sdm-apip-backend/config"
	"sdm-apip-backend/models"

	"gorm.io/gorm"
)

type IAuditService interface {
	GetAll(page, limit int, action, status string, userID *uint) ([]models.AuditLog, int64, error)
}

type AuditService struct {
	db *gorm.DB
}

func NewAuditService() IAuditService {
	return &AuditService{
		db: config.DB,
	}
}

func (s *AuditService) GetAll(page, limit int, action, status string, userID *uint) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	offset := (page - 1) * limit
	query := s.db.Model(&models.AuditLog{})

	if action != "" {
		query = query.Where("action = ?", action)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Preload("User").
		Preload("TargetUser").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error

	return logs, total, err
}
