package models

import (
	"time"

	"gorm.io/gorm"
)

type VerificationTokenType string

const (
	TokenTypeEmailVerification VerificationTokenType = "email_verification"
	TokenTypePasswordReset     VerificationTokenType = "password_reset"
)

// VerificationToken merepresentasikan token verifikasi email
type VerificationToken struct {
	ID        uint                  `gorm:"primaryKey" json:"id"`
	UserID    uint                  `gorm:"not null" json:"user_id"`
	User      User                  `gorm:"foreignKey:UserID" json:"-"`
	TokenHash string                `gorm:"column:token_hash;size:255;uniqueIndex;not null" json:"-"`
	TokenType VerificationTokenType `gorm:"column:token_type;size:50;default:'email_verification'" json:"token_type"`
	OTP       string                `gorm:"size:10" json:"otp,omitempty"`
	ExpiresAt time.Time             `gorm:"column:expires_at;not null" json:"expires_at"`
	UsedAt    *time.Time            `gorm:"column:used_at" json:"used_at"`
	CreatedAt time.Time             `json:"created_at"`
	DeletedAt gorm.DeletedAt        `gorm:"index" json:"-"`
}

func (VerificationToken) TableName() string {
	return "verification_tokens"
}

// IsExpired memeriksa apakah token sudah kedaluwarsa
func (vt *VerificationToken) IsExpired() bool {
	return time.Now().After(vt.ExpiresAt)
}

// IsUsed memeriksa apakah token sudah digunakan
func (vt *VerificationToken) IsUsed() bool {
	return vt.UsedAt != nil
}

// IsValid memeriksa apakah token belum kedaluwarsa dan belum digunakan
func (vt *VerificationToken) IsValid() bool {
	return !vt.IsExpired() && !vt.IsUsed()
}

// MarkUsed menandai token telah digunakan di database
func (vt *VerificationToken) MarkUsed(db *gorm.DB) error {
	now := time.Now()
	return db.Model(vt).Update("used_at", now).Error
}
