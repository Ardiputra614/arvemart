package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetVouchers(c *gin.Context) {
	var vouchers []models.Voucher
	if err := config.DB.Order("created_at DESC").Find(&vouchers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 200, "data": vouchers})
}

func GetVoucher(c *gin.Context) {
	id := c.Param("id")
	var voucher models.Voucher
	if err := config.DB.First(&voucher, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Voucher tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 200, "data": voucher})
}

func CreateVoucher(c *gin.Context) {
	var req struct {
		Code          string  `json:"code"`
		DiscountType  string  `json:"discount_type"`
		DiscountValue float64 `json:"discount_value"`
		MinPurchase   float64 `json:"min_purchase"`
		MaxUses       int     `json:"max_uses"`
		ValidFrom     string  `json:"valid_from"`
		ValidUntil    string  `json:"valid_until"`
		IsActive      bool    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	if req.Code == "" || req.DiscountType == "" || req.DiscountValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Code, discount_type, dan discount_value wajib diisi"})
		return
	}

	if req.DiscountType != "percentage" && req.DiscountType != "flat" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "discount_type harus 'percentage' atau 'flat'"})
		return
	}

	if req.DiscountType == "percentage" && req.DiscountValue > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Persentase diskon tidak boleh lebih dari 100"})
		return
	}

	var existing models.Voucher
	err := config.DB.Where("code = ?", req.Code).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Kode voucher sudah digunakan"})
		return
	}

	validFrom, _ := time.Parse("2006-01-02", req.ValidFrom)
	validUntil, _ := time.Parse("2006-01-02", req.ValidUntil)

	voucher := models.Voucher{
		Code:          req.Code,
		DiscountType:  req.DiscountType,
		DiscountValue: req.DiscountValue,
		MinPurchase:   req.MinPurchase,
		MaxUses:       req.MaxUses,
		UsedCount:     0,
		ValidFrom:     validFrom,
		ValidUntil:    validUntil,
		IsActive:      req.IsActive,
	}

	if err := config.DB.Create(&voucher).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal membuat voucher"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 200, "message": "Voucher berhasil dibuat", "data": voucher})
}

func UpdateVoucher(c *gin.Context) {
	id := c.Param("id")
	var voucher models.Voucher
	if err := config.DB.First(&voucher, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Voucher tidak ditemukan"})
		return
	}

	var req struct {
		Code          string  `json:"code"`
		DiscountType  string  `json:"discount_type"`
		DiscountValue float64 `json:"discount_value"`
		MinPurchase   float64 `json:"min_purchase"`
		MaxUses       int     `json:"max_uses"`
		ValidFrom     string  `json:"valid_from"`
		ValidUntil    string  `json:"valid_until"`
		IsActive      bool    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	validFrom, _ := time.Parse("2006-01-02", req.ValidFrom)
	validUntil, _ := time.Parse("2006-01-02", req.ValidUntil)

	updates := map[string]interface{}{
		"code":           req.Code,
		"discount_type":  req.DiscountType,
		"discount_value": req.DiscountValue,
		"min_purchase":   req.MinPurchase,
		"max_uses":       req.MaxUses,
		"valid_from":     validFrom,
		"valid_until":    validUntil,
		"is_active":      req.IsActive,
	}

	if err := config.DB.Model(&voucher).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate voucher"})
		return
	}

	config.DB.First(&voucher, id)
	c.JSON(http.StatusOK, gin.H{"code": 200, "message": "Voucher berhasil diupdate", "data": voucher})
}

func DeleteVoucher(c *gin.Context) {
	id := c.Param("id")
	var voucher models.Voucher
	if err := config.DB.First(&voucher, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Voucher tidak ditemukan"})
		return
	}

	if err := config.DB.Delete(&voucher).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus voucher"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 200, "message": "Voucher berhasil dihapus"})
}

func ValidateVoucher(c *gin.Context) {
	var req struct {
		Code        string  `json:"code"`
		TotalAmount float64 `json:"total_amount"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	var voucher models.Voucher
	if err := config.DB.Where("code = ?", req.Code).First(&voucher).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "Kode voucher tidak ditemukan", "valid": false})
		return
	}

	now := time.Now()
	if !voucher.IsActive {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": "Voucher sudah tidak aktif", "valid": false})
		return
	}

	if now.Before(voucher.ValidFrom) {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": "Voucher belum berlaku", "valid": false})
		return
	}

	if now.After(voucher.ValidUntil) {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": "Voucher sudah kedaluwarsa", "valid": false})
		return
	}

	if voucher.MaxUses > 0 && voucher.UsedCount >= voucher.MaxUses {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": "Kuota voucher sudah habis", "valid": false})
		return
	}

	if req.TotalAmount < voucher.MinPurchase {
		c.JSON(http.StatusOK, gin.H{"code": 400, "message": "Minimal belanja Rp" + formatFloat(voucher.MinPurchase) + " untuk menggunakan voucher ini", "valid": false})
		return
	}

	var discount float64
	if voucher.DiscountType == "percentage" {
		discount = req.TotalAmount * voucher.DiscountValue / 100
	} else {
		discount = voucher.DiscountValue
		if discount > req.TotalAmount {
			discount = req.TotalAmount
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"valid":   true,
		"message": "Voucher valid",
		"data": gin.H{
			"id":             voucher.ID,
			"code":           voucher.Code,
			"discount_type":  voucher.DiscountType,
			"discount_value": voucher.DiscountValue,
			"discount":       discount,
			"min_purchase":   voucher.MinPurchase,
		},
	})
}

func validateAndUseVoucher(code string, totalAmount float64) (*models.Voucher, float64, error) {
	var voucher models.Voucher
	if err := config.DB.Where("code = ?", code).First(&voucher).Error; err != nil {
		return nil, 0, fmt.Errorf("Kode voucher tidak ditemukan")
	}

	now := time.Now()
	if !voucher.IsActive {
		return nil, 0, fmt.Errorf("Voucher sudah tidak aktif")
	}

	if now.Before(voucher.ValidFrom) {
		return nil, 0, fmt.Errorf("Voucher belum berlaku")
	}

	if now.After(voucher.ValidUntil) {
		return nil, 0, fmt.Errorf("Voucher sudah kedaluwarsa")
	}

	if voucher.MaxUses > 0 && voucher.UsedCount >= voucher.MaxUses {
		return nil, 0, fmt.Errorf("Kuota voucher sudah habis")
	}

	if totalAmount < voucher.MinPurchase {
		return nil, 0, fmt.Errorf("Minimal belanja Rp%.0f untuk menggunakan voucher ini", voucher.MinPurchase)
	}

	var discount float64
	if voucher.DiscountType == "percentage" {
		discount = totalAmount * voucher.DiscountValue / 100
	} else {
		discount = voucher.DiscountValue
		if discount > totalAmount {
			discount = totalAmount
		}
	}

	config.DB.Model(&voucher).UpdateColumn("used_count", gorm.Expr("used_count + 1"))

	return &voucher, discount, nil
}

func formatFloat(f float64) string {
	intVal := int(f)
	result := ""
	s := fmt.Sprintf("%d", intVal)
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}
	return result
}
