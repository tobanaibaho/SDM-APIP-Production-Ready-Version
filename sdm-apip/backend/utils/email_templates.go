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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); padding: 32px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { color: #cbd5e1; margin: 8px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 40px 32px; color: #334155; }
        .content h2 { color: #0f172a; margin-top: 0; font-size: 20px; }
        .content p { line-height: 1.6; font-size: 15px; }
        .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%%, #1d4ed8 100%%); color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 24px 0; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
        .button:hover { opacity: 0.95; transform: translateY(-1px); }
        .url-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; word-break: break-all; color: #475569; font-size: 13px; font-family: monospace; }
        .footer { background: #f1f5f9; padding: 24px 32px; text-align: center; color: #475569; font-size: 13px; border-top: 1px solid #e2e8f0; }
        .warning { background: #fffbeb; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin-top: 24px; color: #b45309; font-size: 14px; font-weight: 500; }
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
            <p>Terima kasih telah mendaftar di Sistem SDM APIP. Silakan klik tombol di bawah untuk memverifikasi email Anda agar bisa masuk ke dalam sistem:</p>
            
            <div style="text-align: center;">
                <a href="%s" class="button">Verifikasi Email Sekarang</a>
            </div>
            
            <p>Atau salin link berikut ke browser Anda:</p>
            <div class="url-box">%s</div>
            
            <div class="warning">
                ⚠️ <strong>Penting:</strong> Link verifikasi ini akan kadaluwarsa dalam 5 menit.
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0 0 8px 0;">Email ini dikirim secara otomatis. Mohon tidak membalas pesan ini.</p>
            <p style="margin: 0;">© %d SDM APIP - Inspektorat Kemenko Infra</p>
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); padding: 32px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { color: #cbd5e1; margin: 8px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 40px 32px; color: #334155; }
        .content h2 { color: #0f172a; margin-top: 0; font-size: 20px; }
        .content p { line-height: 1.6; font-size: 15px; }
        .otp-box { background: #f8fafc; border: 2px dashed #94a3b8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 38px; font-weight: 800; color: #0f172a; letter-spacing: 8px; margin-left: 8px; }
        .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%%, #1d4ed8 100%%); color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 16px 0; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
        .alternative { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin-top: 24px; text-align: center; }
        .alternative h4 { color: #166534; margin: 0 0 12px 0; font-size: 16px; }
        .url-box { background: #ffffff; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; word-break: break-all; color: #475569; font-size: 12px; font-family: monospace; display: block; margin-top: 12px; }
        .warning { background: #fffbeb; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin-top: 24px; color: #b45309; font-size: 14px; font-weight: 500; }
        .footer { background: #f1f5f9; padding: 24px 32px; text-align: center; color: #475569; font-size: 13px; border-top: 1px solid #e2e8f0; }
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
            <p>Cukup satu langkah lagi! Silakan verifikasi email Anda dengan menggunakan kode rahasia atau link di bawah ini:</p>
            
            <div class="otp-box">
                <h3 style="margin-top: 0; margin-bottom: 12px; color: #475569; font-size: 14px; text-transform: uppercase;">Kode OTP Verifikasi</h3>
                <div class="otp-code">%s</div>
                <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">Masukkan 6 digit angka ini di layar aplikasi Anda</p>
            </div>
            
            <div class="alternative">
                <h4>Atau Klik Tombol Verifikasi Otomatis:</h4>
                <a href="%s" class="button">Verifikasi Otomatis</a>
                <div class="url-box">%s</div>
            </div>
            
            <div class="warning">
                ⚠️ <strong>Penting:</strong> Kode OTP dan link ini akan kadaluwarsa dalam <strong>3 menit</strong>.
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0 0 8px 0;">Email ini dikirim secara otomatis. Mohon tidak membalas pesan ini.</p>
            <p style="margin: 0;">© %d SDM APIP - Inspektorat Kemenko Infra</p>
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #b91c1c 0%%, #991b1b 100%%); padding: 32px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { color: #fecaca; margin: 8px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 40px 32px; color: #334155; }
        .content h2 { color: #0f172a; margin-top: 0; font-size: 20px; }
        .content p { line-height: 1.6; font-size: 15px; }
        .otp-box { background: #fff1f2; border: 2px dashed #fda4af; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 38px; font-weight: 800; color: #be123c; letter-spacing: 8px; margin-left: 8px; }
        .button { display: inline-block; background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 16px 0; box-shadow: 0 4px 6px rgba(225, 29, 72, 0.2); }
        .button:hover { opacity: 0.95; transform: translateY(-1px); }
        .warning { background: #fffbeb; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin-top: 24px; color: #b45309; font-size: 14px; font-weight: 500; }
        .footer { background: #f1f5f9; padding: 24px 32px; text-align: center; color: #475569; font-size: 13px; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Reset Password</h1>
            <p>SDM APIP System</p>
        </div>
        <div class="content">
            <h2>Halo, %s!</h2>
            <p>Kami menerima permintaan dari Anda untuk mengatur ulang (reset) password akun. Jika ini memang Anda, gunakan kode OTP berikut:</p>
            
            <div class="otp-box">
                <h3 style="margin-top: 0; margin-bottom: 12px; color: #be123c; font-size: 14px; text-transform: uppercase;">Kode OTP Reset</h3>
                <div class="otp-code">%s</div>
            </div>

            <p style="text-align: center; margin-bottom: 0;">Atau Anda dapat mengeklik tombol ini untuk masuk ke halaman reset otomatis:</p>
            <div style="text-align: center;">
                <a href="%s" class="button">Ke Halaman Reset Password</a>
            </div>
            
            <div class="warning">
                ⚠️ Jika Anda merasa tidak meminta pengaturan ulang password, <strong>abaikan email ini</strong>. Akun Anda tetap aman.
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0 0 8px 0;">Email otomatis sistem. Tidak perlu dibalas.</p>
            <p style="margin: 0;">© %d SDM APIP - Inspektorat Kemenko Infra</p>
        </div>
    </div>
</body>
</html>
`, userName, otp, resetURL, 2026),
	}
}

// GetAdminPasswordResetEmailTemplate returns the template for admin password reset
func GetAdminPasswordResetEmailTemplate(adminName, resetURL string) EmailTemplate {
	return EmailTemplate{
		Subject: "⚠️ Reset Password Administrator - SDM APIP System",
		Body: fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
        .header { background: linear-gradient(135deg, #7f1d1d 0%%, #991b1b 100%%); padding: 30px; text-align: center; }
        .header h1 { color: #fef2f2; margin: 0; font-size: 22px; letter-spacing: 1px; }
        .header p { color: #fca5a5; margin: 8px 0 0; font-size: 13px; }
        .badge { display: inline-block; background: #7f1d1d; border: 1px solid #ef4444; color: #fca5a5; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
        .content { padding: 36px 32px; color: #cbd5e1; }
        .content h2 { color: #f1f5f9; margin-top: 0; font-size: 18px; }
        .content p { line-height: 1.7; font-size: 14px; }
        .button-wrap { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #b91c1c 0%%, #dc2626 100%%); color: #fff !important; padding: 14px 44px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
        .url-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; margin: 16px 0; word-break: break-all; color: #94a3b8; font-size: 12px; font-family: monospace; }
        .warning-box { background: #451a03; border: 1px solid #f97316; border-radius: 8px; padding: 16px; margin-top: 20px; }
        .warning-box p { color: #fdba74; margin: 0; font-size: 13px; }
        .footer { background: #0f172a; padding: 20px 32px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="badge">🔐 Keamanan Sistem</div>
            <h1>Reset Password Administrator</h1>
            <p>Sistem Informasi SDM APIP — Kemenko Infra</p>
        </div>
        <div class="content">
            <h2>Halo, %s!</h2>
            <p>Kami menerima permintaan untuk mereset password akun <strong>Administrator</strong> Anda. Klik tombol di bawah untuk membuat password baru:</p>

            <div class="button-wrap">
                <a href="%s" class="button">🔑 Reset Password Sekarang</a>
            </div>

            <p style="font-size: 13px; color: #64748b;">Atau salin link berikut ke browser:</p>
            <div class="url-box">%s</div>

            <div class="warning-box">
                <p>⚠️ <strong>Penting:</strong> Link ini berlaku selama <strong>1 jam</strong> dan hanya bisa digunakan <strong>sekali</strong>. Jika Anda tidak meminta reset password ini, abaikan email ini dan segera hubungi tim IT.</p>
            </div>
        </div>
        <div class="footer">
            <p>Email ini dikirim secara otomatis — Jangan balas email ini.</p>
            <p>© %d SDM APIP — Inspektorat Kemenko Infra</p>
        </div>
    </div>
</body>
</html>
`, adminName, resetURL, resetURL, 2026),
	}
}
