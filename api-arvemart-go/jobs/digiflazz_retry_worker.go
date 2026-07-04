// jobs/digiflazz_retry_worker.go
package jobs

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"context"
	"log"
	"os"
	"time"
)

// StartRetryMonitor - memonitor dan memproses job yang perlu di-retry
func StartRetryMonitor() {
    go func() {
        ticker := time.NewTicker(1 * time.Minute)
        defer ticker.Stop()
        
        for range ticker.C {
            processPendingRetries()
        }
    }()
    log.Println("✅ Retry monitor started")
}

func processPendingRetries() {
    var transactions []models.Transaction
    
    // Cari transaksi dengan status pending dan next_retry_at <= now
    // Dan bukan karena cut off (karena cut off sudah di-handle terpisah)
    now := time.Now()
    err := config.DB.Where(
        "digiflazz_status = ? AND next_retry_at IS NOT NULL AND next_retry_at <= ? AND (last_error_code != ? OR last_error_code IS NULL)",
        "pending", now, "CUTOFF",
    ).Find(&transactions).Error
    
    if err != nil {
        log.Printf("Error fetching pending retries: %v", err)
        return
    }
    
    for _, tx := range transactions {
        log.Printf("🔄 Processing pending retry for order %s, attempt %d", 
            tx.OrderID, tx.RetryCount+1)
        
        go func(transaction models.Transaction) {
            cfg := DigiflazzConfig{
                Username: os.Getenv("DIGIFLAZZ_USERNAME"),
                ProdKey:  os.Getenv("DIGIFLAZZ_PROD_KEY"),
                BaseURL:  "https://api.digiflazz.com/v1",
            }
            
            job := NewDigiflazzTopupJob(transaction.ID, config.DB, config.RDB, cfg)
            if err := job.Handle(context.Background()); err != nil {
                log.Printf("❌ Retry failed for order %s: %v", transaction.OrderID, err)
            }
        }(tx)
    }
}

// ProcessCutOffRetries - khusus untuk memproses transaksi yang ditunda karena cut off
func ProcessCutOffRetries() {
    var transactions []models.Transaction
    
    now := time.Now()
    err := config.DB.Where(
        "digiflazz_status = ? AND next_retry_at IS NOT NULL AND next_retry_at <= ? AND last_error_code = ?",
        "pending", now, "CUTOFF",
    ).Find(&transactions).Error
    
    if err != nil {
        log.Printf("Error fetching cut off retries: %v", err)
        return
    }
    
    for _, tx := range transactions {
        log.Printf("⏸️ Processing cut off retry for order %s", tx.OrderID)
        
        // Cek ulang cut off produk
        if tx.ProductID != nil {
            var product models.Product
            if err := config.DB.First(&product, *tx.ProductID).Error; err == nil {
                if product.IsWithinCutoff() {
                    // Masih dalam cut off, update next_retry lagi
                    nextAvailable := product.GetNextAvailableTime()
                    config.DB.Model(&tx).Updates(map[string]interface{}{
                        "next_retry_at": nextAvailable,
                        "updated_at":    time.Now(),
                    })
                    log.Printf("⏸️ Product still in cut off, rescheduled to %s", 
                        nextAvailable.Format("15:04 02/01"))
                    continue
                }
            }
        }
        
        // Cut off sudah selesai, proses transaksi
        go func(transaction models.Transaction) {
            cfg := DigiflazzConfig{
                Username: os.Getenv("DIGIFLAZZ_USERNAME"),
                ProdKey:  os.Getenv("DIGIFLAZZ_PROD_KEY"),
                BaseURL:  "https://api.digiflazz.com/v1",
            }
            
            job := NewDigiflazzTopupJob(transaction.ID, config.DB, config.RDB, cfg)
            if err := job.Handle(context.Background()); err != nil {
                log.Printf("❌ Cut off retry failed for order %s: %v", transaction.OrderID, err)
            }
        }(tx)
    }
}

// Update StartRetryWorker untuk memasukkan cut off processor
func StartRetryWorker() {
    go func() {
        for {
            processRetryQueue()
            ProcessCutOffRetries() // Tambahkan ini
            time.Sleep(5 * time.Second)
        }
    }()
}