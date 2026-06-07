// jobs/digiflazz_topup.go - KODE LENGKAP YANG SUDAH DIPERBAIKI

package jobs

import (
	"api-arveshop-go/models"
	"api-arveshop-go/services"
	"api-arveshop-go/utils"
	"bytes"
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const TaskDigiflazzTopup = "digiflazz:topup"

type DigiflazzTopupPayload struct {
	OrderID uint `json:"order_id"`
}

// ─── Config ───────────────────────────────────────────────────────────────────

type DigiflazzConfig struct {
	Username string
	ProdKey  string
	BaseURL  string
}

// ─── Retryable Error ─────────────────────────────────────────────────────────

type RetryableError struct {
	Code    string
	Message string
}

// func (e *RetryableError) Error() string {
// 	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
// }

// ─── Job ──────────────────────────────────────────────────────────────────────

type DigiflazzTopupJob struct {
	OrderID    uint
	db         *gorm.DB
	rdb        *redis.Client
	cfg        DigiflazzConfig
	httpClient *http.Client

	maxRetries int
	backoff    []time.Duration
}

func NewDigiflazzTopupJob(orderID uint, db *gorm.DB, rdb *redis.Client, cfg DigiflazzConfig) *DigiflazzTopupJob {
	return &DigiflazzTopupJob{
		OrderID:    orderID,
		db:         db,
		rdb:        rdb,
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 60 * time.Second},
		maxRetries: 5,
		backoff:    []time.Duration{60, 180, 300, 600, 900}, // dalam detik
	}
}

// Handle adalah entry point job, dipanggil oleh worker
func (j *DigiflazzTopupJob) Handle(ctx context.Context) error {
	// Load & lock order
	var order models.Transaction
	if err := j.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&order, j.OrderID).Error; err != nil {
		slog.Error("Order not found", "order_id", j.OrderID, "err", err)
		return nil // jangan retry kalau order tidak ada
	}

	// Cek apakah sudah sukses atau gagal permanent
	if order.DigiflazzStatus != nil {
		status := *order.DigiflazzStatus
		if status == "success" || status == "cancelled" || status == "failed" {
			slog.Info("Order already processed", "order_id", order.OrderID, "status", status)
			return nil
		}
	}

	// Distributed lock via Redis
	lockKey := fmt.Sprintf("digiflazz_topup_%s", order.OrderID)
	lock, err := j.acquireLock(ctx, lockKey, 300*time.Second)
	if err != nil {
		slog.Warn("Lock tidak bisa didapat", "order_id", order.OrderID, "err", err)
		return nil
	}
	defer lock.Release(ctx)

	// Debit saldo dulu sebelum proses
	if order.SaldoDebitedAt == nil {
		if err := j.debitSaldo(ctx, &order); err != nil {
			slog.Error("Gagal debit saldo", "order_id", order.OrderID, "err", err)
			return err
		}
	}

	// Proses topup ke Digiflazz
	if err := j.processTopup(ctx, &order); err != nil {
		return j.handleError(ctx, &order, err)
	}

	return nil
}


