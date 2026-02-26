package services

import (
	"errors"
	"fmt"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type IGroupService interface {
	GetAllGroups(sortBy, order string, limit, offset int, includeArchived bool) ([]models.Group, int64, error)
	GetGroupByID(id uint) (*models.Group, []map[string]interface{}, error)
	CreateGroup(name, description string) (*models.Group, error)
	UpdateGroup(id uint, name, description string) (*models.Group, error)
	DeleteGroup(id uint) error
	AssignUserToGroup(groupID uint, userID uint, role string, adminID uint) error
	RemoveUserFromGroup(groupID, userID uint) error
	MoveUserBetweenGroups(userID, fromGroupID, toGroupID uint, adminID uint) error
	GetMyGroups(userID uint) ([]map[string]interface{}, error)
	GetGroupDetailIfMember(userID uint, groupID uint) (*models.Group, []map[string]interface{}, error)
	GetGlobalEvaluators() ([]map[string]interface{}, error)
}

type GroupService struct {
	db *gorm.DB
}

func NewGroupService() IGroupService {
	return &GroupService{
		db: config.DB,
	}
}

// GetAllGroups returns all groups with member counts, sorting, and pagination
func (s *GroupService) GetAllGroups(sortBy, order string, limit, offset int, includeArchived bool) ([]models.Group, int64, error) {
	var groups []models.Group
	var total int64

	// Anti-Abuse: Limit validation
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	baseQuery := s.db.Model(&models.Group{})
	if includeArchived {
		baseQuery = baseQuery.Unscoped()
	}

	// 1. Total Count (Pre-filters/joins)
	if err := baseQuery.Count(&total).Error; err != nil {
		logger.Error("Database error in GetAllGroups (Count): %v", err)
		return nil, 0, ErrInternalServer
	}

	// 2. Query with Joins and Group By for user_count (Respects Soft Delete via baseQuery)
	query := baseQuery.
		Select("groups.*, COUNT(user_groups.id) as user_count").
		Joins("LEFT JOIN user_groups ON user_groups.group_id = groups.id").
		Group("groups.id")

	// 3. SECURE SORTING (Whitelist + Qualified Columns)
	allowedSort := map[string]string{
		"name":       "groups.name",
		"created_at": "groups.created_at",
		"user_count": "user_count",
	}

	sortColumn, ok := allowedSort[sortBy]
	if !ok {
		sortColumn = "groups.created_at"
	}

	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// 4. Execution with pagination
	err := query.Order(sortColumn + " " + order).
		Limit(limit).
		Offset(offset).
		Scan(&groups).Error

	if err != nil {
		logger.Error("Database error in GetAllGroups (Find): %v", err)
		return nil, 0, ErrInternalServer
	}

	return groups, total, nil
}

// GetGroupByID returns a group with detailed member information (No N+1)
func (s *GroupService) GetGroupByID(id uint) (*models.Group, []map[string]interface{}, error) {
	var group models.Group
	if err := s.db.Unscoped().First(&group, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrGroupNotFound
		}
		return nil, nil, ErrInternalServer
	}

	// 1. Fetch active member relationships (even if group is archived, we can show its archived members if needed, but let's just use Unscoped for user_groups too to see who was in it)
	var userGroups []models.UserGroup
	if err := s.db.Unscoped().Where("group_id = ?", id).Find(&userGroups).Error; err != nil {
		logger.Error("Database error in GetGroupByID (UserGroup lookup): %v", err)
		return nil, nil, ErrInternalServer
	}

	if len(userGroups) == 0 {
		return &group, []map[string]interface{}{}, nil
	}

	// 2. Collect User IDs and NIPs
	userIDs := make([]uint, len(userGroups))
	roleMap := make(map[uint]string)
	for i, ug := range userGroups {
		userIDs[i] = ug.UserID
		roleMap[ug.UserID] = ug.Role
	}

	// 3. Fetch Users with Roles
	var users []models.User
	if err := s.db.Preload("Role").Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		logger.Error("Database error in GetGroupByID (User lookup): %v", err)
		return nil, nil, ErrInternalServer
	}

	var nips []string
	for _, u := range users {
		if u.NIP != nil {
			nips = append(nips, *u.NIP)
		}
	}

	// 4. Optimized: Fetch all SDM data in one query
	sdmMap := make(map[string]models.SDM)
	if len(nips) > 0 {
		var sdmList []models.SDM
		if err := s.db.Where("nip IN ?", nips).Find(&sdmList).Error; err != nil {
			logger.Error("Database error in GetGroupByID (SDM lookup): %v", err)
			return nil, nil, ErrInternalServer
		}
		for _, sdm := range sdmList {
			sdmMap[sdm.NIP] = sdm
		}
	}

	membersResponse := make([]map[string]interface{}, len(users))
	for i, user := range users {
		nip := ""
		if user.NIP != nil {
			nip = *user.NIP
		}
		sdm := sdmMap[nip]
		role := roleMap[user.ID]
		if role == "" {
			role = "Anggota"
		}

		name := sdm.Nama
		if name == "" && user.Username != nil {
			name = *user.Username
		}

		membersResponse[i] = map[string]interface{}{
			"id":         user.ID,
			"nip":        nip,
			"email":      user.Email,
			"role":       user.Role.Name,
			"group_role": role,
			"name":       name,
			"jabatan":    sdm.Jabatan,
			"unit_kerja": sdm.UnitKerja,
			"foto":       sdm.Foto,
		}
	}

	return &group, membersResponse, nil
}

