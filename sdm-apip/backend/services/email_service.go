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

// EmailService menangani pengiriman email
type EmailService struct {
	dialer *gomail.Dialer
}

// NewEmailService membuat layanan email baru
func NewEmailService() *EmailService {
	d := gomail.NewDialer(
		config.AppConfig.SMTPHost,
		config.AppConfig.SMTPPort,
		config.AppConfig.SMTPUsername,
		config.AppConfig.SMTPPassword,
	)

	// Konfigurasi SSL/TLS
	tlsConfig := &tls.Config{
		ServerName:         config.AppConfig.SMTPHost,
		InsecureSkipVerify: config.AppConfig.SMTPInsecure, // KEAMANAN: Gunakan nilai konfigurasi, bawaan false
	}

	if config.AppConfig.SMTPPort == 465 {
		d.SSL = true
	}
	d.TLSConfig = tlsConfig

	logger.Info("📧 Email service initialized: Host=%s, Port=%d, Insecure=%v",
		config.AppConfig.SMTPHost, config.AppConfig.SMTPPort, config.AppConfig.SMTPInsecure)

	return &EmailService{dialer: d}
}

// GetDialer mengembalikan dialer internal (untuk pengecekan status)
func (s *EmailService) GetDialer() *gomail.Dialer {
	return s.dialer
}

// SendVerificationEmail mengirim tautan verifikasi email
func (s *EmailService) SendVerificationEmail(toEmail, toName, token string) error {
	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", config.AppConfig.FrontendURL, token)
	template := utils.GetVerificationEmailTemplate(toName, verificationURL)
	return s.sendEmail(toEmail, template.Subject, template.Body)
}

// SendVerificationEmailWithOTP mengirim verifikasi email dengan tautan dan OTP
func (s *EmailService) SendVerificationEmailWithOTP(toEmail, toName, token, otp string) error {
	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", config.AppConfig.FrontendURL, token)
	template := utils.GetOTPVerificationEmailTemplate(toName, verificationURL, otp)
	return s.sendEmail(toEmail, template.Subject, template.Body)
}

// SendPasswordResetEmail mengirim email pengaturan ulang (reset) kata sandi
func (s *EmailService) SendPasswordResetEmail(toEmail, toName, token, otp string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", config.AppConfig.FrontendURL, token)
	template := utils.GetPasswordResetEmailTemplate(toName, resetURL, otp)
	return s.sendEmail(toEmail, template.Subject, template.Body)
}

// AsyncSendAdminPasswordResetEmail mengirim email reset password admin secara asinkron (non-blocking)
func (s *EmailService) AsyncSendAdminPasswordResetEmail(toEmail, adminName, resetURL string) {
	template := utils.GetAdminPasswordResetEmailTemplate(adminName, resetURL)
	go func() {
		if err := s.sendEmail(toEmail, template.Subject, template.Body); err != nil {
			logger.Error("📫 Admin reset email failed to %s: %v", toEmail, err)
		}
	}()
}

// AsyncSendEmail mengirim email pada goroutine terpisah secara asinkron (non-blocking)
func (s *EmailService) AsyncSendEmail(toEmail, subject, htmlBody string) {
	go func() {
		if err := s.sendEmail(toEmail, subject, htmlBody); err != nil {
			logger.Error("📫 Async email failed to %s: %v", toEmail, err)
		}
	}()
}

// sendEmail mengirim email dengan context dan batas waktu/timeout (blocking)
func (s *EmailService) sendEmail(toEmail, subject, htmlBody string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", config.AppConfig.SMTPFromName, config.AppConfig.SMTPFrom))
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	logger.Info("📧 Attempting to send email to: %s, Subject: %s", toEmail, subject)

	// Ketahanan (Robustness): Tambahkan context dengan batas waktu
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	// DialAndSend dengan perlindungan batas waktu
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
		return fmt.Errorf("Waktu pengiriman email habis")
	}

	logger.Info("✅ Email sent successfully to: %s", toEmail)
	return nil
}