func (j *DigiflazzTopupJob) processTopup(ctx context.Context, order *models.Transaction) error {
    // CEK CUT OFF TERLEBIH DAHULU
    inCutOff, schedule, err := utils.CheckCutOff("digiflazz")
    if err != nil {
        slog.Warn("Gagal cek cut off", "order_id", order.OrderID, "err", err)
    }
    
    if inCutOff && schedule != nil {
        slog.Info("⏸️ Detected cut off", 
            "order_id", order.OrderID,
            "provider", schedule.Provider,
            "time_range", fmt.Sprintf("%s-%s", schedule.StartTime, schedule.EndTime),
        )
        
        // Handle cut off
        return j.handleCutOff(ctx, order, "Sedang dalam periode maintenance")
    }
    
    // 1. Build payload
    payload := j.buildPayload(order)

    payloadJSON, err := json.Marshal(payload)
    if err != nil {
        return &RetryableError{
            Code:    "BUILD_ERROR",
            Message: fmt.Sprintf("Failed to build payload: %v", err),
        }
    }

    // 2. Simpan request ke DB
    j.db.Model(order).Update("digiflazz_sent_at", time.Now())

    // 3. Tentukan URL API
    apiURL := j.cfg.BaseURL
    if !strings.HasSuffix(apiURL, "/v1") {
        apiURL = strings.TrimSuffix(apiURL, "/") + "/v1"
    }
    apiURL = apiURL + "/transaction"

    slog.Info("Calling Digiflazz API", "url", apiURL, "order_id", order.OrderID)

    // 4. Kirim request
    respBody, err := j.doHTTPPost(ctx, apiURL, payloadJSON)
    if err != nil {
        return &RetryableError{
            Code:    "NETWORK_ERROR",
            Message: fmt.Sprintf("Network error: %v", err),
        }
    }

    // 5. Bersihkan response
    cleanedResp := j.cleanJSONResponse(respBody)

    // 6. Simpan response ke DB
    j.db.Model(order).Updates(map[string]any{
        "digiflazz_request":  payloadJSON,
        "digiflazz_response": cleanedResp,
    })

    // 7. Parse response
    var apiResp digiflazzResponse
    if err := json.Unmarshal(cleanedResp, &apiResp); err != nil {
        slog.Error("Failed to parse Digiflazz response",
            "order_id", order.OrderID,
            "error", err,
            "raw", string(respBody),
            "cleaned", string(cleanedResp),
        )

        // Simpan error ke DB
        errorMsg := fmt.Sprintf("Parse error: %v", err)
        j.db.Model(order).Updates(map[string]any{
            "digiflazz_status": "pending",
            "status_message":   errorMsg,
            "last_error_code":  j.truncateErrorCode("PARSE_ERR"),
        })

        return &RetryableError{
            Code:    "PARSE_ERROR",
            Message: fmt.Sprintf("Failed to parse response: %v", err),
        }
    }

    // 8. Handle response berdasarkan RC
    return j.handleAPIResponse(ctx, order, apiResp.Data)
}

// handleAPIResponse memproses response dari Digiflazz
func (j *DigiflazzTopupJob) handleAPIResponse(ctx context.Context, order *models.Transaction, data digiflazzResponseData) error {
	rc := data.RC
	message := data.Message
	if message == "" {
		message = "Unknown response"
	}

	slog.Info("Response dari Digiflazz",
		"order_id", order.OrderID,
		"rc", rc,
		"message", message,
		"sn", data.SN,
	)

	switch rc {
	case "00": // Success
		return j.handleSuccess(ctx, order, data)
	case "03", "201": // Pending - menunggu callback
		return j.handlePending(order, message, rc)
	case "40", "41", "42", "43", "44", "45": // Gagal permanent
		return j.handleFailed(ctx, order, message, rc)
	case "06", "07", "08", "17", "39", "54": // Bisa di-retry
		return j.handleRetryable(ctx, order, message, rc)
	default: // Unknown
		return j.handleUnknown(order, message, rc)
	}
}

// handleSuccess - transaksi sukses (customer dapat notifikasi)
func (j *DigiflazzTopupJob) handleSuccess(ctx context.Context, order *models.Transaction, data digiflazzResponseData) error {
    now := time.Now()
    successStatus := "success"

    updates := map[string]any{
        "digiflazz_status":   &successStatus,
        "payment_status":     "settlement", // ✅ Customer melihat SETTLEMENT
        "status_message":     "Transaksi berhasil",
        "serial_number":      &data.SN,
        "ref_id":             &data.RefID,
        "retry_count":        0,
        "last_error_code":    nil,
        "next_retry_at":      nil,
        "updated_at":         now,
    }

    if err := j.db.WithContext(ctx).Model(order).Updates(updates).Error; err != nil {
        slog.Error("Failed to update success status", "order_id", order.OrderID, "err", err)
        return err
    }    

    slog.Info("✅ Topup success", "order_id", order.OrderID, "sn", data.SN)
    
    // KIRIM NOTIFIKASI SUKSES KE CUSTOMER
    go j.sendCustomerSuccessNotification(order, data.SN)
    
    return nil
}

