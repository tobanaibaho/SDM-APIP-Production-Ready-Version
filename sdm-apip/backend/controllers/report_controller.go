package controllers

import (
	"fmt"
	"net/http"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type ReportController struct {
	reportService services.IReportService
}

func NewReportController(reportService services.IReportService) *ReportController {
	return &ReportController{
		reportService: reportService,
	}
}

func (ctrl *ReportController) parseFilter(c *gin.Context) models.ReportFilter {
	filter := models.ReportFilter{}

	if start := c.Query("start_date"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			filter.StartDate = &t
		}
	}
	if end := c.Query("end_date"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			// Tetapkan ke akhir hari
			t = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
			filter.EndDate = &t
		}
	}
	if gid := c.Query("group_id"); gid != "" {
		if id, err := strconv.ParseUint(gid, 10, 32); err == nil {
			uintID := uint(id)
			filter.GroupID = &uintID
		}
	}
	if uid := c.Query("user_id"); uid != "" {
		if id, err := strconv.ParseUint(uid, 10, 32); err == nil {
			uintID := uint(id)
			filter.UserID = &uintID
		}
	}

	filter.UnitKerja = c.Query("unit_kerja")
	filter.Search = c.Query("search")
	filter.SortBy = c.Query("sort_by")
	filter.Order = c.Query("order")
	filter.IncludeArchived = c.Query("include_archived") == "true"

	if am := c.Query("assessment_month"); am != "" {
		if month, err := strconv.Atoi(am); err == nil && month >= 1 && month <= 12 {
			filter.AssessmentMonth = &month
		}
	}

	if p := c.Query("page"); p != "" {
		if page, err := strconv.Atoi(p); err == nil {
			filter.Page = page
		}
	}
	if ps := c.Query("page_size"); ps != "" {
		if pageSize, err := strconv.Atoi(ps); err == nil {
			filter.PageSize = pageSize
		} else {
			filter.PageSize = 10 // Bawaan
		}
	} else if filter.Page > 0 {
		filter.PageSize = 10 // Bawaan jika ada page tapi tidak ada page_size
	}

	return filter
}

func (ctrl *ReportController) GetDashboard(c *gin.Context) {
	filter := ctrl.parseFilter(c)
	data, err := ctrl.reportService.GetDashboardData(filter)
	if err != nil {
		fmt.Printf("[ERROR] Dashboard Error: %v\n", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data dashboard", "Terjadi kesalahan internal saat memproses data dashboard")
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *ReportController) GetDetails(c *gin.Context) {
	filter := ctrl.parseFilter(c)
	data, total, err := ctrl.reportService.GetDetailedReports(filter)
	if err != nil {
		fmt.Printf("[ERROR] Report Details Error: %v\n", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil detail laporan", "Terjadi kesalahan internal saat mengambil detail laporan")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":  data,
		"total": total,
	})
}

func (ctrl *ReportController) GetUserReports(c *gin.Context) {
	filter := ctrl.parseFilter(c)
	data, total, err := ctrl.reportService.GetUserReports(filter)
	if err != nil {
		fmt.Printf("[ERROR] User Reports Error: %v\n", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil laporan pengguna", "Terjadi kesalahan internal saat memproses laporan pengguna")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":  data,
		"total": total,
	})
}

func (ctrl *ReportController) ExportExcel(c *gin.Context) {
	filter := ctrl.parseFilter(c)
	filter.Page = 0     // Nonaktifkan paginasi untuk ekspor
	filter.PageSize = 0 // Nonaktifkan paginasi untuk ekspor
	adminID := middleware.GetUserIDFromContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	content, err := ctrl.reportService.ExportToExcel(filter, adminID, ip, ua)
	if err != nil {
		fmt.Printf("[ERROR] Export Excel Error: %v\n", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Ekspor gagal", "Terjadi kesalahan internal saat membuat laporan Excel")
		return
	}

	filename := fmt.Sprintf("report_assessment_%s.xlsx", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content)
}

func (ctrl *ReportController) ExportPDF(c *gin.Context) {
	filter := ctrl.parseFilter(c)
	filter.Page = 0     // Nonaktifkan paginasi untuk ekspor
	filter.PageSize = 0 // Nonaktifkan paginasi untuk ekspor
	adminID := middleware.GetUserIDFromContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	content, err := ctrl.reportService.ExportToPDF(filter, adminID, ip, ua)
	if err != nil {
		fmt.Printf("[ERROR] Export PDF Error: %v\n", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Ekspor gagal", "Terjadi kesalahan internal saat membuat laporan PDF")
		return
	}

	filename := fmt.Sprintf("report_assessment_%s.pdf", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "application/pdf")
	c.Data(http.StatusOK, "application/pdf", content)
}

func (ctrl *ReportController) GetUnitKerjaOptions(c *gin.Context) {
	options, err := ctrl.reportService.GetUnitKerjaOptions()
	if err != nil {
		fmt.Printf("[ERROR] Unit Kerja Options Error: %v\n", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil opsi", "Terjadi kesalahan internal saat mengambil opsi unit kerja")
		return
	}
	c.JSON(http.StatusOK, options)
}