// CreateGroup creates a new group (Handles restoration of soft-deleted groups)
func (s *GroupService) CreateGroup(name, description string) (*models.Group, error) {
	name = strings.TrimSpace(name)
	if len(name) < 1 || len(name) > 100 {
		return nil, ErrInvalidGroupName
	}

	var group models.Group
	// Check for existing group including soft-deleted ones
	err := s.db.Unscoped().Where("name = ?", name).First(&group).Error
	if err == nil {
		if group.DeletedAt.Valid {
			// Found a deleted group with the same name, restore it
			if err := s.db.Unscoped().Model(&group).Updates(map[string]interface{}{
				"deleted_at":  nil,
				"description": strings.TrimSpace(description),
			}).Error; err != nil {
				logger.Error("Failed to restore soft-deleted group: %v", err)
				return nil, ErrInternalServer
			}

			// Reload to clear DeletedAt in the struct and get fresh timestamps
			if err := s.db.First(&group, group.ID).Error; err != nil {
				logger.Error("Failed to reload restored group: %v", err)
				return nil, ErrInternalServer
			}
			return &group, nil
		}
		// Group exists and is active
		return nil, ErrGroupNameExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		logger.Error("Database error in CreateGroup: %v", err)
		return nil, ErrInternalServer
	}

	// Not found anywhere, create new
	group = models.Group{
		Name:        name,
		Description: strings.TrimSpace(description),
	}

	if err := s.db.Create(&group).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(err.Error(), "unique constraint") {
			return nil, ErrGroupNameExists
		}
		return nil, ErrInternalServer
	}

	return &group, nil
}

// UpdateGroup updates an existing group
func (s *GroupService) UpdateGroup(id uint, name, description string) (*models.Group, error) {
	var group models.Group
	if err := s.db.First(&group, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrGroupNotFound
		}
		return nil, ErrInternalServer
	}

	if name != "" {
		name = strings.TrimSpace(name)
		if len(name) < 1 || len(name) > 100 {
			return nil, ErrInvalidGroupName
		}

		// Check if another group (including soft-deleted) has this name
		var existing models.Group
		err := s.db.Unscoped().Where("name = ? AND id <> ?", name, id).First(&existing).Error
		if err == nil {
			return nil, ErrGroupNameExists
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			logger.Error("Database error in UpdateGroup: %v", err)
			return nil, ErrInternalServer
		}

		group.Name = name
	}
	group.Description = strings.TrimSpace(description)

	if err := s.db.Save(&group).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(err.Error(), "unique constraint") {
			return nil, ErrGroupNameExists
		}
		return nil, ErrInternalServer
	}

	logger.Info("[AUDIT] Group updated: ID=%d, Name=%s", id, group.Name)
	return &group, nil
}