// handlePending - menunggu callback dari Digiflazz (customer tetap PENDING)
func (j *DigiflazzTopupJob) handlePending(order *models.Transaction, message, rc string) error {
	status := "pending"
	
	updates := map[string]any{
		"digiflazz_status": &status,
		"payment_status":   "pending", // ⏳ Customer melihat PENDING
		"status_message":   &message,
		"last_error_code":  &rc,
		"updated_at":       time.Now(),
	}
	
	err := j.db.Model(order).Updates(updates).Error

	if err == nil {
		slog.Info("⏳ Menunggu callback", "order_id", order.OrderID, "rc", rc)
		// TIDAK KIRIM NOTIFIKASI KE CUSTOMER
	}
	return err
}

// handleFailed - transaksi gagal dari API response (NOTIFIKASI HANYA KE ADMIN)
func (j *DigiflazzTopupJob) handleFailed(ctx context.Context, order *models.Transaction, message, rc string) error {
    // Refund saldo jika sudah didebit
    if order.SaldoDebitedAt != nil {
        if err := j.refundSaldo(ctx, order); err != nil {
            slog.Error("Gagal refund saldo", "order_id", order.OrderID, "err", err)
        } else {
            purchasePrice, _ := order.PurchasePrice.Float64()
            slog.Info("💸 Saldo dikembalikan", "order_id", order.OrderID, "amount", purchasePrice)
        }
    }

    // UPDATE STATUS DI DATABASE
    // Untuk customer, transaksi tetap "settlement" 
    // Digiflazz status = "pending" (BUKAN failed!)
    digiflazzStatus := "pending"      // ⭐ PENDING, bukan failed!
    errorCode := j.truncateErrorCode(rc)

    updates := map[string]any{
        "digiflazz_status": &digiflazzStatus,
        // "payment_status" TIDAK DISENTUH! Tetap settlement
        "status_message":   &message,
        "last_error_code":  errorCode,
        "updated_at":       time.Now(),
    }

    err := j.db.Model(order).Updates(updates).Error
    if err == nil {
        slog.Error("❌ Transaksi Digiflazz gagal (API response)", 
            "order_id", order.OrderID, 
            "rc", rc,
        )
        slog.Info("🟢 Status customer tetap SETTLEMENT, digiflazz_status = PENDING", 
            "order_id", order.OrderID)
        
        // KIRIM NOTIFIKASI GAGAL KE ADMIN
        j.sendAdminFailureNotification(order, rc, message)
    }
    return err
}

// handleRetryable - transaksi bisa dicoba lagi
func (j *DigiflazzTopupJob) handleRetryable(ctx context.Context, order *models.Transaction, message, rc string) error {
    // Increment retry count
    newRetryCount := order.RetryCount + 1
    j.db.Model(order).UpdateColumn("retry_count", newRetryCount)

    if newRetryCount >= j.maxRetries {
        slog.Warn("Max retries reached", "order_id", order.OrderID, "retry_count", newRetryCount)
        return j.handleFailed(ctx, order, fmt.Sprintf("Gagal setelah %dx retry: %s", j.maxRetries, message), rc)
    }

    // Hitung next retry dengan exponential backoff
    backoffSeconds := j.backoff[newRetryCount-1]
    nextRetryAt := time.Now().Add(backoffSeconds * time.Second)

    status := "pending"  // ⭐ Tetap pending selama retry
    errorCode := j.truncateErrorCode(rc)

    updates := map[string]any{
        "digiflazz_status": &status,
        "status_message":   &message,
        "last_error_code":  errorCode,
        "next_retry_at":    &nextRetryAt,
        "updated_at":       time.Now(),
    }

    err := j.db.Model(order).Updates(updates).Error

    slog.Warn("⚠️ Akan di-retry",
        "order_id", order.OrderID,
        "retry_count", newRetryCount,
        "rc", rc,
        "next_retry", nextRetryAt.Format("15:04:05"),
    )
    
    // TIDAK KIRIM NOTIFIKASI SETIAP RETRY, hanya jika max retries

    return err
}

