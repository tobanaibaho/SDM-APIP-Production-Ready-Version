package routes

import (
	"net/http"

	"sdm-apip-backend/controllers"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"

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

		// Pengguna SSO tidak memiliki password — endpoint ini dinonaktifkan
		user.POST("/change-password", func(c *gin.Context) {
			utils.ErrorResponse(c, http.StatusForbidden,
				"Operasi tidak tersedia",
				"Akun SSO tidak menggunakan password. Kelola akses melalui portal Google/Microsoft Workspace Anda.",
			)
		})

		user.GET("/my-groups", groupController.GetMyGroups)
		user.GET("/groups/:id", groupController.GetGroupDetailForUser)

		// ===== PENILAIAN SEJAWAT (PEER ASSESSMENT) =====
		user.POST("/assessments", assessmentController.SubmitAssessment)
		user.GET("/assessments/my-results", assessmentController.GetMyResults)
		user.GET("/assessments/given", assessmentController.GetMyAssessmentsGiven)
		user.GET("/assessments/targets", assessmentController.GetTargets)
		user.GET("/assessments/matrix", assessmentController.GetMatrixFnForUser)
		user.GET("/assessments/active-period", assessmentController.GetActivePeriod)
		user.GET("/periods", assessmentController.GetAllPeriods)
		user.GET("/assessments/reference/:targetUserID", assessmentController.GetAssessmentReference)
		user.GET("/questions", questionController.GetQuestions)
	}
}
