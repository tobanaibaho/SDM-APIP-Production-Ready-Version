package models

import (
	"time"

	"gorm.io/gorm"
)

// AssessmentPeriod represents a timeframe for peer evaluations
type AssessmentPeriod struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	StartDate time.Time      `gorm:"not null" json:"start_date"`
	EndDate   time.Time      `gorm:"not null" json:"end_date"`
	Frequency string         `gorm:"type:varchar(20);default:'monthly'" json:"frequency"` // monthly, quarterly, semi_annual, annual
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AssessmentPeriod) TableName() string {
	return "assessment_periods"
}

// PeerAssessment represents a 360-degree evaluation between group members
type PeerAssessment struct {
	ID              uint             `gorm:"primaryKey" json:"id"`
	EvaluatorID     uint             `gorm:"not null;index" json:"evaluator_id"`
	Evaluator       User             `gorm:"foreignKey:EvaluatorID" json:"evaluator,omitempty"`
	TargetUserID    uint             `gorm:"not null;index" json:"target_user_id"`
	TargetUser      User             `gorm:"foreignKey:TargetUserID" json:"target_user,omitempty"`
	GroupID         *uint            `gorm:"index" json:"group_id"`
	Group           Group            `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"group,omitempty"`
	PeriodID        uint             `gorm:"not null;index" json:"period_id"`
	Period          AssessmentPeriod `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
	RelationType    string           `gorm:"type:varchar(20);not null" json:"relation_type"`   // Perspektif Penilai: Atasan, Peer, Bawahan
	TargetPosition  string           `gorm:"type:varchar(20);not null" json:"target_position"` // Posisi Target dalam Tim: Atasan, Peer, Bawahan
	AssessmentMonth int              `gorm:"not null;default:1" json:"assessment_month"`       // Month number within period (1, 2, 3, etc.)

	// ASN BerAKHLAK Indicators (0-100 scale)
	BerorientasiPelayanan int `gorm:"not null;check:berorientasi_pelayanan >= 0 AND berorientasi_pelayanan <= 100" json:"berorientasi_pelayanan"`
	Akuntabel             int `gorm:"not null;check:akuntabel >= 0 AND akuntabel <= 100" json:"akuntabel"`
	Kompeten              int `gorm:"not null;check:kompeten >= 0 AND kompeten <= 100" json:"kompeten"`
	Harmonis              int `gorm:"not null;check:harmonis >= 0 AND harmonis <= 100" json:"harmonis"`
	Loyal                 int `gorm:"not null;check:loyal >= 0 AND loyal <= 100" json:"loyal"`
	Adaptif               int `gorm:"not null;check:adaptif >= 0 AND adaptif <= 100" json:"adaptif"`
	Kolaboratif           int `gorm:"not null;check:kolaboratif >= 0 AND kolaboratif <= 100" json:"kolaboratif"`

	Comment   string         `gorm:"type:text" json:"comment"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (PeerAssessment) TableName() string {
	return "peer_assessments"
}

// GetPredikat mengembalikan predikat berdasarkan skor akhir (skala 0-100).
func GetPredikat(score float64) string {
	switch {
	case score >= 110:
		return "Sangat Baik"
	case score >= 90:
		return "Baik"
	case score >= 70:
		return "Cukup"
	case score >= 50:
		return "Kurang"
	default:
		return "Sangat Kurang"
	}
}

// --- Request DTOs ---

type CreatePeriodRequest struct {
	Name      string `json:"name" binding:"required"`
	StartDate string `json:"start_date" binding:"required"`                                           // Format: YYYY-MM-DD
	EndDate   string `json:"end_date" binding:"required"`                                             // Format: YYYY-MM-DD
	Frequency string `json:"frequency" binding:"required,oneof=monthly quarterly semi_annual annual"` // Frequency of assessment
}

type SubmitAssessmentRequest struct {
	TargetUserID          uint   `json:"target_user_id" binding:"required"`
	GroupID               *uint  `json:"group_id"`
	PeriodID              uint   `json:"period_id" binding:"required"`
	AssessmentMonth       int    `json:"assessment_month" binding:"required,min=1"`
	BerorientasiPelayanan int    `json:"berorientasi_pelayanan" binding:"required,min=0,max=100"`
	Akuntabel             int    `json:"akuntabel" binding:"required,min=0,max=100"`
	Kompeten              int    `json:"kompeten" binding:"required,min=0,max=100"`
	Harmonis              int    `json:"harmonis" binding:"required,min=0,max=100"`
	Loyal                 int    `json:"loyal" binding:"required,min=0,max=100"`
	Adaptif               int    `json:"adaptif" binding:"required,min=0,max=100"`
	Kolaboratif           int    `json:"kolaboratif" binding:"required,min=0,max=100"`
	Comment    string `json:"comment" binding:"max=500"`
}

// --- Response DTOs ---

type AssessmentSummary struct {
	PeriodID     uint               `json:"period_id"`
	PeriodName   string             `json:"period_name"`
	AverageScore float64            `json:"average_score"`
	Status       int                `json:"status"` // 1-7, 0 if not rated
	Details      map[string]float64 `json:"details"`
}

// IndicatorReference holds aggregated scores for one BerAKHLAK indicator.
type IndicatorReference struct {
	PeerAvg    float64 `json:"peer_avg"`
	BawahanAvg float64 `json:"bawahan_avg"`
	OverallAvg float64 `json:"overall_avg"`
}

// AssessmentReference is returned to an Atasan (e.g. Inspektur) before they
// fill their assessment so they can see contextual Peer+Bawahan scores.
type AssessmentReference struct {
	Target struct {
		Name    string `json:"name"`
		NIP     string `json:"nip"`
		Jabatan string `json:"jabatan"`
	} `json:"target"`
	PeriodName string `json:"period_name"`
	Summary    struct {
		PeerCount    int     `json:"peer_count"`
		BawahanCount int     `json:"bawahan_count"`
		PeerAvg      float64 `json:"peer_avg"`
		BawahanAvg   float64 `json:"bawahan_avg"`
		OverallAvg   float64 `json:"overall_avg"`
	} `json:"summary"`
	Indicators map[string]IndicatorReference `json:"indicators"`
	IsReady    bool                          `json:"is_ready"`
	Warning    string                        `json:"warning"`
}

// AssessmentRelation defines who evaluates whom and in what capacity
type AssessmentRelation struct {
	ID             uint             `gorm:"primaryKey" json:"id"`
	PeriodID       uint             `gorm:"not null;index" json:"period_id"`
	Period         AssessmentPeriod `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
	GroupID        *uint            `gorm:"index" json:"group_id"`
	Group          Group            `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	EvaluatorID    uint             `gorm:"not null;index" json:"evaluator_id"`
	Evaluator      User             `gorm:"foreignKey:EvaluatorID" json:"evaluator,omitempty"`
	TargetUserID   uint             `gorm:"not null;index" json:"target_user_id"`
	TargetUser     User             `gorm:"foreignKey:TargetUserID" json:"target_user,omitempty"`
	RelationType   string           `gorm:"type:varchar(20);not null" json:"relation_type"`   // Perspektif Penilai: Atasan, Peer, Bawahan
	TargetPosition string           `gorm:"type:varchar(20);not null" json:"target_position"` // Posisi Target dalam Tim: Atasan, Peer, Bawahan
	CreatedAt      time.Time        `json:"created_at"`
}

func (AssessmentRelation) TableName() string {
	return "assessment_relations"
}

type CreateRelationRequest struct {
	PeriodID       uint   `json:"period_id" binding:"required"`
	GroupID        *uint  `json:"group_id"`
	EvaluatorID    uint   `json:"evaluator_id" binding:"required"`
	TargetUserID   uint   `json:"target_user_id" binding:"required"`
	RelationType   string `json:"relation_type" binding:"required,oneof=Atasan Peer Bawahan"`
	TargetPosition string `json:"target_position" binding:"required,oneof=Atasan Peer Bawahan"`
}

type BulkCreateRelationsRequest struct {
	PeriodID  uint                `json:"period_id" binding:"required"`
	GroupID   uint                `json:"group_id" binding:"required"`
	Relations []GroupRelationItem `json:"relations" binding:"required,dive"`
}

type GroupRelationItem struct {
	EvaluatorID    uint   `json:"evaluator_id" binding:"required"`
	TargetUserID   uint   `json:"target_user_id" binding:"required"`
	RelationType   string `json:"relation_type" binding:"required,oneof=Atasan Peer Bawahan"`
	TargetPosition string `json:"target_position" binding:"required,oneof=Atasan Peer Bawahan"`
}

// AssessmentTarget is returned to an evaluator showing who they need to assess.
// For multi-month periods (quarterly/semi-annual/annual), each month is tracked
// independently — an evaluator must submit once per month per target.
type AssessmentTarget struct {
	Relation       AssessmentRelation `json:"relation"`
	IsDone         bool               `json:"is_done"`         // true ONLY when ALL months are submitted
	MonthsDone     []int              `json:"months_done"`     // e.g. [1, 2] = Bulan 1 & 2 done, Bulan 3 pending
	MonthsRequired int                `json:"months_required"` // total months in the period (1, 3, 6, or 12)
}