// handleUnknown - response code tidak dikenal
func (j *DigiflazzTopupJob) handleUnknown(order *models.Transaction, message, rc string) error {
    status := "pending"  // ⭐ Tetap pending
    nextRetryAt := time.Now().Add(10 * time.Minute)
    errorCode := j.truncateErrorCode(rc)

    updates := map[string]any{
        "digiflazz_status": &status,
        "status_message":   &message,
        "last_error_code":  errorCode,
        "next_retry_at":    &nextRetryAt,
        "updated_at":       time.Now(),
    }

    err := j.db.Model(order).Updates(updates).Error

    slog.Error("❓ Response code tidak dikenali",
        "order_id", order.OrderID,
        "rc", rc,
        "message", message,
    )
    
    // KIRIM NOTIFIKASI KE ADMIN
    j.sendAdminFailureNotification(order, rc, message)

    return err
}


// handleError - menangani error dari proses topup
func (j *DigiflazzTopupJob) handleError(ctx context.Context, order *models.Transaction, err error) error {
	// Cek tipe error	    
    if retryErr, ok := err.(*RetryableError); ok {
        slog.Warn("Retryable error",
            "order_id", order.OrderID,
            "code", retryErr.Code,
            "message", retryErr.Message,
            "retry_count", order.RetryCount,
        )

        // Hitung next retry dengan exponential backoff
        backoffSeconds := j.backoff[order.RetryCount]
        nextRetryAt := time.Now().Add(backoffSeconds * time.Second)

        // Update retry info di database
        updates := map[string]any{
            "digiflazz_status": "pending",
            "last_error_code":  j.truncateErrorCode(retryErr.Code),
            "status_message":   retryErr.Message,
            "retry_count":      order.RetryCount + 1,
            "next_retry_at":    &nextRetryAt,
            "updated_at":       time.Now(),
        }

        if dbErr := j.db.WithContext(ctx).Model(order).Updates(updates).Error; dbErr != nil {
            slog.Error("Failed to update retry info", "order_id", order.OrderID, "err", dbErr)
        }

        // Schedule retry job
        go j.scheduleRetry(order.ID, backoffSeconds)

        // Jika sudah mencapai max retries, kirim notifikasi ke admin
        if order.RetryCount+1 >= j.maxRetries {
            j.sendAdminFailureNotification(order, retryErr.Code, 
                fmt.Sprintf("Max retries exceeded: %s", retryErr.Message))
        }

        return retryErr
    }

	// Permanent error
	slog.Error("Permanent error", "order_id", order.OrderID, "err", err)

	// Update status ke failed (untuk admin), tapi customer tetap PENDING
	failed := "failed"
	updates := map[string]any{
		"digiflazz_status": failed,
		// "payment_status":   "pending",      // Customer tetap PENDING
		"status_message":   err.Error(),
		"last_error_code":  j.truncateErrorCode("PERMANENT"),
		"updated_at":       time.Now(),
	}

	if dbErr := j.db.WithContext(ctx).Model(order).Updates(updates).Error; dbErr != nil {
		slog.Error("Failed to update failed status", "order_id", order.OrderID, "err", dbErr)
	}

	// Kirim notifikasi untuk permanent error ke admin
	j.sendAdminFailureNotification(order, "PERMANENT", err.Error())

	return err
}

// ==================== FUNGSI NOTIFIKASI ====================

// sendCustomerSuccessNotification - kirim notifikasi sukses ke customer
func (j *DigiflazzTopupJob) sendCustomerSuccessNotification(order *models.Transaction, sn string) {
    if order == nil {
        log.Println("❌ sendCustomerSuccessNotification: order is nil")
        return
    }

    // Validasi nomor WA customer
    if order.WaPembeli == "" {
        log.Printf("⚠️ WaPembeli kosong untuk order %s, tidak bisa kirim notifikasi sukses", order.OrderID)
        return
    }

    waService := services.NewWANotificationService()
    
    // Ambil data dengan aman
    customerName := "Pelanggan"
    if order.CustomerName != nil && *order.CustomerName != "" {
        customerName = *order.CustomerName
    }
    
    productName := "Produk"
    if order.ProductName != nil && *order.ProductName != "" {
        productName = *order.ProductName
    }
    
    // Format pesan untuk customer (SEDERHANA DAN JELAS)
    message := fmt.Sprintf(`✅ *TOPUP BERHASIL*

Halo %s,

Transaksi Anda telah berhasil diproses!

📋 *Detail Transaksi:*
┌─────────────────────
├ Order ID: %s
├ Produk: %s
├ Target: %s
├ Total: Rp %s
└─────────────────────

📱 *Serial Number:* %s

Terima kasih telah menggunakan layanan kami.

_*ARVESHOP*_`,
        customerName,
        order.OrderID,
        productName,
        order.CustomerNo,
        order.GrossAmount.StringFixed(0),
        sn,
    )
    
    log.Printf("📱 Mengirim notifikasi SUKSES ke customer %s untuk order %s", 
        order.WaPembeli, order.OrderID)
    
    if err := waService.SendNotification(order.WaPembeli, message); err != nil {
        log.Printf("❌ Gagal kirim notifikasi sukses ke customer: %v", err)
    } else {
        log.Printf("✅ Notifikasi sukses terkirim ke customer %s", order.WaPembeli)
    }
}

