// jobs/processor.go
package jobs

import (
	"api-arveshop-go/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/hibiken/asynq"
	"gorm.io/gorm"
)

type DigiflazzProcessor struct {
    db  *gorm.DB
    rdb *redis.Client
    cfg DigiflazzConfig
}

func NewDigiflazzProcessor(db *gorm.DB, rdb *redis.Client, cfg DigiflazzConfig) *DigiflazzProcessor {
    return &DigiflazzProcessor{db: db, rdb: rdb, cfg: cfg}
}

func (p *DigiflazzProcessor) ProcessTask(ctx context.Context, t *asynq.Task) error {
    var payload DigiflazzTopupPayload
    if err := json.Unmarshal(t.Payload(), &payload); err != nil {
        return fmt.Errorf("invalid payload: %w", err)
    }

    log.Printf("🔍 Processing task for transaction ID: %d", payload.OrderID)

    // Ambil transaksi
    var transaction models.Transaction
    if err := p.db.First(&transaction, payload.OrderID).Error; err != nil {
        return fmt.Errorf("transaction not found: %v", err)
    }

    // CEK CUT OFF PRODUK SEBELUM PROSES
    if transaction.ProductID != nil {
        var product models.Product
        if err := p.db.First(&product, *transaction.ProductID).Error; err == nil {
            if product.IsWithinCutoff() {
                nextAvailable := product.GetNextAvailableTime()
                
                log.Printf("⏸️ Product %s is in cut off, rescheduling transaction %s", 
                    product.ProductName, transaction.OrderID)
                
                // Update status
                statusMsg := fmt.Sprintf("Transaksi ditunda karena produk %s sedang cut off (%s - %s)",
                    product.ProductName, product.StartCutOff, product.EndCutOff)
                
                updates := map[string]interface{}{
                    "digiflazz_status": "pending",
                    "status_message":   &statusMsg,
                    "last_error_code":  "CUTOFF",
                    "next_retry_at":    nextAvailable,
                    "updated_at":       time.Now(),
                }
                
                p.db.Model(&transaction).Updates(updates)
                
                // Kirim notifikasi ke admin (optional)
                // go sendCutOffNotification(&transaction, &product, nextAvailable)
                
                // Return nil karena ini bukan error, hanya penundaan
                return nil
            }
        }
    }

    // Lanjut proses normal
    job := NewDigiflazzTopupJob(payload.OrderID, p.db, p.rdb, p.cfg)
    return job.Handle(ctx)
}