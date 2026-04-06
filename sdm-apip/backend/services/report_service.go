package services

import (
	"bytes"
	"fmt"
	"math"
	"sdm-apip-backend/config"
	"sdm-apip-backend/models"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf/v2"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type IReportService interface {
	GetDashboardData(filter models.ReportFilter) (*models.DashboardData, error)
	GetDetailedReports(filter models.ReportFilter) ([]models.AssessmentDetailRow, int64, error)
	ExportToExcel(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error)
	ExportToPDF(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error)
	GetUnitKerjaOptions() ([]string, error)
	GetUserReports(filter models.ReportFilter) ([]models.UserReportRow, int64, error)
}

type ReportService struct {
	db *gorm.DB
}

func NewReportService() IReportService {
	return &ReportService{
		db: config.DB,
	}
}

func (s *ReportService) buildAssessmentQuery(filter models.ReportFilter) *gorm.DB {
	query := s.db.Model(&models.PeerAssessment{}).
		Joins("Join users as target_user ON target_user.id = peer_assessments.target_user_id").
		Joins("Join sdm_apip as sdm ON sdm.nip = target_user.nip").
		Joins("Left Join groups ON groups.id = peer_assessments.group_id")

	if filter.IncludeArchived {
		query = query.Unscoped()
	}

	if filter.StartDate != nil {
		query = query.Where("peer_assessments.created_at >= ?", filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("peer_assessments.created_at <= ?", filter.EndDate)
	}
	if filter.GroupID != nil && *filter.GroupID != 0 {
		query = query.Where("peer_assessments.group_id = ?", filter.GroupID)
	}
	if filter.AssessmentMonth != nil && *filter.AssessmentMonth != 0 {
		query = query.Where("peer_assessments.assessment_month = ?", filter.AssessmentMonth)
	}
	if filter.UnitKerja != "" {
		query = query.Where("sdm.unit_kerja = ?", filter.UnitKerja)
	}
	if filter.UserID != nil && *filter.UserID != 0 {
		query = query.Where("peer_assessments.target_user_id = ?", filter.UserID)
	}
	if filter.Search != "" {
		searchTerm := "%" + filter.Search + "%"
		query = query.Where("(sdm.nama ILIKE ? OR sdm.nip ILIKE ?)", searchTerm, searchTerm)
	}

	return query
}

func (s *ReportService) GetDashboardData(filter models.ReportFilter) (*models.DashboardData, error) {
	data := &models.DashboardData{}

	// 1. Summary Statistics
	query := s.buildAssessmentQuery(filter)

	var stats struct {
		TotalAssessments int64
		AvgTotal         float64
	}

	err := query.Select("COUNT(*) as total_assessments, COALESCE(AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0), 0) as avg_total").
		Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	data.Summary.TotalAssessments = stats.TotalAssessments
	data.Summary.AverageScore = math.Round(stats.AvgTotal*100) / 100

	// Total Users (who received assessment)
	var totalUsers int64
	s.buildAssessmentQuery(filter).Distinct("target_user_id").Count(&totalUsers)
	data.Summary.TotalUsers = totalUsers

	// Min/Max scores (per user average)
	var minMax struct {
		Min float64
		Max float64
	}
	s.buildAssessmentQuery(filter).
		Select("COALESCE(AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0), 0) as avg_score").
		Group("target_user_id").
		Order("avg_score ASC").
		Limit(1).
		Scan(&minMax.Min)

	s.buildAssessmentQuery(filter).
		Select("COALESCE(AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0), 0) as avg_score").
		Group("target_user_id").
		Order("avg_score DESC").
		Limit(1).
		Scan(&minMax.Max)

	data.Summary.LowestScore = math.Round(minMax.Min*100) / 100
	data.Summary.HighestScore = math.Round(minMax.Max*100) / 100

	// 2. Score Distribution
	distribution := []models.ScoreDistribution{
		{Range: "1.0 - 2.0", Count: 0},
		{Range: "2.1 - 3.0", Count: 0},
		{Range: "3.1 - 4.0", Count: 0},
		{Range: "4.1 - 5.0", Count: 0},
	}

	var userScores []float64
	s.buildAssessmentQuery(filter).
		Select("COALESCE(AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0), 0) as avg_score").
		Group("target_user_id").
		Scan(&userScores)

	for _, score := range userScores {
		if score <= 2.0 {
			distribution[0].Count++
		} else if score <= 3.0 {
			distribution[1].Count++
		} else if score <= 4.0 {
			distribution[2].Count++
		} else {
			distribution[3].Count++
		}
	}
	data.ScoreDistribution = distribution

	// 3. Category Breakdown
	var catStats struct {
		AvgSer float64
		AvgAku float64
		AvgKom float64
		AvgHar float64
		AvgLoy float64
		AvgAda float64
		AvgKol float64
	}
	s.buildAssessmentQuery(filter).
		Select("COALESCE(AVG(berorientasi_pelayanan), 0), COALESCE(AVG(akuntabel), 0), COALESCE(AVG(kompeten), 0), COALESCE(AVG(harmonis), 0), COALESCE(AVG(loyal), 0), COALESCE(AVG(adaptif), 0), COALESCE(AVG(kolaboratif), 0)").
		Scan(&catStats)

	data.CategoryBreakdown = []models.CategoryBreakdown{
		{Category: "Berorientasi Pelayanan", Average: math.Round(catStats.AvgSer*100) / 100},
		{Category: "Akuntabel", Average: math.Round(catStats.AvgAku*100) / 100},
		{Category: "Kompeten", Average: math.Round(catStats.AvgKom*100) / 100},
		{Category: "Harmonis", Average: math.Round(catStats.AvgHar*100) / 100},
		{Category: "Loyal", Average: math.Round(catStats.AvgLoy*100) / 100},
		{Category: "Adaptif", Average: math.Round(catStats.AvgAda*100) / 100},
		{Category: "Kolaboratif", Average: math.Round(catStats.AvgKol*100) / 100},
	}

	// 4. Performance Trend (Last 6 Months)
	var trendData []models.TrendData
	for i := 5; i >= 0; i-- {
		targetDate := time.Now().AddDate(0, -i, 0)
		month := targetDate.Month()
		year := targetDate.Year()

		var mAvg float64
		s.buildAssessmentQuery(filter).
			Where("EXTRACT(MONTH FROM peer_assessments.created_at) = ? AND EXTRACT(YEAR FROM peer_assessments.created_at) = ?", int(month), year).
			Select("COALESCE(AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0), 0)").
			Scan(&mAvg)

		trendData = append(trendData, models.TrendData{
			Label: targetDate.Format("Jan 2006"),
			Value: math.Round(mAvg*100) / 100,
		})
	}
	data.PerformanceTrend = trendData

	// 5. Top & Low Performers
	var performers []models.PerformerInfo
	s.buildAssessmentQuery(filter).
		Select("target_user.id as user_id, sdm.nama as name, sdm.nip as nip, sdm.unit_kerja as unit_kerja, AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0) as score").
		Group("target_user.id, sdm.nama, sdm.nip, sdm.unit_kerja").
		Order("score DESC").
		Limit(5).
		Scan(&performers)
	data.TopPerformers = performers

	var lowPerformers []models.PerformerInfo
	s.buildAssessmentQuery(filter).
		Select("target_user.id as user_id, sdm.nama as name, sdm.nip as nip, sdm.unit_kerja as unit_kerja, AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0) as score").
		Group("target_user.id, sdm.nama, sdm.nip, sdm.unit_kerja").
		Order("score ASC").
		Limit(5).
		Scan(&lowPerformers)
	data.LowPerformers = lowPerformers

	return data, nil
}

func (s *ReportService) GetDetailedReports(filter models.ReportFilter) ([]models.AssessmentDetailRow, int64, error) {
	var results []models.AssessmentDetailRow
	var total int64

	query := s.buildAssessmentQuery(filter)
	query.Count(&total)

	// SECURE SORTING (Whitelist)
	allowedSort := map[string]string{
		"date":          "peer_assessments.created_at",
		"created_at":    "peer_assessments.created_at",
		"evaluator":     "evaluator_sdm.nama",
		"target":        "sdm.nama",
		"unit_kerja":    "sdm.unit_kerja",
		"group_role":    "group_role",
		"average_score": "average_score",
	}

	sortBy, ok := allowedSort[filter.SortBy]
	if !ok {
		sortBy = "peer_assessments.created_at"
	}

	order := "DESC"
	if strings.ToUpper(filter.Order) == "ASC" {
		order = "ASC"
	}

	// Pagination
	if filter.Page > 0 && filter.PageSize > 0 {
		query = query.Limit(filter.PageSize).Offset((filter.Page - 1) * filter.PageSize)
	}

	targetUgFilter := "AND target_ug.deleted_at IS NULL"
	if filter.IncludeArchived {
		targetUgFilter = ""
	}

	err := query.Select(`
		peer_assessments.id, 
		peer_assessments.period_id,
		peer_assessments.assessment_month,
		peer_assessments.created_at as date,
		evaluator_sdm.nama as evaluator_name,
		sdm.nama as target_user_name,
		sdm.nip as target_nip,
		groups.name as group_name,
		COALESCE(target_ug.role, 'Anggota') as group_role,
		sdm.unit_kerja,
		berorientasi_pelayanan, akuntabel, kompeten, harmonis, loyal, adaptif, kolaboratif,
		(berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0 as average_score,
		comment
	`).
		Joins("Join users as evaluator_user ON evaluator_user.id = peer_assessments.evaluator_id").
		Joins("Join sdm_apip as evaluator_sdm ON evaluator_sdm.nip = evaluator_user.nip").
		Joins(fmt.Sprintf("Left Join user_groups as target_ug ON target_ug.user_id = peer_assessments.target_user_id AND target_ug.group_id = peer_assessments.group_id %s", targetUgFilter)).
		Order(fmt.Sprintf("%s %s", sortBy, order)).
		Scan(&results).Error

	return results, total, err
}

func (s *ReportService) ExportToExcel(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error) {
	details, _, err := s.GetDetailedReports(filter)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	defer f.Close()

	// Sheet 1: Summary
	f.SetSheetName("Sheet1", "Ringkasan")
	dashData, err := s.GetDashboardData(filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard data: %v", err)
	}

	f.SetCellValue("Ringkasan", "A1", "LAPORAN PENILAIAN PEER ASSESSMENT")
	f.MergeCell("Ringkasan", "A1", "D1")

	f.SetCellValue("Ringkasan", "A3", "Total Penilaian")
	f.SetCellValue("Ringkasan", "B3", dashData.Summary.TotalAssessments)
	f.SetCellValue("Ringkasan", "A4", "Rata-rata Nilai")
	f.SetCellValue("Ringkasan", "B4", dashData.Summary.AverageScore)
	f.SetCellValue("Ringkasan", "A5", "Total User Dinilai")
	f.SetCellValue("Ringkasan", "B5", dashData.Summary.TotalUsers)

	// Sheet 2: Detail Penilaian
	index, _ := f.NewSheet("Detail Penilaian")
	headers := []string{"ID", "Bulan Ke", "Tanggal", "Penilai", "Nama Pegawai", "NIP", "Grup", "Peran", "Unit Kerja", "Berorientasi Pelayanan", "Akuntabel", "Kompeten", "Harmonis", "Loyal", "Adaptif", "Kolaboratif", "Rata-rata", "Komentar"}
	for i, head := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue("Detail Penilaian", cell, head)
	}

	for i, row := range details {
		rowIdx := i + 2
		
		bulanNama := fmt.Sprintf("Ke-%d", row.AssessmentMonth)
		if row.AssessmentMonth >= 1 {
			bulanID := []string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
			bulanNama = bulanID[(row.AssessmentMonth-1)%12]
		}

		f.SetCellValue("Detail Penilaian", fmt.Sprintf("A%d", rowIdx), row.ID)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("B%d", rowIdx), bulanNama)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("C%d", rowIdx), row.Date.Format("2006-01-02"))
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("D%d", rowIdx), row.EvaluatorName)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("E%d", rowIdx), row.TargetUserName)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("F%d", rowIdx), row.TargetNIP)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("G%d", rowIdx), row.GroupName)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("H%d", rowIdx), row.GroupRole)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("I%d", rowIdx), row.UnitKerja)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("J%d", rowIdx), row.BerorientasiPelayanan)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("K%d", rowIdx), row.Akuntabel)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("L%d", rowIdx), row.Kompeten)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("M%d", rowIdx), row.Harmonis)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("N%d", rowIdx), row.Loyal)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("O%d", rowIdx), row.Adaptif)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("P%d", rowIdx), row.Kolaboratif)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("Q%d", rowIdx), row.AverageScore)
		f.SetCellValue("Detail Penilaian", fmt.Sprintf("R%d", rowIdx), row.Comment)
	}
	f.SetActiveSheet(index)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}

	// Audit Log
	models.CreateAuditLog(s.db, &adminID, models.AuditActionReportExport, models.AuditStatusSuccess, ip, ua, "Export Excel Report", nil)

	return buf.Bytes(), nil
}

