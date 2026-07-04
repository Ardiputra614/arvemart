// controllers/monitor_controller.go
package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/jobs"
	"api-arveshop-go/models"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetRetryJobsStatus - Endpoint untuk melihat status semua retry job
func GetRetryJobsStatus(c *gin.Context) {
	status, err := jobs.GetRetryJobsStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   status,
	})
}

// GetRetryJobsSummary - Endpoint untuk ringkasan statistik
func GetRetryJobsSummary(c *gin.Context) {
	summary := jobs.GetRetryJobsSummary()
	
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   summary,
	})
}

// GetRetryJobDetail - Endpoint untuk detail satu job
func GetRetryJobDetail(c *gin.Context) {
	orderID := c.Param("order_id")
	
	detail, err := jobs.GetRetryJobDetail(orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   detail,
	})
}



// GetPendingJobs - Endpoint untuk melihat SEMUA pending job
func GetPendingJobs(c *gin.Context) {
    status, err := jobs.GetPendingJobs()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "status": "success",
        "data":   status,
    })
}


// ForceRetryJob - Endpoint untuk memaksa retry manual
func ForceRetryJob(c *gin.Context) {
	orderID := c.Param("order_id")

	// 🔍 Ambil transaksi
	var trx models.Transaction
	if err := config.DB.Where("order_id = ?", orderID).First(&trx).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Transaction not found",
		})
		return
	}

	// 🎲 Generate ProviderTrxID baru
	newProviderID := GenerateProviderTrxID(orderID)

	// 💾 Simpan ke database
	updates := map[string]interface{}{
		"provider_trx_id": newProviderID,
		"retry_count":     0,
		"updated_at":      time.Now(),
	}

	if err := config.DB.Model(&trx).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update transaction",
		})
		return
	}

	// 🔄 Refresh data
	var updatedTrx models.Transaction
	config.DB.First(&updatedTrx, trx.ID)

	// 🚀 Trigger retry
	go jobs.ProcessDigiflazzWithRetry(&updatedTrx)

	c.JSON(http.StatusOK, gin.H{
		"status":           "success",
		"message":          "Force retry triggered",
		"order_id":         orderID,
		"provider_trx_id":  newProviderID,
	})
}

func GenerateProviderTrxID(orderID string) string {
	rand.Seed(time.Now().UnixNano())

	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	randomPart := make([]byte, 6)

	for i := range randomPart {
		randomPart[i] = chars[rand.Intn(len(chars))]
	}

	return fmt.Sprintf("%s-%s", orderID, string(randomPart))
}