package services

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/websocket"
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// ================================================================
// DIGIFLAZZ — sign & http helper
// ================================================================

// generateSign → MD5(username + api_key + ref_id)
func generateSign(refID string) string {
	raw := os.Getenv("DIGIFLAZZ_USERNAME") + os.Getenv("DIGIFLAZZ_API_KEY") + refID
	return fmt.Sprintf("%x", md5.Sum([]byte(raw)))
}

// hitDigiflazz — satu fungsi untuk semua command
func hitDigiflazz(command, skuCode, customerNo, refID string) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"commands":       command,
		"username":       os.Getenv("DIGIFLAZZ_USERNAME"),
		"buyer_sku_code": skuCode,
		"customer_no":    customerNo,
		"ref_id":         refID,
		"sign":           generateSign(refID),
	}

	body, _ := json.Marshal(payload)
	resp, err := http.Post(
		"https://api.digiflazz.com/v1/transaction",
		"application/json",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return nil, fmt.Errorf("koneksi Digiflazz gagal: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	log.Printf("[Digiflazz] %s rc=%s", command, respBody)

	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	return result, nil
}

// ================================================================
// [POST /api/inquiry]
// Cek tagihan sebelum user bayar
// Body: { customer_no, buyer_sku_code }
// ================================================================

func Inquiry(c *gin.Context) {
	var req struct {
		CustomerNo string `json:"customer_no"    binding:"required"`
		BuyerSKU   string `json:"buyer_sku_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"success": false, "message": err.Error()})
		return
	}

	refID := fmt.Sprintf("INQ-%s-%d", time.Now().Format("20060102150405"), rand.Intn(9000)+1000)

	result, err := hitDigiflazz("inq-pasca", req.BuyerSKU, req.CustomerNo, refID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": err.Error()})
		return
	}

	data, _ := result["data"].(map[string]interface{})
	if data == nil {
		c.JSON(500, gin.H{"success": false, "message": "Response tidak valid"})
		return
	}

	if rc, _ := data["rc"].(string); rc != "00" {
		c.JSON(200, gin.H{
			"success": false,
			"message": data["message"],
			"rc":      rc,
		})
		return
	}

	// Kembalikan ke frontend — termasuk desc untuk DescDetail
	c.JSON(200, gin.H{
		"success": true,
		"data":    data,
	})
}

// ================================================================
// [POST /webhook/midtrans]
// Setelah settlement → bayar tagihan ke Digiflazz (pay-pasca)
// ================================================================

func HandleMidtransWebhook(c *gin.Context) {
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	log.Printf("[Webhook] Midtrans: %s", string(bodyBytes))

	var notif struct {
		OrderID           string `json:"order_id"`
		TransactionStatus string `json:"transaction_status"`
		FraudStatus       string `json:"fraud_status"`
		GrossAmount       string `json:"gross_amount"`
		StatusCode        string `json:"status_code"`
		TransactionID     string `json:"transaction_id"`
		SignatureKey      string `json:"signature_key"`
	}
	json.Unmarshal(bodyBytes, &notif)

	// Validasi signature: MD5(order_id + status_code + gross_amount + server_key)
	raw      := notif.OrderID + notif.StatusCode + notif.GrossAmount + os.Getenv("MIDTRANS_SERVER_KEY")
	expected := fmt.Sprintf("%x", md5.Sum([]byte(raw)))
	if expected != notif.SignatureKey {
		c.JSON(401, gin.H{"error": "Invalid signature"})
		return
	}

	// Cari transaksi
	var trx models.Transaction
	if err := config.DB.Where("order_id = ?", notif.OrderID).First(&trx).Error; err != nil {
		c.JSON(404, gin.H{"error": "Transaction not found"})
		return
	}

	// Tentukan status final
	newStatus := notif.TransactionStatus
	if notif.TransactionStatus == "capture" {
		if notif.FraudStatus == "challenge" {
			newStatus = "challenge"
		} else {
			newStatus = "settlement"
		}
	}

	// Update payment status
	config.DB.Model(&trx).Updates(map[string]interface{}{
		"payment_status":  newStatus,
		"transaction_id":  notif.TransactionID,
		"midtrans_response": datatypes.JSON(bodyBytes),
		"updated_at":      time.Now(),
	})

	// Broadcast ke frontend via WebSocket
	websocket.BroadcastOrderStatus(notif.OrderID)

	// Bayar tagihan ke Digiflazz setelah settlement
	if newStatus == "settlement" {
		go bayarTagihan(notif.OrderID)
	}

	c.JSON(200, gin.H{"status": "ok"})
}

// ================================================================
// bayarTagihan — dipanggil async setelah Midtrans settlement
// Otomatis: pay-pasca untuk pascabayar, top-up untuk prabayar
// ================================================================

func bayarTagihan(orderID string) {
	var trx models.Transaction
	if err := config.DB.Where("order_id = ?", orderID).First(&trx).Error; err != nil {
		log.Printf("[Digiflazz] Transaksi tidak ditemukan: %s", orderID)
		return
	}

	// Pilih command berdasarkan product_type
	command := "top-up"
	if trx.ProductType != nil {
		pascaTypes := []string{"pln", "pdam", "bpjs", "internet", "multifinance", "pbb", "pgas", "tv", "samsat"}
		for _, t := range pascaTypes {
			if strings.Contains(strings.ToLower(*trx.ProductType), t) ||
				strings.Contains(strings.ToLower(trx.BuyerSkuCode), t) {
				command = "pay-pasca"
				break
			}
		}
	}

	log.Printf("[Digiflazz] %s order=%s sku=%s", command, orderID, trx.BuyerSkuCode)

	result, err := hitDigiflazz(command, trx.BuyerSkuCode, trx.CustomerNo, orderID)

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
		updates["status_message"]   = "Response tidak valid dari Digiflazz"
		config.DB.Model(&models.Transaction{}).Where("order_id = ?", orderID).Updates(updates)
		websocket.BroadcastOrderStatus(orderID)
		return
	}

	raw, _ := json.Marshal(result)
	updates["digiflazz_response"] = datatypes.JSON(raw)
	updates["digiflazz_flag"]     = data["status"]

	rc,     _ := data["rc"].(string)
	status, _ := data["status"].(string)
	msg,    _ := data["message"].(string)
	sn,     _ := data["sn"].(string)

	switch {
	case rc == "00" && status == "Sukses":
		updates["digiflazz_status"] = "Sukses"
		updates["status_message"]   = msg
		if sn != "" { updates["serial_number"] = sn }
		log.Printf("[Digiflazz] Sukses order=%s sn=%s", orderID, sn)

	case status == "Pending":
		// Masih diproses Digiflazz — tunggu callback
		updates["digiflazz_status"] = "Pending"
		updates["status_message"]   = msg
		log.Printf("[Digiflazz] Pending order=%s", orderID)

	default:
		updates["digiflazz_status"] = "Gagal"
		updates["status_message"]   = msg
		log.Printf("[Digiflazz] Gagal order=%s rc=%s msg=%s", orderID, rc, msg)
	}

	config.DB.Model(&models.Transaction{}).Where("order_id = ?", orderID).Updates(updates)
	websocket.BroadcastOrderStatus(orderID)
}