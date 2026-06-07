// jobs/digiflazz_retry.go
package jobs

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/websocket"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
)

func (e *RetryableError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Cek apakah error perlu di-retry
func (e *RetryableError) ShouldRetry() bool {
	// Daftar error code yang perlu di-retry
	retryableCodes := map[string]bool{
		"54": true, // Transaction pending/processing
		"40": true, // Server sibuk
		"43": true, // Gagal, silahkan coba lagi
		"47": true, // Server sedang maintenance
	}
	
	return retryableCodes[e.Code]
}

// ProcessDigiflazzWithRetry memproses topup dengan mekanisme retry
func ProcessDigiflazzWithRetry(transaction *models.Transaction) error {
	if transaction == nil {
		return fmt.Errorf("transaction is nil")
	}
	
	log.Printf("🔄 Processing Digiflazz for transaction %d, attempt: %d", 
		transaction.ID, transaction.RetryCount+1)
	
	// Buat job
	job := NewDigiflazzTopupJob(
		transaction.ID,
		config.DB,
		config.RDB,
		DigiflazzConfig{
			Username: os.Getenv("DIGIFLAZZ_USERNAME"),
			ProdKey:  os.Getenv("DIGIFLAZZ_PROD_KEY"),
			BaseURL:  "https://api.digiflazz.com/v1",
		},
	)
	
	// HAPUS SEMUA PANGGILAN WA SERVICE DI SINI
	// Tidak perlu kirim notifikasi processing
	
	// Process dengan timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	err := job.Handle(ctx)
	
	if err != nil {
		// Cek apakah error adalah RetryableError
		if retryErr, ok := err.(*RetryableError); ok && retryErr.ShouldRetry() {
			// Handle retry
			return handleRetry(transaction, retryErr)
		}
		
		// HAPUS PANGGILAN WA SERVICE DI SINI
		// Biarkan webhook yang handle notifikasi
		
		// Error tidak perlu di-retry (permanent failure)
		return handlePermanentFailure(transaction, err)
	}
	
	// HAPUS SEMUA KODE YANG MEMANGGIL handleSuccess()
	// Jangan kirim notifikasi apa pun di sini
	
	// Refresh transaction untuk mendapatkan data terbaru
	var updatedTransaction models.Transaction
	if err := config.DB.First(&updatedTransaction, transaction.ID).Error; err != nil {
		log.Printf("Error refreshing transaction: %v", err)
	} else {
		transaction = &updatedTransaction
	}
	
	// Broadcast via WebSocket saja
	go websocket.BroadcastOrderStatus(transaction.OrderID)
	
	log.Printf("✅ Digiflazz processing completed for transaction %d", transaction.ID)
	return nil
}


// jobs/digiflazz_retry.go - Perbaiki handleRetry

func handleRetry(transaction *models.Transaction, err *RetryableError) error {
    maxRetries := 5
    baseDelay := 5 * time.Second
    
    // CEK APAKAH ERROR KARENA CUT OFF
    if err.Code == "CUTOFF" {
        log.Printf("⏸️ Transaction %s is in cut off, will retry at scheduled time", 
            transaction.OrderID)
        
        // Untuk cut off, next_retry_at sudah di-set oleh triggerDigiflazzProcessing
        // Tidak perlu hitung delay lagi
        return nil
    }
    
    if transaction.RetryCount >= maxRetries {
        //已达最大重试次数，标记为失败
        failedStatus := "failed"
        errorMsg := fmt.Sprintf("Max retries exceeded: %s", err.Error())
        
        updates := map[string]interface{}{
            "digiflazz_status": failedStatus,
            "status_message":   &errorMsg,
            "last_error_code":  err.Code,
            "updated_at":       time.Now(),
        }
        
        if dbErr := config.DB.Model(transaction).Updates(updates).Error; dbErr != nil {
            log.Printf("Error updating transaction after max retries: %v", dbErr)
        }
        
        // Broadcast failure
        go websocket.BroadcastOrderStatus(transaction.OrderID)
        
        return fmt.Errorf("max retries exceeded for transaction %d", transaction.ID)
    }
    
    // Hitung delay dengan exponential backoff
    delay := baseDelay * time.Duration(1<<uint(transaction.RetryCount))
    
    // Update retry info di database
    processingStatus := "processing"
    nextRetryTime := time.Now().Add(delay)
    
    updates := map[string]interface{}{
        "digiflazz_status":  processingStatus,
        "status_message":    &err.Message,
        "last_error_code":   err.Code,
        "retry_count":       transaction.RetryCount + 1,
        "next_retry_at":     &nextRetryTime,
        "updated_at":        time.Now(),
    }
    
    if dbErr := config.DB.Model(transaction).Updates(updates).Error; dbErr != nil {
        log.Printf("Error updating retry info: %v", dbErr)
    }
    
    // Schedule retry job
    // go scheduleRetry(transaction.ID, delay)
    
    log.Printf("⏰ Scheduled retry for transaction %s in %v (attempt %d/%d)", 
        transaction.OrderID, delay, transaction.RetryCount+1, maxRetries)
    
    return nil
}

func handlePermanentFailure(transaction *models.Transaction, err error) error {
	failedStatus := "failed"
	errorMsg := err.Error()
	
	updates := map[string]interface{}{
		"digiflazz_status": failedStatus,
		"status_message":   &errorMsg,
		"last_error_code":  "PERMANENT_FAILURE",
		"updated_at":       time.Now(),
	}
	
	if dbErr := config.DB.Model(transaction).Updates(updates).Error; dbErr != nil {
		log.Printf("Error updating permanent failure: %v", dbErr)
	}
	
	// Broadcast failure
	go websocket.BroadcastOrderStatus(transaction.OrderID)
	
	return err
}

// HAPUS SELURUH FUNGSI handleSuccess() - TIDAK DIGUNAKAN
// func handleSuccess(transaction *models.Transaction) error { ... }

// func scheduleRetry(transactionID uint, delay time.Duration) {
// 	time.Sleep(delay)
	
// 	// Ambil transaksi terbaru
// 	var transaction models.Transaction
// 	if err := config.DB.First(&transaction, transactionID).Error; err != nil {
// 		log.Printf("Error fetching transaction for retry: %v", err)
// 		return
// 	}
	
// 	// Proses ulang
// 	log.Printf("🔄 Executing scheduled retry for transaction %d", transactionID)
// 	if err := ProcessDigiflazzWithRetry(&transaction); err != nil {
// 		log.Printf("Retry failed for transaction %d: %v", transactionID, err)
// 	}
// }

// Redis-based retry queue (optional, lebih reliable)
type RetryJob struct {
	TransactionID uint      `json:"transaction_id"`
	RetryCount    int       `json:"retry_count"`
	ScheduledAt   time.Time `json:"scheduled_at"`
}

func EnqueueRetryJob(transactionID uint, delay time.Duration) error {
	rdb := config.RDB
	if rdb == nil {
		// Fallback to simple schedule if Redis not available
		// go scheduleRetry(transactionID, delay)
		return nil
	}
	
	job := RetryJob{
		TransactionID: transactionID,
		RetryCount:    0,
		ScheduledAt:   time.Now().Add(delay),
	}
	
	jobJSON, _ := json.Marshal(job)
	
	// Gunakan Redis Sorted Set untuk scheduled jobs
	score := float64(job.ScheduledAt.Unix())
	
	return rdb.ZAdd(context.Background(), "digiflazz:retry:queue", &redis.Z{
		Score:  score,
		Member: jobJSON,
	}).Err()
}

// Worker untuk memproses retry queue
// func StartRetryWorker() {
// 	go func() {
// 		for {
// 			processRetryQueue()
// 			time.Sleep(5 * time.Second)
// 		}
// 	}()
// }

func processRetryQueue() {
	rdb := config.RDB
	if rdb == nil {
		return
	}
	
	ctx := context.Background()
	now := float64(time.Now().Unix())
	
	// Ambil jobs yang sudah waktunya
	results, err := rdb.ZRangeByScore(ctx, "digiflazz:retry:queue", &redis.ZRangeBy{
		Min:   "0",
		Max:   fmt.Sprintf("%f", now),
		Count: 10,
	}).Result()
	
	if err != nil {
		log.Printf("Error fetching retry queue: %v", err)
		return
	}
	
	for _, result := range results {
		var job RetryJob
		if err := json.Unmarshal([]byte(result), &job); err != nil {
			log.Printf("Error unmarshaling retry job: %v", err)
			continue
		}
		
		// Hapus dari queue
		rdb.ZRem(ctx, "digiflazz:retry:queue", result)
		
		// Proses job
		var transaction models.Transaction
		if err := config.DB.First(&transaction, job.TransactionID).Error; err != nil {
			log.Printf("Transaction not found for retry: %d", job.TransactionID)
			continue
		}
		
		log.Printf("🔄 Processing retry job for transaction %d", job.TransactionID)
		if err := ProcessDigiflazzWithRetry(&transaction); err != nil {
			log.Printf("Retry failed for transaction %d: %v", job.TransactionID, err)
		}
	}
}