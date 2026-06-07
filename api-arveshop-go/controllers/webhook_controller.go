// controllers/webhook_controller.go
package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/jobs"
	"api-arveshop-go/models"
	"api-arveshop-go/services"
	"api-arveshop-go/websocket"
	"bytes"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
)

// MidtransNotification struct untuk menampung data dari Midtrans
type MidtransNotification struct {
	TransactionID     string `json:"transaction_id"`
	OrderID           string `json:"order_id"`
	PaymentType       string `json:"payment_type"`
	TransactionTime   string `json:"transaction_time"`
	TransactionStatus string `json:"transaction_status"`
	GrossAmount       string `json:"gross_amount"`
	StatusCode        string `json:"status_code"`
	StatusMessage     string `json:"status_message"`
	SignatureKey      string `json:"signature_key"`
	MerchantID        string `json:"merchant_id"`
	
	// Untuk VA
	VaNumbers         []struct {
		Bank     string `json:"bank"`
		VaNumber string `json:"va_number"`
	} `json:"va_numbers,omitempty"`
	
	// Untuk QRIS / E-Wallet
	Actions           []struct {
		Name   string `json:"name"`
		Method string `json:"method"`
		URL    string `json:"url"`
	} `json:"actions,omitempty"`
	
	// Untuk Kartu Kredit
	ApprovalCode      string `json:"approval_code,omitempty"`
	FraudStatus       string `json:"fraud_status,omitempty"`
	Currency          string `json:"currency,omitempty"`
}