func (s *ReportService) ExportToPDF(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error) {
	dashData, err := s.GetDashboardData(filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard data: %v", err)
	}

	details, _, err := s.GetDetailedReports(filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get detailed reports: %v", err)
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()

	// Header
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "LAPORAN RESMI PENILAIAN PERFORMA PEGAWAI")
	pdf.Ln(8)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 10, fmt.Sprintf("Dicetak pada: %s", time.Now().Format("02 Jan 2006 15:04")))
	pdf.Ln(12)

	// Summary Cards
	pdf.SetFillColor(240, 240, 240)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(50, 10, "Ringkasan Statistik", "1", 1, "C", true, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(50, 8, fmt.Sprintf("Total Penilaian: %d", dashData.Summary.TotalAssessments), "1", 1, "L", false, 0, "")
	pdf.CellFormat(50, 8, fmt.Sprintf("Rata-rata Nilai: %.2f", dashData.Summary.AverageScore), "1", 1, "L", false, 0, "")
	pdf.CellFormat(50, 8, fmt.Sprintf("User Dinilai: %d", dashData.Summary.TotalUsers), "1", 1, "L", false, 0, "")
	pdf.Ln(10)

	// Table Detail
	pdf.SetFont("Arial", "B", 10)
	cols := []struct {
		Text  string
		Width float64
	}{
		{"No", 10}, {"Bulan", 20}, {"Tanggal", 22}, {"Nama Pegawai", 45}, {"NIP", 30}, {"Peran", 22}, {"Unit Kerja", 43}, {"Nilai", 15}, {"Komentar", 68},
	}
	for _, col := range cols {
		pdf.CellFormat(col.Width, 10, col.Text, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Arial", "", 9)
	for i, row := range details {
		bulanNama := fmt.Sprintf("Ke-%d", row.AssessmentMonth)
		if row.AssessmentMonth >= 1 {
			bulanID := []string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
			bulanNama = bulanID[(row.AssessmentMonth-1)%12]
		}

		pdf.CellFormat(10, 8, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(20, 8, bulanNama, "1", 0, "C", false, 0, "")
		pdf.CellFormat(22, 8, row.Date.Format("02-01-2006"), "1", 0, "L", false, 0, "")
		pdf.CellFormat(45, 8, row.TargetUserName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 8, row.TargetNIP, "1", 0, "L", false, 0, "")
		pdf.CellFormat(22, 8, row.GroupRole, "1", 0, "L", false, 0, "")
		pdf.CellFormat(43, 8, row.UnitKerja, "1", 0, "L", false, 0, "")
		pdf.CellFormat(15, 8, fmt.Sprintf("%.2f", row.AverageScore), "1", 0, "C", false, 0, "")
		pdf.CellFormat(68, 8, row.Comment, "1", 1, "L", false, 0, "")

		if pdf.GetY() > 180 {
			pdf.AddPage()
		}
	}

	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return nil, err
	}

	// Audit Log
	models.CreateAuditLog(s.db, &adminID, models.AuditActionReportExport, models.AuditStatusSuccess, ip, ua, "Export PDF Report", nil)

	return buf.Bytes(), nil
}

func (s *ReportService) GetUnitKerjaOptions() ([]string, error) {
	var options []string
	err := s.db.Model(&models.SDM{}).Distinct().Order("unit_kerja ASC").Pluck("unit_kerja", &options).Error
	return options, err
}

func (s *ReportService) GetUserReports(filter models.ReportFilter) ([]models.UserReportRow, int64, error) {
	var results []models.UserReportRow
	var total int64

	// Base query starts from Users who have an NIP (Employee data)
	query := s.db.Table("users").
		Select("users.id as user_id, sdm.nama as name, sdm.nip as nip, sdm.jabatan as jabatan, sdm.unit_kerja").
		Joins("Join sdm_apip as sdm ON sdm.nip = users.nip")

	if filter.UnitKerja != "" {
		query = query.Where("sdm.unit_kerja = ?", filter.UnitKerja)
	}

	if filter.Search != "" {
		searchTerm := "%" + filter.Search + "%"
		query = query.Where("(sdm.nama ILIKE ? OR sdm.nip ILIKE ?)", searchTerm, searchTerm)
	}

	query.Count(&total)

	// Sorting - Map frontend sort fields to valid database columns
	sortBy := "sdm.nama" // Default sort by name
	if filter.SortBy != "" {
		// Map sort fields to valid columns in this query
		switch filter.SortBy {
		case "peer_assessments.created_at":
			sortBy = "sdm.nama" // Fallback to name since created_at not available here
		case "average_score":
			sortBy = "average_score"
		case "name":
			sortBy = "sdm.nama"
		case "unit_kerja":
			sortBy = "sdm.unit_kerja"
		default:
			sortBy = "sdm.nama"
		}
	}
	order := "ASC"
	if strings.ToUpper(filter.Order) == "DESC" {
		order = "DESC"
	}

	// Pagination
	if filter.Page > 0 && filter.PageSize > 0 {
		query = query.Limit(filter.PageSize).Offset((filter.Page - 1) * filter.PageSize)
	}

	subqueryFilter := "AND deleted_at IS NULL"
	if filter.IncludeArchived {
		subqueryFilter = ""
	}

	// Build constraints for subqueries
	if filter.StartDate != nil {
		// Use manual string concatenation for subquery filter to inject safely
		// We insert the date string. Note: string formatting might be tricky if we don't pass it as an argument to the main query, But since Select doesn't easily take infinite args for multiple subqueries unless we duplicate them, we can format the date conditionally since it's a strongly typed time/string.
		dateStr := filter.StartDate.Format("2006-01-02 15:04:05")
		subqueryFilter += fmt.Sprintf(" AND created_at >= '%s'", dateStr)
	}
	if filter.EndDate != nil {
		dateStr := filter.EndDate.Format("2006-01-02 15:04:05")
		subqueryFilter += fmt.Sprintf(" AND created_at <= '%s'", dateStr)
	}
	if filter.AssessmentMonth != nil && *filter.AssessmentMonth != 0 {
		subqueryFilter += fmt.Sprintf(" AND assessment_month = %d", *filter.AssessmentMonth)
	}

	// Dynamic subqueries using Joins or subqueries safely
	err := query.Select(fmt.Sprintf(`
		users.id as user_id, 
		sdm.nama as name, 
		sdm.nip as nip, 
		sdm.jabatan as jabatan,
		(SELECT role FROM user_groups WHERE user_id = users.id AND deleted_at IS NULL LIMIT 1) as group_role,
		sdm.unit_kerja,
		(SELECT COUNT(*) FROM peer_assessments WHERE target_user_id = users.id %[1]s) as assessments_received,
		(SELECT COUNT(*) FROM peer_assessments WHERE evaluator_id = users.id %[1]s) as assessments_given,
		(SELECT COALESCE(AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0), 0) 
		 FROM peer_assessments WHERE target_user_id = users.id %[1]s) as average_score
	`, subqueryFilter)).
		Order(fmt.Sprintf("%s %s", sortBy, order)).
		Scan(&results).Error

	return results, total, err
}
