// jobs/expiry_monitor.go
package jobs

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/services"
	"log"
	"time"

	"gorm.io/gorm"
)

const expiryReminderMinutes = 15

func StartExpiryMonitor() {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			processExpiringPayments()
		}
	}()
	log.Println("✅ Expiry reminder monitor started (every 1 minute)")
}

func processExpiringPayments() {
	now := time.Now()
	reminderWindow := now.Add(time.Duration(expiryReminderMinutes) * time.Minute)

	var transactions []models.Transaction

	err := config.DB.Where(
		`payment_status = ? AND reminder_count = ? AND (
			(ipaymu_expiry IS NOT NULL AND ipaymu_expiry BETWEEN ? AND ?) OR
			(midtrans_expiry IS NOT NULL AND midtrans_expiry BETWEEN ? AND ?)
		)`,
		"pending", 1,
		now, reminderWindow,
		now, reminderWindow,
	).Find(&transactions).Error

	if err != nil {
		log.Printf("❌ Expiry monitor query error: %v", err)
		return
	}

	for _, tx := range transactions {
		if tx.WaPembeli == "" {
			continue
		}

		var expiryTime *time.Time
		if tx.IpaymuExpiry != nil {
			expiryTime = tx.IpaymuExpiry
		} else if tx.MidtransExpiry != nil {
			expiryTime = tx.MidtransExpiry
		}

		err := services.WAService.SendPaymentExpiryReminder(&tx, expiryTime)
		if err != nil {
			log.Printf("❌ Gagal kirim WA expiry reminder untuk %s: %v", tx.OrderID, err)
			continue
		}

		config.DB.Model(&tx).UpdateColumn("reminder_count", gorm.Expr("reminder_count + 1"))
		log.Printf("✅ Expiry reminder WA sent for %s", tx.OrderID)
	}
}
