package models

import (
	"time"
)

// RefreshToken represents stored refresh tokens for rotation
type RefreshToken struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"column:user_id;not null" json:"user_id"`
	TokenHash string     `gorm:"column:token_hash;size:255;unique;not null" json:"token_hash"`
	ExpiresAt time.Time  `gorm:"column:expires_at;not null" json:"expires_at"`
	RevokedAt *time.Time `gorm:"column:revoked_at" json:"revoked_at"`
	CreatedAt time.Time  `gorm:"column:created_at" json:"created_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (RefreshToken) TableName() string {
	return "refresh_tokens"
}

func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}

func (rt *RefreshToken) IsRevoked() bool {
	return rt.RevokedAt != nil
}
