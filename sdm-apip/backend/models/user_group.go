package models

import (
	"time"

	"gorm.io/gorm"
)

// UserGroup represents the many-to-many relationship between users and groups
type UserGroup struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	UserID     uint           `gorm:"column:user_id;not null;index:idx_user_group,unique" json:"user_id"`
	GroupID    uint           `gorm:"column:group_id;not null;index:idx_user_group,unique" json:"group_id"`
	Role       string         `gorm:"column:role;size:20;default:'Anggota'" json:"role"`
	AssignedBy *uint          `gorm:"column:assigned_by" json:"assigned_by,omitempty"`
	AssignedAt time.Time      `gorm:"column:assigned_at;default:CURRENT_TIMESTAMP" json:"assigned_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UserGroup) TableName() string {
	return "user_groups"
}