// sendAdminFailureNotification - kirim notifikasi error ke admin (DETAIL)
func (j *DigiflazzTopupJob) sendAdminFailureNotification(order *models.Transaction, rc, message string) {
    if order == nil {
        log.Println("❌ sendAdminFailureNotification: order is nil")
        return
    }

    log.Printf("📱 Mengirim notifikasi ERROR ke admin untuk order %s (RC: %s)", 
        order.OrderID, rc)

    waService := services.NewWANotificationService()
    adminPhone := "6287864705664" // Nomor admin
    
    // Ambil data dengan aman
    customerName := "-"
    if order.CustomerName != nil && *order.CustomerName != "" {
        customerName = *order.CustomerName
    }
    
    phoneNumber := "-"
    if order.PhoneNumber != nil && *order.PhoneNumber != "" {
        phoneNumber = *order.PhoneNumber
    }
    
    productName := "-"
    if order.ProductName != nil && *order.ProductName != "" {
        productName = *order.ProductName
    }
    
    // Mapping RC code ke deskripsi
    rcDescription := getRCDescription(rc)
    
    // Format pesan untuk admin (DETAIL DENGAN INSTRUKSI)
    notifMessage := fmt.Sprintf(`⚠️ *[INTERNAL] ERROR DIGIFLAZZ - RC %s*

Halo Admin,

Terjadi error saat memproses topup:

📋 *Detail Transaksi:*
┌─────────────────────
├ Order ID: %s
├ Customer: %s
├ Phone: %s
├ Produk: %s
├ Target: %s
├ Total: Rp %s
└─────────────────────

❌ *Error Details:*
┌─────────────────────
├ Kode Error: %s
├ Deskripsi: %s
├ Pesan: %s
└─────────────────────

⏰ Waktu: %s

✅ *Status Customer: PENDING*
Customer melihat status "pending" dan TIDAK TAHU error ini.

🔧 *Tindakan yang diperlukan:*
1. Cek penyebab error di log
2. Jika perlu, lakukan refund manual
3. Hubungi customer jika diperlukan
4. Update status manual jika sudah selesai

_*ARVESHOP - Admin Alert*_`,
        rc,
        order.OrderID,
        customerName,
        phoneNumber,
        productName,
        order.CustomerNo,
        order.GrossAmount.StringFixed(0),
        rc,
        rcDescription,
        message,
        time.Now().Format("02/01/2006 15:04:05"),
    )
    
    log.Printf("📱 Mengirim WA ke admin %s untuk order %s", adminPhone, order.OrderID)
    
    if err := waService.SendNotification(adminPhone, notifMessage); err != nil {
        log.Printf("❌ Gagal mengirim notifikasi error ke admin: %v", err)
    } else {
        log.Printf("✅ Notifikasi error terkirim ke admin untuk order %s", order.OrderID)
    }
}

