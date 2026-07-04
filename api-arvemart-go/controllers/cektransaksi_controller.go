package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type PublicTransaction struct {
	OrderID       string `json:"order_id"`
	CustomerNo    string `json:"customer_no"`
	GrossAmount   string `json:"gross_amount"`
	PaymentStatus string `json:"payment_status"`
	CreatedAt     string `json:"created_at"`
}

func maskOrderID(id string) string {
	if len(id) <= 6 {
		return id
	}
	return id[:2] + strings.Repeat("x", len(id)-5) + id[len(id)-3:]
}

func maskCustomerNo(no string) string {
	if len(no) <= 3 {
		return no
	}
	return strings.Repeat("*", len(no)-3) + no[len(no)-3:]
}

func maskAmount(amount decimal.Decimal) string {
	s := amount.String()
	parts := strings.Split(s, ".")
	intPart := parts[0]

	if len(intPart) <= 2 {
		return "IDR " + intPart
	}

	prefix := intPart[:2]
	return fmt.Sprintf("IDR %s%s", prefix, strings.Repeat("x", len(intPart)-2))
}

func GetRecentTransactions(c *gin.Context) {
	var transactions []models.Transaction

	if err := config.DB.Where(
		"payment_status = ? OR (created_at > NOW() - INTERVAL 5 MINUTE)",
		"pending",
	).Order("created_at DESC").Limit(20).Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal mengambil data transaksi",
		})
		return
	}

	var result []PublicTransaction
	for _, t := range transactions {
		result = append(result, PublicTransaction{
			OrderID:       maskOrderID(t.OrderID),
			CustomerNo:    maskCustomerNo(t.CustomerNo),
			GrossAmount:   maskAmount(t.GrossAmount),
			PaymentStatus: t.PaymentStatus,
			CreatedAt:     t.CreatedAt.Format("02-01-2006 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}
