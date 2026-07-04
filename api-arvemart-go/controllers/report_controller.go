package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ReportController struct {
	db *gorm.DB
}

func NewReportController(db *gorm.DB) *ReportController {
	return &ReportController{db: db}
}

// ─── Response structs ──────────────────────────────────────────────────────────

type ReportSummary struct {
	TotalRevenue  float64 `json:"total_revenue"`
	TotalProfit   float64 `json:"total_profit"`
	TotalOrders   int64   `json:"total_orders"`
	SuccessOrders int64   `json:"success_orders"`
	PendingOrders int64   `json:"pending_orders"`
	FailedOrders  int64   `json:"failed_orders"`
	SuccessRate   float64 `json:"success_rate"`
}

type ReportTransactionRow struct {
	ID              uint      `json:"id"`
	OrderID         string    `json:"order_id"`
	CustomerNo      string    `json:"customer_no"`
	WaPembeli       string    `json:"wa_pembeli"`
	ProductName     *string   `json:"product_name"`
	ProductType     *string   `json:"product_type"`
	CategoryName    *string   `json:"category_name"`
	GrossAmount     float64   `json:"gross_amount"`
	SellingPrice    float64   `json:"selling_price"`
	PurchasePrice   float64   `json:"purchase_price"`
	Profit          float64   `json:"profit"`
	AdminFee        float64   `json:"admin_fee"`
	PaymentStatus   string    `json:"payment_status"`
	DigiflazzStatus *string   `json:"digiflazz_status"`
	PaymentType     *string   `json:"payment_type"`
	SerialNumber    *string   `json:"serial_number"`
	CreatedAt       time.Time `json:"created_at"`
}

type ReportResponse struct {
	Summary      ReportSummary          `json:"summary"`
	Transactions []ReportTransactionRow `json:"transactions"`
	DateFrom     string                 `json:"date_from"`
	DateTo       string                 `json:"date_to"`
	GeneratedAt  time.Time              `json:"generated_at"`
}

// ─── GET /api/admin/report?from=2025-01-01&to=2025-01-31 ──────────────────────

func (rc *ReportController) GetReport(c *gin.Context) {
	fromStr := c.DefaultQuery("from", "")
	toStr   := c.DefaultQuery("to", "")

	loc := time.Local
	var dateFrom, dateTo time.Time
	var err error

	if fromStr == "" {
		now := time.Now().In(loc)
		dateFrom = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
	} else {
		dateFrom, err = time.ParseInLocation("2006-01-02", fromStr, loc)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid. Gunakan YYYY-MM-DD"})
			return
		}
	}

	if toStr == "" {
		now := time.Now().In(loc)
		dateTo = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, loc)
	} else {
		dateTo, err = time.ParseInLocation("2006-01-02", toStr, loc)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid. Gunakan YYYY-MM-DD"})
			return
		}
		dateTo = time.Date(dateTo.Year(), dateTo.Month(), dateTo.Day(), 23, 59, 59, 0, loc)
	}

	if dateFrom.After(dateTo) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tanggal 'from' tidak boleh setelah tanggal 'to'"})
		return
	}

	successStatuses := []string{"settlement", "success"}
	failedStatuses  := []string{"failed", "cancel", "deny", "expire", "expired"}

	// ── Summary ─────────────────────────────────────────────────────────────
	type aggResult struct {
		TotalRevenue float64
		TotalProfit  float64
	}
	var agg aggResult
	rc.db.Table("transactions").
		Select("COALESCE(SUM(gross_amount), 0) AS total_revenue, COALESCE(SUM(profit), 0) AS total_profit").
		Where("payment_status IN ? AND created_at >= ? AND created_at <= ?", successStatuses, dateFrom, dateTo).
		Scan(&agg)

	var totalOrders, successOrders, pendingOrders, failedOrders int64
	rc.db.Table("transactions").Where("created_at >= ? AND created_at <= ?", dateFrom, dateTo).Count(&totalOrders)
	rc.db.Table("transactions").Where("payment_status IN ? AND created_at >= ? AND created_at <= ?", successStatuses, dateFrom, dateTo).Count(&successOrders)
	rc.db.Table("transactions").Where("payment_status = ? AND created_at >= ? AND created_at <= ?", "pending", dateFrom, dateTo).Count(&pendingOrders)
	rc.db.Table("transactions").Where("payment_status IN ? AND created_at >= ? AND created_at <= ?", failedStatuses, dateFrom, dateTo).Count(&failedOrders)

	successRate := 0.0
	if totalOrders > 0 {
		successRate = (float64(successOrders) / float64(totalOrders)) * 100
	}

	// ── Transactions ────────────────────────────────────────────────────────
	var rows []ReportTransactionRow
	err = rc.db.Table("transactions").
		Select(`
			id, order_id, customer_no, wa_pembeli,
			product_name, product_type, category_name,
			CAST(gross_amount   AS DECIMAL(20,2)) AS gross_amount,
			CAST(selling_price  AS DECIMAL(20,2)) AS selling_price,
			CAST(purchase_price AS DECIMAL(20,2)) AS purchase_price,
			COALESCE(CAST(profit    AS DECIMAL(20,2)), 0) AS profit,
			COALESCE(CAST(admin_fee AS DECIMAL(20,2)), 0) AS admin_fee,
			payment_status, digiflazz_status, payment_type, serial_number, created_at
		`).
		Where("created_at >= ? AND created_at <= ?", dateFrom, dateTo).
		Order("created_at DESC").
		Scan(&rows).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data transaksi"})
		return
	}
	if rows == nil {
		rows = []ReportTransactionRow{}
	}

	c.JSON(http.StatusOK, ReportResponse{
		Summary: ReportSummary{
			TotalRevenue:  agg.TotalRevenue,
			TotalProfit:   agg.TotalProfit,
			TotalOrders:   totalOrders,
			SuccessOrders: successOrders,
			PendingOrders: pendingOrders,
			FailedOrders:  failedOrders,
			SuccessRate:   successRate,
		},
		Transactions: rows,
		DateFrom:     dateFrom.Format("2006-01-02"),
		DateTo:       dateTo.Format("2006-01-02"),
		GeneratedAt:  time.Now(),
	})
}