// getRCDescription - mendapatkan deskripsi RC code
func getRCDescription(rcCode string) string {
    descriptions := map[string]string{
        "00": "Sukses",
        "01": "Server sedang sibuk",
        "02": "Produk tidak tersedia",
        "03": "Pending - Sedang diproses",
        "04": "Nomor tidak valid",
        "05": "Saldo tidak cukup",
        "06": "Koneksi terputus",
        "07": "Timeout",
        "08": "Transaksi sudah ada",
        "09": "Format salah",
        "10": "IP tidak terdaftar",
        "11": "Signature salah",
        "12": "Ref ID sudah digunakan",
        "13": "Operator sedang gangguan",
        "14": "Nomor dalam masa tenggang",
        "15": "Nomor tidak aktif",
        "16": "Produk tidak tersedia untuk operator ini",
        "17": "Masa aktif tidak tersedia",
        "18": "Transaksi dalam antrian",
        "19": "Server error",
        "20": "Koneksi ke operator gagal",
        "21": "Harga berubah",
        "22": "Melebihi batas maksimal",
        "23": "Di bawah batas minimal",
        "24": "Sedang masa pemeliharaan",
        "25": "Produk habis",
        "26": "Kode produk tidak ditemukan",
        "27": "Customer number tidak valid",
        "28": "Sedang proses refund",
        "29": "Sudah direfund",
        "30": "Dibatalkan sistem",
        "31": "Dibatalkan manual",
        "32": "Double posting",
        "33": "Inquiri gagal",
        "34": "Payment gagal",
        "35": "Settlement gagal",
        "36": "Tidak ada respon dari server",
        "37": "Terjadi kesalahan pada server",
        "38": "Terjadi kesalahan pada database",
        "39": "Terjadi kesalahan pada koneksi",
        "40": "Terjadi kesalahan pada jaringan",
        "41": "Transaksi ditolak",
        "42": "Transaksi dibatalkan",
        "43": "Transaksi expired",
        "44": "Transaksi tidak ditemukan",
        "45": "IP tidak terdaftar di whitelist",
        "46": "Merchant tidak aktif",
        "47": "Produk sedang maintenance",
        "48": "Melebihi batas harian",
        "49": "Nomor sedang diblokir",
        "50": "Sedang jam sibuk",
        "99": "Unknown error",
    }
    
    if desc, exists := descriptions[rcCode]; exists {
        return desc
    }
    return "Unknown error code"
}

// ─── Saldo ────────────────────────────────────────────────────────────────────

func (j *DigiflazzTopupJob) debitSaldo(ctx context.Context, order *models.Transaction) error {
    // CEK CUT OFF PRODUK SEBELUM DEBIT SALDO
    if order.ProductID != nil {
        var product models.Product
        if err := j.db.First(&product, *order.ProductID).Error; err == nil {
            if product.IsWithinCutoff() {
                nextAvailable := product.GetNextAvailableTime()
                
                // Update status
                statusMsg := fmt.Sprintf("Produk %s sedang cut off (%s - %s). Akan diproses %s",
                    product.ProductName, product.StartCutOff, product.EndCutOff,
                    nextAvailable.Format("15:04 02/01/2006"))
                
                j.db.Model(order).Updates(map[string]any{
                    "digiflazz_status": "pending",
                    "status_message":   &statusMsg,
                    "last_error_code":  "CUTOFF",
                    "next_retry_at":    nextAvailable,
                    "updated_at":       time.Now(),
                })
                
                return &RetryableError{
                    Code:    "CUTOFF",
                    Message: fmt.Sprintf("Product %s is in cut off (%s-%s)", 
                        product.ProductName, product.StartCutOff, product.EndCutOff),
                }
            }
        }
    }
    
    // ... lanjut debit saldo normal ...
    return j.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        var profil models.ProfilAplikasi
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&profil).Error; err != nil {
            slog.Error("ProfilAplikasi tidak ditemukan")
            return &RetryableError{
                Code:    "NOPROF",
                Message: "Konfigurasi aplikasi tidak ditemukan",
            }
        }

        purchasePrice, _ := order.PurchasePrice.Float64()

        if profil.Saldo < purchasePrice {
            return &RetryableError{
                Code:    "INSUFF",
                Message: fmt.Sprintf("Saldo tidak cukup: tersedia %.0f, dibutuhkan %.0f", 
                    profil.Saldo, purchasePrice),
            }
        }

        // Saldo cukup, lanjutkan transaksi
        saldoSebelum := profil.Saldo
        if err := tx.Model(&profil).UpdateColumn("saldo", gorm.Expr("saldo - ?", purchasePrice)).Error; err != nil {
            return err
        }

        slog.Info("Saldo dipotong",
            "order_id", order.OrderID,
            "saldo_sebelum", saldoSebelum,
            "dipotong", purchasePrice,
        )

        now := time.Now()
        statusMsg := "Saldo dipotong, memproses transaksi..."
        return tx.Model(order).Updates(map[string]any{
            "saldo_debited_at": &now,
            "digiflazz_status": "processing",
            "status_message":   &statusMsg,
        }).Error
    })
}

