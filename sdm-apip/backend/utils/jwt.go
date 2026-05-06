package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"sdm-apip-backend/config"
	"sdm-apip-backend/models"

	"github.com/golang-jwt/jwt/v5"
)

const (
	JWTAudience = "sdm-apip-web"
	JWTIssuer   = "sdm-apip-system"
)

// JWTClaims merepresentasikan klaim di dalam JWT kita
type JWTClaims struct {
	UserID         uint   `json:"user_id"`
	NIP            string `json:"nip,omitempty"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	IdentifierType string `json:"identifier_type"`
	jwt.RegisteredClaims
}

// GenerateJWT menghasilkan Access Token baru (berumur pendek)
func GenerateJWT(user *models.User) (string, error) {
	// Pastikan Role dimuat sebelumnya (preloaded) dan memiliki nama
	roleName := user.Role.Name
	if roleName == "" {
		// Cadangan (fallback) untuk keamanan
		roleName = models.RoleNameUser
		if user.RoleID == models.RoleSuperAdmin {
			roleName = models.RoleNameSuperAdmin
		}
	}

	// Tentukan tipe identifier
	identifierType := "NIP"
	if user.RoleID == models.RoleSuperAdmin {
		identifierType = "USERNAME"
	}

	now := time.Now()
	// Gunakan kedaluwarsa dari konfigurasi (cadangan 1 jam jika tidak diatur atau tidak valid)
	expiryHours := config.AppConfig.JWTExpiryHours
	if expiryHours <= 0 {
		expiryHours = 1
	}
	expirationTime := now.Add(time.Duration(expiryHours) * time.Hour)

	nip := ""
	if user.NIP != nil {
		nip = *user.NIP
	}

	claims := &JWTClaims{
		UserID:         user.ID,
		NIP:            nip,
		Email:          user.Email,
		Role:           roleName,
		IdentifierType: identifierType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    JWTIssuer,
			Audience:  jwt.ClaimStrings{JWTAudience},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

// GenerateRefreshToken menghasilkan Refresh Token baru (berumur panjang)
func GenerateRefreshToken(user *models.User) (string, error) {
	now := time.Now()
	// Gunakan kedaluwarsa dari konfigurasi (cadangan 7 hari jika tidak diatur atau tidak valid)
	refreshExpiryHours := config.AppConfig.JWTRefreshExpiryHours
	if refreshExpiryHours <= 0 {
		refreshExpiryHours = 7 * 24
	}
	expirationTime := now.Add(time.Duration(refreshExpiryHours) * time.Hour)

	claims := &jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", user.ID),
		ExpiresAt: jwt.NewNumericDate(expirationTime),
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		Issuer:    JWTIssuer,
		Audience:  jwt.ClaimStrings{JWTAudience},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

// ValidateJWT memvalidasi token JWT dan mengembalikan klaim
func ValidateJWT(tokenString string) (*JWTClaims, error) {
	claims := &JWTClaims{}

	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("Metode penandatanganan tidak terduga: %v", token.Header["alg"])
			}
			return []byte(config.AppConfig.JWTSecret), nil
		},
		jwt.WithLeeway(time.Minute),
		jwt.WithAudience(JWTAudience),
		jwt.WithIssuer(JWTIssuer),
	)

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("Token tidak valid")
	}

	return claims, nil
}

// HashToken mengembalikan hash SHA256 dari string token
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
