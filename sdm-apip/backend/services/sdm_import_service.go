package services

import (
	"fmt"
	"strconv"
	"strings"

	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"
	"sdm-apip-backend/utils"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type SDMImportResult struct {
	SuccessCount int      `json:"success_count"`
	Errors       []string `json:"errors"`
}

type ISDMImportService interface {
	ImportExcel(filePath string) (*SDMImportResult, error)
}

type SDMImportService struct {
	db *gorm.DB
}

func NewSDMImportService() ISDMImportService {
	return &SDMImportService{
		db: config.DB,
	}
}

func (s *SDMImportService) ImportExcel(filePath string) (*SDMImportResult, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("empty excel file")
	}

	// === HEADER DETECTION ===
	headerRowIndex := 0
	colMap := make(map[string]int)

	for i, row := range rows {
		for _, cell := range row {
			if strings.Contains(strings.ToLower(cell), "nip") {
				headerRowIndex = i
				break
			}
		}
	}

	for i, cell := range rows[headerRowIndex] {
		colMap[strings.ToLower(strings.TrimSpace(cell))] = i
	}

	getCol := func(names ...string) int {
		for _, name := range names {
			if idx, ok := colMap[name]; ok {
				return idx
			}
		}
		return -1
	}

	idxNIP := getCol("nip")
	idxNama := getCol("nama")
	idxEmail := getCol("email")
	idxJabatan := getCol("jabatan")
	idxPangkat := getCol("pangkat", "golongan", "pangkat/golongan")
	idxPendidikan := getCol("pendidikan")
	idxHP := getCol("hp", "handphone", "phone", "nomor hp", "no hp")

	if idxNIP == -1 {
		return nil, fmt.Errorf("NIP column not found")
	}

	result := &SDMImportResult{}
	getVal := func(row []string, idx int) string {
		if idx < 0 || idx >= len(row) {
			return ""
		}
		val := strings.TrimSpace(row[idx])
		if strings.Contains(val, "E+") {
			if f, err := strconv.ParseFloat(val, 64); err == nil {
				val = fmt.Sprintf("%.0f", f)
			}
		}
		return val
	}

	// === PROCESS ROWS ===
	for i := headerRowIndex + 1; i < len(rows); i++ {
		row := rows[i]
		nip := getVal(row, idxNIP)

		if nip == "" || !utils.ValidateNIP(nip) {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: NIP invalid", i+1))
			continue
		}

		tx := s.db.Begin()

		var sdm models.SDM
		if err := tx.Where("nip = ?", nip).First(&sdm).Error; err == nil {
			// UPDATE
			sdm.Nama = getVal(row, idxNama)
			sdm.Email = getVal(row, idxEmail)
			sdm.Jabatan = getVal(row, idxJabatan)
			sdm.PangkatGolongan = getVal(row, idxPangkat)
			sdm.Pendidikan = getVal(row, idxPendidikan)
			sdm.NomorHP = getVal(row, idxHP)

			if err := tx.Save(&sdm).Error; err != nil {
				tx.Rollback()
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: update failed", i+1))
				continue
			}
		} else {
			// CREATE
			newSDM := models.SDM{
				NIP:             nip,
				Nama:            getVal(row, idxNama),
				Email:           getVal(row, idxEmail),
				Jabatan:         getVal(row, idxJabatan),
				PangkatGolongan: getVal(row, idxPangkat),
				Pendidikan:      getVal(row, idxPendidikan),
				NomorHP:         getVal(row, idxHP),
				UnitKerja:       "-",
			}

			if err := tx.Create(&newSDM).Error; err != nil {
				tx.Rollback()
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: insert failed", i+1))
				continue
			}
		}

		tx.Commit()
		result.SuccessCount++
	}

	logger.Info("📥 SDM import completed: %d success", result.SuccessCount)
	return result, nil
}
