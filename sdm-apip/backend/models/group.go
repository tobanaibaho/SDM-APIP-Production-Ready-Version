package models

import (
	"time"

	"gorm.io/gorm"
)

// Group represents a user group
type Group struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;unique;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	UserCount   int            `gorm:"-" json:"user_count,omitempty"` // Strictly ignored by GORM persistence/migration
	Users       []User         `gorm:"many2many:user_groups;" json:"users,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Group) TableName() string {
	return "groups"
}

// GroupResponse for API response
type GroupResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	UserCount   int    `json:"user_count,omitempty"`
	UserRole    string `json:"user_role,omitempty"`
	CreatedAt   string `json:"created_at"`
	IsArchived  bool   `json:"is_archived"`
}

func (g *Group) ToResponse(userCount int, userRole string) GroupResponse {
	return GroupResponse{
		ID:          g.ID,
		Name:        g.Name,
		Description: g.Description,
		UserCount:   userCount,
		UserRole:    userRole,
		CreatedAt:   g.CreatedAt.Format("2006-01-02 15:04:05"),
		IsArchived:  g.DeletedAt.Valid,
	}
}

// CreateGroupRequest
type CreateGroupRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`
	Description string `json:"description" binding:"omitempty"`
}

// UpdateGroupRequest
type UpdateGroupRequest struct {
	Name        string `json:"name" binding:"omitempty,min=1,max=100"`
	Description string `json:"description" binding:"omitempty"`
}

// AssignUserRequest
// Valid group_roles:
//   - AT      : Anggota Tim (default, many per group)
//   - KT      : Ketua Tim (max 1 per group)
//   - Dalnis  : Pengendali Teknis (max 1 per group)
//
// NOTE: Inspektur is a GLOBAL role from sdm_apip.jabatan — never assigned here.
type AssignUserRequest struct {
	UserID uint   `json:"user_id" binding:"required"`
	Role   string `json:"role" binding:"omitempty,oneof=Dalnis KT AT"`
}

// MoveUserRequest
type MoveUserRequest struct {
	UserID      uint `json:"user_id" binding:"required"`
	FromGroupID uint `json:"from_group_id"` // Optional: if provided, validates user is in this group
	ToGroupID   uint `json:"to_group_id" binding:"required"`
}
