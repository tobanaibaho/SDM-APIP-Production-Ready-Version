package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"time"

	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/utils"

	"gopkg.in/gomail.v2"
)

// EmailService handles email sending
type EmailService struct {
	dialer *gomail.Dialer
}

// NewEmailService creates a new email service
func NewEmailService() *EmailService {
	d := gomail.NewDialer(
		config.AppConfig.SMTPHost,
		config.AppConfig.SMTPPort,
		config.AppConfig.SMTPUsername,
		config.AppConfig.SMTPPassword,
	)

	// Configure SSL/TLS
	tlsConfig := &tls.Config{
		ServerName:         config.AppConfig.SMTPHost,
		InsecureSkipVerify: config.AppConfig.SMTPInsecure, // SECURITY: Use config value, default false
	}

	if config.AppConfig.SMTPPort == 465 {
		d.SSL = true
	}
	d.TLSConfig = tlsConfig

	logger.Info("📧 Email service initialized: Host=%s, Port=%d, Insecure=%v",
		config.AppConfig.SMTPHost, config.AppConfig.SMTPPort, config.AppConfig.SMTPInsecure)

	return &EmailService{dialer: d}
}

// GetDialer returns the internal dialer (for health checks)
func (s *EmailService) GetDialer() *gomail.Dialer {
	return s.dialer
}

// SendVerificationEmail sends email verification link
func (s *EmailService) SendVerificationEmail(toEmail, toName, token string) error {
	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", config.AppConfig.FrontendURL, token)
	template := utils.GetVerificationEmailTemplate(toName, verificationURL)
	return s.sendEmail(toEmail, template.Subject, template.Body)
}

// SendVerificationEmailWithOTP sends email verification with link and OTP
func (s *EmailService) SendVerificationEmailWithOTP(toEmail, toName, token, otp string) error {
	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", config.AppConfig.FrontendURL, token)
	template := utils.GetOTPVerificationEmailTemplate(toName, verificationURL, otp)
	return s.sendEmail(toEmail, template.Subject, template.Body)
}

// SendPasswordResetEmail sends password reset email
func (s *EmailService) SendPasswordResetEmail(toEmail, toName, token, otp string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", config.AppConfig.FrontendURL, token)
	template := utils.GetPasswordResetEmailTemplate(toName, resetURL, otp)
	return s.sendEmail(toEmail, template.Subject, template.Body)
}

// AsyncSendAdminPasswordResetEmail sends admin password reset email (non-blocking)
func (s *EmailService) AsyncSendAdminPasswordResetEmail(toEmail, adminName, resetURL string) {
	template := utils.GetAdminPasswordResetEmailTemplate(adminName, resetURL)
	go func() {
		if err := s.sendEmail(toEmail, template.Subject, template.Body); err != nil {
			logger.Error("📫 Admin reset email failed to %s: %v", toEmail, err)
		}
	}()
}

// AsyncSendEmail sends email in a separate goroutine (non-blocking)
func (s *EmailService) AsyncSendEmail(toEmail, subject, htmlBody string) {
	go func() {
		if err := s.sendEmail(toEmail, subject, htmlBody); err != nil {
			logger.Error("📫 Async email failed to %s: %v", toEmail, err)
		}
	}()
}

// sendEmail sends email with context and timeout (blocking)
func (s *EmailService) sendEmail(toEmail, subject, htmlBody string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", config.AppConfig.SMTPFromName, config.AppConfig.SMTPFrom))
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	logger.Info("📧 Attempting to send email to: %s, Subject: %s", toEmail, subject)

	// Robustness: Add context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	// DialAndSend with timeout protection
	errChan := make(chan error, 1)
	go func() {
		errChan <- s.dialer.DialAndSend(m)
	}()

	select {
	case err := <-errChan:
		if err != nil {
			logger.Error("❌ Failed to send email to %s: %v", toEmail, err)
			return err
		}
	case <-ctx.Done():
		logger.Error("⏳ Email sending timed out for: %s", toEmail)
		return fmt.Errorf("email sending timed out")
	}

	logger.Info("✅ Email sent successfully to: %s", toEmail)
	return nil
}
