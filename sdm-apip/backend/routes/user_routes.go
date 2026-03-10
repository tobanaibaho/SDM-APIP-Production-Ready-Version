package routes

import (
	"sdm-apip-backend/controllers"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/services"

	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(api *gin.RouterGroup) {
	// ===== Services =====
	groupService := services.NewGroupService()
	authService := services.NewAuthService()
	assessmentService := services.NewAssessmentService()

	// ===== Controllers =====
	groupController := controllers.NewGroupController(groupService)
	authController := controllers.NewAuthController(authService)
	assessmentController := controllers.NewAssessmentController(assessmentService)

	user := api.Group("/user")
	user.Use(middleware.JWTAuthMiddleware())
	{
		user.GET("/profile", authController.GetProfile)
		user.PUT("/profile", authController.UpdateProfile)
		user.POST("/change-password", authController.ChangePassword)
		user.GET("/my-groups", groupController.GetMyGroups)
		user.GET("/groups/:id", groupController.GetGroupDetailForUser)

		// ===== PEER ASSESSMENT =====
		user.POST("/assessments", assessmentController.SubmitAssessment)
		// REMOVED: user.GET("/assessments/my-results", assessmentController.GetMyResults) - Users cannot view their scores
		user.GET("/assessments/given", assessmentController.GetMyAssessmentsGiven)
		user.GET("/assessments/targets", assessmentController.GetTargets) // New: Get who to assess
		user.GET("/assessments/matrix", assessmentController.GetMatrixFnForUser)
		user.GET("/assessments/active-period", assessmentController.GetActivePeriod)
		user.GET("/periods", assessmentController.GetAllPeriods)
		// Inspektur Reference Panel — aggregated Peer+Bawahan scores for a target user
		user.GET("/assessments/reference/:targetUserID", assessmentController.GetAssessmentReference)
	}
}
