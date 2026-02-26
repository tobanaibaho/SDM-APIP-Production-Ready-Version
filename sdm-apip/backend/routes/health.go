package routes

import (
	"fmt"
	"sdm-apip-backend/config"
	"sdm-apip-backend/services"

	"github.com/gin-gonic/gin"
)

func HealthCheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":  "healthy",
		"message": "SDM APIP API is running",
	})
}

func TestEmailConnection(c *gin.Context) {
	emailService := services.NewEmailService()

	// Test dialing the SMTP server
	dialer, err := emailService.GetDialer().Dial()

	// Prepare masked password for debugging
	pass := config.AppConfig.SMTPPassword
	maskedPass := ""
	if len(pass) > 2 {
		maskedPass = pass[:2] + "..." + fmt.Sprintf("(len:%d)", len(pass))
	} else {
		maskedPass = fmt.Sprintf("(len:%d)", len(pass))
	}

	if err != nil {
		c.JSON(500, gin.H{
			"status": "error",
			"error":  err.Error(),
			"debug": gin.H{
				"host": config.AppConfig.SMTPHost,
				"port": config.AppConfig.SMTPPort,
				"user": config.AppConfig.SMTPUsername,
				"pass": maskedPass,
			},
		})
		return
	}
	dialer.Close()

	c.JSON(200, gin.H{
		"status":  "ok",
		"message": "SMTP connection successful",
		"debug": gin.H{
			"host": config.AppConfig.SMTPHost,
			"port": config.AppConfig.SMTPPort,
			"user": config.AppConfig.SMTPUsername,
			"pass": maskedPass,
		},
	})
}
