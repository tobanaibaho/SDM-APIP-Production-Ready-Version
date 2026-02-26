package controllers

import (
	"net/http"
	"strconv"

	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

type AuditController struct {
	auditService services.IAuditService
}

func NewAuditController(auditService services.IAuditService) *AuditController {
	return &AuditController{
		auditService: auditService,
	}
}

func (ac *AuditController) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	action := c.Query("action")
	status := c.Query("status")

	var userID *uint
	if uidStr := c.Query("user_id"); uidStr != "" {
		uid, err := strconv.ParseUint(uidStr, 10, 32)
		if err == nil {
			id := uint(uid)
			userID = &id
		}
	}

	logs, total, err := ac.auditService.GetAll(page, limit, action, status, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch audit logs", err.Error())
		return
	}

	utils.PaginatedSuccessResponse(c, http.StatusOK, "Audit logs retrieved", logs, utils.Pagination{
		TotalItems:  total,
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  (int(total) + limit - 1) / limit,
	})
}
