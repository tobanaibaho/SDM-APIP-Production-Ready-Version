package controllers

import (
	"fmt"
	"net/http"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"
	"strconv"
	"strings"

	"sdm-apip-backend/config"
	"sdm-apip-backend/middleware"
	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

type QuestionController struct {
	questionService services.IQuestionService
}

func NewQuestionController(questionService services.IQuestionService) *QuestionController {
	return &QuestionController{questionService: questionService}
}

// GetQuestions memungkinkan pengambilan semua pertanyaan. Jika pengguna adalah admin, mereka dapat melihat yang tidak aktif menggunakan parameter kueri `all=true`.
func (c *QuestionController) GetQuestions(ctx *gin.Context) {
	// Asumsikan siapa pun yang terautentikasi dapat mengambil pertanyaan aktif. Admin dapat menambahkan ?all=true
	includeInactive := ctx.Query("all") == "true"
	
	questions, err := c.questionService.GetAllQuestions(includeInactive)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Gagal mengambil pertanyaan", err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Questions retrieved successfully", questions)
}

func (c *QuestionController) CreateQuestion(ctx *gin.Context) {
	var req models.CreateQuestionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	question, err := c.questionService.CreateQuestion(req)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Gagal membuat pertanyaan", err.Error())
		return
	}

	// Log Audit
	userID := middleware.GetUserIDFromContext(ctx)
	models.CreateAuditLog(config.DB, &userID, models.AuditActionQuestionCreate, models.AuditStatusSuccess, 
		ctx.ClientIP(), ctx.GetHeader("User-Agent"), 
		fmt.Sprintf("Created question for indicator: %s", question.Indicator), nil)

	utils.SuccessResponse(ctx, http.StatusCreated, "Question created successfully", question)
}

func (c *QuestionController) UpdateQuestion(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "ID pertanyaan tidak valid", err.Error())
		return
	}

	var req models.UpdateQuestionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	question, err := c.questionService.UpdateQuestion(uint(id), req)
	if err != nil {
		if err.Error() == "question not found" {
			utils.ErrorResponse(ctx, http.StatusNotFound, "Pertanyaan tidak ditemukan", err.Error())
		} else {
			utils.ErrorResponse(ctx, http.StatusInternalServerError, "Gagal memperbarui pertanyaan", err.Error())
		}
		return
	}

	// Log Audit
	userID := middleware.GetUserIDFromContext(ctx)
	models.CreateAuditLog(config.DB, &userID, models.AuditActionQuestionUpdate, models.AuditStatusSuccess, 
		ctx.ClientIP(), ctx.GetHeader("User-Agent"), 
		fmt.Sprintf("Updated question ID: %d", id), nil)

	utils.SuccessResponse(ctx, http.StatusOK, "Question updated successfully", question)
}

func (c *QuestionController) DeleteQuestion(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "ID pertanyaan tidak valid", err.Error())
		return
	}

	if err := c.questionService.DeleteQuestion(uint(id)); err != nil {
		if err.Error() == "question not found" {
			utils.ErrorResponse(ctx, http.StatusNotFound, "Pertanyaan tidak ditemukan", err.Error())
		} else {
			utils.ErrorResponse(ctx, http.StatusInternalServerError, "Gagal menghapus pertanyaan", err.Error())
		}
		return
	}

	// Log Audit
	userID := middleware.GetUserIDFromContext(ctx)
	models.CreateAuditLog(config.DB, &userID, models.AuditActionQuestionDelete, models.AuditStatusSuccess, 
		ctx.ClientIP(), ctx.GetHeader("User-Agent"), 
		fmt.Sprintf("Deleted question ID: %d", id), nil)

	utils.SuccessResponse(ctx, http.StatusOK, "Question deleted successfully", nil)
}

func (c *QuestionController) ImportQuestionsExcel(ctx *gin.Context) {
	file, err := ctx.FormFile("file")
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "File tidak ditemukan", err.Error())
		return
	}

	// Validasi ekstensi
	if len(file.Filename) < 5 || (file.Filename[len(file.Filename)-5:] != ".xlsx" && file.Filename[len(file.Filename)-4:] != ".xls") {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Format file harus .xlsx atau .xls", "Ekstensi file tidak valid")
		return
	}

	src, err := file.Open()
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Gagal membuka file", err.Error())
		return
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Gagal membaca file Excel. Pastikan format benar.", err.Error())
		return
	}
	defer f.Close()

	// Baca sheet pertama
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "File Excel kosong atau tidak memiliki sheet", "Tidak ada sheet yang ditemukan")
		return
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Gagal membaca baris Excel", err.Error())
		return
	}

	var importRows []models.CreateQuestionRequest
	for i, row := range rows {
		// Lewati baris header
		if i == 0 {
			continue
		}
		if len(row) < 2 {
			continue
		}
		indicator := strings.TrimSpace(row[0])
		text := strings.TrimSpace(row[1])
		if indicator == "" || text == "" {
			continue
		}
		importRows = append(importRows, models.CreateQuestionRequest{
			Indicator: indicator,
			Text:      text,
		})
	}

	count, err := c.questionService.BulkImportQuestions(importRows)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusUnprocessableEntity, "Import gagal: "+err.Error(), err.Error())
		return
	}

	// Log Audit
	userID := middleware.GetUserIDFromContext(ctx)
	models.CreateAuditLog(config.DB, &userID, models.AuditActionQuestionCreate, models.AuditStatusSuccess, 
		ctx.ClientIP(), ctx.GetHeader("User-Agent"), 
		fmt.Sprintf("Bulk imported %d questions via Excel", count), nil)

	utils.SuccessResponse(ctx, http.StatusCreated, fmt.Sprintf("%d pertanyaan berhasil diimport", count), map[string]int{"imported": count})
}
