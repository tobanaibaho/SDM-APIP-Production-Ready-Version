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

	// 1. Statistik Ringkasan
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

	// Total Pengguna (yang menerima penilaian)
	var totalUsers int64
	s.buildAssessmentQuery(filter).Distinct("target_user_id").Count(&totalUsers)
	data.Summary.TotalUsers = totalUsers

	// Skor Min/Max (rata-rata per pengguna)
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

	// 2. Distribusi Skor
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

	// 3. Rincian Kategori
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
		Select("COALESCE(AVG(berorientasi_pelayanan), 0) as avg_ser, COALESCE(AVG(akuntabel), 0) as avg_aku, COALESCE(AVG(kompeten), 0) as avg_kom, COALESCE(AVG(harmonis), 0) as avg_har, COALESCE(AVG(loyal), 0) as avg_loy, COALESCE(AVG(adaptif), 0) as avg_ada, COALESCE(AVG(kolaboratif), 0) as avg_kol").
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

	// 4. Tren Performa (6 Bulan Terakhir)
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

	// 5. Performa Tertinggi & Terendah
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

	// PENGURUTAN AMAN (Daftar Putih)
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

	// Paginasi
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

func bulanIndonesia(month int) string {
	bulanID := []string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
	if month >= 1 && month <= 12 {
		return bulanID[month-1]
	}
	return fmt.Sprintf("Bulan-%d", month)
}

