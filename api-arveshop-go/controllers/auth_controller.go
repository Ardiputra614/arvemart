package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Me(c *gin.Context) {
	user, _ := c.Get("user")

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	var input struct {
		Name            string `json:"name"`
		NoHp            string `json:"no_hp"`
		Email           string `json:"email"`
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	if input.Name != "" {
		user.Name = input.Name
	}

	if input.NoHp != "" {
		user.NoHp = input.NoHp
	}

	if input.Email != "" && input.Email != user.Email {
		email := strings.TrimSpace(strings.ToLower(input.Email))
		var existing models.User
		err := config.DB.Where("email = ?", email).First(&existing).Error
		if err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Email sudah digunakan"})
			return
		}
		user.Email = email
		user.EmailVerified = false

		// hapus token verifikasi lama
		config.DB.Where("user_id = ?", user.ID).Delete(&models.EmailVerified{})

		// buat token baru
		rawToken := generateToken()
		hashedToken := hashToken(rawToken)
		verification := models.EmailVerified{
			UserID:    user.ID,
			Token:     hashedToken,
			ExpiredAt: time.Now().Add(1 * time.Hour),
		}
		if err := config.DB.Create(&verification).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal membuat token verifikasi"})
			return
		}

		// kirim email verifikasi ke alamat baru
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Println("PANIC SEND EMAIL:", r)
				}
			}()
			SendVerificationEmail(user.Email, rawToken)
		}()
	}

	if input.NewPassword != "" {
		if input.CurrentPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Password saat ini wajib diisi"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.CurrentPassword)); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Password saat ini salah"})
			return
		}
		if len(input.NewPassword) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Password baru minimal 6 karakter"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), 12)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal hash password"})
			return
		}
		user.Password = string(hash)
	}

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal update profil"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profil berhasil diperbarui",
		"user":    user,
	})
}

