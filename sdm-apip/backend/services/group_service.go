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

// GetAllGroups mengembalikan semua grup dengan jumlah anggota, pengurutan, dan paginasi
func (s *GroupService) GetAllGroups(sortBy, order string, limit, offset int, includeArchived bool) ([]models.Group, int64, error) {
	var groups []models.Group
	var total int64

	// Anti-Penyalahgunaan: Validasi batasan limit
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

	// 1. Jumlah Total (Pra-filter/join)
	if err := baseQuery.Count(&total).Error; err != nil {
		logger.Error("Database error in GetAllGroups (Count): %v", err)
		return nil, 0, ErrInternalServer
	}

	// 2. Query dengan Join dan Group By untuk menghitung user_count (Mematuhi Soft Delete melalui baseQuery)
	query := baseQuery.
		Select("groups.*, COUNT(user_groups.id) as user_count").
		Joins("LEFT JOIN user_groups ON user_groups.group_id = groups.id").
		Group("groups.id")

	// 3. PENGURUTAN AMAN (Daftar Putih + Kolom Berkualitas)
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

	// 4. Eksekusi dengan paginasi
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

// GetGroupByID mengembalikan grup dengan informasi anggota yang detail (Tanpa N+1)
func (s *GroupService) GetGroupByID(id uint) (*models.Group, []map[string]interface{}, error) {
	var group models.Group
	if err := s.db.Unscoped().First(&group, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrGroupNotFound
		}
		return nil, nil, ErrInternalServer
	}

	// 1. Ambil hubungan anggota. Jika grup diarsipkan, gunakan Unscoped untuk melihat siapa anggotanya
	var userGroups []models.UserGroup
	ugQuery := s.db.Where("group_id = ?", id)
	if group.DeletedAt.Valid {
		ugQuery = ugQuery.Unscoped()
	}
	if err := ugQuery.Find(&userGroups).Error; err != nil {
		logger.Error("Database error in GetGroupByID (UserGroup lookup): %v", err)
		return nil, nil, ErrInternalServer
	}

	if len(userGroups) == 0 {
		return &group, []map[string]interface{}{}, nil
	}

	// 2. Kumpulkan ID Pengguna dan NIP
	userIDs := make([]uint, len(userGroups))
	roleMap := make(map[uint]string)
	for i, ug := range userGroups {
		userIDs[i] = ug.UserID
		roleMap[ug.UserID] = ug.Role
	}

	// 3. Ambil Pengguna beserta Perannya
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

	// 4. Dioptimalkan: Ambil semua data SDM dalam satu kueri
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

// CreateGroup membuat grup baru (Menangani pemulihan grup yang dihapus sementara/soft-deleted)
func (s *GroupService) CreateGroup(name, description string) (*models.Group, error) {
	name = strings.TrimSpace(name)
	if len(name) < 1 || len(name) > 100 {
		return nil, ErrInvalidGroupName
	}

	var group models.Group
	// Cek apakah grup sudah ada, termasuk yang dihapus sementara
	err := s.db.Unscoped().Where("name = ?", name).First(&group).Error
	if err == nil {
		if group.DeletedAt.Valid {
			// Menemukan grup yang dihapus dengan nama yang sama, pulihkan
			if err := s.db.Unscoped().Model(&group).Updates(map[string]interface{}{
				"deleted_at":  nil,
				"description": strings.TrimSpace(description),
			}).Error; err != nil {
				logger.Error("Failed to restore soft-deleted group: %v", err)
				return nil, ErrInternalServer
			}

			// Muat ulang untuk membersihkan DeletedAt di struct dan dapatkan timestamp terbaru
			if err := s.db.First(&group, group.ID).Error; err != nil {
				logger.Error("Failed to reload restored group: %v", err)
				return nil, ErrInternalServer
			}
			return &group, nil
		}
		// Grup sudah ada dan aktif
		return nil, ErrGroupNameExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		logger.Error("Database error in CreateGroup: %v", err)
		return nil, ErrInternalServer
	}

	// Tidak ditemukan dimanapun, buat baru
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

// UpdateGroup memperbarui grup yang sudah ada
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

		// Cek apakah ada grup lain (termasuk yang dihapus sementara) yang menggunakan nama ini
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

// DeleteGroup menghapus grup dan data terkaitnya (UserGroup dan PeerAssessment)
func (s *GroupService) DeleteGroup(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Cek apakah grup ada
		var group models.Group
		if err := tx.First(&group, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrGroupNotFound
			}
			return ErrInternalServer
		}

		// 2. Hapus sementara (soft-delete) grup
		if err := tx.Delete(&group).Error; err != nil {
			logger.Error("Failed to delete group: %v", err)
			return ErrInternalServer
		}

		// 3. Hapus sementara semua asosiasi pengguna di grup ini
		if err := tx.Where("group_id = ?", id).Delete(&models.UserGroup{}).Error; err != nil {
			logger.Error("Failed to delete user_groups for group %d: %v", id, err)
			return ErrInternalServer
		}

		// 4. Hapus sementara semua penilaian (assessment) di grup ini
		if err := tx.Where("group_id = ?", id).Delete(&models.PeerAssessment{}).Error; err != nil {
			logger.Error("Failed to delete peer_assessments for group %d: %v", id, err)
			return ErrInternalServer
		}

		logger.Info("[AUDIT] Group and children deleted: ID=%d", id)
		return nil
	})
}