func HandleMidtransWebhook(c *gin.Context) {
	// Baca body request
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	// Restore body untuk dibaca lagi jika perlu
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Log untuk debugging
	log.Printf("Midtrans Webhook received: %s", string(bodyBytes))

	// Parse JSON
	var notification MidtransNotification
	if err := json.Unmarshal(bodyBytes, &notification); err != nil {
		log.Printf("Error parsing webhook JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}

	// Validasi signature key (keamanan)
	if !validateSignature(notification) {
		log.Printf("Invalid signature key for order: %s", notification.OrderID)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
		return
	}

	// Cari transaksi berdasarkan OrderID
	var transaction models.Transaction
	if err := config.DB.Where("order_id = ?", notification.OrderID).First(&transaction).Error; err != nil {
		log.Printf("Transaction not found for order_id: %s", notification.OrderID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Update transaksi berdasarkan notifikasi
	newStatus, err := updateTransactionFromWebhook(&transaction, notification, bodyBytes)
	if err != nil {
		log.Printf("Error updating transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
		return
	}

	// AMBIL DATA TERBARU setelah update
	var updatedTransaction models.Transaction
	config.DB.Where("order_id = ?", notification.OrderID).First(&updatedTransaction)

	// BROADCAST VIA WEBSOCKET dengan data lengkap
	log.Printf("📢 Broadcasting settlement for order %s via WebSocket", notification.OrderID)
	websocket.BroadcastOrderStatusWithData(notification.OrderID, updatedTransaction)

	// Trigger Digiflazz jika settlement atau capture
	if notification.TransactionStatus == "settlement" || notification.TransactionStatus == "capture" {
		// CEK PRODUCT TYPE UNTUK MENENTUKAN PRABAYAR ATAU PASCABAYAR
		if updatedTransaction.ProductType != nil {
			if *updatedTransaction.ProductType == "postpaid" {
				// PASCABAYAR: panggil bayarTagihan
				log.Printf("📞 Postpaid transaction detected for order %s, calling bayarTagihan", notification.OrderID)
				go bayarTagihan(notification.OrderID)
			} else if *updatedTransaction.ProductType == "prepaid" {
				// PRABAYAR: panggil triggerDigiflazzProcessing
				log.Printf("💎 Prepaid transaction detected for order %s, calling triggerDigiflazzProcessing", notification.OrderID)
				go triggerDigiflazzProcessing(&updatedTransaction)
			} else {
				// FALLBACK: jika product type tidak dikenali, gunakan logika lama
				log.Printf("⚠️ Unknown product type '%s' for order %s, using default processing", *updatedTransaction.ProductType, notification.OrderID)
				go triggerDigiflazzProcessing(&updatedTransaction)
			}
		} else {
			// FALLBACK: jika product_type nil, gunakan logika dari isPascabayar()
			log.Printf("⚠️ ProductType is nil for order %s, checking via isPascabayar()", notification.OrderID)
			if isPascabayar(updatedTransaction) {
				log.Printf("📞 Postpaid detected via isPascabayar() for order %s, calling bayarTagihan", notification.OrderID)
				go bayarTagihan(notification.OrderID)
			} else {
				log.Printf("💎 Prepaid detected via isPascabayar() for order %s, calling triggerDigiflazzProcessing", notification.OrderID)
				go triggerDigiflazzProcessing(&updatedTransaction)
			}
		}
	}

	// Selalu return 200 OK ke Midtrans
	c.JSON(http.StatusOK, gin.H{
		"status":  newStatus,
		"message": "Notification processed",
	})
}

// func HandleDuitkuWebhook(c *gin.Context) {
// 	// Ambil form-data dari Duitku
// 	merchantCode := c.PostForm("merchantCode")
// 	amount := c.PostForm("amount")
// 	orderID := c.PostForm("merchantOrderId")
// 	resultCode := c.PostForm("resultCode")
// 	reference := c.PostForm("reference")
// 	signature := c.PostForm("signature")

// 	log.Printf("📩 Duitku Webhook received: order=%s result=%s amount=%s", orderID, resultCode, amount)

// 	apiKey := os.Getenv("DUITKU_API_KEY")

// 	// =============================
// 	// VALIDASI SIGNATURE
// 	// =============================
// 	raw := fmt.Sprintf("%s%s%s%s", merchantCode, amount, orderID, apiKey)
// 	hash := md5.Sum([]byte(raw))
// 	expected := hex.EncodeToString(hash[:])

// 	if signature != expected {
// 		log.Printf("❌ Invalid signature for order %s", orderID)
// 		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
// 		return
// 	}

// 	// =============================
// 	// CARI TRANSAKSI
// 	// =============================
// 	var trx models.Transaction
// 	if err := config.DB.Where("order_id = ?", orderID).First(&trx).Error; err != nil {
// 		log.Printf("❌ Transaction not found: %s", orderID)
// 		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
// 		return
// 	}

// 	// =============================
// 	// VALIDASI AMOUNT
// 	// =============================
// 	if trx.GrossAmount.StringFixed(0) != amount {
// 		log.Printf("❌ Amount mismatch: DB=%s Duitku=%s", trx.GrossAmount.StringFixed(0), amount)
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount mismatch"})
// 		return
// 	}
	

// 	// =============================
// 	// MAP STATUS DUITKU → INTERNAL
// 	// =============================
// 	var newStatus string

// 	switch resultCode {
// 	case "00":
// 		newStatus = "settlement"
// 		trx.TransactionID = &reference
// 		paidAt := NowWIB()
//     	trx.PaidAt = &paidAt

// 	case "01":
// 		newStatus = "pending"

// 	default:
// 		newStatus = "failure"
// 	}

// 	trx.PaymentStatus = newStatus

// 	responseMap := map[string]interface{}{
// 	"merchantCode": merchantCode,
// 	"amount":       amount,
// 	"orderID":      orderID,
// 	"resultCode":   resultCode,
// 	"reference":    reference,
// }

// jsonData, _ := json.Marshal(responseMap)

// trx.DuitkuResponse = datatypes.JSON(jsonData)

// 	// =============================
// 	// AMBIL DATA TERBARU
// 	// =============================
// 	var updatedTransaction models.Transaction
// 	config.DB.Where("order_id = ?", orderID).First(&updatedTransaction)

// 	// =============================
// 	// WEBSOCKET BROADCAST
// 	// =============================
// 	log.Printf("📢 Broadcasting update for order %s", orderID)
// 	websocket.BroadcastOrderStatusWithData(orderID, updatedTransaction)

// 	// =============================
// 	// TRIGGER DIGIFLAZZ
// 	// =============================
// 	if newStatus == "settlement" {

// 		if updatedTransaction.ProductType != nil {

// 			switch *updatedTransaction.ProductType {

// 			case "postpaid":
// 				log.Printf("📞 Postpaid → bayarTagihan: %s", orderID)
// 				go bayarTagihan(orderID)

// 			case "prepaid":
// 				log.Printf("💎 Prepaid → triggerDigiflazzProcessing: %s", orderID)
// 				go triggerDigiflazzProcessing(&updatedTransaction)

// 			default:
// 				log.Printf("⚠️ Unknown product type → fallback prepaid: %s", orderID)
// 				go triggerDigiflazzProcessing(&updatedTransaction)
// 			}

// 		} else {
// 			// fallback lama
// 			if isPascabayar(updatedTransaction) {
// 				log.Printf("📞 Fallback Postpaid: %s", orderID)
// 				go bayarTagihan(orderID)
// 			} else {
// 				log.Printf("💎 Fallback Prepaid: %s", orderID)
// 				go triggerDigiflazzProcessing(&updatedTransaction)
// 			}
// 		}
// 	}

// 	// =============================
// 	// RESPONSE KE DUITKU
// 	// =============================
// 	c.JSON(http.StatusOK, gin.H{
// 		"status":  newStatus,
// 		"message": "Duitku webhook processed",
// 	})
// }
 
// ================================================================
// bayarTagihan — ambil semua data dari DB, lalu hit Digiflazz
// ================================================================
func bayarTagihan(orderID string) {
	// 1. Ambil data transaksi dari DB
	var trx models.Transaction
    if err := config.DB.Where("order_id = ?", orderID).First(&trx).Error; err != nil {
        log.Printf("[Digiflazz] order tidak ditemukan: %s", orderID)
        return
    }

    command := "top-up"

    // Ambil refID dari ProviderTrxID
    refID := trx.OrderID // fallback
    if trx.ProviderTrxID != nil && *trx.ProviderTrxID != "" {
        refID = *trx.ProviderTrxID
    }

    isPasca := isPascabayar(trx)
    if isPasca {
        command = "pay-pasca"
    }

    log.Printf("[Digiflazz] %s | order=%s | sku=%s | customer=%s | ref_id=%s",
        command, orderID, trx.BuyerSkuCode, trx.CustomerNo, refID)

    result, err := hitDigiflazz(command, trx.BuyerSkuCode, trx.CustomerNo, refID)
 
	// 4. Simpan hasil ke DB
	updates := map[string]interface{}{
		"digiflazz_sent_at": time.Now(),
		"updated_at":        time.Now(),
	}
 
	if err != nil {
		updates["digiflazz_status"] = "Gagal"
		updates["status_message"]   = err.Error()
		config.DB.Model(&models.Transaction{}).Where("order_id = ?", orderID).Updates(updates)
		websocket.BroadcastOrderStatus(orderID)
		return
	}
 
	data, _ := result["data"].(map[string]interface{})
	if data == nil {
		updates["digiflazz_status"] = "Gagal"
		updates["status_message"]   = "Response kosong dari Digiflazz"
		config.DB.Model(&models.Transaction{}).Where("order_id = ?", orderID).Updates(updates)
		websocket.BroadcastOrderStatus(orderID)
		return
	}
 
	raw, _                       := json.Marshal(result)
	updates["digiflazz_response"] = datatypes.JSON(raw)
 
	rc,     _ := data["rc"].(string)
	status2, _ := data["status"].(string)
	msg,    _ := data["message"].(string)
	sn,     _ := data["sn"].(string)
 
	switch {
	case rc == "00" && status2 == "Sukses":
		updates["digiflazz_status"] = "Sukses"
		updates["status_message"]   = msg
		if sn != "" {
			updates["serial_number"] = sn
		}
		log.Printf("[Digiflazz] Sukses order=%s sn=%s", orderID, sn)
 
	case status2 == "Pending":
		updates["digiflazz_status"] = "Pending"
		updates["status_message"]   = msg
		log.Printf("[Digiflazz] Pending order=%s", orderID)
 
	default:
		updates["digiflazz_status"] = "Gagal"
		updates["status_message"]   = msg
		log.Printf("[Digiflazz] Gagal order=%s rc=%s", orderID, rc)
	}
 
	config.DB.Model(&models.Transaction{}).Where("order_id = ?", orderID).Updates(updates)
	websocket.BroadcastOrderStatus(orderID)
}
 
// ================================================================
// isPascabayar — cek dari product_type atau buyer_sku_code
// ================================================================
func isPascabayar(trx models.Transaction) bool {
	pascaTypes := []string{
		"pln", "pdam", "bpjs", "bpjstk", "internet",
		"multifinance", "pbb", "pgas", "tv", "samsat",
		"pajakdaerah", "emoney", "pascabayar",
	}
	check := strings.ToLower(trx.BuyerSkuCode)
	if trx.ProductType != nil {
		check += " " + strings.ToLower(*trx.ProductType)
	}
	for _, t := range pascaTypes {
		if strings.Contains(check, t) {
			return true
		}
	}
	return false
}
 
// ================================================================
// getRefID — ambil ref_id inquiry dari digiflazz_response di DB
// Saat inquiry berhasil, frontend kirim raw_response ke create-transaction
// Backend simpan di kolom digiflazz_response dengan format:
// { "data": { "ref_id": "INQ-xxx", "customer_no": "...", ... } }
// ================================================================
func getRefID(trx models.Transaction) string {
	if trx.DigiflazzResponse == nil {
		log.Printf("[Digiflazz] Warning: digiflazz_response kosong, pakai order_id sebagai ref_id")
		return trx.OrderID
	}
 
	var resp map[string]interface{}
	if err := json.Unmarshal(trx.DigiflazzResponse, &resp); err != nil {
		return trx.OrderID
	}
 
	// Cek format { "data": { "ref_id": "..." } }
	if data, ok := resp["data"].(map[string]interface{}); ok {
		if refID, ok := data["ref_id"].(string); ok && refID != "" {
			return refID
		}
	}
 
	log.Printf("[Digiflazz] Warning: ref_id tidak ditemukan di DB, pakai order_id")
	return trx.OrderID
}

// HandleMidtransWebhook menangani notifikasi dari Midtrans
// func HandleMidtransWebhook(c *gin.Context) {
// 	// Baca body request
// 	bodyBytes, err := io.ReadAll(c.Request.Body)
// 	if err != nil {
// 		log.Printf("Error reading webhook body: %v", err)
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
// 		return
// 	}
	
// 	// Restore body untuk dibaca lagi jika perlu
// 	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	
// 	// Log untuk debugging
// 	log.Printf("Midtrans Webhook received: %s", string(bodyBytes))
	
// 	// Parse JSON
// 	var notification MidtransNotification
// 	if err := json.Unmarshal(bodyBytes, &notification); err != nil {
// 		log.Printf("Error parsing webhook JSON: %v", err)
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
// 		return
// 	}
	
// 	// Validasi signature key (keamanan)
// 	if !validateSignature(notification) {
// 		log.Printf("Invalid signature key for order: %s", notification.OrderID)
// 		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
// 		return
// 	}
	
// 	// Cari transaksi berdasarkan OrderID
// 	var transaction models.Transaction
// 	if err := config.DB.Where("order_id = ?", notification.OrderID).First(&transaction).Error; err != nil {
// 		log.Printf("Transaction not found for order_id: %s", notification.OrderID)
// 		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
// 		return
// 	}
	
// 	// Update transaksi berdasarkan notifikasi
// 	newStatus, err := updateTransactionFromWebhook(&transaction, notification, bodyBytes)
// 	if err != nil {
// 		log.Printf("Error updating transaction: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
// 		return
// 	}
	
// 	// AMBIL DATA TERBARU setelah update
// 	var updatedTransaction models.Transaction
// 	config.DB.Where("order_id = ?", notification.OrderID).First(&updatedTransaction)
	
// 	// BROADCAST VIA WEBSOCKET dengan data lengkap
// 	log.Printf("📢 Broadcasting settlement for order %s via WebSocket", notification.OrderID)
// 	websocket.BroadcastOrderStatusWithData(notification.OrderID, updatedTransaction)
	
// 	// Trigger Digiflazz jika settlement
// 	if notification.TransactionStatus == "settlement" || notification.TransactionStatus == "capture" {
// 		go triggerDigiflazzProcessing(&updatedTransaction)
// 	}
	
// 	// Selalu return 200 OK ke Midtrans
// 	c.JSON(http.StatusOK, gin.H{
// 		"status":  newStatus,
// 		"message": "Notification processed",
// 	})
// }

// Validasi signature key dari Midtrans
func validateSignature(notification MidtransNotification) bool {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	if serverKey == "" {
		log.Println("WARNING: MIDTRANS_SERVER_KEY not set, skipping signature validation")
		return true
	}
	
	// Format: order_id + status_code + gross_amount + server_key
	signatureString := notification.OrderID + notification.StatusCode + 
		notification.GrossAmount + serverKey
	
	// Generate SHA512 hash
	hash := sha512.New()
	hash.Write([]byte(signatureString))
	expectedSignature := hex.EncodeToString(hash.Sum(nil))
	
	// Compare with received signature
	return expectedSignature == notification.SignatureKey
}

// Update transaksi berdasarkan data webhook
// Update transaksi berdasarkan data webhook Midtrans
func updateTransactionFromWebhook(
    transaction *models.Transaction, 
    notification MidtransNotification, 
    rawBody []byte,
) (string, error) {
    // Mapping status Midtrans ke status aplikasi
    newStatus := mapMidtransStatus(notification.TransactionStatus)
    
    // Parse gross amount
    grossAmount, err := parseGrossAmount(notification.GrossAmount)
    if err != nil {
        log.Printf("Error parsing gross amount: %v", err)
    }
    
    // Siapkan data update
    updates := map[string]interface{}{
        "payment_status":   newStatus,
        "status_message":   notification.StatusMessage,
        "updated_at":       time.Now(),
    }
    
    // Update TransactionID jika belum ada
    if transaction.TransactionID == nil || *transaction.TransactionID == "" {
        updates["transaction_id"] = notification.TransactionID
    }
    
    // Update gross amount jika berbeda
    if !grossAmount.Equals(transaction.GrossAmount) && grossAmount.GreaterThan(decimal.Zero) {
        updates["gross_amount"] = grossAmount
    }
    
    // Update PaymentType jika belum ada
    if transaction.PaymentType == nil || *transaction.PaymentType == "" {
        updates["payment_type"] = notification.PaymentType
    }
    
    // Simpan raw Midtrans response
    updates["midtrans_response"] = datatypes.JSON(rawBody)
    
    // Jika settlement (sukses), trigger Digiflazz
    if notification.TransactionStatus == "settlement" || notification.TransactionStatus == "capture" {
        go triggerDigiflazzProcessing(transaction)
    }
    
    // Jika EXPIRED, update digiflazz_status menjadi FAILED
    if newStatus == "expired" {
        digiflazzStatus := "failed"  // ⭐ HANYA EXPIRED YANG JADI FAILED
        updates["digiflazz_status"] = &digiflazzStatus
        log.Printf("💰 Transaksi EXPIRED - digiflazz_status = failed")
    }
    
    // Update ke database
    if err := config.DB.Model(transaction).Updates(updates).Error; err != nil {
        return "", err
    }
    
    log.Printf("Transaction %s updated: payment_status=%s", 
        notification.OrderID, newStatus)
    
    return newStatus, nil
}

// Mapping status Midtrans ke status aplikasi
func mapMidtransStatus(midtransStatus string) string {
	switch midtransStatus {
	case "capture", "settlement":
		return "settlement"
	case "pending":
		return "pending"
	case "deny", "cancel", "expire", "failure":
		return "failed"
	case "refund":
		return "refunded"
	case "partial_refund":
		return "partial_refund"
	default:
		return "unknown"
	}
}

// Parse gross amount dari format Midtrans (string) ke decimal
func parseGrossAmount(grossAmountStr string) (decimal.Decimal, error) {
	// Midtrans format: "10000.00" atau "10000"
	amount, err := decimal.NewFromString(grossAmountStr)
	if err != nil {
		return decimal.Zero, err
	}
	return amount, nil
}

// Trigger proses pengiriman ke Digiflazz

func triggerDigiflazzProcessing(transaction *models.Transaction) {
    if transaction == nil {
        log.Println("❌ triggerDigiflazzProcessing: transaction is nil")
        return
    }

    log.Printf("🔍 Triggering Digiflazz for transaction ID: %d, Order: %s", 
        transaction.ID, transaction.OrderID)

    // Validasi status - HANYA process jika payment_status = settlement
    if transaction.PaymentStatus != "settlement" {
        log.Printf("⏭️ Transaction %d status is %s, skipping Digiflazz", 
            transaction.ID, transaction.PaymentStatus)
        return
    }

    // Validasi buyer_sku_code
    if transaction.BuyerSkuCode == "" {
        log.Printf("⏭️ Transaction %d has no buyer_sku_code, skipping Digiflazz", 
            transaction.ID)
        return
    }

    // CEK CUT OFF BERDASARKAN PRODUK
    if transaction.ProductID != nil {
        var product models.Product
        if err := config.DB.First(&product, *transaction.ProductID).Error; err != nil {
            log.Printf("⚠️ Error fetching product: %v", err)
        } else {
            // Cek apakah produk sedang dalam cut off
            if product.IsWithinCutoff() {
    nextAvailable := product.GetNextAvailableTime()

    log.Printf("⏸️ Product %s is in cut off, delaying transaction %s", 
        product.ProductName, transaction.OrderID)

    var nextTimeStr string
    if nextAvailable != nil {
        nextTimeStr = nextAvailable.Format("02/01/2006 15:04")
    } else {
        nextTimeStr = "tidak diketahui"
    }

    statusMsg := fmt.Sprintf(
        "Transaksi ditunda karena produk %s sedang cut off (%s - %s). Akan diproses ulang setelah %s",
        product.ProductName,
        product.StartCutOff,
        product.EndCutOff,
        nextTimeStr,
    )

    updates := map[string]interface{}{
        "digiflazz_status": "pending",
        "payment_status":   "settlement",
        "status_message":   &statusMsg,
        "last_error_code":  "CUTOFF",
        "next_retry_at":    nextAvailable,
        "retry_count":      0,
        "updated_at":       time.Now(),
    }

    if err := config.DB.Model(transaction).Updates(updates).Error; err != nil {
        log.Printf("❌ Failed to update cut off status: %v", err)
    }

    go sendAdminCutOffNotification(transaction, &product, nextAvailable)
    return
}
        }
    }

    // Cek status Digiflazz
    if transaction.DigiflazzStatus != nil {
        status := *transaction.DigiflazzStatus
        
        // Jika sudah success, jangan process ulang
        if status == "success" {
            log.Printf("⏭️ Transaction %d already success Digiflazz", transaction.ID)
            return
        }
        
        // Jika sedang processing, jangan double process
        if status == "processing" {
            log.Printf("⏭️ Transaction %d already processing Digiflazz", transaction.ID)
            return
        }
    }

    log.Printf("✅ Transaction %d is valid for Digiflazz processing", transaction.ID)

    // Update status menjadi processing
    processing := "processing"
    now := time.Now()
    
    updates := map[string]interface{}{
        "digiflazz_status":   processing,
        "payment_status":     "settlement",
        "digiflazz_sent_at":  now,
        "updated_at":         now,
    }
    
    // Reset retry count
    updates["retry_count"] = 0
    
    if err := config.DB.Model(&models.Transaction{}).
        Where("id = ?", transaction.ID).
        Updates(updates).Error; err != nil {
        log.Printf("❌ Failed to update Digiflazz status: %v", err)
        return
    }

    // Refresh transaction object
    var updatedTransaction models.Transaction
    if err := config.DB.First(&updatedTransaction, transaction.ID).Error; err != nil {
        log.Printf("❌ Failed to refresh transaction: %v", err)
        updatedTransaction = *transaction
    } else {
        transaction = &updatedTransaction
    }

    // Proses dengan retry mechanism
    go func() {
        if err := jobs.ProcessDigiflazzWithRetry(transaction); err != nil {
            log.Printf("❌ Digiflazz processing error: %v", err)
        }
    }()
}

// sendAdminCutOffNotification - notifikasi cut off ke admin

func sendAdminCutOffNotification(transaction *models.Transaction, product *models.Product, nextRetry *time.Time) {
    waService := services.NewWANotificationService()
    adminPhone := os.Getenv("WA_ADMIN")
    if adminPhone == "" {
        adminPhone = "6287864705664"
    }
    
    customerName := "-"
    if transaction.CustomerName != nil {
        customerName = *transaction.CustomerName
    }
    
    productName := product.ProductName
    
    nextRetryStr := "Tidak diketahui"
    if nextRetry != nil {
        nextRetryStr = nextRetry.Format("02/01/2006 15:04:05")
    }
    
    message := fmt.Sprintf(`⏸️ *[CUT OFF] TRANSAKSI DITUNDA*

Halo Admin,

Transaksi berikut ditunda karena produk sedang dalam masa cut off:

📋 *Detail Transaksi:*
┌─────────────────────
├ Order ID: %s
├ Customer: %s
├ Produk: %s
├ Target: %s
├ Total: Rp %s
└─────────────────────

⏰ *Info Cut Off:*
┌─────────────────────
├ Waktu Cut Off: %s - %s
├ Akan diproses: %s
└─────────────────────

Sistem akan otomatis meretry setelah cut off selesai.

_*ARVESHOP - System Alert*_`,
        transaction.OrderID,
        customerName,
        productName,
        transaction.CustomerNo,
        transaction.GrossAmount.StringFixed(0),
        product.StartCutOff,
        product.EndCutOff,
        nextRetryStr,
    )
    
    if err := waService.SendNotification(adminPhone, message); err != nil {
        log.Printf("❌ Gagal kirim notifikasi cut off: %v", err)
    } else {
        log.Printf("✅ Notifikasi cut off terkirim untuk order %s", transaction.OrderID)
    }
}

// Endpoint untuk testing webhook
func TestMidtransWebhook(c *gin.Context) {
	var notification MidtransNotification
	if err := c.ShouldBindJSON(&notification); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Log untuk debugging
	log.Printf("Test webhook received: %+v", notification)
	
	c.JSON(http.StatusOK, gin.H{
		"status":  "settlement",
		"message": "Test webhook received",
		"data":    notification,
	})
}

// Endpoint untuk manual update status (admin)
func ManualUpdateStatus(c *gin.Context) {
	var req struct {
		OrderID         string `json:"order_id" binding:"required"`
		PaymentStatus   string `json:"payment_status" binding:"required"`
		DigiflazzStatus string `json:"digiflazz_status"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Cari transaksi
	var transaction models.Transaction
	if err := config.DB.Where("order_id = ?", req.OrderID).First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}
	
	// Update status
	updates := map[string]interface{}{
		"payment_status": req.PaymentStatus,
		"updated_at":     time.Now(),
	}
	
	if req.DigiflazzStatus != "" {
		updates["digiflazz_status"] = req.DigiflazzStatus
	}
	
	if err := config.DB.Model(&transaction).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Status updated",
		"data":    transaction,
	})
}

// Struktur yang sesuai dengan payload Digiflazz
type DigiflazzWebhookPayload struct {
	Data struct {
		RefID          string `json:"ref_id"`  // INI AKAN BERISI ORDER_ID KITA
		TrxID          string `json:"trx_id"`
		CustomerNo     string `json:"customer_no"`
		BuyerSkuCode   string `json:"buyer_sku_code"`
		Message        string `json:"message"`
		Status         string `json:"status"`
		RC             string `json:"rc"`
		BuyerLastSaldo int    `json:"buyer_last_saldo"`
		SN             string `json:"sn"`
		Price          int    `json:"price"`
		Tele           string `json:"tele"`
		Wa             string `json:"wa"`
	} `json:"data"`
}

// HandleDigiflazzWebhook menangani webhook dari Digiflazz

func HandleDigiflazzWebhook(c *gin.Context) {
    // Baca body request
    bodyBytes, err := io.ReadAll(c.Request.Body)
    if err != nil {
        log.Printf("Error reading Digiflazz webhook body: %v", err)
        c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
        return
    }
    
    // Restore body
    c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
    
    // Log untuk debugging
    log.Printf("📥 Digiflazz Webhook received: %s", string(bodyBytes))
    
    // Parse JSON
    var payload DigiflazzWebhookPayload
    if err := json.Unmarshal(bodyBytes, &payload); err != nil {
        log.Printf("Error parsing webhook JSON: %v", err)
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
        return
    }
    
    // AMBIL ORDER_ID DARI REF_ID
    data := payload.Data
    orderID := data.RefID
    
    if orderID == "" {
        log.Printf("❌ RefID (OrderID) kosong dalam webhook")
        c.JSON(http.StatusBadRequest, gin.H{"error": "RefID is empty"})
        return
    }
    
    log.Printf("📦 Processing webhook for order: %s, status: %s, rc: %s", 
        orderID, data.Status, data.RC)
    
    // Cari transaksi berdasarkan OrderID
    var transaction models.Transaction
    if err := config.DB.Where("order_id = ?", orderID).First(&transaction).Error; err != nil {
        log.Printf("❌ Transaction not found for order_id: %s", orderID)
        c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
        return
    }
    
    // CEK RC CODE
    rcCode := data.RC
    log.Printf("🔍 RC Code received: %s", rcCode)
    
    // Tentukan status berdasarkan RC Code
    var digiflazzStatus string
    var paymentStatus string
    
    switch rcCode {
    case "00": // SUCCESS
        digiflazzStatus = "success"      // ✅ Status Digiflazz sukses
        paymentStatus = "settlement"     // Customer lihat SETTLEMENT
        log.Printf("✅ Transaksi %s sukses (RC: 00)", orderID)
        
        // Kirim notifikasi sukses ke CUSTOMER
        go sendCustomerSuccessNotification(transaction, data.SN)
        
    case "03": // PENDING - tunggu callback
        digiflazzStatus = "pending"      // ⏳ Status Digiflazz pending
        paymentStatus = "pending"        // Customer lihat PENDING
        log.Printf("⏳ Transaksi %s pending (RC: 03)", orderID)
        // TIDAK KIRIM NOTIFIKASI
        
    default: // ERROR (semua RC selain 00 dan 03)
        digiflazzStatus = "pending"      // ⭐ Status Digiflazz tetap PENDING (bukan failed!)
        paymentStatus = "settlement"     // Customer tetap lihat SETTLEMENT
        log.Printf("⚠️ Transaksi %s error (RC: %s) - status customer SETTLEMENT, digiflazz_status PENDING", 
            orderID, rcCode)
        
        // ⚠️ ERROR - Kirim notifikasi DETAIL ke ADMIN
        go sendAdminErrorNotification(transaction, rcCode, data.Message)
    }
    
    // Siapkan updates
    statusMessage := data.Message
    updates := map[string]interface{}{
        "digiflazz_status":  digiflazzStatus,
        "payment_status":    paymentStatus,
        "status_message":    &statusMessage,
        "serial_number":     &data.SN,
        "updated_at":        time.Now(),
    }
    
    // Simpan trx_id dan rc
    if data.TrxID != "" {
        updates["transaction_id"] = &data.TrxID
    }
    if data.RC != "" {
        updates["last_error_code"] = &data.RC
    }
    
    // Update ke database
    log.Printf("💾 Updating database for order %s - payment_status: %s, digiflazz_status: %s", 
        orderID, paymentStatus, digiflazzStatus)
    
    if err := config.DB.Model(&transaction).Updates(updates).Error; err != nil {
        log.Printf("❌ Error updating transaction: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
        return
    }
    
    // Refresh transaction
    var updatedTransaction models.Transaction
    config.DB.First(&updatedTransaction, transaction.ID)
    
    // Broadcast via WebSocket
    go websocket.BroadcastOrderStatus(orderID)
    go websocket.BroadcastOrderStatusWithData(orderID, updatedTransaction)
    
    // Return 200 OK
    log.Printf("✅ Webhook processing completed for order %s", orderID)
    c.JSON(http.StatusOK, gin.H{
        "status":  "success",
        "message": "Webhook received",
        "data": gin.H{
            "order_id": orderID,
            "status":   digiflazzStatus,
            "rc":       rcCode,
        },
    })
}

// ==================== FUNGSI NOTIFIKASI ====================

// sendCustomerSuccessNotification - kirim notifikasi sukses ke customer
func sendCustomerSuccessNotification(tx models.Transaction, sn string) {
    if tx.WaPembeli == "" {
        log.Printf("⚠️ WaPembeli kosong untuk order %s, tidak bisa kirim notifikasi sukses", tx.OrderID)
        return
    }

    waService := services.NewWANotificationService()

    customerName := "Pelanggan"
    if tx.CustomerName != nil && *tx.CustomerName != "" {
        customerName = *tx.CustomerName
    }

    productName := "Produk"
    if tx.ProductName != nil && *tx.ProductName != "" {
        productName = *tx.ProductName
    }

    appURL := os.Getenv("APP_URL")
    historyLink := fmt.Sprintf("%s/history/%s", appURL, tx.OrderID)

    log.Printf("📱 Mengirim notifikasi SUKSES ke customer %s untuk order %s",
        tx.WaPembeli, tx.OrderID)

    message := fmt.Sprintf(
`🎉 *TRANSAKSI BERHASIL!* 🎉

Halo *%s*, terima kasih telah berbelanja di *ARVESHOP* 🛍️

━━━━━━━━━━━━━━━━━━━━
📦 *DETAIL PESANAN*
━━━━━━━━━━━━━━━━━━━━
🔖 Order ID   : %s
🛒 Produk     : %s
🎯 Target     : %s
💰 Total      : Rp %s
━━━━━━━━━━━━━━━━━━━━
🔑 *SERIAL NUMBER*
%s
━━━━━━━━━━━━━━━━━━━━

📜 Lihat detail transaksi:
 %s

⏰ Diproses pada: %s

💬 Ada pertanyaan? Hubungi kami segera.
Terima kasih telah mempercayai *ARVESHOP* ❤️`,
        customerName,
        tx.OrderID,
        productName,
        tx.CustomerNo,
        tx.GrossAmount.StringFixed(0),
        sn,
        historyLink,
        time.Now().Format("02 Jan 2006, 15:04 WIB"),
    )

    if err := waService.SendNotification(tx.WaPembeli, message); err != nil {
        log.Printf("❌ Gagal kirim notifikasi sukses ke customer: %v", err)
    } else {
        log.Printf("✅ Notifikasi sukses terkirim ke customer %s", tx.WaPembeli)
    }
}

// sendAdminErrorNotification - kirim notifikasi error DETAIL ke admin
func sendAdminErrorNotification(tx models.Transaction, rc, msg string) {
    waService := services.NewWANotificationService()
    adminPhone := os.Getenv("WA_ADMIN") // Nomor admin
    
    // Ambil data dengan aman
    customerName := "-"
    if tx.CustomerName != nil && *tx.CustomerName != "" {
        customerName = *tx.CustomerName
    }
    
    phoneNumber := "-"
    if tx.PhoneNumber != nil && *tx.PhoneNumber != "" {
        phoneNumber = *tx.PhoneNumber
    }
    
    productName := "-"
    if tx.ProductName != nil && *tx.ProductName != "" {
        productName = *tx.ProductName
    }
    
    // Mapping RC code ke deskripsi
    rcDescription := getRCDescription(rc)
    
    log.Printf("📱 Mengirim notifikasi ERROR ke admin untuk order %s (RC: %s)", 
        tx.OrderID, rc)
    
    // Format pesan untuk admin (DETAIL DENGAN INSTRUKSI)
    message := fmt.Sprintf(`⚠️ *[INTERNAL] ERROR DIGIFLAZZ - RC %s*

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
        tx.OrderID,
        customerName,
        phoneNumber,
        productName,
        tx.CustomerNo,
        tx.GrossAmount.StringFixed(0),
        rc,
        rcDescription,
        msg,
        time.Now().Format("02/01/2006 15:04:05"),
    )
    
    if err := waService.SendNotification(adminPhone, message); err != nil {
        log.Printf("❌ Gagal mengirim notifikasi error ke admin: %v", err)
    } else {
        log.Printf("✅ Notifikasi error terkirim ke admin untuk order %s", tx.OrderID)
    }
}

// Helper function untuk mengamankan string pointer
func safeString(s *string) string {
    if s == nil {
        return "-"
    }
    return *s
}

// Fungsi untuk mendapatkan deskripsi RC code
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