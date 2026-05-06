package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// SDMController menangani operasi CRUD SDM APIP
type SDMController struct {
	sdmService    services.ISDMService
	importService services.ISDMImportService
}

// NewSDMController membuat controller SDM baru
func NewSDMController(sdmService services.ISDMService, importService services.ISDMImportService) *SDMController {
	return &SDMController{
		sdmService:    sdmService,
		importService: importService,
	}
}

// GetAll mengembalikan semua data SDM dengan paginasi
// GET /api/admin/sdm
func (sc *SDMController) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	order := c.DefaultQuery("order", "desc")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	sdmList, total, err := sc.sdmService.GetAll(page, perPage, search, sortBy, order)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data SDM", err.Error())
		return
	}

	// Konversi ke respons
	responseList := []models.SDMResponse{}
	for _, sdm := range sdmList {
		responseList = append(responseList, sdm.ToResponse())
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	utils.PaginatedSuccessResponse(c, http.StatusOK, "SDM data retrieved successfully", responseList, utils.Pagination{
		CurrentPage: page,
		PerPage:     perPage,
		TotalItems:  total,
		TotalPages:  totalPages,
	})
}

// GetByID mengembalikan satu data SDM berdasarkan ID
// GET /api/super-admin/sdm/:id
func (sc *SDMController) GetByID(c *gin.Context) {
	id := c.Param("id")

	sdm, err := sc.sdmService.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "SDM tidak ditemukan", "Tidak ada SDM yang ditemukan dengan ID tersebut")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "SDM data retrieved", sdm.ToResponse())
}

// Create membuat data SDM baru
// POST /api/super-admin/sdm
func (sc *SDMController) Create(c *gin.Context) {
	var req models.SDMCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	// Validasi format NIP
	if !utils.ValidateNIP(req.NIP) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format NIP tidak valid", "NIP harus 18 digit")
		return
	}

	// Validasi email
	if !utils.ValidateEmail(req.Email) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format email tidak valid", "Harap berikan alamat email yang valid")
		return
	}

	// Bersihkan input
	req.Nama = utils.SanitizeString(req.Nama)
	req.Jabatan = utils.SanitizeString(req.Jabatan)
	req.PangkatGolongan = utils.SanitizeString(req.PangkatGolongan)
	req.Pendidikan = utils.SanitizeString(req.Pendidikan)
	req.NomorHP = utils.SanitizeString(req.NomorHP)
	req.UnitKerja = utils.SanitizeString(req.UnitKerja)

	sdm, err := sc.sdmService.Create(req)
	if err != nil {
		if err.Error() == "nip already exists" {
			utils.ErrorResponse(c, http.StatusConflict, "NIP sudah ada", "Rekam SDM dengan NIP ini sudah ada")
		} else {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat SDM", err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "SDM created successfully", sdm.ToResponse())
}

// Update memperbarui data SDM yang sudah ada
// PUT /api/admin/sdm/:id
func (sc *SDMController) Update(c *gin.Context) {
	id := c.Param("id")

	var req models.SDMUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	// Validasi email jika diberikan
	if req.Email != "" && !utils.ValidateEmail(req.Email) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format email tidak valid", "Harap berikan alamat email yang valid")
		return
	}

	// Bersihkan input
	if req.Nama != "" {
		req.Nama = utils.SanitizeString(req.Nama)
	}
	if req.Jabatan != "" {
		req.Jabatan = utils.SanitizeString(req.Jabatan)
	}
	if req.UnitKerja != "" {
		req.UnitKerja = utils.SanitizeString(req.UnitKerja)
	}
	if req.PangkatGolongan != "" {
		req.PangkatGolongan = utils.SanitizeString(req.PangkatGolongan)
	}
	if req.Pendidikan != "" {
		req.Pendidikan = utils.SanitizeString(req.Pendidikan)
	}
	if req.NomorHP != "" {
		req.NomorHP = utils.SanitizeString(req.NomorHP)
	}

	sdm, err := sc.sdmService.Update(id, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memperbarui SDM", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "SDM updated successfully", sdm.ToResponse())
}

// Delete menghapus data SDM
// DELETE /api/admin/sdm/:id
func (sc *SDMController) Delete(c *gin.Context) {
	id := c.Param("id")

	err := sc.sdmService.Delete(id)
	if err != nil {
		if err.Error() == "cannot delete SDM: user account linked" {
			utils.ErrorResponse(c, http.StatusConflict, "Tidak dapat menghapus SDM", "Ada akun pengguna yang terhubung dengan SDM ini. Harap hapus akun pengguna terlebih dahulu.")
		} else {
			utils.ErrorResponse(c, http.StatusNotFound, "SDM tidak ditemukan", "Tidak ada SDM yang ditemukan dengan ID tersebut atau penghapusan gagal")
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "SDM deleted successfully", nil)
}

// GetStats mengembalikan statistik SDM untuk dashboard
// GET /api/admin/sdm/stats
func (sc *SDMController) GetStats(c *gin.Context) {
	stats, err := sc.sdmService.GetStats()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil statistik", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Statistics retrieved", stats)
}

// ImportExcel mengimpor data SDM dari file Excel
func (sc *SDMController) ImportExcel(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File wajib diisi", err.Error())
		return
	}

	// KEAMANAN: Batasi ukuran file yang diunggah menjadi 15MB
	if file.Size > 15*1024*1024 {
		utils.ErrorResponse(c, http.StatusBadRequest, "File terlalu besar", "Maksimal ukuran file adalah 15MB")
		return
	}

	// SECURITY: Validasi tipe ekstensi khusus Excel
	ext := filepath.Ext(file.Filename)
	if ext != ".xlsx" && ext != ".xls" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format tidak diizinkan", "Hanya file Excel (.xlsx / .xls) yang diperbolehkan")
		return
	}

	filename := fmt.Sprintf("temp_%d%s", time.Now().UnixNano(), ext)
	if err := c.SaveUploadedFile(file, filename); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan", err.Error())
		return
	}
	defer os.Remove(filename)

	result, err := sc.importService.ImportExcel(filename)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Impor gagal", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Import completed", result)
}
