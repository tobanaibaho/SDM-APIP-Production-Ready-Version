package controllers

import (
	"fmt"
	"net/http"
	"sdm-apip-backend/config"
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

// --- Endpoint Admin ---

func (ac *AssessmentController) CreatePeriod(c *gin.Context) {
	var req models.CreatePeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	period, err := ac.assessmentService.CreatePeriod(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat periode", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Assessment period created", period)
}

func (ac *AssessmentController) GetAllPeriods(c *gin.Context) {
	periods, err := ac.assessmentService.GetAllPeriods()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil periode", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Periods retrieved", periods)
}

func (ac *AssessmentController) UpdatePeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)
	var req models.UpdatePeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	err := ac.assessmentService.UpdatePeriod(uint(id), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memperbarui periode", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment period updated", nil)
}

func (ac *AssessmentController) UpdatePeriodStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	err := ac.assessmentService.UpdatePeriodStatus(uint(id), req.IsActive)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Gagal memperbarui periode", err.Error())
		return
	}

	// Log Audit
	adminID := middleware.GetUserIDFromContext(c)
	details := fmt.Sprintf("Admin manually updated period ID %d status to active=%v", id, req.IsActive)
	models.CreateAuditLog(config.DB, &adminID, models.AuditActionPeriodUpdate, models.AuditStatusSuccess,
		c.ClientIP(), c.GetHeader("User-Agent"), details, nil)

	utils.SuccessResponse(c, http.StatusOK, "Period status updated", nil)
}

func (ac *AssessmentController) DeletePeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	err := ac.assessmentService.DeletePeriod(uint(id))
	if err != nil {
		if err == services.ErrPeriodNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, "Gagal menghapus periode", "Periode tidak ditemukan")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus periode", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment period deleted successfully", nil)
}

// --- Manajemen Relasi (Admin) ---

func (ac *AssessmentController) CreateRelation(c *gin.Context) {
	var req models.CreateRelationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	err := ac.assessmentService.CreateAssessmentRelation(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat relasi", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Assessment relation created", nil)
}

func (ac *AssessmentController) CreateGroupRelations(c *gin.Context) {
	var req models.BulkCreateRelationsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
		return
	}

	err := ac.assessmentService.CreateGroupRelations(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat relasi grup", err.Error())
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
		utils.ErrorResponse(c, http.StatusBadRequest, "ID grup atau ID periode tidak ada", "Harap berikan ID yang valid")
		return
	}

	relations, err := ac.assessmentService.GetGroupRelations(uint(groupID), uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil relasi grup", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Group relations retrieved", relations)
}

func (ac *AssessmentController) GetCrossGroupRelations(c *gin.Context) {
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID periode tidak ada", "Harap berikan ID periode yang valid")
		return
	}

	relations, err := ac.assessmentService.GetCrossGroupRelations(uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil relasi lintas grup", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Cross-group relations retrieved", relations)
}

func (ac *AssessmentController) DeleteRelation(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	if id == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID relasi tidak valid", "")
		return
	}

	if err := ac.assessmentService.DeleteAssessmentRelation(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Gagal menghapus relasi", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Relation deleted successfully", nil)
}

func (ac *AssessmentController) GetTargets(c *gin.Context) {
	evaluatorID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID periode tidak ada", "Harap berikan ID periode yang valid")
		return
	}

	targets, err := ac.assessmentService.GetAssessmentTargets(evaluatorID, uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil target", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment targets retrieved", targets)
}

func (ac *AssessmentController) GetMatrix(c *gin.Context) {
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID periode tidak ada", "Harap berikan ID periode yang valid")
		return
	}

	matrix, err := ac.assessmentService.GetAssessmentMatrix(uint(periodID), 0) // Admin selalu 0
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil matriks", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment matrix retrieved", matrix)
}

