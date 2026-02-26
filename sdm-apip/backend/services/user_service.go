package services

import (
	"errors"
	"strings"
	"time"

	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"

	"gorm.io/gorm"
)

/*
====================================================
Errors (Service-level)
====================================================
*/
var (
	ErrInvalidStatus       = errors.New("invalid status")
	ErrInvalidRole         = errors.New("invalid role")
	ErrLastAdminProtection = errors.New("cannot delete the last super admin")
	ErrInternal            = errors.New("internal server error")
)

/*
====================================================
Interface
====================================================
*/
type IUserService interface {
	GetAll(page, limit int, search, status, sortBy, order string) ([]*models.User, int64, error)
	GetByID(id uint) (*models.User, *models.SDM, error)
	UpdateStatus(id uint, status models.UserStatus) (*models.User, error)
	UpdateRole(id uint, roleID models.RoleID) (*models.User, error)
	Delete(id uint) error
}

/*
====================================================
Service Implementation
====================================================
*/
type UserService struct {
	db *gorm.DB
}

func NewUserService() IUserService {
	return &UserService{
		db: config.DB,
	}
}

/*
====================================================
Get All Users
====================================================
*/
func (s *UserService) GetAll(page, limit int, search, status, sortBy, order string) ([]*models.User, int64, error) {
	var users []*models.User
	var total int64

	offset := (page - 1) * limit

	// 1. Create base query for standard user fields
	query := s.db.Model(&models.User{})

	// Apply search filter (Searching by NIP or Email)
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("(users.nip LIKE ? OR users.email LIKE ?)", like, like)
	}

	// Apply status filter
	if status != "" {
		st := models.UserStatus(status)
		if st == models.StatusActive || st == models.StatusPendingVerification || st == models.StatusEmailVerified || st == models.StatusInactive {
			query = query.Where("users.status = ?", st)
		}
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		logger.Error("Database error in UserService.GetAll (Count): %v", err)
		return nil, 0, ErrInternal
	}

	// Handle sorting (Only columns in users table)
	allowedSort := map[string]string{
		"nip":        "users.nip",
		"email":      "users.email",
		"status":     "users.status",
		"created_at": "users.created_at",
	}

	sortColumn := allowedSort[sortBy]
	if sortColumn == "" {
		sortColumn = "users.created_at"
	}

	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// 2. Fetch paginated records
	if err := query.
		Preload("Role").
		Order(sortColumn + " " + order).
		Offset(offset).
		Limit(limit).
		Find(&users).Error; err != nil {
		logger.Error("Database error in UserService.GetAll (Find): %v", err)
		return nil, 0, ErrInternal
	}

	// 3. Batch Fetch Names from SDM APIP table to ensure 100% success
	var nips []string
	userMap := make(map[string]*models.User)
	for _, u := range users {
		if u.NIP != nil {
			trimmedNIP := strings.TrimSpace(*u.NIP)
			if trimmedNIP != "" {
				nips = append(nips, trimmedNIP)
				userMap[trimmedNIP] = u
			}
		}
	}

	if len(nips) > 0 {
		var sdmList []models.SDM
		// Trim spaces in query too
		if err := s.db.Where("TRIM(nip) IN ?", nips).Find(&sdmList).Error; err == nil {
			for _, sdm := range sdmList {
				trimmedSDMNIP := strings.TrimSpace(sdm.NIP)
				if u, ok := userMap[trimmedSDMNIP]; ok {
					u.Name = sdm.Nama
				}
			}
		}
	}

	return users, total, nil
}

/*
====================================================
Get User By ID
====================================================
*/
func (s *UserService) GetByID(id uint) (*models.User, *models.SDM, error) {
	var user models.User
	if err := s.db.Preload("Role").First(&user, id).Error; err != nil {
		return nil, nil, ErrUserNotFound
	}

	var sdm models.SDM
	if user.NIP != nil {
		s.db.Where("nip = ?", *user.NIP).First(&sdm)
	}

	return &user, &sdm, nil
}

/*
====================================================
Update Status
====================================================
*/
func (s *UserService) UpdateStatus(id uint, status models.UserStatus) (*models.User, error) {
	if status != models.StatusPendingVerification && status != models.StatusEmailVerified && status != models.StatusActive && status != models.StatusInactive {
		return nil, ErrInvalidStatus
	}

	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, ErrUserNotFound
	}

	tx := s.db.Begin()

	if err := tx.Model(&user).Update("status", status).Error; err != nil {
		tx.Rollback()
		return nil, ErrInternal
	}

	// Session Revocation: If inactive, revoke all sessions
	if status == models.StatusInactive {
		if err := tx.Model(&models.RefreshToken{}).Where("user_id = ?", user.ID).Update("revoked_at", time.Now()).Error; err != nil {
			tx.Rollback()
			return nil, ErrInternal
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, ErrInternal
	}

	s.db.Preload("Role").First(&user, id)
	return &user, nil
}

/*
====================================================
Update Role
====================================================
*/
func (s *UserService) UpdateRole(id uint, roleID models.RoleID) (*models.User, error) {
	if !models.IsValidRole(roleID) {
		return nil, ErrInvalidRole
	}

	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, ErrUserNotFound
	}

	tx := s.db.Begin()

	if err := tx.Model(&user).Update("role_id", roleID).Error; err != nil {
		tx.Rollback()
		return nil, ErrInternal
	}

	// Session Revocation: Force re-login with new authority level
	if err := tx.Model(&models.RefreshToken{}).Where("user_id = ?", user.ID).Update("revoked_at", time.Now()).Error; err != nil {
		tx.Rollback()
		return nil, ErrInternal
	}

	if err := tx.Commit().Error; err != nil {
		return nil, ErrInternal
	}

	s.db.Preload("Role").First(&user, id)
	return &user, nil
}

/*
====================================================
Delete User
====================================================
*/
func (s *UserService) Delete(id uint) error {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return ErrUserNotFound
	}

	// Protect last Super Admin
	if user.RoleID == models.RoleSuperAdmin {
		var count int64
		s.db.Model(&models.User{}).
			Where("role_id = ?", models.RoleSuperAdmin).
			Count(&count)

		if count <= 1 {
			return ErrLastAdminProtection
		}
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if user.NIP != nil && strings.TrimSpace(*user.NIP) != "" {
			if err := tx.Exec(
				"UPDATE sdm_apip SET email = '-' WHERE nip = ?",
				*user.NIP,
			).Error; err != nil {
				return err
			}
		}

		if err := tx.
			Where("user_id = ?", user.ID).
			Delete(&models.VerificationToken{}).Error; err != nil {
			return err
		}

		if err := tx.Delete(&user).Error; err != nil {
			return err
		}

		nip := "N/A"
		if user.NIP != nil {
			nip = *user.NIP
		}
		logger.Info("[AUDIT] User deleted: ID=%d, NIP=%s", user.ID, nip)
		return nil
	})
}
