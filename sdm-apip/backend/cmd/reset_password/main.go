package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	nip := os.Args[1]
	newPassword := os.Args[2]

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 10)
	if err != nil {
		log.Fatal("failed to hash password:", err)
	}

	dbURL := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "sdm_admin"),
		getEnv("DB_PASSWORD", "sdm_secure_password_2024"),
		getEnv("DB_NAME", "sdm_apip_db"),
	)

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("failed to connect:", err)
	}
	defer db.Close()

	result, err := db.Exec("UPDATE users SET password = $1, login_attempts = 0, lockout_until = NULL WHERE nip = $2", string(hash), nip)
	if err != nil {
		log.Fatal("failed to update:", err)
	}

	rows, _ := result.RowsAffected()
	fmt.Printf("Password reset successful. Rows affected: %d\n", rows)
	fmt.Printf("Hash length: %d\n", len(hash))
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
