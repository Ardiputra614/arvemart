package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetAllTransaction(t *gin.Context) {
	var page int = 1
	var limit int = 20
	if p, err := strconv.Atoi(t.DefaultQuery("page", "1")); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(t.DefaultQuery("limit", "20")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	var transaction []models.Transaction
	var total int64

	config.DB.Model(&models.Transaction{}).Count(&total)
	err := config.DB.Offset((page - 1) * limit).Limit(limit).Order("created_at DESC").Find(&transaction).Error

	if err != nil {
		t.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	t.JSON(http.StatusOK, gin.H{
		"message":     "Berhasil",
		"data":        transaction,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

func GetHistoryCustomer(c *gin.Context) {
    // Ambil user_id dari context (yang udah diset middleware)
    userID, exists := c.Get("user_id")
    fmt.Println(userID)
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{
            "error": "Unauthorized - user_id tidak ditemukan",
        })
        return
    }

    // Convert ke uint
    uid, ok := userID.(uint)
    if !ok {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Invalid user ID format",
        })
        return
    }

    // Ambil parameter filter
    var filter struct {
        ProductType   string `form:"product_type"`
        PaymentStatus string `form:"payment_status"`
        StartDate     string `form:"start_date"`
        EndDate       string `form:"end_date"`
        Search        string `form:"search"`
        Page          int    `form:"page,default=1"`
        Limit         int    `form:"limit,default=10"`
    }

    if err := c.ShouldBindQuery(&filter); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filter"})
        return
    }

    // Query dengan filter
    var orders []models.Transaction
    var total int64

    query := config.DB.Model(&models.Transaction{}).Where("user_id = ?", uid)

    // Apply filters
    if filter.ProductType != "" {
        query = query.Where("product_type LIKE ?", "%"+filter.ProductType+"%")
    }
    
    if filter.PaymentStatus != "" {
        query = query.Where("payment_status = ?", filter.PaymentStatus)
    }
    
    if filter.StartDate != "" {
        start, _ := time.Parse("2006-01-02", filter.StartDate)
        query = query.Where("created_at >= ?", start)
    }
    
    if filter.EndDate != "" {
        end, _ := time.Parse("2006-01-02", filter.EndDate)
        end = end.Add(24 * time.Hour - time.Second)
        query = query.Where("created_at <= ?", end)
    }
    
    if filter.Search != "" {
        search := "%" + filter.Search + "%"
        query = query.Where("order_id LIKE ? OR product_name LIKE ? OR customer_no LIKE ?", 
            search, search, search)
    }

    // Hitung total
    query.Count(&total)

    // Pagination
    offset := (filter.Page - 1) * filter.Limit
    err := query.Offset(offset).Limit(filter.Limit).Order("created_at DESC").Find(&orders).Error

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
        return
    }

    totalPages := int(total) / filter.Limit
    if int(total)%filter.Limit > 0 {
        totalPages++
    }

    c.JSON(http.StatusOK, gin.H{
        "message":      "berhasil",
        "data":         orders,
        "total":        total,
        "page":         filter.Page,
        "limit":        filter.Limit,
        "total_pages":  totalPages,
    })
}

// PAKAI CONTEXT JUGA
func GetHistorySummary(c *gin.Context) {
    // Ambil user_id dari context
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{
            "error": "Unauthorized",
        })
        return
    }

    uid, ok := userID.(uint)
    if !ok {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Invalid user ID",
        })
        return
    }

    var summary struct {
        TotalTransactions int64   `json:"total_transactions"`
        TotalSellingPrice float64 `json:"total_selling_price"`
        SuccessCount      int64   `json:"success_count"`
        PendingCount      int64   `json:"pending_count"`
        FailedCount       int64   `json:"failed_count"`
    }

    // Hitung total
    config.DB.Model(&models.Transaction{}).
        Where("user_id = ?", uid).
        Select("COUNT(*) as total_transactions, COALESCE(SUM(selling_price), 0) as total_selling_price").
        Scan(&summary)

    // Hitung status
    config.DB.Model(&models.Transaction{}).
        Where("user_id = ? AND payment_status = ?", uid, "settlement").
        Count(&summary.SuccessCount)

    config.DB.Model(&models.Transaction{}).
        Where("user_id = ? AND payment_status = ?", uid, "pending").
        Count(&summary.PendingCount)

    config.DB.Model(&models.Transaction{}).
        Where("user_id = ? AND payment_status IN ?", uid, []string{"failed", "expired", "deny"}).
        Count(&summary.FailedCount)

    c.JSON(http.StatusOK, summary)
}