// DeleteGroup deletes a group and its associated data (UserGroup and PeerAssessment)
func (s *GroupService) DeleteGroup(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Check if group exists
		var group models.Group
		if err := tx.First(&group, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrGroupNotFound
			}
			return ErrInternalServer
		}

		// 2. Soft-delete the group
		if err := tx.Delete(&group).Error; err != nil {
			logger.Error("Failed to delete group: %v", err)
			return ErrInternalServer
		}

		// 3. Soft-delete all user associations in this group
		if err := tx.Where("group_id = ?", id).Delete(&models.UserGroup{}).Error; err != nil {
			logger.Error("Failed to delete user_groups for group %d: %v", id, err)
			return ErrInternalServer
		}

		// 4. Soft-delete all assessments in this group
		if err := tx.Where("group_id = ?", id).Delete(&models.PeerAssessment{}).Error; err != nil {
			logger.Error("Failed to delete peer_assessments for group %d: %v", id, err)
			return ErrInternalServer
		}

		logger.Info("[AUDIT] Group and children deleted: ID=%d", id)
		return nil
	})
}

// AssignUserToGroup assigns a user to a group with status check, duplicate handling, and auditing
func (s *GroupService) AssignUserToGroup(groupID uint, userID uint, role string, adminID uint) error {
	// 0. Default role: AT (Anggota Tim) is the base role for all group members
	if role == "" {
		role = "AT"
	}

	// 1. Check user status
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		logger.Error("Database error in AssignUserToGroup (User check): %v", err)
		return ErrInternalServer
	}

	if user.Status != models.StatusActive && user.Status != models.StatusEmailVerified {
		return ErrUserInactive
	}

	// 1.b Restriction: Administrators cannot be assigned to any group
	if user.RoleID == models.RoleSuperAdmin {
		return ErrAdminCannotBeInGroup
	}

	// 2. Check group existence
	var group models.Group
	if err := s.db.First(&group, groupID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGroupNotFound
		}
		logger.Error("Database error in AssignUserToGroup (Group check): %v", err)
		return ErrInternalServer
	}

	// 3. Reject invalid roles
	// Inspektur is a global role (from sdm_apip.jabatan) — not assigned inside a group.
	if role == "Inspektur" || role == "Ketua" || role == "Anggota" {
		return fmt.Errorf("peran '%s' tidak valid. Gunakan AT, KT, atau Dalnis", role)
	}

	// 4. Single-Occupant Role Rules: Only ONE Dalnis and ONE KT allowed per group
	if role == "Dalnis" || role == "KT" {
		var existingRole models.UserGroup
		err := s.db.Where("group_id = ? AND role = ? AND user_id != ?", group.ID, role, userID).First(&existingRole).Error
		if err == nil {
			roleName := map[string]string{
				"Dalnis": "Pengendali Teknis (Dalnis)",
				"KT":     "Ketua Tim (KT)",
			}[role]
			return fmt.Errorf("grup ini sudah memiliki %s. Hapus %s yang ada terlebih dahulu sebelum menetapkan yang baru", roleName, roleName)
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			logger.Error("Database check error in AssignUserToGroup: %v", err)
			return ErrInternalServer
		}
	}

	// 4. SECURE UPSERT
	var assignedBy *uint
	if adminID != 0 {
		assignedBy = &adminID
	}

	// Use Transaction for safety
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var existing models.UserGroup
		// Check for existing (including soft-deleted)
		result := tx.Unscoped().Where("user_id = ? AND group_id = ?", userID, group.ID).First(&existing)

		if result.Error == nil {
			// Found existing, restore and update
			if err := tx.Unscoped().Model(&existing).Updates(map[string]interface{}{
				"deleted_at":  nil,
				"assigned_by": assignedBy,
				"assigned_at": time.Now(),
				"role":        role,
			}).Error; err != nil {
				return err
			}
			// Reload to ensure instance in memory is "active"
			return tx.First(&existing, existing.ID).Error
		} else if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Create new
			userGroup := models.UserGroup{
				UserID:     userID,
				GroupID:    group.ID,
				Role:       role,
				AssignedBy: assignedBy,
			}
			return tx.Create(&userGroup).Error
		}
		return result.Error
	})

	if err != nil {
		logger.Error("Failed to assign user to group: %v", err)
		return ErrInternalServer
	}

	logger.Info("[AUDIT] User assigned to group: UserID=%d, GroupID=%d, Role=%s", userID, group.ID, role)
	return nil
}

// RemoveUserFromGroup removes a user from a group
func (s *GroupService) RemoveUserFromGroup(groupID, userID uint) error {
	result := s.db.Where("group_id = ? AND user_id = ?", groupID, userID).Delete(&models.UserGroup{})
	if result.Error != nil {
		return ErrInternalServer
	}
	if result.RowsAffected == 0 {
		return ErrRelationNotFound
	}

	logger.Info("[AUDIT] User removed from group: UserID=%d, GroupID=%d", userID, groupID)
	return nil
}

