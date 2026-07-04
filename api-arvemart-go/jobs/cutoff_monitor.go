// jobs/cutoff_monitor.go
package jobs

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"log"
	"os"
	"time"

	"github.com/hibiken/asynq"
)

// StartCutOffMonitor - memonitor transaksi yang pending karena cut off
func StartCutOffMonitor() {
    go func() {
        ticker := time.NewTicker(1 * time.Minute)
        defer ticker.Stop()
        
        for range ticker.C {
            processCutOffTransactions()
        }
    }()
    log.Println("✅ Cut-off monitor started")
}

func processCutOffTransactions() {
    var transactions []models.Transaction
    
    // Cari transaksi dengan status pending karena cut off dan next_retry_at sudah lewat
    now := time.Now()
    err := config.DB.Where(
        "digiflazz_status = ? AND last_error_code = ? AND next_retry_at IS NOT NULL AND next_retry_at <= ?",
        "pending", "CUTOFF", now,
    ).Find(&transactions).Error
    
    if err != nil {
        log.Printf("Error checking cut off transactions: %v", err)
        return
    }
    
    if len(transactions) == 0 {
        return
    }
    
    log.Printf("⏸️ Found %d cut off transactions ready for processing", len(transactions))
    
    // Setup Redis client untuk Asynq
    redisAddr := os.Getenv("REDIS_ADDR")
    if redisAddr == "" {
        redisAddr = "127.0.0.1:6379"
    }
    
    client := asynq.NewClient(asynq.RedisClientOpt{
        Addr:     redisAddr,
        Password: os.Getenv("REDIS_PASSWORD"),
        DB:       0,
    })
    defer client.Close()
    
    for _, tx := range transactions {
        // Cek ulang cut off produk (jaga-jaga)
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
                    log.Printf("⏸️ Product %s still in cut off, rescheduled to %s", 
                        product.ProductName, nextAvailable.Format("15:04 02/01"))
                    continue
                }
            }
        }
        
        // Reset status sebelum enqueue ulang
        config.DB.Model(&tx).Updates(map[string]interface{}{
            "digiflazz_status": "processing",
            "last_error_code":  "",
            "next_retry_at":    nil,
            "retry_count":      0,
            "updated_at":       time.Now(),
        })
        
        // Enqueue ulang ke Asynq
        task, err := NewDigiflazzTopupTask(tx.ID)
        if err != nil {
            log.Printf("Failed to create task for order %s: %v", tx.OrderID, err)
            continue
        }
        
        info, err := client.Enqueue(task, asynq.Queue("default"))
        if err != nil {
            log.Printf("Failed to enqueue cut off transaction %s: %v", tx.OrderID, err)
        } else {
            log.Printf("✅ Re-enqueued cut off transaction %s, task ID: %s", tx.OrderID, info.ID)
        }
    }
}