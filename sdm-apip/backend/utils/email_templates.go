package utils

import (
	"fmt"
)

// EmailTemplate contains the structure for email content
type EmailTemplate struct {
	Subject string
	Body    string
}

// GetVerificationEmailTemplate returns the template for email verification
func GetVerificationEmailTemplate(userName, verificationURL string) EmailTemplate {
	return EmailTemplate{
		Subject: "Verifikasi Email - SDM APIP System",
		Body: fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%%, #2d5a87 100%%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1e3a5f; margin-top: 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%%, #2d5a87 100%%); color: white !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .button:hover { opacity: 0.9; }
        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ SDM APIP System</h1>
            <p>Inspektorat Kemenko Infra</p>
        </div>
        <div class="content">
            <h2>Halo, %s!</h2>
            <p>Terima kasih telah mendaftar di Sistem SDM APIP. Silakan klik tombol di bawah untuk memverifikasi email Anda:</p>
            
            <div style="text-align: center;">
                <a href="%s" class="button">Verifikasi Email</a>
            </div>
            
            <p>Atau salin link berikut ke browser Anda:</p>
            <p style="word-break: break-all; color: #2d5a87;">%s</p>
            
            <div class="warning">
                <strong>⚠️ Penting:</strong> Link ini akan kadaluwarsa dalam 5 menit.
            </div>
        </div>
        <div class="footer">
            <p>Email ini dikirim secara otomatis. Jangan balas email ini.</p>
            <p>© %d SDM APIP - Inspektorat Kemenko Infra</p>
        </div>
    </div>
</body>
</html>
`, userName, verificationURL, verificationURL, 2026),
	}
}

// GetOTPVerificationEmailTemplate returns the template for email verification with OTP
func GetOTPVerificationEmailTemplate(userName, verificationURL, otp string) EmailTemplate {
	return EmailTemplate{
		Subject: "Verifikasi Email - SDM APIP System",
		Body: fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%%, #2d5a87 100%%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1e3a5f; margin-top: 0; }
        .otp-box { background: linear-gradient(135deg, #f8f9fa 0%%, #e9ecef 100%%); border: 2px solid #1e3a5f; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #1e3a5f; letter-spacing: 4px; }
        .button { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%%, #2d5a87 100%%); color: white !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .button:hover { opacity: 0.9; }
        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .alternative { background: #e7f3ff; border: 1px solid #0066cc; padding: 15px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ SDM APIP System</h1>
            <p>Inspektorat Kemenko Infra</p>
        </div>
        <div class="content">
            <h2>Halo, %s!</h2>
            <p>Terima kasih telah mendaftar di Sistem SDM APIP. Silakan verifikasi email Anda dengan salah satu cara berikut:</p>
            
            <div class="otp-box">
                <h3 style="margin-top: 0; color: #1e3a5f;">Kode OTP Verifikasi</h3>
                <div class="otp-code">%s</div>
                <p style="margin: 10px 0 0; color: #6c757d;">Masukkan kode 6 digit ini di halaman verifikasi</p>
            </div>
            
            <div class="alternative">
                <h4 style="margin-top: 0; color: #0066cc;">Atau gunakan link verifikasi:</h4>
                <div style="text-align: center;">
                    <a href="%s" class="button">Verifikasi Email</a>
                </div>
                <p style="margin: 10px 0 0;">Link alternatif: <span style="word-break: break-all; color: #0066cc;">%s</span></p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Penting:</strong> Kode OTP dan link ini akan kadaluwarsa dalam 3 menit.
            </div>
        </div>
        <div class="footer">
            <p>Email ini dikirim secara otomatis. Jangan balas email ini.</p>
            <p>© %d SDM APIP - Inspektorat Kemenko Infra</p>
        </div>
    </div>
</body>
</html>
`, userName, otp, verificationURL, verificationURL, 2026),
	}
}

// GetPasswordResetEmailTemplate returns the template for password reset
func GetPasswordResetEmailTemplate(userName, resetURL, otp string) EmailTemplate {
	return EmailTemplate{
		Subject: "Reset Password - SDM APIP System",
		Body: fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #dc3545 0%%, #c82333 100%%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 40px 30px; }
        .otp-box { background: linear-gradient(135deg, #fff5f5 0%%, #ffe3e3 100%%); border: 2px solid #dc3545; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 4px; }
        .button { display: inline-block; background: linear-gradient(135deg, #dc3545 0%%, #c82333 100%%); color: white !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Reset Password</h1>
        </div>
        <div class="content">
            <h2>Halo, %s!</h2>
            <p>Kami menerima permintaan untuk mereset password akun Anda.</p>
            
            <div class="otp-box">
                <h3 style="margin-top: 0; color: #dc3545;">Kode OTP Reset</h3>
                <div class="otp-code">%s</div>
            </div>

            <p>Gunakan kode di atas atau klik tombol berikut:</p>
            
            <div style="text-align: center;">
                <a href="%s" class="button">Reset Password</a>
            </div>
            
            <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
        <div class="footer">
            <p>© %d SDM APIP - Kemenko Infra</p>
        </div>
    </div>
</body>
</html>
`, userName, otp, resetURL, 2026),
	}
}
