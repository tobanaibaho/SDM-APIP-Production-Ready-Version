package models

import (
	"time"

	"gorm.io/gorm"
)

// WIB is the Asia/Jakarta timezone location
var WIB, _ = time.LoadLocation("Asia/Jakarta")

// AuditAction represents the type of action being audited
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
)

// AuditStatus represents the result of the audited action
type AuditStatus string

const (
	AuditStatusSuccess AuditStatus = "success"
	AuditStatusFailed  AuditStatus = "failed"
	AuditStatusPending AuditStatus = "pending"
)

// AuditLog represents a security audit log entry
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

	// CreatedAtWIB is always sent to frontend with explicit +07:00 offset
	CreatedAtWIB string `gorm:"-" json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}

// AfterFind hook: converts CreatedAt to WIB string after every DB query
func (a *AuditLog) AfterFind(tx *gorm.DB) error {
	loc := WIB
	if loc == nil {
		loc = time.UTC
	}
	// Always output with explicit +07:00 so frontend has unambiguous timezone
	a.CreatedAtWIB = a.CreatedAt.UTC().In(loc).Format("2006-01-02T15:04:05+07:00")
	return nil
}

// CreateAuditLog is a helper function to create audit log entries
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
