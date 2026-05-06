package models

import (
	"time"

	"gorm.io/gorm"
)

// Tipe RoleID untuk keamanan pada saat kompilasi (compile-time safety)
type RoleID uint

// Role merepresentasikan peran pengguna
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
| Konstanta Peran (Role Constants)
*/

const (
	RoleSuperAdmin RoleID = 1
	RoleUser       RoleID = 2

	RoleNameSuperAdmin = "SuperAdmin"
	RoleNameUser       = "User"
)

/*
| Metode Pembantu (Helper Methods)
*/

// IsSuperAdmin memeriksa apakah peran adalah Super Admin
func (r Role) IsSuperAdmin() bool {
	return r.ID == RoleSuperAdmin
}

// IsUser memeriksa apakah peran adalah pengguna biasa
func (r Role) IsUser() bool {
	return r.ID == RoleUser
}

// IsValidRole memeriksa apakah RoleID diizinkan
func IsValidRole(id RoleID) bool {
	return id == RoleSuperAdmin || id == RoleUser
}
