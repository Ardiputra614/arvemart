package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/services"
	"errors"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetProductHome(p *gin.Context) {
    var products []models.Product
    slug := p.Param("slug")    
    
    // Gunakan First untuk single record, Find untuk multiple
    err := config.DB.
        Where("seller_product_status = ?", true).
        Where("buyer_product_status = ?", true).
        Where("slug = ?", slug).
        Find(&products).Error // Gunakan First karena slug biasanya unique

    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            p.JSON(http.StatusNotFound, gin.H{"message": "Data tidak ditemukan"})
            return
        }
        p.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data: " + err.Error()})
        return
    }

    p.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": products})
}


func GetProductsAdmin(c *gin.Context) {
	var products []models.Product

	db := config.DB.Model(&models.Product{})

	// =========================
	// FILTER SEARCH
	// =========================
	search := c.Query("search")

	if search != "" {
		db = db.Where(
			`product_name LIKE ?
			OR brand LIKE ?
			OR buyer_sku_code LIKE ?`,
			"%"+search+"%",
			"%"+search+"%",
			"%"+search+"%",
		)
	}

	// =========================
	// FILTER CATEGORY
	// =========================
	category := c.Query("category")

	if category != "" {
		db = db.Where(
			"category = ?",
			category,
		)
	}

	// =========================
	// FILTER PRODUCT TYPE
	// =========================
	productType := c.Query("product_type")

	if productType != "" {
		db = db.Where(
			"product_type = ?",
			productType,
		)
	}

	// =========================
	// FILTER BUYER STATUS
	// =========================
	buyerStatus := c.Query("buyer_product_status")

	if buyerStatus != "" {
		db = db.Where(
			"buyer_product_status = ?",
			buyerStatus == "true",
		)
	}

	// =========================
	// FILTER SELLER STATUS
	// =========================
	sellerStatus := c.Query("seller_product_status")

	if sellerStatus != "" {
		db = db.Where(
			"seller_product_status = ?",
			sellerStatus == "true",
		)
	}

	// =========================
	// PAGINATION
	// =========================
	page, _ := strconv.Atoi(
		c.DefaultQuery("page", "1"),
	)

	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(
		c.DefaultQuery("limit", "20"),
	)

	// MAX LIMIT
	if limit <= 0 {
		limit = 20
	}

	if limit > 200 {
		limit = 200
	}

	offset := (page - 1) * limit

	// =========================
	// TOTAL
	// =========================
	var total int64

	if err := db.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": err.Error(),
		})
		return
	}

	// =========================
	// GET DATA
	// =========================
	err := db.
		Order("updated_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&products).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": err.Error(),
		})
		return
	}

	// =========================
	// PAGINATION META
	// =========================
	totalPage := int(math.Ceil(
		float64(total) / float64(limit),
	))

	var nextPage interface{} = nil
	var prevPage interface{} = nil

	if page < totalPage {
		nextPage = page + 1
	}

	if page > 1 {
		prevPage = page - 1
	}

	c.JSON(http.StatusOK, gin.H{
		"data": products,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"total_page": totalPage,
			"next_page":  nextPage,
			"prev_page":  prevPage,
		},
	})
}

func CreateProduct(c *gin.Context) {
	var product models.Product

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(400, gin.H{
			"message": err.Error(),
		})
		return
	}

	if err := config.DB.Create(&product).Error; err != nil {
		c.JSON(500, gin.H{
			"message": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"message": "success",
		"data": product,
	})
}

func UpdateProduct(c *gin.Context) {
	id := c.Param("id")

	var product models.Product

	if err := config.DB.First(&product, id).Error; err != nil {
		c.JSON(404, gin.H{
			"message": "product not found",
		})
		return
	}

	var input models.Product

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{
			"message": err.Error(),
		})
		return
	}

	if err := config.DB.Model(&product).
		Updates(input).Error; err != nil {

		c.JSON(500, gin.H{
			"message": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"message": "updated",
	})
}

func DeleteProduct(c *gin.Context) {
	id := c.Param("id")

	var product models.Product

	if err := config.DB.First(&product, id).Error; err != nil {
		c.JSON(404, gin.H{
			"message": "product not found",
		})
		return
	}

	if err := config.DB.Delete(&product).Error; err != nil {
		c.JSON(500, gin.H{
			"message": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"message": "deleted",
	})
}

func SyncProducts(c *gin.Context) {
	productType := c.Query("type")

	if productType == "" {
		c.JSON(400, gin.H{
			"message": "type required",
		})
		return
	}

	go services.SyncDigiflazzProducts(productType)

	c.JSON(200, gin.H{
		"message": "sync started",
	})
}