// AssignUserToGroup menugaskan pengguna ke grup dengan pengecekan status, penanganan duplikat, dan pencatatan audit
func (s *GroupService) AssignUserToGroup(groupID uint, userID uint, role string, adminID uint) error {
	// 0. Peran bawaan: AT (Anggota Tim) adalah peran dasar untuk semua anggota grup
	if role == "" {
		role = "AT"
	}

	// 1. Cek status pengguna
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

	// 1.b Batasan: Administrator tidak dapat dimasukkan ke grup mana pun
	if user.RoleID == models.RoleSuperAdmin {
		return ErrAdminCannotBeInGroup
	}

	// 2. Cek keberadaan grup
	var group models.Group
	if err := s.db.First(&group, groupID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGroupNotFound
		}
		logger.Error("Database error in AssignUserToGroup (Group check): %v", err)
		return ErrInternalServer
	}

	// 3. Tolak peran yang tidak valid
	// Inspektur adalah peran global (dari sdm_apip.jabatan) — tidak ditetapkan di dalam grup.
	if role == "Inspektur" || role == "Ketua" || role == "Anggota" {
		return fmt.Errorf("Peran '%s' tidak valid. Gunakan AT, KT, atau Dalnis", role)
	}

	// 4. Aturan Peran Penghuni Tunggal: Hanya boleh ada SATU Dalnis dan SATU KT per grup
	if role == "Dalnis" || role == "KT" {
		var existingRole models.UserGroup
		err := s.db.Where("group_id = ? AND role = ? AND user_id != ?", group.ID, role, userID).First(&existingRole).Error
		if err == nil {
			roleName := map[string]string{
				"Dalnis": "Pengendali Teknis (Dalnis)",
				"KT":     "Ketua Tim (KT)",
			}[role]
			return fmt.Errorf("Grup ini sudah memiliki %s. Hapus %s yang ada terlebih dahulu sebelum menetapkan yang baru", roleName, roleName)
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			logger.Error("Database check error in AssignUserToGroup: %v", err)
			return ErrInternalServer
		}
	}

	// 4. UPSERT AMAN (SECURE UPSERT)
	var assignedBy *uint
	if adminID != 0 {
		assignedBy = &adminID
	}

	// Gunakan Transaksi (Transaction) demi keamanan
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var existing models.UserGroup
		// Cek yang sudah ada (termasuk yang dihapus sementara)
		result := tx.Unscoped().Where("user_id = ? AND group_id = ?", userID, group.ID).First(&existing)

		if result.Error == nil {
			// Ditemukan yang sudah ada, pulihkan dan perbarui
			if err := tx.Unscoped().Model(&existing).Updates(map[string]interface{}{
				"deleted_at":  nil,
				"assigned_by": assignedBy,
				"assigned_at": time.Now(),
				"role":        role,
			}).Error; err != nil {
				return err
			}
			// Muat ulang untuk memastikan instans di memori "aktif"
			return tx.First(&existing, existing.ID).Error
		} else if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Buat baru
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

// RemoveUserFromGroup menghapus pengguna dari sebuah grup
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

// MoveUserBetweenGroups menangani perpindahan/upsert atomik beserta pencatatan audit
func (s *GroupService) MoveUserBetweenGroups(userID, fromGroupID, toGroupID uint, adminID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Validasi Grup Tujuan
		var toGroup models.Group
		if err := tx.First(&toGroup, toGroupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrGroupNotFound
			}
			logger.Error("Database error in MoveUserBetweenGroups (Target group check): %v", err)
			return ErrInternalServer
		}

		// 2. Hapus dari semua grup lama untuk menegakkan kebijakan "hanya satu grup"
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserGroup{}).Error; err != nil {
			logger.Error("Database error in MoveUserBetweenGroups (Remove old groups): %v", err)
			return ErrInternalServer
		}

		// 3. Upsert ke grup baru
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

// GetMyGroups mengembalikan grup untuk pengguna tertentu beserta peran dan jumlah anggota
func (s *GroupService) GetMyGroups(userID uint) ([]map[string]interface{}, error) {
	var results []struct {
		models.Group
		Role      string `gorm:"column:role"`
		UserCount int    `gorm:"column:user_count"`
	}

	// Kueri eksplisit melalui tabel join untuk memastikan kita mendapatkan semua penugasan aktif
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

// GetGroupDetailIfMember mengembalikan detail grup hanya jika pengguna adalah anggota
func (s *GroupService) GetGroupDetailIfMember(userID uint, groupID uint) (*models.Group, []map[string]interface{}, error) {
	// 1. Cek keanggotaan
	var count int64
	if err := s.db.Model(&models.UserGroup{}).Where("user_id = ? AND group_id = ?", userID, groupID).Count(&count).Error; err != nil {
		logger.Error("Database error in GetGroupDetailIfMember (Count): %v", err)
		return nil, nil, ErrInternalServer
	}

	if count == 0 {
		return nil, nil, ErrAccessDenied
	}

	// 2. Gunakan kembali GetGroupByID untuk mengambil detail
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