func (j *DigiflazzTopupJob) refundSaldo(ctx context.Context, order *models.Transaction) error {
	return j.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var profil models.ProfilAplikasi
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&profil).Error; err != nil {
			slog.Error("ProfilAplikasi tidak ditemukan untuk refund")
			return nil
		}

		purchasePrice, _ := order.PurchasePrice.Float64()
		saldoSebelum := profil.Saldo

		if err := tx.Model(&profil).UpdateColumn("saldo", gorm.Expr("saldo + ?", purchasePrice)).Error; err != nil {
			return err
		}

		slog.Info("Saldo dikembalikan",
			"order_id", order.OrderID,
			"saldo_sebelum", saldoSebelum,
			"dikembalikan", purchasePrice,
		)
		return nil
	})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type digiflazzPayload struct {
	Username     string `json:"username"`
	BuyerSkuCode string `json:"buyer_sku_code"`
	CustomerNo   string `json:"customer_no"`
	RefID        string `json:"ref_id"`
	Sign         string `json:"sign"`
}

type digiflazzResponseData struct {
	RC      string `json:"rc"`
	Message string `json:"message"`
	SN      string `json:"sn"`
	RefID   string `json:"ref_id"`
}

type digiflazzResponse struct {
	Data digiflazzResponseData `json:"data"`
}

func (j *DigiflazzTopupJob) buildPayload(order *models.Transaction) digiflazzPayload {
    // Ambil ProviderTrxID dengan aman
    refID := order.OrderID // fallback
    if order.ProviderTrxID != nil && *order.ProviderTrxID != "" {
        refID = *order.ProviderTrxID
    }

    sign := fmt.Sprintf("%x", md5.Sum([]byte(j.cfg.Username+j.cfg.ProdKey+refID)))
    return digiflazzPayload{
        Username:     j.cfg.Username,
        BuyerSkuCode: order.BuyerSkuCode,
        CustomerNo:   order.CustomerNo,
        RefID:        refID,
        Sign:         sign,
    }
}

func (j *DigiflazzTopupJob) cleanJSONResponse(data []byte) []byte {
	if len(data) == 0 {
		return data
	}

	str := string(data)

	// Trim whitespace
	str = strings.TrimSpace(str)

	// Hapus karakter 'p' di awal jika ada
	if strings.HasPrefix(str, "p") {
		str = str[1:]
		str = strings.TrimSpace(str)
	}

	// Hapus karakter non-JSON di awal
	startIdx := -1
	for i, c := range str {
		if c == '{' || c == '[' {
			startIdx = i
			break
		}
	}

	if startIdx > 0 {
		str = str[startIdx:]
	}

	// Cari akhir JSON yang valid
	endIdx := -1
	stack := 0
	inString := false
	escaped := false

	for i := 0; i < len(str); i++ {
		c := str[i]

		if escaped {
			escaped = false
			continue
		}

		if c == '\\' {
			escaped = true
			continue
		}

		if c == '"' && !escaped {
			inString = !inString
			continue
		}

		if !inString {
			if c == '{' || c == '[' {
				stack++
			} else if c == '}' || c == ']' {
				stack--
				if stack == 0 {
					endIdx = i
					break
				}
			}
		}
	}

	if endIdx != -1 && endIdx < len(str)-1 {
		str = str[:endIdx+1]
	}

	return []byte(str)
}

