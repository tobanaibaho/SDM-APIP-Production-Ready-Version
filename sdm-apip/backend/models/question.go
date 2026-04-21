package models

import (
	"time"

	"gorm.io/gorm"
)

// Question represents a dynamic question belonging to a specific BerAKHLAK indicator
type Question struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Indicator string         `gorm:"type:varchar(100);not null;index" json:"indicator"` // e.g., "Berorientasi Pelayanan", "Akuntabel", dll.
	Text      string         `gorm:"type:text;not null" json:"text"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Question) TableName() string {
	return "questions"
}

// AssessmentAnswer records the specific score given to a specific Question within a PeerAssessment submission
type AssessmentAnswer struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	PeerAssessmentID uint           `gorm:"not null;index;constraint:OnDelete:CASCADE" json:"peer_assessment_id"`
	QuestionID       uint           `gorm:"not null;index" json:"question_id"`
	Question         Question       `gorm:"foreignKey:QuestionID" json:"question"`
	Score            int            `gorm:"not null;check:score >= 0 AND score <= 100" json:"score"`
	CreatedAt        time.Time      `json:"created_at"`
}

func (AssessmentAnswer) TableName() string {
	return "assessment_answers"
}

// --- DTOs for Admin Questions ---

type CreateQuestionRequest struct {
	Indicator string `json:"indicator" binding:"required,oneof='Berorientasi Pelayanan' Akuntabel Kompeten Harmonis Loyal Adaptif Kolaboratif"`
	Text      string `json:"text" binding:"required"`
}

type UpdateQuestionRequest struct {
	Indicator string `json:"indicator" binding:"omitempty,oneof='Berorientasi Pelayanan' Akuntabel Kompeten Harmonis Loyal Adaptif Kolaboratif"`
	Text      string `json:"text" binding:"omitempty"`
	IsActive  *bool  `json:"is_active" binding:"omitempty"`
}
