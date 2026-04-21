package controllers

import (
	"fmt"
	"net/http"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

type QuestionController struct {
	questionService services.IQuestionService
}

func NewQuestionController(questionService services.IQuestionService) *QuestionController {
	return &QuestionController{questionService: questionService}
}

// GetQuestions allows fetching all questions. If the user is admin, they can see inactive ones using query param `all=true`.
func (c *QuestionController) GetQuestions(ctx *gin.Context) {
	// Assume anyone authenticated can fetch active questions. Admin can pass ?all=true
	includeInactive := ctx.Query("all") == "true"
	
	questions, err := c.questionService.GetAllQuestions(includeInactive)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to fetch questions", err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Questions retrieved successfully", questions)
}

func (c *QuestionController) CreateQuestion(ctx *gin.Context) {
	var req models.CreateQuestionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	question, err := c.questionService.CreateQuestion(req)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to create question", err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusCreated, "Question created successfully", question)
}

func (c *QuestionController) UpdateQuestion(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid question ID", err.Error())
		return
	}

	var req models.UpdateQuestionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	question, err := c.questionService.UpdateQuestion(uint(id), req)
	if err != nil {
		if err.Error() == "question not found" {
			utils.ErrorResponse(ctx, http.StatusNotFound, "Question not found", err.Error())
		} else {
			utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to update question", err.Error())
		}
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Question updated successfully", question)
}

func (c *QuestionController) DeleteQuestion(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid question ID", err.Error())
		return
	}

	if err := c.questionService.DeleteQuestion(uint(id)); err != nil {
		if err.Error() == "question not found" {
			utils.ErrorResponse(ctx, http.StatusNotFound, "Question not found", err.Error())
		} else {
			utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to delete question", err.Error())
		}
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Question deleted successfully", nil)
}

func (c *QuestionController) ImportQuestionsExcel(ctx *gin.Context) {
	file, err := ctx.FormFile("file")
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "File tidak ditemukan", err.Error())
		return
	}

	// Validate extension
	if len(file.Filename) < 5 || (file.Filename[len(file.Filename)-5:] != ".xlsx" && file.Filename[len(file.Filename)-4:] != ".xls") {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Format file harus .xlsx atau .xls", "invalid file extension")
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

	// Read first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "File Excel kosong atau tidak memiliki sheet", "no sheets found")
		return
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Gagal membaca baris Excel", err.Error())
		return
	}

	var importRows []models.CreateQuestionRequest
	for i, row := range rows {
		// Skip header row
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

	utils.SuccessResponse(ctx, http.StatusCreated, fmt.Sprintf("%d pertanyaan berhasil diimport", count), map[string]int{"imported": count})
}
