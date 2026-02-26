package routes

import (
	"sdm-apip-backend/controllers"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/services"

	"github.com/gin-gonic/gin"
)

func RegisterAdminRoutes(api *gin.RouterGroup) {
	// =======================
	// SERVICES
	// =======================
	userService := services.NewUserService()
	groupService := services.NewGroupService()
	sdmService := services.NewSDMService()
	sdmImportService := services.NewSDMImportService()
	authService := services.NewAuthService()
	assessmentService := services.NewAssessmentService()
	reportService := services.NewReportService()
	auditService := services.NewAuditService()

	// =======================
	// CONTROLLERS
	// =======================
	userController := controllers.NewUserController(userService)
	groupController := controllers.NewGroupController(groupService)
	sdmController := controllers.NewSDMController(sdmService, sdmImportService)
	authController := controllers.NewAuthController(authService)
	assessmentController := controllers.NewAssessmentController(assessmentService)
	reportController := controllers.NewReportController(reportService)
	auditController := controllers.NewAuditController(auditService)

	// =======================
	// ROUTES
	// =======================
	admin := api.Group("/admin")
	admin.Use(
		middleware.JWTAuthMiddleware(),
		middleware.SuperAdminOnly(),
	)
	{
		// ===== AUDIT LOGS =====
		admin.GET("/audit-logs", auditController.GetAll)

		// ===== REPORTS =====
		admin.GET("/reports/dashboard", reportController.GetDashboard)
		admin.GET("/reports/details", reportController.GetDetails)
		admin.GET("/reports/users", reportController.GetUserReports)
		admin.GET("/reports/export/excel", reportController.ExportExcel)
		admin.GET("/reports/export/pdf", reportController.ExportPDF)
		admin.GET("/reports/unit-kerja-options", reportController.GetUnitKerjaOptions)

		// ===== SDM =====
		admin.GET("/sdm", sdmController.GetAll)
		admin.GET("/sdm/stats", sdmController.GetStats)
		admin.GET("/sdm/:id", sdmController.GetByID)
		admin.POST("/sdm", sdmController.Create)
		admin.POST("/sdm/import", sdmController.ImportExcel)
		admin.PUT("/sdm/:id", sdmController.Update)
		admin.DELETE("/sdm/:id", sdmController.Delete)

		// ===== USER =====
		admin.GET("/users", userController.GetAll)
		admin.GET("/users/:id", userController.GetByID)
		admin.PATCH("/users/:id/status", userController.UpdateStatus)
		admin.PATCH("/users/:id/role", userController.UpdateRole)
		admin.POST("/users/:id/mfa/disable", authController.AdminDisableMFA)
		admin.DELETE("/users/:id", userController.Delete)

		// ===== GROUP =====
		admin.GET("/groups", groupController.GetAll)
		admin.GET("/groups/:id", groupController.GetByID)
		admin.POST("/groups", groupController.Create)
		admin.PUT("/groups/:id", groupController.Update)
		admin.DELETE("/groups/:id", groupController.Delete)
		admin.POST("/groups/:id/users", groupController.AssignUser)
		admin.DELETE("/groups/:id/users/:userId", groupController.RemoveUser)
		admin.POST("/groups/move-user", groupController.MoveUser)

		// ===== SECURE ADMIN RESET =====
		admin.POST("/secure-reset/request", authController.SecureAdminResetRequest)
		admin.POST("/secure-reset/confirm", authController.SecureAdminResetConfirm)

		// ===== ASSESSMENT PERIODS =====
		admin.GET("/periods", assessmentController.GetAllPeriods)
		admin.POST("/periods", assessmentController.CreatePeriod)
		admin.PATCH("/periods/:id/status", assessmentController.UpdatePeriodStatus)
		admin.DELETE("/periods/:id", assessmentController.DeletePeriod)

		// ===== ASSESSMENT RELATIONS & MATRIX =====
		admin.POST("/relations", assessmentController.CreateRelation)
		admin.GET("/relations", assessmentController.GetCrossGroupRelations)
		admin.DELETE("/relations/:id", assessmentController.DeleteRelation)
		admin.POST("/groups/:id/relations", assessmentController.CreateGroupRelations)
		admin.GET("/groups/:id/relations", assessmentController.GetGroupRelations)
		admin.GET("/assessments/matrix", assessmentController.GetMatrix)
		admin.GET("/assessments/detail/:userId", assessmentController.GetDetail)
	}
}