func Register(c *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
		NoHp     string `json:"no_hp"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Data tidak valid",
		})
		return
	}

	input.Email = strings.TrimSpace(strings.ToLower(input.Email))

	// cek email unik
	var existing models.User

	err := config.DB.
		Where("email = ?", input.Email).
		First(&existing).Error

	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Email sudah terdaftar",
		})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Database error",
		})
		return
	}

	// bcrypt cost 12 sudah aman
	hash, err := bcrypt.GenerateFromPassword(
		[]byte(input.Password),
		12,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal hash password",
		})
		return
	}

	user := models.User{
		Name:            input.Name,
		NoHp:            input.NoHp,
		Email:           input.Email,
		Password:        string(hash),
		Role:            models.RoleUser,
		EmailVerified:   false,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal register",
		})
		return
	}

	// hapus token lama
	config.DB.
		Where("user_id = ?", user.ID).
		Delete(&models.EmailVerified{})

	// generate verification token
	rawToken := generateToken()
	hashedToken := hashToken(rawToken)

	verification := models.EmailVerified{
		UserID:    user.ID,
		Token:     hashedToken,
		ExpiredAt: time.Now().Add(1 * time.Hour),
	}

	if err := config.DB.Create(&verification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal membuat verification token",
		})
		return
	}

	// kirim email async + recover panic
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Println("PANIC SEND EMAIL:", r)
			}
		}()

		SendVerificationEmail(user.Email, rawToken)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Register berhasil, cek email",
	})
}

func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Data tidak valid",
		})
		return
	}

	input.Email = strings.TrimSpace(strings.ToLower(input.Email))

	var user models.User

	err := config.DB.
		Where("email = ?", input.Email).
		First(&user).Error

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Email atau password salah",
		})
		return
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.Password),
		[]byte(input.Password),
	)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Email atau password salah",
		})
		return
	}

	if !user.EmailVerified {
		c.JSON(http.StatusForbidden, gin.H{
			"message": "Email belum diverifikasi",
			"code":    "EMAIL_NOT_VERIFIED",
		})
		return
	}

	access, err := config.GenerateAccessToken(
		user.ID,
		string(user.Role),
		user.Name,
		user.Email,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal generate access token",
		})
		return
	}

	refresh, err := config.GenerateRefreshToken(
		user.ID,
		string(user.Role),
		user.Name,
		user.Email,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal generate refresh token",
		})
		return
	}

	// Simpan jti refresh token ke Redis
	if config.RDB != nil {
		refreshClaims := jwt.MapClaims{}
		jwt.ParseWithClaims(refresh, refreshClaims, func(t *jwt.Token) (interface{}, error) {
			return config.JwtSecret, nil
		})
		if jti, ok := refreshClaims["jti"].(string); ok {
			ctx := context.Background()
			config.RDB.Set(ctx, "refresh_token:"+jti, user.ID, time.Hour*24*7)
		}
	}

	appEnv := strings.ToLower(os.Getenv("APP_ENV"))
	isProduction := appEnv == "production"

	domain := os.Getenv("COOKIE_DOMAIN")
	if !isProduction {
		domain = ""
	}

	// SameSite
	c.SetSameSite(http.SameSiteLaxMode)

	// Access token
	c.SetCookie(
		"access_token",
		access,
		900,
		"/",
		domain,
		isProduction,
		true,
	)

	// Refresh token
	c.SetCookie(
		"refresh_token",
		refresh,
		604800,
		"/",
		domain,
		isProduction,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
	})
}

func Logout(c *gin.Context) {
	// Hapus refresh token dari Redis
	refreshToken, err := c.Cookie("refresh_token")
	if err == nil && refreshToken != "" && config.RDB != nil {
		token, _, _ := jwt.NewParser().ParseUnverified(refreshToken, jwt.MapClaims{})
		if token != nil {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if jti, ok := claims["jti"].(string); ok {
					ctx := context.Background()
					config.RDB.Del(ctx, "refresh_token:"+jti)
				}
			}
		}
	}

	appEnv := strings.ToLower(os.Getenv("APP_ENV"))
	isProduction := appEnv == "production"

	domain := os.Getenv("COOKIE_DOMAIN")
	if !isProduction {
		domain = ""
	}

	c.SetSameSite(http.SameSiteLaxMode)

	// hapus access token
	c.SetCookie(
		"access_token",
		"",
		-1,
		"/",
		domain,
		isProduction,
		true,
	)

	// hapus refresh token
	c.SetCookie(
		"refresh_token",
		"",
		-1,
		"/",
		domain,
		isProduction,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logout berhasil",
	})
}

func RefreshToken(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "No refresh token",
		})
		return
	}

	token, err := jwt.Parse(
		refreshToken,
		func(token *jwt.Token) (interface{}, error) {
			return config.JwtSecret, nil
		},
	)

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Refresh token invalid",
		})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid claims",
		})
		return
	}

	// VALIDASI TOKEN TYPE
	if claims["type"] != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid token type",
		})
		return
	}

	// Validasi jti di Redis (cekal token yang sudah di-revoke)
	jti, _ := claims["jti"].(string)
	if jti != "" && config.RDB != nil {
		ctx := context.Background()
		exists, _ := config.RDB.Exists(ctx, "refresh_token:"+jti).Result()
		if exists == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Refresh token sudah tidak valid",
			})
			return
		}
		// Hapus jti lama (token rotation — old token tidak bisa dipakai lagi)
		config.RDB.Del(ctx, "refresh_token:"+jti)
	}

	userID := uint(claims["user_id"].(float64))

	newAccess, err := config.GenerateAccessToken(
		userID,
		claims["role"].(string),
		claims["name"].(string),
		claims["email"].(string),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed generate access token",
		})
		return
	}

	// Generate refresh token baru (token rotation)
	newRefresh, err := config.GenerateRefreshToken(
		userID,
		claims["role"].(string),
		claims["name"].(string),
		claims["email"].(string),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed generate refresh token",
		})
		return
	}

	// Simpan jti baru ke Redis
	if config.RDB != nil {
		refreshClaims := jwt.MapClaims{}
		jwt.ParseWithClaims(newRefresh, refreshClaims, func(t *jwt.Token) (interface{}, error) {
			return config.JwtSecret, nil
		})
		if newJti, ok := refreshClaims["jti"].(string); ok {
			ctx := context.Background()
			config.RDB.Set(ctx, "refresh_token:"+newJti, userID, time.Hour*24*7)
		}
	}

	appEnv := strings.ToLower(os.Getenv("APP_ENV"))
	isProduction := appEnv == "production"

	domain := os.Getenv("COOKIE_DOMAIN")
	if !isProduction {
		domain = ""
	}

	c.SetSameSite(http.SameSiteLaxMode)

	c.SetCookie(
		"access_token",
		newAccess,
		900,
		"/",
		domain,
		isProduction,
		true,
	)

	c.SetCookie(
		"refresh_token",
		newRefresh,
		604800,
		"/",
		domain,
		isProduction,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed",
	})
}

func VerifyEmail(c *gin.Context) {
	token := c.Query("token")

	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Token wajib",
		})
		return
	}

	hashed := hashToken(token)

	var verification models.EmailVerified

	err := config.DB.
		Where("token = ?", hashed).
		First(&verification).Error

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Token tidak valid",
		})
		return
	}

	if time.Now().After(verification.ExpiredAt) {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Token expired",
		})
		return
	}

	err = config.DB.Model(&models.User{}).
		Where("id = ?", verification.UserID).
		Update("email_verified", true).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal verifikasi email",
		})
		return
	}

	// hapus semua token user
	config.DB.
		Where("user_id = ?", verification.UserID).
		Delete(&models.EmailVerified{})

	c.JSON(http.StatusOK, gin.H{
		"message": "Email berhasil diverifikasi",
	})
}

func ResendVerification(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Email wajib diisi",
		})
		return
	}

	input.Email = strings.TrimSpace(strings.ToLower(input.Email))

	var user models.User

	err := config.DB.
		Where("email = ?", input.Email).
		First(&user).Error

	if err != nil {
		// jangan bocorkan email valid/tidak
		c.JSON(http.StatusOK, gin.H{
			"message": "Jika email terdaftar, email verifikasi akan dikirim",
		})
		return
	}

	if user.EmailVerified {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Email sudah diverifikasi",
		})
		return
	}

	config.DB.
		Where("user_id = ?", user.ID).
		Delete(&models.EmailVerified{})

	rawToken := generateToken()
	hashedToken := hashToken(rawToken)

	verification := models.EmailVerified{
		UserID:    user.ID,
		Token:     hashedToken,
		ExpiredAt: time.Now().Add(1 * time.Hour),
	}

	if err := config.DB.Create(&verification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal membuat token verifikasi",
		})
		return
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Println("PANIC RESEND EMAIL:", r)
			}
		}()

		SendVerificationEmail(user.Email, rawToken)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verifikasi dikirim",
	})
}

func CheckVerification(c *gin.Context) {
	email := strings.TrimSpace(
		strings.ToLower(c.Query("email")),
	)

	var user models.User

	err := config.DB.
		Where("email = ?", email).
		First(&user).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "User tidak ditemukan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"verified": user.EmailVerified,
	})
}

func ForgotPassword(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Email wajib diisi"})
		return
	}

	input.Email = strings.TrimSpace(strings.ToLower(input.Email))

	var user models.User
	err := config.DB.Where("email = ?", input.Email).First(&user).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Email tidak ditemukan"})
		return
	}

	config.DB.Where("user_id = ?", user.ID).Delete(&models.PasswordReset{})

	rawToken := generateToken()
	hashedToken := hashToken(rawToken)

	reset := models.PasswordReset{
		UserID:    user.ID,
		Token:     hashedToken,
		ExpiredAt: time.Now().Add(1 * time.Hour),
	}

	if err := config.DB.Create(&reset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal membuat token"})
		return
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Println("PANIC SEND EMAIL:", r)
			}
		}()
		SendResetPasswordEmail(user.Email, rawToken)
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Jika email terdaftar, link reset password akan dikirim"})
}

func ResetPassword(c *gin.Context) {
	var input struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	hashed := hashToken(input.Token)

	var reset models.PasswordReset
	err := config.DB.Where("token = ?", hashed).First(&reset).Error
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Token tidak valid"})
		return
	}

	if time.Now().After(reset.ExpiredAt) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Token expired"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal hash password"})
		return
	}

	if err := config.DB.Model(&models.User{}).Where("id = ?", reset.UserID).Update("password", string(hash)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal reset password"})
		return
	}

	config.DB.Delete(&reset)

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil direset, silakan login"})
}

func SendResetPasswordEmail(email string, token string) {
	link := os.Getenv("APP_URL") + "/reset-password?token=" + token

	body := bytes.NewBuffer(nil)

	body.WriteString("Subject: Reset Password\r\n")
	body.WriteString("MIME-Version: 1.0\r\n")
	body.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n")
	body.WriteString("Klik link berikut untuk reset password:\n\n")
	body.WriteString(link)

	err := smtp.SendMail(
		"smtp.gmail.com:587",
		smtp.PlainAuth(
			"",
			os.Getenv("SYSTEM_EMAIL"),
			os.Getenv("APP_PASSWORD_GMAIL"),
			"smtp.gmail.com",
		),
		os.Getenv("SYSTEM_EMAIL"),
		[]string{email},
		body.Bytes(),
	)

	if err != nil {
		log.Println("❌ Gagal kirim email reset password:", err)
		return
	}

	log.Println("✅ Email reset password terkirim ke:", email)
}

func SendVerificationEmail(email string, token string) {
	link := os.Getenv("APP_URL") + "/verify?token=" + token

	body := bytes.NewBuffer(nil)

	body.WriteString("Subject: Verifikasi Email\r\n")
	body.WriteString("MIME-Version: 1.0\r\n")
	body.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n")
	body.WriteString("Klik link berikut untuk verifikasi email:\n\n")
	body.WriteString(link)

	err := smtp.SendMail(
		"smtp.gmail.com:587",
		smtp.PlainAuth(
			"",
			os.Getenv("SYSTEM_EMAIL"),
			os.Getenv("APP_PASSWORD_GMAIL"),
			"smtp.gmail.com",
		),
		os.Getenv("SYSTEM_EMAIL"),
		[]string{email},
		body.Bytes(),
	)

	if err != nil {
		log.Println("❌ Gagal kirim email:", err)
		return
	}

	log.Println("✅ Email terkirim ke:", email)
}

func generateToken() string {
	b := make([]byte, 32)

	_, err := rand.Read(b)

	if err != nil {
		panic(err)
	}

	return hex.EncodeToString(b)
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}