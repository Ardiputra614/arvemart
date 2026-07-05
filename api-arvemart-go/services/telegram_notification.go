package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type TelegramService struct {
	BotToken   string
	HTTPClient *http.Client
}

var Telegram = NewTelegramService()

func NewTelegramService() *TelegramService {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	return &TelegramService{
		BotToken:   token,
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (t *TelegramService) SendMessage(chatID, text string) error {
	if t.BotToken == "" || chatID == "" {
		log.Println("⚠️ TELEGRAM: Bot token atau chat ID kosong")
		return nil
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.BotToken)

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}

	body, _ := json.Marshal(payload)

	resp, err := t.HTTPClient.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("telegram send error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		return fmt.Errorf("telegram API error: %v", result)
	}

	return nil
}

func (t *TelegramService) SendToGangguan(text string) {
	chatID := os.Getenv("TELEGRAM_CHAT_GANGGUAN")
	if err := t.SendMessage(chatID, text); err != nil {
		log.Printf("❌ Gagal kirim Telegram ke grup GANGGUAN: %v", err)
	}
}

func (t *TelegramService) SendToGagal(text string) {
	chatID := os.Getenv("TELEGRAM_CHAT_GAGAL")
	if err := t.SendMessage(chatID, text); err != nil {
		log.Printf("❌ Gagal kirim Telegram ke grup GAGAL: %v", err)
	}
}

func (t *TelegramService) SendProductGangguanNotification(productName, sku, productType string, buyerStatus, sellerStatus bool) {
	msg := fmt.Sprintf(`🚫 <b>PRODUK GANGGUAN</b>

%s
SKU: %s
Tipe: %s
Buyer Status: %t
Seller Status: %t`,
		productName, sku, productType, buyerStatus, sellerStatus)

	t.SendToGangguan(msg)
}

func (t *TelegramService) SendOrderFailedNotification(orderID, reason string) {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://www.arvemart.com"
	}

	msg := fmt.Sprintf(`❌ <b>PESANAN GAGAL</b>

Order ID: %s
Alasan: %s

🔗 <a href="%s/history/%s">Lihat Pesanan</a>
🔗 <a href="https://dashboard.digiflazz.com">Dashboard Digiflazz</a>
🔗 <a href="%s/login">Login Arvemart</a>`,
		orderID, reason,
		frontendURL, orderID,
		frontendURL)

	t.SendToGagal(msg)
}

func (t *TelegramService) SendSaldoLowNotification(saldo float64) {
	msg := fmt.Sprintf(`💰 <b>SALDO DIGIFLAZZ RENDAH</b>

Sisa saldo: Rp %.0f
Segera lakukan pengisian saldo.

🔗 <a href="https://dashboard.digiflazz.com">Dashboard Digiflazz</a>`, saldo)

	t.SendToGagal(msg)
}