func (s *ReportService) ExportToExcel(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error) {
	details, _, err := s.GetDetailedReports(filter)
	if err != nil {
		return nil, err
	}
	dashData, err := s.GetDashboardData(filter)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data dashboard: %v", err)
	}

	f := excelize.NewFile()
	defer f.Close()

	// ── STYLES ──────────────────────────────────────────────────
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14, Color: "1E3A5F"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 9},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E3A5F"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "FFFFFF", Style: 1}, {Type: "right", Color: "FFFFFF", Style: 1}, {Type: "top", Color: "FFFFFF", Style: 1}, {Type: "bottom", Color: "FFFFFF", Style: 1}},
	})
	subHeaderStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "1E3A5F"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"D9E1F2"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "1E3A5F", Style: 1}, {Type: "bottom", Color: "1E3A5F", Style: 1}},
	})
	dataStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 9},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "CCCCCC", Style: 1}, {Type: "right", Color: "CCCCCC", Style: 1}, {Type: "top", Color: "CCCCCC", Style: 1}, {Type: "bottom", Color: "CCCCCC", Style: 1}},
	})
	avgRowStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 9, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"2E75B6"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "FFFFFF", Style: 1}, {Type: "right", Color: "FFFFFF", Style: 1}, {Type: "top", Color: "FFFFFF", Style: 1}, {Type: "bottom", Color: "FFFFFF", Style: 1}},
	})

	// ── SHEET 1: RINGKASAN ──────────────────────────────────────
	f.SetSheetName("Sheet1", "Ringkasan")
	f.SetCellValue("Ringkasan", "A1", "LAPORAN PENILAIAN KINERJA PEGAWAI APIP — BerAKHLAK")
	f.MergeCell("Ringkasan", "A1", "D1")
	f.SetCellStyle("Ringkasan", "A1", "D1", titleStyle)
	f.SetRowHeight("Ringkasan", 1, 30)
	f.SetCellValue("Ringkasan", "A2", fmt.Sprintf("Dicetak pada: %s", time.Now().Format("02 January 2006, 15:04 WIB")))
	f.MergeCell("Ringkasan", "A2", "D2")

	stats := [][]interface{}{
		{"Total Sesi Penilaian", dashData.Summary.TotalAssessments},
		{"Jumlah Pegawai Dinilai", dashData.Summary.TotalUsers},
		{"Rata-rata Nilai Keseluruhan", fmt.Sprintf("%.2f", dashData.Summary.AverageScore)},
		{"Nilai Tertinggi", fmt.Sprintf("%.2f", dashData.Summary.HighestScore)},
		{"Nilai Terendah", fmt.Sprintf("%.2f", dashData.Summary.LowestScore)},
	}
	for i, row := range stats {
		f.SetCellValue("Ringkasan", fmt.Sprintf("A%d", i+4), row[0])
		f.SetCellValue("Ringkasan", fmt.Sprintf("B%d", i+4), row[1])
		f.SetCellStyle("Ringkasan", fmt.Sprintf("A%d", i+4), fmt.Sprintf("A%d", i+4), subHeaderStyle)
	}
	f.SetCellValue("Ringkasan", "D3", "Rata-rata Per Indikator BerAKHLAK")
	f.SetCellStyle("Ringkasan", "D3", "D3", subHeaderStyle)
	for i, cat := range dashData.CategoryBreakdown {
		f.SetCellValue("Ringkasan", fmt.Sprintf("D%d", i+4), cat.Category)
		f.SetCellValue("Ringkasan", fmt.Sprintf("E%d", i+4), fmt.Sprintf("%.2f", cat.Average))
	}
	f.SetColWidth("Ringkasan", "A", "A", 32)
	f.SetColWidth("Ringkasan", "B", "C", 15)
	f.SetColWidth("Ringkasan", "D", "D", 30)
	f.SetColWidth("Ringkasan", "E", "E", 12)

	// ── SHEET 2: DETAIL PER SESI PENILAIAN ──────────────────────
	f.NewSheet("Detail Penilaian")
	f.SetCellValue("Detail Penilaian", "A1", "DETAIL PENILAIAN PER SESI")
	f.MergeCell("Detail Penilaian", "A1", "M1")
	f.SetCellStyle("Detail Penilaian", "A1", "M1", titleStyle)
	f.SetRowHeight("Detail Penilaian", 1, 25)

	headers2 := []string{"No", "Bulan", "Tanggal", "Nama Pegawai Dinilai", "Nama Penilai", "Ber. Pelayanan", "Akuntabel", "Kompeten", "Harmonis", "Loyal", "Adaptif", "Kolaboratif", "Rata-rata", "Komentar"}
	colWidths2 := []float64{5, 12, 14, 28, 28, 12, 12, 12, 12, 12, 12, 12, 11, 40}
	for i, head := range headers2 {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue("Detail Penilaian", cell, head)
		f.SetCellStyle("Detail Penilaian", cell, cell, headerStyle)
		if i < len(colWidths2) {
			col, _ := excelize.ColumnNumberToName(i + 1)
			f.SetColWidth("Detail Penilaian", col, col, colWidths2[i])
		}
	}
	f.SetRowHeight("Detail Penilaian", 2, 38)

	for i, row := range details {
		rowIdx := i + 3
		values := []interface{}{
			i + 1, bulanIndonesia(row.AssessmentMonth), row.Date.Format("02-01-2006"),
			row.TargetUserName, row.EvaluatorName,
			row.BerorientasiPelayanan, row.Akuntabel, row.Kompeten,
			row.Harmonis, row.Loyal, row.Adaptif, row.Kolaboratif,
			fmt.Sprintf("%.2f", row.AverageScore), row.Comment,
		}
		for j, val := range values {
			cell, _ := excelize.CoordinatesToCellName(j+1, rowIdx)
			f.SetCellValue("Detail Penilaian", cell, val)
			f.SetCellStyle("Detail Penilaian", cell, cell, dataStyle)
		}
	}

	// ── SHEET 3: REKAP PER PEGAWAI (dikelompokkan) ──────────────
	idx3, _ := f.NewSheet("Rekap Per Pegawai")

	// Kelompokkan data berdasarkan pegawai yang dinilai
	type userEntry struct {
		name        string
		assessments []models.AssessmentDetailRow
	}
	userMap := map[string]*userEntry{}
	userOrder := []string{}
	for _, row := range details {
		if _, ok := userMap[row.TargetUserName]; !ok {
			userMap[row.TargetUserName] = &userEntry{name: row.TargetUserName}
			userOrder = append(userOrder, row.TargetUserName)
		}
		userMap[row.TargetUserName].assessments = append(userMap[row.TargetUserName].assessments, row)
	}

	f.SetCellValue("Rekap Per Pegawai", "A1", "REKAP PENILAIAN PER PEGAWAI — SEMUA PENILAI")
	f.MergeCell("Rekap Per Pegawai", "A1", "M1")
	f.SetCellStyle("Rekap Per Pegawai", "A1", "M1", titleStyle)
	f.SetRowHeight("Rekap Per Pegawai", 1, 25)

	colWidths3 := []float64{5, 12, 14, 28, 12, 12, 12, 12, 12, 12, 12, 11, 40}
	subCols := []string{"No", "Bulan", "Tanggal", "Nama Penilai", "Ber. Pelayanan", "Akuntabel", "Kompeten", "Harmonis", "Loyal", "Adaptif", "Kolaboratif", "Rata-rata", "Komentar"}
	for i, w := range colWidths3 {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth("Rekap Per Pegawai", col, col, w)
	}

	currentRow := 2
	for _, key := range userOrder {
		ue := userMap[key]

		// Nama pegawai yang dinilai
		nameCell, _ := excelize.CoordinatesToCellName(1, currentRow)
		lastCell, _ := excelize.CoordinatesToCellName(13, currentRow)
		f.SetCellValue("Rekap Per Pegawai", nameCell, fmt.Sprintf("Pegawai: %s", ue.name))
		f.MergeCell("Rekap Per Pegawai", nameCell, lastCell)
		f.SetCellStyle("Rekap Per Pegawai", nameCell, lastCell, subHeaderStyle)
		f.SetRowHeight("Rekap Per Pegawai", currentRow, 18)
		currentRow++

		// Header kolom
		for j, h := range subCols {
			cell, _ := excelize.CoordinatesToCellName(j+1, currentRow)
			f.SetCellValue("Rekap Per Pegawai", cell, h)
			f.SetCellStyle("Rekap Per Pegawai", cell, cell, headerStyle)
		}
		f.SetRowHeight("Rekap Per Pegawai", currentRow, 30)
		currentRow++

		var tBer, tAku, tKom, tHar, tLoy, tAda, tKol, tAvg float64
		n := float64(len(ue.assessments))
		for i, a := range ue.assessments {
			vals := []interface{}{
				i + 1, bulanIndonesia(a.AssessmentMonth), a.Date.Format("02-01-2006"),
				a.EvaluatorName,
				a.BerorientasiPelayanan, a.Akuntabel, a.Kompeten,
				a.Harmonis, a.Loyal, a.Adaptif, a.Kolaboratif,
				fmt.Sprintf("%.2f", a.AverageScore), a.Comment,
			}
			for j, val := range vals {
				cell, _ := excelize.CoordinatesToCellName(j+1, currentRow)
				f.SetCellValue("Rekap Per Pegawai", cell, val)
				f.SetCellStyle("Rekap Per Pegawai", cell, cell, dataStyle)
			}
			tBer += float64(a.BerorientasiPelayanan)
			tAku += float64(a.Akuntabel)
			tKom += float64(a.Kompeten)
			tHar += float64(a.Harmonis)
			tLoy += float64(a.Loyal)
			tAda += float64(a.Adaptif)
			tKol += float64(a.Kolaboratif)
			tAvg += a.AverageScore
			currentRow++
		}

		// Baris rata-rata
		if n > 0 {
			avgVals := []interface{}{
				"", "RATA-RATA", "", fmt.Sprintf("%d penilai", int(n)),
				fmt.Sprintf("%.1f", tBer/n), fmt.Sprintf("%.1f", tAku/n), fmt.Sprintf("%.1f", tKom/n),
				fmt.Sprintf("%.1f", tHar/n), fmt.Sprintf("%.1f", tLoy/n), fmt.Sprintf("%.1f", tAda/n),
				fmt.Sprintf("%.1f", tKol/n), fmt.Sprintf("%.2f", tAvg/n), "",
			}
			for j, val := range avgVals {
				cell, _ := excelize.CoordinatesToCellName(j+1, currentRow)
				f.SetCellValue("Rekap Per Pegawai", cell, val)
				f.SetCellStyle("Rekap Per Pegawai", cell, cell, avgRowStyle)
			}
			currentRow++
		}
		currentRow++ // Baris kosong antar pegawai
	}
	f.SetActiveSheet(idx3)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	models.CreateAuditLog(s.db, &adminID, models.AuditActionReportExport, models.AuditStatusSuccess, ip, ua, "Export Excel Report (Enhanced)", nil)
	return buf.Bytes(), nil
}



