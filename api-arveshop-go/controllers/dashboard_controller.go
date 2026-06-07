package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ─── Controller struct ─────────────────────────────────────────────────────────

type DashboardController struct {
	db *gorm.DB
}

func NewDashboardController(db *gorm.DB) *DashboardController {
	return &DashboardController{db: db}
}

// ─── Response structs ──────────────────────────────────────────────────────────

type periodStats struct {
	TotalRevenue  float64
	TotalProfit   float64
	TotalOrders   int64
	PendingOrders int64
	SuccessOrders int64
	FailedOrders  int64
}

type DashboardStatsResponse struct {
	TotalUsers    int64   `json:"total_users"`
	TotalRevenue  float64 `json:"total_revenue"`
	TotalOrders   int64   `json:"total_orders"`
	PendingOrders int64   `json:"pending_orders"`
	TotalProfit   float64 `json:"total_profit"`
	SuccessOrders int64   `json:"success_orders"`
	FailedOrders  int64   `json:"failed_orders"`
	RevenueChange float64 `json:"revenue_change"`
	OrdersChange  float64 `json:"orders_change"`
	PendingChange float64 `json:"pending_change"`
	ProfitChange  float64 `json:"profit_change"`
	UsersChange   float64 `json:"users_change"`
}

type RecentTransactionItem struct {
	ID              uint      `json:"id"`
	OrderID         string    `json:"order_id"`
	CustomerNo      string    `json:"customer_no"`
	ProductName     *string   `json:"product_name"`
	ProductType     *string   `json:"product_type"`
	CategoryName    *string   `json:"category_name"`
	GrossAmount     float64   `json:"gross_amount"`
	Profit          float64   `json:"profit"`
	PaymentStatus   string    `json:"payment_status"`
	DigiflazzStatus *string   `json:"digiflazz_status"`
	WaPembeli       string    `json:"wa_pembeli"`
	CreatedAt       time.Time `json:"created_at"`
}

type RecentTransactionsResponse struct {
	Data []RecentTransactionItem `json:"data"`
}

// ─── Private helpers ───────────────────────────────────────────────────────────

func percentChange(current, previous float64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100
		}
		return 0
	}
	return ((current - previous) / previous) * 100
}

func startOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

func (dc *DashboardController) queryPeriodStats(start, end time.Time) (periodStats, error) {
	var stats periodStats

	successStatuses := []string{"settlement", "success"}
	failedStatuses  := []string{"failed", "cancel", "deny", "expire", "expired"}

	// Revenue & profit — hanya transaksi sukses
	type revenueResult struct {
		TotalRevenue float64
		TotalProfit  float64
	}
	var rev revenueResult
	err := dc.db.Table("transactions").
		Select("COALESCE(SUM(gross_amount), 0) AS total_revenue, COALESCE(SUM(profit), 0) AS total_profit").
		Where("payment_status IN ? AND created_at >= ? AND created_at < ?", successStatuses, start, end).
		Scan(&rev).Error
	if err != nil {
		return stats, err
	}
	stats.TotalRevenue = rev.TotalRevenue
	stats.TotalProfit  = rev.TotalProfit

	// Count per status
	dc.db.Table("transactions").
		Where("created_at >= ? AND created_at < ?", start, end).
		Count(&stats.TotalOrders)

	dc.db.Table("transactions").
		Where("payment_status = ? AND created_at >= ? AND created_at < ?", "pending", start, end).
		Count(&stats.PendingOrders)

	dc.db.Table("transactions").
		Where("payment_status IN ? AND created_at >= ? AND created_at < ?", successStatuses, start, end).
		Count(&stats.SuccessOrders)

	dc.db.Table("transactions").
		Where("payment_status IN ? AND created_at >= ? AND created_at < ?", failedStatuses, start, end).
		Count(&stats.FailedOrders)

	return stats, nil
}

// ─── GET /api/admin/dashboard/stats ───────────────────────────────────────────

func (dc *DashboardController) GetStats(c *gin.Context) {
	now := time.Now()

	thisStart := startOfMonth(now)
	thisEnd   := startOfMonth(now.AddDate(0, 1, 0))
	prevStart := startOfMonth(now.AddDate(0, -1, 0))
	prevEnd   := thisStart

	// Jalankan query dua periode secara concurrent
	type chanResult struct {
		stats periodStats
		err   error
	}
	thisCh := make(chan chanResult, 1)
	prevCh := make(chan chanResult, 1)

	go func() {
		s, err := dc.queryPeriodStats(thisStart, thisEnd)
		thisCh <- chanResult{s, err}
	}()
	go func() {
		s, err := dc.queryPeriodStats(prevStart, prevEnd)
		prevCh <- chanResult{s, err}
	}()

	thisRes := <-thisCh
	prevRes := <-prevCh

	if thisRes.err != nil || prevRes.err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil statistik transaksi"})
		return
	}

	curr := thisRes.stats
	prev := prevRes.stats

	// Total users dengan role "user"
	var totalUsers int64
	dc.db.Table("users").
		Where("role = ? AND deleted_at IS NULL", "user").
		Count(&totalUsers)

	// User baru bulan ini vs bulan lalu (untuk persentase perubahan)
	var usersThisMonth, usersPrevMonth int64
	dc.db.Table("users").
		Where("role = ? AND deleted_at IS NULL AND created_at >= ? AND created_at < ?", "user", thisStart, thisEnd).
		Count(&usersThisMonth)
	dc.db.Table("users").
		Where("role = ? AND deleted_at IS NULL AND created_at >= ? AND created_at < ?", "user", prevStart, prevEnd).
		Count(&usersPrevMonth)

	c.JSON(http.StatusOK, DashboardStatsResponse{
		TotalUsers:    totalUsers,
		TotalRevenue:  curr.TotalRevenue,
		TotalOrders:   curr.TotalOrders,
		PendingOrders: curr.PendingOrders,
		TotalProfit:   curr.TotalProfit,
		SuccessOrders: curr.SuccessOrders,
		FailedOrders:  curr.FailedOrders,

		RevenueChange: percentChange(curr.TotalRevenue, prev.TotalRevenue),
		OrdersChange:  percentChange(float64(curr.TotalOrders), float64(prev.TotalOrders)),
		PendingChange: percentChange(float64(curr.PendingOrders), float64(prev.PendingOrders)),
		ProfitChange:  percentChange(curr.TotalProfit, prev.TotalProfit),
		UsersChange:   percentChange(float64(usersThisMonth), float64(usersPrevMonth)),
	})
}

// ─── GET /api/admin/dashboard/recent-transactions ─────────────────────────────

func (dc *DashboardController) GetRecentTransactions(c *gin.Context) {
	var rows []RecentTransactionItem

	err := dc.db.Table("transactions").
		Select(`
			id,
			order_id,
			customer_no,
			product_name,
			product_type,
			category_name,
			CAST(gross_amount AS DECIMAL(20,2))        AS gross_amount,
			COALESCE(CAST(profit AS DECIMAL(20,2)), 0) AS profit,
			payment_status,
			digiflazz_status,
			wa_pembeli,
			created_at
		`).
		Order("created_at DESC").
		Limit(5).
		Scan(&rows).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil transaksi terbaru"})
		return
	}

	if rows == nil {
		rows = []RecentTransactionItem{}
	}

	c.JSON(http.StatusOK, RecentTransactionsResponse{Data: rows})
}
