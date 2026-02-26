package controllers

import (
	"net/http"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AssessmentController struct {
	assessmentService services.IAssessmentService
}

func NewAssessmentController(as services.IAssessmentService) *AssessmentController {
	return &AssessmentController{
		assessmentService: as,
	}
}

// --- Admin Endpoints ---

func (ac *AssessmentController) CreatePeriod(c *gin.Context) {
	var req models.CreatePeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	period, err := ac.assessmentService.CreatePeriod(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create period", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Assessment period created", period)
}

func (ac *AssessmentController) GetAllPeriods(c *gin.Context) {
	periods, err := ac.assessmentService.GetAllPeriods()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch periods", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Periods retrieved", periods)
}

func (ac *AssessmentController) UpdatePeriodStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	err := ac.assessmentService.UpdatePeriodStatus(uint(id), req.IsActive)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Failed to update period", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Period status updated", nil)
}

func (ac *AssessmentController) DeletePeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	err := ac.assessmentService.DeletePeriod(uint(id))
	if err != nil {
		if err == services.ErrPeriodNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, "Failed to delete period", "Period not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete period", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment period deleted successfully", nil)
}

// --- Relation Management (Admin) ---

func (ac *AssessmentController) CreateRelation(c *gin.Context) {
	var req models.CreateRelationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	err := ac.assessmentService.CreateAssessmentRelation(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create relation", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Assessment relation created", nil)
}

func (ac *AssessmentController) CreateGroupRelations(c *gin.Context) {
	var req models.BulkCreateRelationsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	err := ac.assessmentService.CreateGroupRelations(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create group relations", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Group assessment relations created/updated", nil)
}

func (ac *AssessmentController) GetGroupRelations(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, _ := strconv.ParseUint(groupIDStr, 10, 32)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if groupID == 0 || periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing group_id or period_id", "Please provide valid IDs")
		return
	}

	relations, err := ac.assessmentService.GetGroupRelations(uint(groupID), uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch group relations", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Group relations retrieved", relations)
}

func (ac *AssessmentController) GetCrossGroupRelations(c *gin.Context) {
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing period_id", "Please provide a valid period_id")
		return
	}

	relations, err := ac.assessmentService.GetCrossGroupRelations(uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch cross-group relations", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Cross-group relations retrieved", relations)
}

func (ac *AssessmentController) DeleteRelation(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	if id == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid relation ID", "")
		return
	}

	if err := ac.assessmentService.DeleteAssessmentRelation(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Failed to delete relation", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Relation deleted successfully", nil)
}

func (ac *AssessmentController) GetTargets(c *gin.Context) {
	evaluatorID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing period_id", "Please provide a valid period_id")
		return
	}

	targets, err := ac.assessmentService.GetAssessmentTargets(evaluatorID, uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch targets", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment targets retrieved", targets)
}

func (ac *AssessmentController) GetMatrix(c *gin.Context) {
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing period_id", "Please provide a valid period_id")
		return
	}

	matrix, err := ac.assessmentService.GetAssessmentMatrix(uint(periodID), 0) // Admin always 0
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch matrix", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment matrix retrieved", matrix)
}

func (ac *AssessmentController) GetMatrixFnForUser(c *gin.Context) {
	userID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing period_id", "Please provide a valid period_id")
		return
	}

	matrix, err := ac.assessmentService.GetAssessmentMatrix(uint(periodID), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch matrix", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment matrix retrieved", matrix)
}

func (ac *AssessmentController) GetDetail(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, _ := strconv.ParseUint(userIDStr, 10, 32)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing period_id", "Please provide a valid period_id")
		return
	}

	detail, err := ac.assessmentService.GetAssessmentDetail(uint(userID), uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch detail", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment detail retrieved", detail)
}

// --- User Endpoints ---

func (ac *AssessmentController) SubmitAssessment(c *gin.Context) {
	evaluatorID := middleware.GetUserIDFromContext(c)
	var req models.SubmitAssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	err := ac.assessmentService.SubmitAssessment(evaluatorID, req)
	if err != nil {
		status := http.StatusBadRequest
		switch err {
		case services.ErrInternalServer:
			status = http.StatusInternalServerError
		case services.ErrPeriodNotFound:
			status = http.StatusNotFound
		case services.ErrAdminCannotAssess:
			utils.ErrorResponse(c, http.StatusForbidden, "Assessment failed", "Administrator tidak diperbolehkan melakukan penilaian")
			return
		}
		// Catch string errors from service
		if err.Error() == "you are not assigned to assess this user in this period" {
			status = http.StatusForbidden
		}
		utils.ErrorResponse(c, status, "Assessment failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Assessment submitted successfully", nil)
}

func (ac *AssessmentController) GetMyResults(c *gin.Context) {
	userID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing period_id", "Please provide a valid period_id")
		return
	}

	summary, err := ac.assessmentService.GetAssessmentSummary(userID, uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch results", err.Error())
		return
	}

	role, _ := c.Get("role")
	isAdmin := role == string(models.RoleNameSuperAdmin)

	if summary == nil {
		utils.SuccessResponse(c, http.StatusOK, "No assessment data for this period", gin.H{
			"status": "Belum Dinilai",
		})
		return
	}

	// ALWAYS return status for User
	if !isAdmin {
		utils.SuccessResponse(c, http.StatusOK, "Assessment status retrieved", gin.H{
			"status":      summary.Status, // 1-7
			"period_name": summary.PeriodName,
			"period_id":   periodID,
		})
		return
	}

	// For Admin, return full summary
	utils.SuccessResponse(c, http.StatusOK, "Assessment summary retrieved", summary)
}

func (ac *AssessmentController) GetMyAssessmentsGiven(c *gin.Context) {
	userID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	assessments, err := ac.assessmentService.GetGivenAssessments(userID, uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch assessments", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessments given retrieved", assessments)
}

func (ac *AssessmentController) GetActivePeriod(c *gin.Context) {
	period, err := ac.assessmentService.GetActivePeriod()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	if period == nil {
		utils.SuccessResponse(c, http.StatusOK, "No active assessment period", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Active period retrieved", period)
}

// GetAssessmentReference returns Peer+Bawahan aggregated scores for a target user.
// Only accessible to the Atasan evaluator assigned for that target in the given period.
func (ac *AssessmentController) GetAssessmentReference(c *gin.Context) {
	evaluatorID := middleware.GetUserIDFromContext(c)

	targetIDStr := c.Param("targetUserID")
	targetID, parseErr := strconv.ParseUint(targetIDStr, 10, 32)
	if parseErr != nil || targetID == 0 {
		utils.ErrorResponse(c, 400, "Invalid target user ID", "Please provide a valid target_user_id")
		return
	}

	periodIDStr := c.Query("period_id")
	periodID, parseErr2 := strconv.ParseUint(periodIDStr, 10, 32)
	if parseErr2 != nil || periodID == 0 {
		utils.ErrorResponse(c, 400, "Missing period_id", "Please provide a valid period_id")
		return
	}

	ref, err := ac.assessmentService.GetAssessmentReferenceForEvaluator(evaluatorID, uint(targetID), uint(periodID))
	if err != nil {
		if err.Error() == "akses ditolak: Anda bukan penilai Atasan untuk user ini pada periode ini" {
			utils.ErrorResponse(c, 403, "Akses Ditolak", err.Error())
			return
		}
		utils.ErrorResponse(c, 500, "Gagal mengambil data referensi", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Referensi penilaian berhasil diambil", ref)
}
