// services/wa_notification.go
package services

import (
	"api-arveshop-go/models"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

// Global instance
var WAService = NewWANotificationService()

type WANotificationService struct {
	APIBaseURL string
	HTTPClient *http.Client
}

type WAMessageRequest struct {
	DeviceID string `json:"device_id"`
	Target   string `json:"target"`
	Message  string `json:"message"`
}

type WAMessageResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	QueuePosition int    `json:"queuePosition"`
	TaskID        string `json:"taskId"`
}

// NewWANotificationService membuat instance baru WANotificationService
func NewWANotificationService() *WANotificationService {
	apiURL := os.Getenv("WA_ENGINE_URL")
	if apiURL == "" {
		apiURL = "http://202.10.36.51:4000" // default
	}

	return &WANotificationService{
		APIBaseURL: apiURL,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *WANotificationService) SendNotification(WaPembeli, message string) error {
    if s.APIBaseURL == "" {
        log.Println("⚠️ WA_ENGINE_URL not set, skipping WhatsApp notification")
        return nil
    }

    deviceID, err := s.getConnectedDevice()
    if err != nil {
        return fmt.Errorf("failed to get connected device: %v", err)
    }

    cleanedPhone := s.cleanWaPembeli(WaPembeli)

    reqBody := WAMessageRequest{
        DeviceID: deviceID,
        Target:   cleanedPhone,
        Message:  message,
    }

    jsonData, err := json.Marshal(reqBody)
    if err != nil {
        return fmt.Errorf("failed to marshal request: %v", err)
    }

    // ✅ Tidak ada /api/ prefix karena sudah ada di APIBaseURL
    resp, err := s.HTTPClient.Post(
        fmt.Sprintf("%s/send-message", s.APIBaseURL),
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return fmt.Errorf("failed to send to WA Engine: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("WA Engine returned status: %d", resp.StatusCode)
    }

    var waResp WAMessageResponse
    if err := json.NewDecoder(resp.Body).Decode(&waResp); err != nil {
        return fmt.Errorf("failed to decode response: %v", err)
    }

    if !waResp.Success {
        return fmt.Errorf("WA Engine error: %s", waResp.Message)
    }

    log.Printf("✅ WhatsApp notification sent to %s, queue position: %d",
        cleanedPhone, waResp.QueuePosition)

    return nil
}

func (s *WANotificationService) getConnectedDevice() (string, error) {
    // ✅ Tidak ada /api/ prefix
    resp, err := s.HTTPClient.Get(fmt.Sprintf("%s/devices", s.APIBaseURL))
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    var result struct {
        Success bool `json:"success"`
        Devices []struct {
            ID     string `json:"id"`
            Status string `json:"status"`
            Name   string `json:"name"`
        } `json:"devices"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return "", err
    }

    if !result.Success {
        return "", fmt.Errorf("failed to get devices")
    }

    for _, device := range result.Devices {
        if device.Status == "connected" {
            log.Printf("📱 Using connected device: %s (%s)", device.Name, device.ID)
            return device.ID, nil
        }
    }

    return "", fmt.Errorf("no connected device found")
}



// cleanWaPembeli membersihkan format nomor telepon
func (s *WANotificationService) cleanWaPembeli(phone string) string {
    // Hapus semua karakter non-digit
    cleaned := ""
    for _, char := range phone {
        if char >= '0' && char <= '9' {
            cleaned += string(char)
        }
    }

    // Kalau kosong, return kosong
    if len(cleaned) == 0 {
        return ""
    }

    // Kalau diawali 0 → ganti dengan 62
    // contoh: 087864705664 → 6287864705664
    if cleaned[0] == '0' {
        cleaned = "62" + cleaned[1:]
        log.Printf("📞 Format 08xxx → 62xxx: %s", cleaned)
        return cleaned
    }

    // Kalau sudah diawali 62 → biarkan
    // contoh: 6287864705664 → 6287864705664
    if len(cleaned) >= 2 && cleaned[:2] == "62" {
        log.Printf("📞 Format 62xxx sudah benar: %s", cleaned)
        return cleaned
    }

    // Kalau diawali 8 (tanpa 0 dan tanpa 62) → tambah 62
    // contoh: 87864705664 → 6287864705664
    if cleaned[0] == '8' {
        cleaned = "62" + cleaned
        log.Printf("📞 Format 8xxx → 62xxx: %s", cleaned)
        return cleaned
    }

    // Default → tambah 62
    cleaned = "62" + cleaned
    log.Printf("📞 Format default → 62xxx: %s", cleaned)
    return cleaned
}

// SendDigiflazzSuccess mengirim notifikasi sukses topup ke pembeli
// services/wa_notification.go

// SendDigiflazzSuccess mengirim notifikasi sukses ke pembeli
func (s *WANotificationService) SendDigiflazzSuccess(transaction *models.Transaction, serialNumber string) error {
    if transaction == nil {
        return fmt.Errorf("transaction is nil")
    }

    // Validasi data penting
    if transaction.WaPembeli == "" {
        return fmt.Errorf("phone number is empty for order %s", transaction.OrderID)
    }

    if serialNumber == "" {
        serialNumber = "N/A"
        log.Printf("⚠️ Empty serial number for transaction %d, using N/A", transaction.ID)
    }

    log.Printf("📱 Preparing success notification for %s (%s) with SN: %s", 
        transaction.CustomerName, transaction.WaPembeli, serialNumber)

    // Format pesan sukses
    message := fmt.Sprintf(`✅ *TOPUP BERHASIL*

Halo *%s*!

Yeay! Topup Anda telah berhasil diproses 🎉

📋 *Detail Transaksi:*
┌─────────────────────
├ Order ID: %s
├ Produk: %s
├ Target: %s
├ Total: Rp %s
└─────────────────────

🔑 *Detail Produk:*
┌─────────────────────
├ SN/Kode Voucher: `+"`%s`"+`
└─────────────────────

Simpan kode di atas untuk penggunaan nanti.

Terima kasih telah menggunakan layanan kami! 🙏

_*ARVESHOP - Solusi Digital Terpercaya*_`,
        transaction.CustomerName,
        transaction.OrderID,
        transaction.ProductName,
        transaction.CustomerNo,
        transaction.GrossAmount.StringFixed(0),
        serialNumber,
    )

    // Kirim via WA Engine
    err := s.SendNotification(transaction.WaPembeli, message)
    if err != nil {
        log.Printf("❌ Failed to send success notification to %s: %v", 
            transaction.WaPembeli, err)
        return err
    }

    log.Printf("✅ Success notification sent to %s for transaction %d", 
        transaction.WaPembeli, transaction.ID)
    return nil
}

// SendDigiflazzFailed mengirim notifikasi gagal topup ke admin (087864705662)
func (s *WANotificationService) SendDigiflazzFailed(transaction *models.Transaction, errorCode, errorMessage string) error {
	if transaction == nil {
		return fmt.Errorf("transaction is nil")
	}

	// Nomor admin fixed
	adminPhone := "6287864705662" // 087864705662 tanpa 0

	// Format pesan gagal topup untuk admin
	message := fmt.Sprintf(`⚠️ *TOPUP GAGAL*

Halo Admin,

Topup berikut gagal diproses oleh Digiflazz:

📋 *Detail Transaksi:*
┌─────────────────────
├ Order ID: %s
├ Customer: %s (%s)
├ Produk: %s
├ Target: %s
├ Total: Rp %s
└─────────────────────

❌ *Error Details:*
┌─────────────────────
├ Kode Error: %s
├ Pesan: %s
└─────────────────────

⏰ Waktu: %s

Mohon segera dicek dan dilakukan refund jika diperlukan.

_*ARVESHOP - System Alert*_`,
		transaction.OrderID,
		transaction.CustomerName,
		transaction.WaPembeli,
		transaction.ProductName,
		transaction.CustomerNo,
		transaction.GrossAmount.StringFixed(0),
		errorCode,
		errorMessage,
		time.Now().Format("02/01/2006 15:04:05"),
	)

	return s.SendNotification(adminPhone, message)
}

// SendDigiflazzProcessing mengirim notifikasi topup sedang diproses ke pembeli
func (s *WANotificationService) SendDigiflazzProcessing(transaction *models.Transaction) error {
	if transaction == nil {
		return fmt.Errorf("transaction is nil")
	}

	message := fmt.Sprintf(`⏳ *TOPUP DIPROSES*

Halo *%s*!

Topup Anda sedang diproses oleh sistem.

📋 *Detail Transaksi:*
┌─────────────────────
├ Order ID: %s
├ Produk: %s
├ Target: %s
├ Total: Rp %s
└─────────────────────

Mohon tunggu sebentar, kami akan mengirimkan notifikasi setelah topup selesai.

_*ARVESHOP - Solusi Digital Terpercaya*_`,
		transaction.CustomerName,
		transaction.OrderID,
		transaction.ProductName,
		transaction.CustomerNo,
		transaction.GrossAmount.StringFixed(0),
	)

	return s.SendNotification(transaction.WaPembeli, message)
}