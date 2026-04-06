package models

import "time"

// ReportFilter represents the query parameters for filtering assessments
type ReportFilter struct {
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	GroupID         *uint      `json:"group_id"`
	UnitKerja       string     `json:"unit_kerja"`
	UserID          *uint      `json:"user_id"`
	AssessmentType  string     `json:"assessment_type"` // e.g., "peer"
	AssessmentMonth *int       `json:"assessment_month"`
	Search          string     `json:"search"`
	SortBy          string     `json:"sort_by"`
	Order           string     `json:"order"` // asc, desc
	Page            int        `json:"page"`
	PageSize        int        `json:"page_size"`
	IncludeArchived bool       `json:"include_archived"`
}

// ReportSummary represents high-level KPI cards
type ReportSummary struct {
	TotalAssessments int64   `json:"total_assessments"`
	AverageScore     float64 `json:"average_score"`
	HighestScore     float64 `json:"highest_score"`
	LowestScore      float64 `json:"lowest_score"`
	TotalUsers       int64   `json:"total_users"`
}

// ScoreDistribution represents data for a pie/bar chart
type ScoreDistribution struct {
	Range string `json:"range"` // e.g., "1-2", "2-3", etc.
	Count int64  `json:"count"`
}

// TrendData represents data for a line/bar chart
type TrendData struct {
	Label string  `json:"label"` // e.g., "Jan", "Feb", or "2024-Q1"
	Value float64 `json:"value"`
}

// CategoryBreakdown represents data for a radar/bar chart
type CategoryBreakdown struct {
	Category string  `json:"category"`
	Average  float64 `json:"average"`
}

// PerformerInfo represents top/low performers
type PerformerInfo struct {
	UserID    uint    `json:"user_id"`
	Name      string  `json:"name"`
	NIP       string  `json:"nip"`
	UnitKerja string  `json:"unit_kerja"`
	Score     float64 `json:"score"`
}

// DashboardData is the comprehensive object for the admin dashboard
type DashboardData struct {
	Summary           ReportSummary       `json:"summary"`
	ScoreDistribution []ScoreDistribution `json:"score_distribution"`
	PerformanceTrend  []TrendData         `json:"performance_trend"`
	CategoryBreakdown []CategoryBreakdown `json:"category_breakdown"`
	TopPerformers     []PerformerInfo     `json:"top_performers"`
	LowPerformers     []PerformerInfo     `json:"low_performers"`
}

// AssessmentDetailRow represents a single row in the detailed report table
type AssessmentDetailRow struct {
	ID                    uint      `json:"id"`
	PeriodID              uint      `json:"period_id"`
	AssessmentMonth       int       `json:"assessment_month"`
	Date                  time.Time `json:"date"`
	EvaluatorName         string    `json:"evaluator_name"`
	TargetUserName        string    `json:"target_user_name"`
	TargetNIP             string    `json:"target_nip"`
	GroupName             string    `json:"group_name"`
	GroupRole             string    `json:"group_role"`
	UnitKerja             string    `json:"unit_kerja"`
	BerorientasiPelayanan int       `json:"berorientasi_pelayanan"`
	Akuntabel             int       `json:"akuntabel"`
	Kompeten              int       `json:"kompeten"`
	Harmonis              int       `json:"harmonis"`
	Loyal                 int       `json:"loyal"`
	Adaptif               int       `json:"adaptif"`
	Kolaboratif           int       `json:"kolaboratif"`
	AverageScore          float64   `json:"average_score"`
	Comment               string    `json:"comment"`
}

// UserReportRow represents a summary of performance for a specific user
type UserReportRow struct {
	UserID              uint    `json:"user_id"`
	Name                string  `json:"name"`
	NIP                 string  `json:"nip"`
	GroupRole           string  `json:"group_role"`
	Jabatan             string  `json:"jabatan"`
	UnitKerja           string  `json:"unit_kerja"`
	AssessmentsReceived int64   `json:"assessments_received"`
	AssessmentsGiven    int64   `json:"assessments_given"`
	AverageScore        float64 `json:"average_score"`
}
