package config

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var JwtSecret = []byte(os.Getenv("SECRET_JWT"))

func generateJTI() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func GenerateAccessToken(userID uint, role string, name string, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"name":    name,
		"email":   email,
		"exp":     time.Now().Add(time.Minute * 15).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtSecret)
}

func GenerateRefreshToken(userID uint, role string, name string, email string) (string, error) {
	jti := generateJTI()
	claims := jwt.MapClaims{
		"jti":    jti,
		"user_id": userID,
		"role":    role,
		"name":    name,
		"email":   email,
		"type":   "refresh",
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtSecret)
}