func (s *ReportService) ExportToPDF(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error) {
	if filter.UserID != nil {
		return s.generateUserDetailPDF(filter, adminID, ip, ua)
	}
	return s.generateGlobalPDF(filter, adminID, ip, ua)
}

func (s *ReportService) generateGlobalPDF(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error) {
	dashData, err := s.GetDashboardData(filter)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data dashboard: %v", err)
	}
	details, _, err := s.GetDetailedReports(filter)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil detail laporan: %v", err)
	}

	// Kelompokkan data per pegawai yang dinilai
	type evalRow struct {
		EvaluatorName         string
		Bulan                 string
		Tanggal               string
		BerorientasiPelayanan int
		Akuntabel             int
		Kompeten              int
		Harmonis              int
		Loyal                 int
		Adaptif               int
		Kolaboratif           int
		AverageScore          float64
		Comment               string
	}
	type empBlock struct {
		Name string
		Rows []evalRow
	}
	empMap := map[string]*empBlock{}
	empOrder := []string{}
	for _, d := range details {
		if _, ok := empMap[d.TargetUserName]; !ok {
			empMap[d.TargetUserName] = &empBlock{Name: d.TargetUserName}
			empOrder = append(empOrder, d.TargetUserName)
		}
		empMap[d.TargetUserName].Rows = append(empMap[d.TargetUserName].Rows, evalRow{
			EvaluatorName:         d.EvaluatorName,
			Bulan:                 bulanIndonesia(d.AssessmentMonth),
			Tanggal:               d.Date.Format("02-01-2006"),
			BerorientasiPelayanan: d.BerorientasiPelayanan,
			Akuntabel:             d.Akuntabel,
			Kompeten:              d.Kompeten,
			Harmonis:              d.Harmonis,
			Loyal:                 d.Loyal,
			Adaptif:               d.Adaptif,
			Kolaboratif:           d.Kolaboratif,
			AverageScore:          d.AverageScore,
			Comment:               d.Comment,
		})
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(10, 12, 10)
	pdf.AddPage()

	// Header halaman pertama
	pdf.SetFont("Arial", "B", 15)
	pdf.CellFormat(0, 10, "LAPORAN REKAP PENILAIAN KINERJA PEGAWAI APIP", "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(0, 6, fmt.Sprintf("Dicetak pada: %s", time.Now().Format("02 January 2006, 15:04 WIB")), "", 1, "C", false, 0, "")
	pdf.Ln(4)

	// Ringkasan statistik
	pdf.SetFillColor(30, 58, 95)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(0, 8, "RINGKASAN STATISTIK", "0", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFillColor(217, 225, 242)
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, fmt.Sprintf("Total Sesi Penilaian: %d", dashData.Summary.TotalAssessments), "1", 0, "L", true, 0, "")
	pdf.CellFormat(60, 7, fmt.Sprintf("Jumlah Pegawai Dinilai: %d", dashData.Summary.TotalUsers), "1", 0, "L", true, 0, "")
	pdf.CellFormat(60, 7, fmt.Sprintf("Rata-rata Nilai: %.2f", dashData.Summary.AverageScore), "1", 0, "L", true, 0, "")
	pdf.CellFormat(60, 7, fmt.Sprintf("Nilai Tertinggi: %.2f | Terendah: %.2f", dashData.Summary.HighestScore, dashData.Summary.LowestScore), "1", 1, "L", true, 0, "")
	pdf.Ln(6)

	// Kolom header tabel penilai
	type col struct {
		Text  string
		Width float64
	}
	cols := []col{
		{"No", 8}, {"Bulan", 18}, {"Tanggal", 20}, {"Nama Penilai", 42},
		{"B.Pelayanan", 18}, {"Akuntabel", 18}, {"Kompeten", 18},
		{"Harmonis", 18}, {"Loyal", 16}, {"Adaptif", 16}, {"Kolaboratif", 20},
		{"Rata-rata", 18}, {"Komentar", 45},
	}

	for _, name := range empOrder {
		block := empMap[name]

		// Nama pegawai yang dinilai
		pdf.SetFillColor(30, 58, 95)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(0, 8, fmt.Sprintf("  Pegawai: %s", block.Name), "0", 1, "L", true, 0, "")
		pdf.SetTextColor(0, 0, 0)

		// Header kolom
		pdf.SetFillColor(46, 117, 182)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 7)
		for _, c := range cols {
			pdf.CellFormat(c.Width, 8, c.Text, "1", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)
		pdf.SetTextColor(0, 0, 0)

		// Baris data penilai
		var tBer, tAku, tKom, tHar, tLoy, tAda, tKol, tAvg float64
		n := float64(len(block.Rows))
		pdf.SetFont("Arial", "", 7)
		for i, r := range block.Rows {
			pdf.SetFillColor(255, 255, 255)
			if i%2 == 1 {
				pdf.SetFillColor(242, 245, 250)
			}
			pdf.CellFormat(8, 7, fmt.Sprintf("%d", i+1), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, r.Bulan, "1", 0, "C", true, 0, "")
			pdf.CellFormat(20, 7, r.Tanggal, "1", 0, "C", true, 0, "")
			pdf.CellFormat(42, 7, r.EvaluatorName, "1", 0, "L", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%d", r.BerorientasiPelayanan), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%d", r.Akuntabel), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%d", r.Kompeten), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%d", r.Harmonis), "1", 0, "C", true, 0, "")
			pdf.CellFormat(16, 7, fmt.Sprintf("%d", r.Loyal), "1", 0, "C", true, 0, "")
			pdf.CellFormat(16, 7, fmt.Sprintf("%d", r.Adaptif), "1", 0, "C", true, 0, "")
			pdf.CellFormat(20, 7, fmt.Sprintf("%d", r.Kolaboratif), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%.2f", r.AverageScore), "1", 0, "C", true, 0, "")
			pdf.CellFormat(45, 7, r.Comment, "1", 1, "L", true, 0, "")
			tBer += float64(r.BerorientasiPelayanan)
			tAku += float64(r.Akuntabel)
			tKom += float64(r.Kompeten)
			tHar += float64(r.Harmonis)
			tLoy += float64(r.Loyal)
			tAda += float64(r.Adaptif)
			tKol += float64(r.Kolaboratif)
			tAvg += r.AverageScore

			if pdf.GetY() > 188 {
				pdf.AddPage()
			}
		}

		// Baris rata-rata per pegawai
		if n > 0 {
			pdf.SetFillColor(46, 117, 182)
			pdf.SetTextColor(255, 255, 255)
			pdf.SetFont("Arial", "B", 7)
			pdf.CellFormat(8, 7, "", "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, "RERATA", "1", 0, "C", true, 0, "")
			pdf.CellFormat(20, 7, "", "1", 0, "C", true, 0, "")
			pdf.CellFormat(42, 7, fmt.Sprintf("%d Penilai", int(n)), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%.1f", tBer/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%.1f", tAku/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%.1f", tKom/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%.1f", tHar/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(16, 7, fmt.Sprintf("%.1f", tLoy/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(16, 7, fmt.Sprintf("%.1f", tAda/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(20, 7, fmt.Sprintf("%.1f", tKol/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(18, 7, fmt.Sprintf("%.2f", tAvg/n), "1", 0, "C", true, 0, "")
			pdf.CellFormat(45, 7, "", "1", 1, "C", true, 0, "")
			pdf.SetTextColor(0, 0, 0)
		}
		pdf.Ln(5)

		if pdf.GetY() > 185 {
			pdf.AddPage()
		}
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	models.CreateAuditLog(s.db, &adminID, models.AuditActionReportExport, models.AuditStatusSuccess, ip, ua, "Export Global PDF Report (Enhanced)", nil)
	return buf.Bytes(), nil
}


func (s *ReportService) generateUserDetailPDF(filter models.ReportFilter, adminID uint, ip, ua string) ([]byte, error) {
	details, _, err := s.GetDetailedReports(filter)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil detail laporan: %v", err)
	}
	if len(details) == 0 {
		return nil, fmt.Errorf("Tidak ada data laporan yang ditemukan untuk pengguna ini")
	}

	targetName := details[0].TargetUserName

	// Ambil jawaban per pertanyaan
	var detailIDs []uint
	for _, raw := range details {
		detailIDs = append(detailIDs, raw.ID)
	}
	var answers []models.AssessmentAnswer
	if len(detailIDs) > 0 {
		if err := s.db.Preload("Question").Where("peer_assessment_id IN ?", detailIDs).Find(&answers).Error; err != nil {
			return nil, fmt.Errorf("Gagal memuat jawaban: %v", err)
		}
	}
	answerMap := make(map[uint]map[uint]models.AssessmentAnswer)
	for _, a := range answers {
		if answerMap[a.PeerAssessmentID] == nil {
			answerMap[a.PeerAssessmentID] = make(map[uint]models.AssessmentAnswer)
		}
		answerMap[a.PeerAssessmentID][a.QuestionID] = a
	}

	pdf := gofpdf.New("P", "mm", "A4", "")

	for _, p := range details {
		pdf.AddPage()

		// Header
		pdf.SetFillColor(30, 58, 95)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 14)
		pdf.CellFormat(0, 10, "RAPOR EVALUASI KINERJA BerAKHLAK", "0", 1, "C", true, 0, "")
		pdf.SetTextColor(0, 0, 0)
		pdf.Ln(4)

		// Nama pegawai yang dinilai
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(40, 6, "Nama Pegawai:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 10)
		pdf.CellFormat(0, 6, targetName, "", 1, "L", false, 0, "")

		// Nama penilai
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(40, 6, "Dinilai Oleh:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 10)
		pdf.CellFormat(0, 6, fmt.Sprintf("%s — Grup: %s", p.EvaluatorName, p.GroupName), "", 1, "L", false, 0, "")

		// Tanggal dan skor rata-rata
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(40, 6, "Tanggal Penilaian:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 10)
		pdf.CellFormat(0, 6, fmt.Sprintf("%s  |  Bulan: %s  |  Rata-rata Skor: %.2f", p.Date.Format("02 January 2006"), bulanIndonesia(p.AssessmentMonth), p.AverageScore), "", 1, "L", false, 0, "")

		// Komentar
		if p.Comment != "" {
			pdf.SetFont("Arial", "B", 9)
			pdf.CellFormat(25, 5, "Komentar:", "", 0, "L", false, 0, "")
			pdf.SetFont("Arial", "", 9)
			pdf.MultiCell(0, 5, p.Comment, "", "L", false)
		}
		pdf.Ln(3)

		// Header tabel pertanyaan
		pdf.SetFillColor(46, 117, 182)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 9)
		pdf.CellFormat(45, 8, "Indikator", "1", 0, "C", true, 0, "")
		pdf.CellFormat(125, 8, "Kriteria / Pertanyaan", "1", 0, "C", true, 0, "")
		pdf.CellFormat(20, 8, "Nilai", "1", 1, "C", true, 0, "")
		pdf.SetTextColor(0, 0, 0)

		// Baris jawaban per pertanyaan
		pdf.SetFont("Arial", "", 8)
		pAnswers := answerMap[p.ID]
		for _, a := range pAnswers {
			curY := pdf.GetY()
			pdf.SetX(55) // Lebar indikator (45) + margin (10)
			pdf.MultiCell(125, 6, a.Question.Text, "1", "L", false)
			newY := pdf.GetY()
			height := newY - curY
			pdf.SetXY(10, curY)
			pdf.CellFormat(45, height, a.Question.Indicator, "1", 0, "C", false, 0, "")
			pdf.SetXY(180, curY)
			pdf.CellFormat(20, height, fmt.Sprintf("%d", a.Score), "1", 1, "C", false, 0, "")
		}
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	models.CreateAuditLog(s.db, &adminID, models.AuditActionReportExport, models.AuditStatusSuccess, ip, ua, fmt.Sprintf("Export Personal PDF Report User %v", *filter.UserID), nil)
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

	// Kueri dasar dimulai dari Pengguna yang memiliki NIP (Data pegawai)
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

	// Pengurutan - Petakan field urutan dari frontend ke kolom database yang valid
	sortBy := "sdm.nama" // Default sort by name
	if filter.SortBy != "" {
		// Map sort fields to valid columns in this query
		switch filter.SortBy {
		case "peer_assessments.created_at":
			sortBy = "sdm.nama" // Kembali ke nama karena created_at tidak tersedia di sini
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

	// Paginasi
	if filter.Page > 0 && filter.PageSize > 0 {
		query = query.Limit(filter.PageSize).Offset((filter.Page - 1) * filter.PageSize)
	}

	subqueryFilter := "AND deleted_at IS NULL"
	if filter.IncludeArchived {
		subqueryFilter = ""
	}

	// Bangun batasan (constraints) untuk subkueri
	if filter.StartDate != nil {
		// Gunakan penggabungan string manual untuk filter subkueri agar disuntikkan dengan aman
		// Kita memasukkan string tanggal. Catatan: pemformatan string mungkin sedikit rumit jika kita tidak melewatkannya sebagai argumen ke kueri utama, Tetapi karena Select tidak mudah menerima argumen tak terbatas untuk banyak subkueri kecuali kita menduplikatnya, kita dapat memformat tanggal secara kondisional karena ini adalah time/string yang diketik dengan kuat.
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

	// Subkueri dinamis menggunakan Join atau subkueri secara aman
	err := query.Select(fmt.Sprintf(`
		users.id as user_id, 
		sdm.nama as name, 
		sdm.nip as nip, 
		sdm.jabatan as jabatan,
		(SELECT role FROM user_groups WHERE user_id = users.id AND deleted_at IS NULL LIMIT 1) as group_role,
		sdm.unit_kerja,
		(SELECT COUNT(*) FROM peer_assessments WHERE target_user_id = users.id %[1]s) as assessments_received,
		(SELECT COUNT(*) FROM peer_assessments WHERE evaluator_id = users.id %[1]s) as assessments_given,
		(SELECT COUNT(*) FROM assessment_relations WHERE target_user_id = users.id AND deleted_at IS NULL) as received_needed,
		(SELECT COUNT(*) FROM assessment_relations WHERE evaluator_id = users.id AND deleted_at IS NULL) as given_needed,
		(SELECT COALESCE(AVG((berorientasi_pelayanan + akuntabel + kompeten + harmonis + loyal + adaptif + kolaboratif) / 7.0), 0) 
		 FROM peer_assessments WHERE target_user_id = users.id %[1]s) as average_score
	`, subqueryFilter)).
		Order(fmt.Sprintf("%s %s", sortBy, order)).
		Scan(&results).Error

	return results, total, err
}
