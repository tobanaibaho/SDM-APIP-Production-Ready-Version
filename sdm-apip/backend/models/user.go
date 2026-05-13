package models

import (
	"time"

	"gorm.io/gorm"
)

// Tipe UserStatus untuk keamanan pada saat kompilasi (compile-time safety)
type UserStatus string

// User merepresentasikan pengguna yang terdaftar
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	NIP       *string        `gorm:"column:nip;size:18;unique" json:"nip"`
	Username  *string        `gorm:"column:username;size:50;unique" json:"username"`
	Email     string         `gorm:"column:email;size:255;not null" json:"email"`
	Password  string         `gorm:"column:password;size:255" json:"-"`
	RoleID    RoleID         `gorm:"column:role_id;default:2" json:"role_id"`
	Role      Role           `gorm:"foreignKey:RoleID" json:"role"`
	Status    UserStatus     `gorm:"column:status;size:20;default:'pending_verification'" json:"status"`
	Groups    []Group        `gorm:"many2many:user_groups;" json:"groups,omitempty"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Field Keamanan
	LoginAttempts int        `gorm:"column:login_attempts;default:0" json:"-"`
	LockoutUntil  *time.Time `gorm:"column:lockout_until" json:"-"`
	MFASecret     *string    `gorm:"column:mfa_secret;size:100" json:"-"`
	MFAEnabled    bool       `gorm:"column:mfa_enabled;default:false" json:"mfa_enabled"`

	// Pelacakan Aktivitas
	LastLoginAt    *time.Time `gorm:"column:last_login_at" json:"last_login_at"`
	LastActivityAt *time.Time `gorm:"column:last_activity_at" json:"last_activity_at"`
	LastIP         string     `gorm:"column:last_ip;size:50" json:"-"`

	// Field dinamis dari tabel SDM APIP (diisi melalui Join pada services)
	Name    string `gorm:"<-:false" json:"name"`    // Hanya-baca (dihitung/digabungkan)
	Foto    string `gorm:"<-:false" json:"foto"`    // Hanya-baca (dihitung/digabungkan)
	Jabatan string `gorm:"<-:false" json:"jabatan"` // Hanya-baca (dihitung/digabungkan)
}

func (User) TableName() string {
	return "users"
}

// Konstanta status pengguna
const (
	StatusPendingVerification UserStatus = "pending_verification"
	StatusEmailVerified       UserStatus = "email_verified"
	StatusActive              UserStatus = "active"
	StatusInactive            UserStatus = "inactive"
)

// LoginRequest untuk login pengguna (berbasis NIP)
type LoginRequest struct {
	NIP      string `json:"nip" binding:"required"`
	Password string `json:"password" binding:"required"`
	TOTP     string `json:"totp"` // Opsional, wajib diisi jika MFA diaktifkan
}

// AdminLoginRequest untuk login super admin (berbasis Username)
type AdminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	TOTP     string `json:"totp"` // Opsional, wajib diisi jika MFA diaktifkan
}

// AdminForgotPasswordRequest untuk reset password admin
type AdminForgotPasswordRequest struct {
	Username string `json:"username" binding:"required"`
}

// AdminResetPasswordRequest untuk reset password admin melalui token email
type AdminResetPasswordRequest struct {
	Token           string `json:"token" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" binding:"required"`
}

// SecureAdminResetRequest untuk memulai reset admin aman dengan MFA
type SecureAdminResetRequest struct {
	TargetUsername string `json:"target_username" binding:"required"`
}

// SecureAdminResetConfirmRequest untuk mengkonfirmasi reset admin dengan OTP
type SecureAdminResetConfirmRequest struct {
	TargetUsername string `json:"target_username" binding:"required"`
	OTP            string `json:"otp" binding:"required,len=6"`
	NewPassword    string `json:"new_password" binding:"required,min=8"`
}

// Catatan: RegisterRequest, SetPasswordRequest, VerifyEmailRequest, ForgotPasswordRequest,
// dan ResetPasswordRequest telah DIHAPUS.
// Sistem hanya menggunakan SSO — tidak ada alur pendaftaran atau pemulihan password manual untuk pegawai.

// UserResponse untuk respon API
type UserResponse struct {
	ID             uint   `json:"id"`
	NIP            string `json:"nip"`
	Username       string `json:"username"`
	Name           string `json:"name"`
	Foto           string `json:"foto"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	Jabatan        string `json:"jabatan"`
	Status         string `json:"status"`
	LastLoginAt    string `json:"last_login_at,omitempty"`
	LastActivityAt string `json:"last_activity_at,omitempty"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

// Hook AfterFind untuk memastikan Name terisi meskipun proses join gagal
func (u *User) AfterFind(tx *gorm.DB) (err error) {
	if u.Name == "" {
		if u.Username != nil && *u.Username != "" {
			u.Name = *u.Username
		} else {
			u.Name = ""
		}
	}
	if u.Jabatan == "" {
		u.Jabatan = "Personil APIP"
	}
	return
}

func (u *User) ToResponse() UserResponse {
	roleName := "user"
	if u.Role.Name != "" {
		if u.RoleID == RoleSuperAdmin {
			roleName = "super admin"
		} else {
			roleName = "user"
		}
	} else if u.RoleID == RoleSuperAdmin {
		roleName = "super admin"
	}

	nip := ""
	if u.NIP != nil {
		nip = *u.NIP
	}

	username := ""
	if u.Username != nil {
		username = *u.Username
	}

	name := u.Name
	if name == "" {
		if u.Username != nil && *u.Username != "" {
			name = *u.Username
		} else {
			name = ""
		}
	}

	lastLogin := ""
	if u.LastLoginAt != nil {
		lastLogin = u.LastLoginAt.Format(time.RFC3339)
	}

	lastActivity := ""
	if u.LastActivityAt != nil {
		lastActivity = u.LastActivityAt.Format(time.RFC3339)
	}

	return UserResponse{
		ID:             u.ID,
		NIP:            nip,
		Username:       username,
		Name:           name,
		Foto:           u.Foto,
		Email:          u.Email,
		Role:           roleName,
		Jabatan:        u.Jabatan,
		Status:         string(u.Status),
		LastLoginAt:    lastLogin,
		LastActivityAt: lastActivity,
		CreatedAt:      u.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:      u.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

// LoginResponse for successful login
type LoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	User         UserResponse `json:"user"`
}
