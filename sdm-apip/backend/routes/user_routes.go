package routes

import (
	"sdm-apip-backend/controllers"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/services"

	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(api *gin.RouterGroup) {
	// ===== Layanan (Services) =====
	groupService := services.NewGroupService()
	authService := services.NewAuthService()
	assessmentService := services.NewAssessmentService()
	questionService := services.NewQuestionService()

	// ===== Pengendali (Controllers) =====
	groupController := controllers.NewGroupController(groupService)
	authController := controllers.NewAuthController(authService)
	assessmentController := controllers.NewAssessmentController(assessmentService)
	questionController := controllers.NewQuestionController(questionService)

	user := api.Group("/user")
	user.Use(middleware.JWTAuthMiddleware())
	{
		user.GET("/profile", authController.GetProfile)
		user.PUT("/profile", authController.UpdateProfile)
		user.POST("/change-password", authController.ChangePassword)
		user.GET("/my-groups", groupController.GetMyGroups)
		user.GET("/groups/:id", groupController.GetGroupDetailForUser)

		// ===== PENILAIAN SEJAWAT (PEER ASSESSMENT) =====
		user.POST("/assessments", assessmentController.SubmitAssessment)
		user.GET("/assessments/my-results", assessmentController.GetMyResults) // Pengguna sekarang dapat melihat skor mereka sendiri
		user.GET("/assessments/given", assessmentController.GetMyAssessmentsGiven)
		user.GET("/assessments/targets", assessmentController.GetTargets) // Baru: Dapatkan daftar orang yang harus dinilai
		user.GET("/assessments/matrix", assessmentController.GetMatrixFnForUser)
		user.GET("/assessments/active-period", assessmentController.GetActivePeriod)
		user.GET("/periods", assessmentController.GetAllPeriods)
		// Panel Referensi Inspektur — skor agregat (keseluruhan) Peer+Bawahan untuk target pengguna
		user.GET("/assessments/reference/:targetUserID", assessmentController.GetAssessmentReference)
		user.GET("/questions", questionController.GetQuestions)
	}
}