func (ac *AssessmentController) GetMatrixFnForUser(c *gin.Context) {
	userID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID periode tidak ada", "Harap berikan ID periode yang valid")
		return
	}

	matrix, err := ac.assessmentService.GetAssessmentMatrix(uint(periodID), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil matriks", err.Error())
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
		utils.ErrorResponse(c, http.StatusBadRequest, "ID periode tidak ada", "Harap berikan ID periode yang valid")
		return
	}

	detail, err := ac.assessmentService.GetAssessmentDetail(uint(userID), uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil detail", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment detail retrieved", detail)
}

// --- Endpoint Pengguna ---

func (ac *AssessmentController) SubmitAssessment(c *gin.Context) {
	evaluatorID := middleware.GetUserIDFromContext(c)
	var req models.SubmitAssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Permintaan tidak valid", err.Error())
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
			utils.ErrorResponse(c, http.StatusForbidden, "Penilaian gagal", "Administrator tidak diperbolehkan melakukan penilaian")
			return
		}

		// Log Audit untuk kegagalan
		models.CreateAuditLog(config.DB, &evaluatorID, models.AuditActionAssessmentSubmit, models.AuditStatusFailed,
			c.ClientIP(), c.GetHeader("User-Agent"), fmt.Sprintf("Assessment submission failed: %v", err.Error()), &req.TargetUserID)

		// Tangkap error string dari service
		if err.Error() == "you are not assigned to assess this user in this period" {
			status = http.StatusForbidden
		}
		utils.ErrorResponse(c, status, "Penilaian gagal", err.Error())
		return
	}

	// Log Audit untuk keberhasilan
	models.CreateAuditLog(config.DB, &evaluatorID, models.AuditActionAssessmentSubmit, models.AuditStatusSuccess,
		c.ClientIP(), c.GetHeader("User-Agent"), fmt.Sprintf("User submitted assessment for target ID %d", req.TargetUserID), &req.TargetUserID)

	utils.SuccessResponse(c, http.StatusCreated, "Assessment submitted successfully", nil)
}

func (ac *AssessmentController) GetMyResults(c *gin.Context) {
	userID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	if periodID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID periode tidak ada", "Harap berikan ID periode yang valid")
		return
	}

	summary, err := ac.assessmentService.GetAssessmentSummary(userID, uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil hasil", err.Error())
		return
	}

	if summary == nil {
		utils.SuccessResponse(c, http.StatusOK, "No assessment data for this period", gin.H{
			"status": "Belum Dinilai",
		})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessment summary retrieved", summary)
}

func (ac *AssessmentController) GetMyAssessmentsGiven(c *gin.Context) {
	userID := middleware.GetUserIDFromContext(c)
	periodIDStr := c.Query("period_id")
	periodID, _ := strconv.ParseUint(periodIDStr, 10, 32)

	assessments, err := ac.assessmentService.GetGivenAssessments(userID, uint(periodID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil penilaian", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Assessments given retrieved", assessments)
}

func (ac *AssessmentController) GetActivePeriod(c *gin.Context) {
	period, err := ac.assessmentService.GetActivePeriod()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Kesalahan server internal", err.Error())
		return
	}

	if period == nil {
		utils.SuccessResponse(c, http.StatusOK, "No active assessment period", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Active period retrieved", period)
}

// GetAssessmentReference mengembalikan skor agregat Peer+Bawahan untuk pengguna target.
// Hanya dapat diakses oleh penilai Atasan yang ditugaskan untuk target tersebut pada periode yang diberikan.
func (ac *AssessmentController) GetAssessmentReference(c *gin.Context) {
	evaluatorID := middleware.GetUserIDFromContext(c)

	targetIDStr := c.Param("targetUserID")
	targetID, parseErr := strconv.ParseUint(targetIDStr, 10, 32)
	if parseErr != nil || targetID == 0 {
		utils.ErrorResponse(c, 400, "ID pengguna target tidak valid", "Harap berikan ID pengguna target yang valid")
		return
	}

	periodIDStr := c.Query("period_id")
	periodID, parseErr2 := strconv.ParseUint(periodIDStr, 10, 32)
	if parseErr2 != nil || periodID == 0 {
		utils.ErrorResponse(c, 400, "ID periode tidak ada", "Harap berikan ID periode yang valid")
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
