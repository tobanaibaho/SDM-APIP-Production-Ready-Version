package models

import (
	"time"

	"gorm.io/gorm"
)

// RoleID type for compile-time safety
type RoleID uint

// Role represents user roles
type Role struct {
	ID          RoleID         `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:50;unique;not null" json:"name"`
	Description string         `gorm:"size:255" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Role) TableName() string {
	return "roles"
}

/*
| Role Constants
*/

const (
	RoleSuperAdmin RoleID = 1
	RoleUser       RoleID = 2

	RoleNameSuperAdmin = "SuperAdmin"
	RoleNameUser       = "User"
)

/*
| Helper Methods
*/

// IsSuperAdmin checks if role is Super Admin
func (r Role) IsSuperAdmin() bool {
	return r.ID == RoleSuperAdmin
}

// IsUser checks if role is a regular user
func (r Role) IsUser() bool {
	return r.ID == RoleUser
}

// IsValidRole checks if RoleID is allowed
func IsValidRole(id RoleID) bool {
	return id == RoleSuperAdmin || id == RoleUser
}
