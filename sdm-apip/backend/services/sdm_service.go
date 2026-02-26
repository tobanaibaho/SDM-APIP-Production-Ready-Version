package services

import (
	"fmt"
	"sdm-apip-backend/config"
	"sdm-apip-backend/models"
	"strings"

	"gorm.io/gorm"
)

type ISDMService interface {
	GetAll(page, perPage int, search, sortBy, order string) ([]models.SDM, int64, error)
	GetByID(id string) (*models.SDM, error)
	Create(req models.SDMCreateRequest) (*models.SDM, error)
	Update(id string, req models.SDMUpdateRequest) (*models.SDM, error)
	Delete(id string) error
	GetStats() (map[string]interface{}, error)
}

type SDMService struct {
	db *gorm.DB
}

func NewSDMService() ISDMService {
	return &SDMService{
		db: config.DB,
	}
}

func (s *SDMService) GetAll(page, perPage int, search, sortBy, order string) ([]models.SDM, int64, error) {
	var sdmList []models.SDM
	var total int64

	offset := (page - 1) * perPage
	query := s.db.Model(&models.SDM{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("nip LIKE ? OR nama LIKE ? OR email LIKE ? OR jabatan LIKE ? OR pangkat_golongan LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	query.Count(&total)

	allowedSortColumns := map[string]bool{
		"nip":              true,
		"nama":             true,
		"email":            true,
		"jabatan":          true,
		"pangkat_golongan": true,
		"pendidikan":       true,
		"unit_kerja":       true,
		"created_at":       true,
		"nomor_hp":         true,
	}

	if !allowedSortColumns[sortBy] {
		sortBy = "created_at"
	}

	if strings.ToLower(order) != "asc" && strings.ToLower(order) != "desc" {
		order = "desc"
	}

	if err := query.Order(fmt.Sprintf("%s %s", sortBy, order)).Offset(offset).Limit(perPage).Find(&sdmList).Error; err != nil {
		return nil, 0, err
	}

	return sdmList, total, nil
}

func (s *SDMService) GetByID(id string) (*models.SDM, error) {
	var sdm models.SDM
	if err := s.db.First(&sdm, id).Error; err != nil {
		return nil, err
	}
	return &sdm, nil
}

func (s *SDMService) Create(req models.SDMCreateRequest) (*models.SDM, error) {
	// Check if NIP already exists
	var existing models.SDM
	if err := s.db.Where("nip = ?", req.NIP).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("nip already exists")
	}

	sdm := models.SDM{
		NIP:             req.NIP,
		Nama:            req.Nama,
		Email:           req.Email,
		Jabatan:         req.Jabatan,
		PangkatGolongan: req.PangkatGolongan,
		Pendidikan:      req.Pendidikan,
		NomorHP:         req.NomorHP,
		UnitKerja:       req.UnitKerja,
	}

	if err := s.db.Create(&sdm).Error; err != nil {
		return nil, err
	}

	return &sdm, nil
}

func (s *SDMService) Update(id string, req models.SDMUpdateRequest) (*models.SDM, error) {
	var sdm models.SDM
	if err := s.db.First(&sdm, id).Error; err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if req.Nama != "" {
		updates["nama"] = req.Nama
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Jabatan != "" {
		updates["jabatan"] = req.Jabatan
	}
	if req.UnitKerja != "" {
		updates["unit_kerja"] = req.UnitKerja
	}
	if req.PangkatGolongan != "" {
		updates["pangkat_golongan"] = req.PangkatGolongan
	}
	if req.Pendidikan != "" {
		updates["pendidikan"] = req.Pendidikan
	}
	if req.NomorHP != "" {
		updates["nomor_hp"] = req.NomorHP
	}

	if len(updates) > 0 {
		if err := s.db.Model(&sdm).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return &sdm, nil
}

func (s *SDMService) Delete(id string) error {
	var sdm models.SDM
	if err := s.db.First(&sdm, id).Error; err != nil {
		return err
	}

	// Check if there's a user linked to this SDM
	var user models.User
	if err := s.db.Where("nip = ?", sdm.NIP).First(&user).Error; err == nil {
		return fmt.Errorf("cannot delete SDM: user account linked")
	}

	return s.db.Delete(&sdm).Error
}

func (s *SDMService) GetStats() (map[string]interface{}, error) {
	// --- Core user counts ---
	var totalSDM, totalUsers, activeUsers, pendingUsers, totalGroups int64
	s.db.Model(&models.SDM{}).Count(&totalSDM)
	s.db.Model(&models.User{}).Count(&totalUsers)
	s.db.Model(&models.User{}).Where("status = ?", models.StatusActive).Count(&activeUsers)
	s.db.Model(&models.User{}).Where("status = ?", models.StatusPendingVerification).Count(&pendingUsers)
	s.db.Model(&models.Group{}).Where("deleted_at IS NULL").Count(&totalGroups)

	// --- Active period ---
	var activePeriod models.AssessmentPeriod
	activePeriodFound := false
	if err := s.db.Where("is_active = ? AND start_date <= NOW() AND end_date >= NOW()", true).
		Order("start_date DESC").First(&activePeriod).Error; err == nil {
		activePeriodFound = true
	}

	// --- Assessment progress for active period ---
	assessmentProgress := map[string]interface{}{
		"total_required":  0,
		"total_submitted": 0,
		"completion_pct":  0,
		"period_name":     "",
	}
	groupProgress := []map[string]interface{}{}

	if activePeriodFound {
		maxMonths := periodMaxMonthsSDM(activePeriod.Frequency)
		assessmentProgress["period_name"] = activePeriod.Name
		assessmentProgress["months_required"] = maxMonths

		// Total unique evaluator-target relations for this period
		var totalRelations int64
		s.db.Model(&models.AssessmentRelation{}).
			Where("period_id = ?", activePeriod.ID).
			Count(&totalRelations)
		totalRequired := int(totalRelations) * maxMonths

		// Total submitted assessments
		var totalSubmitted int64
		s.db.Model(&models.PeerAssessment{}).
			Where("period_id = ? AND deleted_at IS NULL", activePeriod.ID).
			Count(&totalSubmitted)

		pct := 0
		if totalRequired > 0 {
			pct = int((int64(totalSubmitted) * 100) / int64(totalRequired))
			if pct > 100 {
				pct = 100
			}
		}
		assessmentProgress["total_required"] = totalRequired
		assessmentProgress["total_submitted"] = int(totalSubmitted)
		assessmentProgress["completion_pct"] = pct

		// Per-group progress
		type GroupRow struct {
			GroupID   uint   `gorm:"column:group_id"`
			GroupName string `gorm:"column:group_name"`
		}
		var groupRows []GroupRow
		s.db.Table("groups").
			Select("groups.id as group_id, groups.name as group_name").
			Where("groups.deleted_at IS NULL").
			Scan(&groupRows)

		for _, g := range groupRows {
			var gRelations int64
			s.db.Model(&models.AssessmentRelation{}).
				Where("period_id = ? AND group_id = ?", activePeriod.ID, g.GroupID).
				Count(&gRelations)

			var gSubmitted int64
			s.db.Model(&models.PeerAssessment{}).
				Where("period_id = ? AND group_id = ? AND deleted_at IS NULL", activePeriod.ID, g.GroupID).
				Count(&gSubmitted)

			gRequired := int(gRelations) * maxMonths
			gPct := 0
			if gRequired > 0 {
				gPct = int((gSubmitted * 100) / int64(gRequired))
				if gPct > 100 {
					gPct = 100
				}
			}
			groupProgress = append(groupProgress, map[string]interface{}{
				"group_id":   g.GroupID,
				"group_name": g.GroupName,
				"required":   gRequired,
				"submitted":  int(gSubmitted),
				"pct":        gPct,
			})
		}
	}

	// --- Never-logged-in users (active accounts, no last_login) ---
	type NeverLoginUser struct {
		UserID   uint   `gorm:"column:user_id" json:"user_id"`
		NIP      string `gorm:"column:nip" json:"nip"`
		Nama     string `gorm:"column:nama" json:"nama"`
		Jabatan  string `gorm:"column:jabatan" json:"jabatan"`
		JoinedAt string `gorm:"column:joined_at" json:"joined_at"`
	}
	var neverLogin []NeverLoginUser
	s.db.Table("users").
		Select("users.id as user_id, users.nip, sdm_apip.nama, sdm_apip.jabatan, users.created_at as joined_at").
		Joins("LEFT JOIN sdm_apip ON sdm_apip.nip = users.nip").
		Where("users.status IN ? AND users.last_login_at IS NULL AND users.role_id != 1",
			[]string{string(models.StatusActive), string(models.StatusEmailVerified)}).
		Order("users.created_at DESC").
		Limit(10).
		Scan(&neverLogin)

	// --- Monthly submission trend (last 6 calendar months) ---
	type MonthCount struct {
		Month string `gorm:"column:month" json:"month"`
		Count int64  `gorm:"column:count" json:"count"`
	}
	var monthlyTrend []MonthCount
	s.db.Table("peer_assessments").
		Select("TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count").
		Where("deleted_at IS NULL AND created_at >= NOW() - INTERVAL '6 months'").
		Group("month").
		Order("month ASC").
		Scan(&monthlyTrend)

	// --- Unit kerja distribution ---
	type UnitKerjaStats struct {
		UnitKerja string `json:"unit_kerja"`
		Count     int64  `json:"count"`
	}
	var unitKerjaStats []UnitKerjaStats
	s.db.Model(&models.SDM{}).
		Select("unit_kerja, COUNT(*) as count").
		Group("unit_kerja").
		Having("unit_kerja IS NOT NULL AND unit_kerja != ''").
		Order("count DESC").
		Limit(5).
		Scan(&unitKerjaStats)

	return map[string]interface{}{
		"total_sdm":           totalSDM,
		"total_users":         totalUsers,
		"active_users":        activeUsers,
		"pending_users":       pendingUsers,
		"total_groups":        totalGroups,
		"active_period":       activePeriodFound,
		"active_period_name":  activePeriod.Name,
		"unit_kerja_dist":     unitKerjaStats,
		"assessment_progress": assessmentProgress,
		"group_progress":      groupProgress,
		"never_login_users":   neverLogin,
		"monthly_trend":       monthlyTrend,
	}, nil
}

// periodMaxMonthsSDM mirrors periodMaxMonths from assessment_service without circular dependency
func periodMaxMonthsSDM(frequency string) int {
	switch frequency {
	case "monthly":
		return 1
	case "quarterly":
		return 3
	case "semi_annual":
		return 6
	case "annual":
		return 12
	default:
		return 1
	}
}
