package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/utils"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Helper: ekstrak PublicID dari Cloudinary URL
// https://res.cloudinary.com/cloud/image/upload/v123/services/logos/logo_123.jpg
// → services/logos/logo_123
func extractPublicID(cloudinaryURL string) string {
	if cloudinaryURL == "" {
		return ""
	}

	// Cari "/upload/" dalam URL
	uploadIdx := strings.Index(cloudinaryURL, "/upload/")
	if uploadIdx == -1 {
		return ""
	}

	// Ambil bagian setelah "/upload/"
	afterUpload := cloudinaryURL[uploadIdx+len("/upload/"):]

	// Hapus versi jika ada (v1234567890/)
	if len(afterUpload) > 0 && afterUpload[0] == 'v' {
		slashIdx := strings.Index(afterUpload, "/")
		if slashIdx != -1 {
			afterUpload = afterUpload[slashIdx+1:]
		}
	}

	// Hapus ekstensi file
	dotIdx := strings.LastIndex(afterUpload, ".")
	if dotIdx != -1 {
		afterUpload = afterUpload[:dotIdx]
	}

	return afterUpload
}

// UploadLogo - upload logo ke Cloudinary
func UploadLogo(c *gin.Context) {
	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "File logo tidak ditemukan: " + err.Error(),
		})
		return
	}

	// Validasi file
	if err := utils.ValidateImage(file); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": err.Error(),
		})
		return
	}

	// Upload ke Cloudinary
	result, err := utils.UploadFile(file, "services/logos")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal mengupload logo: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":      200,
		"message":   "Logo berhasil diupload",
		"url":       result.SecureURL,
		"public_id": result.PublicID,
	})
}

// GetProfilAplikasi - ambil data profil aplikasi
func GetProfilAplikasi(c *gin.Context) {
	var profil models.ProfilAplikasi
	if err := config.DB.First(&profil).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "Data tidak ditemukan!",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": profil,
	})
}

// CreateProfilAplikasi - buat profil baru (hanya jika belum ada)
func CreateProfilAplikasi(c *gin.Context) {
	var count int64
	config.DB.Model(&models.ProfilAplikasi{}).Count(&count)

	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Data profil aplikasi sudah ada!",
		})
		return
	}

	var input models.ProfilAplikasi
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Format input tidak valid: " + err.Error(),
		})
		return
	}

	if input.ApplicationName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Application name wajib diisi"})
		return
	}
	if input.ApplicationFee == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Application fee wajib diisi"})
		return
	}
	if input.TermsCondition == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Terms and condition wajib diisi"})
		return
	}
	if input.PrivacyPolicy == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Privacy policy wajib diisi"})
		return
	}
	if input.Logo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Logo wajib diisi"})
		return
	}

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal menyimpan data: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code":    201,
		"message": "Data profil aplikasi berhasil dibuat",
		"data":    input,
	})
}

// UpdateProfilAplikasi - update profil + hapus logo lama di Cloudinary kalau logo berubah
func UpdateProfilAplikasi(c *gin.Context) {
	id := c.Param("id")

	var profil models.ProfilAplikasi
	if err := config.DB.First(&profil, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "Data tidak ditemukan!",
		})
		return
	}

	var input models.ProfilAplikasi
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Format input tidak valid: " + err.Error(),
		})
		return
	}

	if input.ApplicationName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Application name wajib diisi"})
		return
	}
	if input.ApplicationFee == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Application fee wajib diisi"})
		return
	}
	if input.TermsCondition == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Terms and condition wajib diisi"})
		return
	}
	if input.PrivacyPolicy == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Privacy policy wajib diisi"})
		return
	}
	if input.Logo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Logo wajib diisi"})
		return
	}

	// ✅ Hapus logo lama di Cloudinary kalau logo berubah
	oldLogo := profil.Logo
	if oldLogo != "" && oldLogo != input.Logo {
		publicID := extractPublicID(oldLogo)
		if publicID != "" {
			if err := utils.DeleteFile(publicID); err != nil {
				// Log error tapi jangan gagalkan request
				// log.Printf("Warning: gagal hapus logo lama: %v", err)
				_ = err
			}
		}
	}

	sql := `UPDATE profil_aplikasis 
		SET application_name = ?, application_fee = ?, saldo = ?, 
		    terms_condition = ?, privacy_policy = ?, logo = ?, updated_at = ? 
		WHERE id = ?`

	result := config.DB.Exec(sql,
		input.ApplicationName,
		input.ApplicationFee,
		input.Saldo,
		input.TermsCondition,
		input.PrivacyPolicy,
		input.Logo,
		time.Now(),
		id,
	)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal mengupdate data: " + result.Error.Error(),
		})
		return
	}

	config.DB.First(&profil, id)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Data profil aplikasi berhasil diupdate",
		"data":    profil,
	})
}

// UpdateProfilAplikasiPartial - partial update + hapus logo lama kalau berubah
func UpdateProfilAplikasiPartial(c *gin.Context) {
	id := c.Param("id")

	var profil models.ProfilAplikasi
	if err := config.DB.First(&profil, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "Data tidak ditemukan!",
		})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Format input tidak valid: " + err.Error(),
		})
		return
	}

	if len(input) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Tidak ada data yang diupdate",
		})
		return
	}

	// Validasi field kosong
	for _, field := range []string{"application_name", "application_fee", "logo"} {
		if val, exists := input[field]; exists && val == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": field + " tidak boleh kosong",
			})
			return
		}
	}

	// ✅ Hapus logo lama di Cloudinary kalau logo berubah
	if newLogo, exists := input["logo"]; exists {
		newLogoStr, ok := newLogo.(string)
		oldLogo := profil.Logo
		if ok && oldLogo != "" && oldLogo != newLogoStr {
			publicID := extractPublicID(oldLogo)
			if publicID != "" {
				_ = utils.DeleteFile(publicID)
			}
		}
	}

	// Build dynamic SQL
	sql := "UPDATE profil_aplikasis SET "
	args := []interface{}{}

	fieldMapping := map[string]string{
		"application_name": "application_name",
		"application_fee":  "application_fee",
		"saldo":            "saldo",
		"terms_condition":  "terms_condition",
		"privacy_policy":   "privacy_policy",
		"logo":             "logo",
	}

	first := true
	for jsonField, dbField := range fieldMapping {
		if value, exists := input[jsonField]; exists {
			if !first {
				sql += ", "
			}
			sql += dbField + " = ?"
			args = append(args, value)
			first = false
		}
	}

	sql += ", updated_at = ? WHERE id = ?"
	args = append(args, time.Now(), id)

	if result := config.DB.Exec(sql, args...); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal mengupdate data: " + result.Error.Error(),
		})
		return
	}

	config.DB.First(&profil, id)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Data profil aplikasi berhasil diupdate",
		"data":    profil,
	})
}

// DeleteLogoCloudinary - endpoint khusus hapus logo dari Cloudinary by URL
func DeleteLogoCloudinary(c *gin.Context) {
	var input struct {
		URL string `json:"url"`
	}

	if err := c.ShouldBindJSON(&input); err != nil || input.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "URL logo wajib diisi",
		})
		return
	}

	publicID := extractPublicID(input.URL)
	if publicID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Gagal mengekstrak public ID dari URL",
		})
		return
	}

	if err := utils.DeleteFile(publicID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal menghapus logo: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Logo berhasil dihapus",
	})
}