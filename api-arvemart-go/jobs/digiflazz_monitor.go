// jobs/digiflazz_monitor.go
package jobs

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/hibiken/asynq"
)

// RetryJobStatus struct untuk response monitoring
type RetryJobStatus struct {
	TransactionID   uint       `json:"transaction_id"`
	OrderID         string     `json:"order_id"`
	DigiflazzStatus *string    `json:"digiflazz_status"`
	PaymentStatus   string     `json:"payment_status"`
	RetryCount      int        `json:"retry_count"`
	LastErrorCode   *string    `json:"last_error_code"`
	StatusMessage   *string    `json:"status_message"`
	NextRetryAt     *time.Time `json:"next_retry_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	IsRetryable     bool       `json:"is_retryable"`
	WillRetry       bool       `json:"will_retry"`
	JobType         string     `json:"job_type"` // "retry", "cutoff", "pending"
}

// GetPendingJobs - Mendapatkan SEMUA job yang sedang pending (bukan hanya retry)
func GetPendingJobs() ([]RetryJobStatus, error) {
	var transactions []models.Transaction
	var result []RetryJobStatus
	
	// 🔴 AMBIL SEMUA TRANSAKSI DENGAN STATUS:
	// - payment_status = settlement (sudah bayar)
	// - digiflazz_status != success (belum sukses)
	// - digiflazz_status != failed (kecuali expired)
	err := config.DB.Where(
		"payment_status = ? AND (digiflazz_status IS NULL OR digiflazz_status NOT IN (?, ?))",
		"settlement", "success", "failed",
	).Order("updated_at DESC").Find(&transactions).Error
	
	if err != nil {
		return nil, fmt.Errorf("error fetching pending jobs: %v", err)
	}
	
	log.Printf("📊 Found %d pending transactions", len(transactions))
	
	now := time.Now()
	for _, tx := range transactions {
		status := RetryJobStatus{
			TransactionID:   tx.ID,
			OrderID:         tx.OrderID,
			DigiflazzStatus: tx.DigiflazzStatus,
			PaymentStatus:   tx.PaymentStatus,
			RetryCount:      tx.RetryCount,
			LastErrorCode:   tx.LastErrorCode,
			StatusMessage:   tx.StatusMessage,
			NextRetryAt:     tx.NextRetryAt,
			CreatedAt:       tx.CreatedAt,
			UpdatedAt:       tx.UpdatedAt,
		}
		
		// Tentukan tipe job
		if tx.LastErrorCode != nil && *tx.LastErrorCode == "CUTOFF" {
			status.JobType = "cutoff"
		} else if tx.RetryCount > 0 {
			status.JobType = "retry"
		} else {
			status.JobType = "pending"
		}
		
		// Tentukan apakah masih akan di-retry
		if tx.NextRetryAt != nil && tx.NextRetryAt.After(now) {
			status.WillRetry = true
		}
		
		// Cek apakah error code bisa di-retry
		if tx.LastErrorCode != nil {
			retryableCodes := map[string]bool{
				"54": true, // Transaction pending/processing
				"40": true, // Server sibuk
				"43": true, // Gagal, silahkan coba lagi
				"47": true, // Server sedang maintenance
				"INSUFF": true, // Saldo tidak cukup
				"CUTOFF": true, // Cut off
				"NETWORK_ERROR": true,
				"TIMEOUT": true,
			}
			status.IsRetryable = retryableCodes[*tx.LastErrorCode]
		}
		
		result = append(result, status)
	}
	
	return result, nil
}

// GetRetryJobsStatus - Mendapatkan semua job yang sedang dalam proses retry
func GetRetryJobsStatus() ([]RetryJobStatus, error) {
	var transactions []models.Transaction
	var result []RetryJobStatus
	
	// Cari transaksi dengan status processing atau pending dan memiliki retry_count > 0
	err := config.DB.Where(
		"(digiflazz_status = ? OR digiflazz_status = ?) AND retry_count > 0",
		"processing", "pending",
	).Order("next_retry_at ASC").Find(&transactions).Error
	
	if err != nil {
		return nil, fmt.Errorf("error fetching retry jobs: %v", err)
	}
	
	now := time.Now()
	for _, tx := range transactions {
		status := RetryJobStatus{
			TransactionID:   tx.ID,
			OrderID:         tx.OrderID,
			DigiflazzStatus: tx.DigiflazzStatus,
			PaymentStatus:   tx.PaymentStatus,
			RetryCount:      tx.RetryCount,
			LastErrorCode:   tx.LastErrorCode,
			StatusMessage:   tx.StatusMessage,
			NextRetryAt:     tx.NextRetryAt,
			CreatedAt:       tx.CreatedAt,
			UpdatedAt:       tx.UpdatedAt,
		}
		
		// Tentukan apakah masih akan di-retry
		if tx.NextRetryAt != nil && tx.NextRetryAt.After(now) {
			status.WillRetry = true
		}
		
		// Cek apakah error code bisa di-retry
		if tx.LastErrorCode != nil {
			retryableCodes := map[string]bool{
				"54": true,
				"40": true,
				"43": true,
				"47": true,
			}
			status.IsRetryable = retryableCodes[*tx.LastErrorCode]
		}
		
		result = append(result, status)
	}
	
	return result, nil
}

// GetRetryJobsSummary - Mendapatkan ringkasan statistik SEMUA job
func GetRetryJobsSummary() map[string]interface{} {
	var totalPending int64
	var totalSuccess int64
	var totalFailed int64
	var totalSettlement int64
	var totalCutoff int64
	var totalRetryable int64
	
	// Total pending (sedang diproses)
	config.DB.Model(&models.Transaction{}).
		Where("payment_status = ? AND (digiflazz_status IS NULL OR digiflazz_status != ?)", 
			"settlement", "success").
		Count(&totalPending)
	
	// Total sukses
	config.DB.Model(&models.Transaction{}).
		Where("digiflazz_status = ?", "success").
		Count(&totalSuccess)
	
	// Total failed
	config.DB.Model(&models.Transaction{}).
		Where("digiflazz_status = ?", "failed").
		Count(&totalFailed)
	
	// Total settlement (sudah bayar)
	config.DB.Model(&models.Transaction{}).
		Where("payment_status = ?", "settlement").
		Count(&totalSettlement)
	
	// Total cutoff
	config.DB.Model(&models.Transaction{}).
		Where("last_error_code = ?", "CUTOFF").
		Count(&totalCutoff)
	
	// Total retryable
	config.DB.Model(&models.Transaction{}).
		Where("last_error_code IN ?", []string{"54", "40", "43", "47", "INSUFF", "NETWORK_ERROR"}).
		Count(&totalRetryable)
	
	// Hitung rata-rata retry
	var avgRetry float64
	config.DB.Model(&models.Transaction{}).
		Where("retry_count > 0").
		Select("AVG(retry_count)").
		Row().Scan(&avgRetry)
	
	// Job yang akan di-retry dalam 1 jam ke depan
	var nextHourJobs int64
	nextHour := time.Now().Add(1 * time.Hour)
	config.DB.Model(&models.Transaction{}).
		Where("next_retry_at IS NOT NULL AND next_retry_at <= ?", nextHour).
		Count(&nextHourJobs)
	
	// Job yang overdue (next_retry_at sudah lewat)
	var overdueJobs int64
	now := time.Now()
	config.DB.Model(&models.Transaction{}).
		Where("next_retry_at IS NOT NULL AND next_retry_at < ?", now).
		Count(&overdueJobs)
	
	return map[string]interface{}{
		"total_pending":         totalPending,
		"total_success":         totalSuccess,
		"total_failed":          totalFailed,
		"total_settlement":      totalSettlement,
		"total_cutoff":          totalCutoff,
		"total_retryable":       totalRetryable,
		"total_retry_jobs":      totalPending, // alias
		"average_retry_count":   avgRetry,
		"next_hour_retry_jobs":  nextHourJobs,
		"overdue_jobs":          overdueJobs,
		"timestamp":             time.Now(),
	}
}

// GetRetryJobDetail - Mendapatkan detail satu job
func GetRetryJobDetail(orderID string) (*RetryJobStatus, error) {
	var transaction models.Transaction
	
	err := config.DB.Where("order_id = ?", orderID).First(&transaction).Error
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %v", err)
	}
	
	status := &RetryJobStatus{
		TransactionID:   transaction.ID,
		OrderID:         transaction.OrderID,
		DigiflazzStatus: transaction.DigiflazzStatus,
		PaymentStatus:   transaction.PaymentStatus,
		RetryCount:      transaction.RetryCount,
		LastErrorCode:   transaction.LastErrorCode,
		StatusMessage:   transaction.StatusMessage,
		NextRetryAt:     transaction.NextRetryAt,
		CreatedAt:       transaction.CreatedAt,
		UpdatedAt:       transaction.UpdatedAt,
	}
	
	// Tentukan tipe job
	if transaction.LastErrorCode != nil && *transaction.LastErrorCode == "CUTOFF" {
		status.JobType = "cutoff"
	} else if transaction.RetryCount > 0 {
		status.JobType = "retry"
	} else {
		status.JobType = "pending"
	}
	
	// Tentukan apakah masih akan di-retry
	if transaction.NextRetryAt != nil && transaction.NextRetryAt.After(time.Now()) {
		status.WillRetry = true
	}
	
	// Cek apakah error code bisa di-retry
	if transaction.LastErrorCode != nil {
		retryableCodes := map[string]bool{
			"54": true,
			"40": true,
			"43": true,
			"47": true,
			"INSUFF": true,
			"CUTOFF": true,
			"NETWORK_ERROR": true,
		}
		status.IsRetryable = retryableCodes[*transaction.LastErrorCode]
	}
	
	return status, nil
}


// ForceRetryJob - Memaksa retry untuk job tertentu (manual)
func ForceRetryJob(orderID string) error {
    var transaction models.Transaction
    
    err := config.DB.Where("order_id = ?", orderID).First(&transaction).Error
    if err != nil {
        return fmt.Errorf("transaction not found: %v", err)
    }
    
    // Reset retry count dan next_retry_at
    now := time.Now()
    processing := "processing"
    updates := map[string]interface{}{
        "digiflazz_status": processing,
        "retry_count":      0,
        "next_retry_at":    nil,
        "updated_at":       now,
    }
    
    if err := config.DB.Model(&transaction).Updates(updates).Error; err != nil {
        return fmt.Errorf("failed to reset retry: %v", err)
    }
    
    // Trigger retry via Asynq
    go func() {
        // Enqueue ke Asynq
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
        
        task, err := NewDigiflazzTopupTask(transaction.ID)
        if err != nil {
            log.Printf("❌ Failed to create task for force retry: %v", err)
            return
        }
        
        info, err := client.Enqueue(task, asynq.Queue("critical"))
        if err != nil {
            log.Printf("❌ Failed to enqueue force retry: %v", err)
        } else {
            log.Printf("✅ Force retry enqueued for %s, task ID: %s", orderID, info.ID)
        }
    }()
    
    return nil
}