func (j *DigiflazzTopupJob) doHTTPPost(ctx context.Context, url string, body []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := j.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

func (j *DigiflazzTopupJob) truncateErrorCode(code string) *string {
	if code == "" {
		return nil
	}
	// Trim spasi
	code = strings.TrimSpace(code)
	// Potong jika lebih dari 10
	if len(code) > 10 {
		code = code[:10]
	}
	// Pastikan tidak kosong setelah dipotong
	if code == "" {
		defaultCode := "ERR"
		return &defaultCode
	}
	return &code
}

// ─── Lock ─────────────────────────────────────────────────────────────────────

type SimpleLock struct {
	key string
	rdb *redis.Client
}

func (j *DigiflazzTopupJob) acquireLock(ctx context.Context, key string, ttl time.Duration) (*SimpleLock, error) {
	if j.rdb == nil {
		// Jika Redis tidak tersedia, return lock dummy
		return &SimpleLock{key: key, rdb: nil}, nil
	}

	// Gunakan SETNX untuk mendapatkan lock
	success, err := j.rdb.SetNX(ctx, key, "locked", ttl).Result()
	if err != nil {
		return nil, fmt.Errorf("redis error: %w", err)
	}

	if !success {
		return nil, fmt.Errorf("lock already acquired for key: %s", key)
	}

	return &SimpleLock{
		key: key,
		rdb: j.rdb,
	}, nil
}

func (l *SimpleLock) Release(ctx context.Context) error {
	if l == nil || l.rdb == nil {
		return nil
	}

	// Hapus key lock
	_, err := l.rdb.Del(ctx, l.key).Result()
	if err != nil {
		return fmt.Errorf("failed to release lock: %w", err)
	}

	return nil
}



// jobs/digiflazz_topup.go - scheduleRetry

func (j *DigiflazzTopupJob) scheduleRetry(transactionID uint, delaySeconds time.Duration) {
    time.Sleep(delaySeconds)
    
    // Ambil transaksi terbaru
    var transaction models.Transaction
    if err := j.db.First(&transaction, transactionID).Error; err != nil {
        slog.Error("Error fetching transaction for retry", "transaction_id", transactionID, "err", err)
        return
    }
    
    // Cek apakah masih perlu retry
    if transaction.DigiflazzStatus == nil || *transaction.DigiflazzStatus != "pending" {
        slog.Info("Transaction no longer pending, skipping retry", 
            "order_id", transaction.OrderID, 
            "status", transaction.DigiflazzStatus)
        return
    }
    
    // Cek apakah sudah melebihi max retries
    if transaction.RetryCount >= j.maxRetries {
        slog.Warn("Transaction has reached max retries, skipping", 
            "order_id", transaction.OrderID, 
            "retry_count", transaction.RetryCount)
        return
    }
    
    slog.Info("🔄 Executing scheduled retry", 
        "order_id", transaction.OrderID, 
        "attempt", transaction.RetryCount+1)
    
    // Proses ulang dengan job baru
    newJob := NewDigiflazzTopupJob(transactionID, j.db, j.rdb, j.cfg)
    if err := newJob.Handle(context.Background()); err != nil {
        slog.Error("Retry failed", "order_id", transaction.OrderID, "err", err)
    }
}

// jobs/digiflazz_topup.go - Tambahkan fungsi cut off aware

// handleCutOff - handle transaksi saat cut off
func (j *DigiflazzTopupJob) handleCutOff(ctx context.Context, order *models.Transaction, message string) error {
    // Dapatkan estimasi waktu selesai cut off
    nextEnd, err := utils.GetNextCutOffEnd("digiflazz")
    if err != nil {
        nextEnd = nil
    }
    
    // Jika tidak ada info cut off, default 1 jam
    var nextRetryAt time.Time
    if nextEnd != nil {
        nextRetryAt = nextEnd.Add(5 * time.Minute) // Tambah buffer 5 menit
    } else {
        nextRetryAt = time.Now().Add(1 * time.Hour)
    }
    
    // Update status
    status := "pending"
    cutoffMsg := fmt.Sprintf("Transaksi ditunda karena cut off. %s", message)
    
    updates := map[string]any{
        "digiflazz_status": &status,
        "status_message":   &cutoffMsg,
        "last_error_code":  j.truncateErrorCode("CUTOFF"),
        "next_retry_at":    &nextRetryAt,
        "retry_count":      order.RetryCount + 1,
        "updated_at":       time.Now(),
    }
    
    if err := j.db.Model(order).Updates(updates).Error; err != nil {
        slog.Error("Failed to update cut off status", "order_id", order.OrderID, "err", err)
        return err
    }
    
    slog.Info("⏸️ Transaksi ditunda karena cut off", 
        "order_id", order.OrderID,
        "next_retry", nextRetryAt.Format("15:04:05"),
    )
    
    return nil
}
