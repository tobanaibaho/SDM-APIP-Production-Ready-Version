package utils

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
	"strings"
)

// ValidateNIP memvalidasi format NIP (18 digit)
func ValidateNIP(nip string) bool {
	// NIP harus terdiri dari tepat 18 digit angka
	matched, _ := regexp.MatchString(`^\d{18}$`, nip)
	return matched
}

// ValidateEmail memvalidasi format email
func ValidateEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// ValidatePassword memvalidasi kekuatan kata sandi
func ValidatePassword(password string) (bool, string) {
	if len(password) < 8 {
		return false, "Kata sandi harus minimal 8 karakter"
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper || !hasLower || !hasNumber {
		return false, "Kata sandi harus mengandung huruf besar, huruf kecil, dan angka"
	}

	return true, ""
}

// SanitizeString menghapus karakter yang berpotensi berbahaya
func SanitizeString(input string) string {
	// Hapus tag HTML
	htmlRegex := regexp.MustCompile(`<[^>]*>`)
	sanitized := htmlRegex.ReplaceAllString(input, "")

	// Hapus spasi di awal dan akhir
	sanitized = strings.TrimSpace(sanitized)

	return sanitized
}

// GenerateRandomToken menghasilkan token acak untuk verifikasi
func GenerateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GenerateOTP menghasilkan kode OTP berupa angka
func GenerateOTP(length int) (string, error) {
	const digits = "0123456789"
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	otp := make([]byte, length)
	for i := 0; i < length; i++ {
		otp[i] = digits[bytes[i]%10]
	}
	return string(otp), nil
}
