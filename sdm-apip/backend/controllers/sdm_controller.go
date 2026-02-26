package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

// SDMController handles SDM APIP CRUD operations
type SDMController struct {
	sdmService    services.ISDMService
	importService services.ISDMImportService
}

// NewSDMController creates a new SDM controller
func NewSDMController(sdmService services.ISDMService, importService services.ISDMImportService) *SDMController {
	return &SDMController{
		sdmService:    sdmService,
		importService: importService,
	}
}

// GetAll returns all SDM data with pagination
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
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get SDM data", err.Error())
		return
	}

	// Convert to response
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

// GetByID returns a single SDM by ID
// GET /api/super-admin/sdm/:id
func (sc *SDMController) GetByID(c *gin.Context) {
	id := c.Param("id")

	sdm, err := sc.sdmService.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "SDM not found", "No SDM found with the given ID")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "SDM data retrieved", sdm.ToResponse())
}

// Create creates a new SDM record
// POST /api/super-admin/sdm
func (sc *SDMController) Create(c *gin.Context) {
	var req models.SDMCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Validate NIP format
	if !utils.ValidateNIP(req.NIP) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid NIP format", "NIP must be 18 digits")
		return
	}

	// Validate email
	if !utils.ValidateEmail(req.Email) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid email format", "Please provide a valid email address")
		return
	}

	// Sanitize
	req.Nama = utils.SanitizeString(req.Nama)
	req.Jabatan = utils.SanitizeString(req.Jabatan)
	req.PangkatGolongan = utils.SanitizeString(req.PangkatGolongan)
	req.Pendidikan = utils.SanitizeString(req.Pendidikan)
	req.NomorHP = utils.SanitizeString(req.NomorHP)
	req.UnitKerja = utils.SanitizeString(req.UnitKerja)

	sdm, err := sc.sdmService.Create(req)
	if err != nil {
		if err.Error() == "nip already exists" {
			utils.ErrorResponse(c, http.StatusConflict, "NIP already exists", "An SDM record with this NIP already exists")
		} else {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create SDM", err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "SDM created successfully", sdm.ToResponse())
}

// Update updates an existing SDM record
// PUT /api/admin/sdm/:id
func (sc *SDMController) Update(c *gin.Context) {
	id := c.Param("id")

	var req models.SDMUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Validate email if provided
	if req.Email != "" && !utils.ValidateEmail(req.Email) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid email format", "Please provide a valid email address")
		return
	}

	// Sanitize
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
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update SDM", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "SDM updated successfully", sdm.ToResponse())
}

// Delete deletes an SDM record
// DELETE /api/admin/sdm/:id
func (sc *SDMController) Delete(c *gin.Context) {
	id := c.Param("id")

	err := sc.sdmService.Delete(id)
	if err != nil {
		if err.Error() == "cannot delete SDM: user account linked" {
			utils.ErrorResponse(c, http.StatusConflict, "Cannot delete SDM", "There is a user account linked to this SDM. Please delete the user account first.")
		} else {
			utils.ErrorResponse(c, http.StatusNotFound, "SDM not found", "No SDM found with the given ID or deletion failed")
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "SDM deleted successfully", nil)
}

// GetStats returns SDM statistics for dashboard
// GET /api/admin/sdm/stats
func (sc *SDMController) GetStats(c *gin.Context) {
	stats, err := sc.sdmService.GetStats()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get stats", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Statistics retrieved", stats)
}

// ImportExcel imports SDM data from Excel file
func (sc *SDMController) ImportExcel(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File required", err.Error())
		return
	}

	filename := fmt.Sprintf("temp_%d.xlsx", time.Now().UnixNano())
	if err := c.SaveUploadedFile(file, filename); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Save failed", err.Error())
		return
	}
	defer os.Remove(filename)

	result, err := sc.importService.ImportExcel(filename)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Import failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Import completed", result)
}
