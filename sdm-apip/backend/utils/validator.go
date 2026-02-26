package utils

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
	"strings"
)

// ValidateNIP validates NIP format (18 digits)
func ValidateNIP(nip string) bool {
	// NIP should be exactly 18 digits
	matched, _ := regexp.MatchString(`^\d{18}$`, nip)
	return matched
}

// ValidateEmail validates email format
func ValidateEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// ValidatePassword validates password strength
func ValidatePassword(password string) (bool, string) {
	if len(password) < 8 {
		return false, "Password must be at least 8 characters"
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper || !hasLower || !hasNumber {
		return false, "Password must contain uppercase, lowercase, and number"
	}

	return true, ""
}

// SanitizeString removes potentially dangerous characters
func SanitizeString(input string) string {
	// Remove HTML tags
	htmlRegex := regexp.MustCompile(`<[^>]*>`)
	sanitized := htmlRegex.ReplaceAllString(input, "")

	// Trim whitespace
	sanitized = strings.TrimSpace(sanitized)

	return sanitized
}

// GenerateRandomToken generates a random token for verification
func GenerateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GenerateOTP generates a numeric OTP code
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
