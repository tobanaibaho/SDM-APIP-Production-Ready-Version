package models

import (
	"time"

	"gorm.io/gorm"
)

// WIB adalah lokasi zona waktu Asia/Jakarta
var WIB, _ = time.LoadLocation("Asia/Jakarta")

// AuditAction merepresentasikan jenis tindakan yang diaudit
type AuditAction string

const (
	AuditActionAdminReset     AuditAction = "admin_reset"
	AuditActionUserCreate     AuditAction = "user_create"
	AuditActionUserUpdate     AuditAction = "user_update"
	AuditActionUserDelete     AuditAction = "user_delete"
	AuditActionRoleChange     AuditAction = "role_change"
	AuditActionStatusChange   AuditAction = "status_change"
	AuditActionLogin          AuditAction = "login"
	AuditActionLoginFailed    AuditAction = "login_failed"
	AuditActionPasswordChange AuditAction = "password_change"
	AuditActionUserSeed       AuditAction = "user_seed_cli"
	AuditActionReportExport   AuditAction = "report_export"
	AuditActionPeriodUpdate   AuditAction = "period_update"
	AuditActionPeriodLock     AuditAction = "period_lock"
	AuditActionAssessmentSubmit AuditAction = "assessment_submit"
	AuditActionQuestionCreate AuditAction = "question_create"
	AuditActionQuestionUpdate AuditAction = "question_update"
	AuditActionQuestionDelete AuditAction = "question_delete"
)

// AuditStatus merepresentasikan hasil dari tindakan yang diaudit
type AuditStatus string

const (
	AuditStatusSuccess AuditStatus = "success"
	AuditStatusFailed  AuditStatus = "failed"
	AuditStatusPending AuditStatus = "pending"
)

// AuditLog merepresentasikan entri catatan audit keamanan
type AuditLog struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       *uint          `gorm:"column:user_id;index" json:"user_id"`
	User         *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action       AuditAction    `gorm:"column:action;size:50;not null;index" json:"action"`
	TargetUserID *uint          `gorm:"column:target_user_id;index" json:"target_user_id,omitempty"`
	TargetUser   *User          `gorm:"foreignKey:TargetUserID" json:"target_user,omitempty"`
	IPAddress    string         `gorm:"column:ip_address;size:45" json:"ip_address"`
	UserAgent    string         `gorm:"column:user_agent;size:255" json:"user_agent,omitempty"`
	Status       AuditStatus    `gorm:"column:status;size:20;not null" json:"status"`
	Details      string         `gorm:"column:details;type:text" json:"details,omitempty"`
	CreatedAt    time.Time      `gorm:"column:created_at" json:"-"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// CreatedAtWIB selalu dikirim ke frontend dengan offset +07:00 secara eksplisit
	CreatedAtWIB string `gorm:"-" json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}

// Hook AfterFind: mengubah CreatedAt menjadi string berformat WIB setelah setiap query ke database
func (a *AuditLog) AfterFind(tx *gorm.DB) error {
	loc := WIB
	if loc == nil {
		loc = time.UTC
	}
	// Selalu keluarkan output dengan +07:00 secara eksplisit agar frontend tidak bingung dengan zona waktunya
	a.CreatedAtWIB = a.CreatedAt.UTC().In(loc).Format("2006-01-02T15:04:05+07:00")
	return nil
}

// CreateAuditLog adalah fungsi pembantu (helper) untuk membuat entri catatan audit
func CreateAuditLog(db *gorm.DB, userID *uint, action AuditAction, status AuditStatus, ipAddress, userAgent, details string, targetUserID *uint) error {
	log := AuditLog{
		UserID:       userID,
		Action:       action,
		TargetUserID: targetUserID,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		Status:       status,
		Details:      details,
	}
	return db.Create(&log).Error
}