// MoveUserBetweenGroups handles atomic movement/upsert with auditing
func (s *GroupService) MoveUserBetweenGroups(userID, fromGroupID, toGroupID uint, adminID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Validate Target Group
		var toGroup models.Group
		if err := tx.First(&toGroup, toGroupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrGroupNotFound
			}
			logger.Error("Database error in MoveUserBetweenGroups (Target group check): %v", err)
			return ErrInternalServer
		}

		// 2. Remove from all old groups to enforce "one group only" policy
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserGroup{}).Error; err != nil {
			logger.Error("Database error in MoveUserBetweenGroups (Remove old groups): %v", err)
			return ErrInternalServer
		}

		// 3. Upsert into new group
		var assignedBy *uint
		if adminID != 0 {
			assignedBy = &adminID
		}

		userGroup := models.UserGroup{
			UserID:     userID,
			GroupID:    toGroupID,
			AssignedBy: assignedBy,
		}

		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&userGroup).Error; err != nil {
			return ErrInternalServer
		}

		logger.Info("[AUDIT] User moved: UserID=%d, From=%d, To=%d", userID, fromGroupID, toGroupID)
		return nil
	})
}

// GetMyGroups returns groups for a specific user with role and member count
func (s *GroupService) GetMyGroups(userID uint) ([]map[string]interface{}, error) {
	var results []struct {
		models.Group
		Role      string `gorm:"column:role"`
		UserCount int    `gorm:"column:user_count"`
	}

	// Explicit query through join table to ensure we get all active assignments
	err := s.db.Model(&models.Group{}).
		Select("groups.*, user_groups.role, (SELECT COUNT(id) FROM user_groups WHERE group_id = groups.id AND deleted_at IS NULL) as user_count").
		Joins("INNER JOIN user_groups ON user_groups.group_id = groups.id").
		Where("user_groups.user_id = ? AND user_groups.deleted_at IS NULL", userID).
		Scan(&results).Error

	if err != nil {
		logger.Error("Database error in GetMyGroups: %v", err)
		return nil, ErrInternalServer
	}

	response := make([]map[string]interface{}, len(results))
	for i, r := range results {
		response[i] = map[string]interface{}{
			"id":          r.ID,
			"name":        r.Name,
			"description": r.Description,
			"user_role":   r.Role,
			"user_count":  r.UserCount,
			"created_at":  r.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	return response, nil
}

// GetGroupDetailIfMember returns group details only if the user is a member
func (s *GroupService) GetGroupDetailIfMember(userID uint, groupID uint) (*models.Group, []map[string]interface{}, error) {
	// 1. Check membership
	var count int64
	if err := s.db.Model(&models.UserGroup{}).Where("user_id = ? AND group_id = ?", userID, groupID).Count(&count).Error; err != nil {
		logger.Error("Database error in GetGroupDetailIfMember (Count): %v", err)
		return nil, nil, ErrInternalServer
	}

	if count == 0 {
		return nil, nil, ErrAccessDenied
	}

	// 2. Reuse GetGroupByID for details
	return s.GetGroupByID(groupID)
}

func (s *GroupService) GetGlobalEvaluators() ([]map[string]interface{}, error) {
	var results []struct {
		ID      uint   `gorm:"column:id"`
		Name    string `gorm:"column:name"`
		Jabatan string `gorm:"column:jabatan"`
		NIP     string `gorm:"column:nip"`
	}

	err := s.db.Table("users").
		Select("users.id, sdm.nama as name, sdm.jabatan, users.nip").
		Joins("INNER JOIN sdm_apip sdm ON sdm.nip = users.nip").
		Where("sdm.jabatan ILIKE ?", "%Inspektur%").
		Scan(&results).Error

	if err != nil {
		logger.Error("Failed to fetch global evaluators: %v", err)
		return nil, ErrInternalServer
	}

	response := make([]map[string]interface{}, len(results))
	for i, r := range results {
		response[i] = map[string]interface{}{
			"id":         r.ID,
			"name":       r.Name,
			"nip":        r.NIP,
			"jabatan":    r.Jabatan,
			"group_role": "Inspektur",
		}
	}
	return response, nil
}
