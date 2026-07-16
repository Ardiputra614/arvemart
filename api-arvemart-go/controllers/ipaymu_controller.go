package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/services"
	"api-arveshop-go/websocket"
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
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
	"gorm.io/gorm"
)

type CreateTransactionRequest struct {
	ID            uint            `json:"id"`
	ProductName   string          `json:"product_name"`
	ProductType   string          `json:"product_type"`
	BuyerSkuCode  string          `json:"buyer_sku_code"`
	UserID        *uint           `json:"user_id"`
	ProductID     *uint           `json:"product_id"`
	SellingPrice  float64         `json:"selling_price"`
	PurchasePrice float64         `json:"purchase_price"`
	Fee           decimal.Decimal `json:"fee"`

	CustomerNo   string  `json:"customer_no"`
	CustomerName string  `json:"customer_name"`
	Email        *string `json:"email"`
	WaPembeli    string  `json:"wa_pembeli"`
	CustomerNote string  `json:"customer_note"`

	PaymentMethodName string `json:"payment_method_name"`
	PaymentType       string `json:"payment_type"`
	PaymentMethodCode string `json:"payment_method_code"`

	IsAdmin   bool   `json:"is_admin"`
	AdminID   uint   `json:"admin_id"`
	AdminNote string `json:"admin_note"`

	CategoryID   *uint  `json:"category_id"`
	CategoryName string `json:"category_name"`

	VoucherCode     *string `json:"voucher_code"`
	VoucherDiscount float64 `json:"voucher_discount"`
	ApplicationFee  float64 `json:"application_fee"`
}

func CreateTransactionIpaymu(c *gin.Context) {
	var req CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.ProductName == "" || req.CustomerNo == "" || req.PaymentMethodName == "" {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	sellingPrice := decimal.NewFromFloat(req.SellingPrice)
	fee := req.Fee
	purchasePrice := decimal.NewFromFloat(req.PurchasePrice)

	applicationFee := decimal.NewFromFloat(req.ApplicationFee)
	voucherDiscount := decimal.NewFromFloat(req.VoucherDiscount)
	grossAmount := sellingPrice.Add(fee).Add(applicationFee).Sub(voucherDiscount)
	if grossAmount.LessThan(decimal.Zero) {
		grossAmount = decimal.Zero
	}
	profit := sellingPrice.Sub(purchasePrice).Sub(fee)

	orderID := fmt.Sprintf("ORD-%d", time.Now().Unix())

	if req.PaymentType == "cash" {
		if req.AdminID == 0 && req.UserID != nil {
			req.AdminID = *req.UserID
		}
		var profitMargin *float64
		handleAdminTopup(c, req, sellingPrice, fee, purchasePrice, grossAmount, profit, profitMargin, orderID)
		return
	}

	// VALIDASI VOUCHER SEBELUM PANGGIL IPAYMU API
	if req.VoucherCode != nil && *req.VoucherCode != "" && req.VoucherDiscount > 0 {
		totalBeforeDiscount := sellingPrice.Add(fee).Add(applicationFee)
		_, correctDiscount, err := validateAndUseVoucher(*req.VoucherCode, totalBeforeDiscount.InexactFloat64())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if correctDiscount != req.VoucherDiscount {
			correctDiscountDec := decimal.NewFromFloat(correctDiscount)
			voucherDiscount = correctDiscountDec
			req.VoucherDiscount = correctDiscount
			grossAmount = sellingPrice.Add(fee).Add(applicationFee).Sub(correctDiscountDec)
			if grossAmount.LessThan(decimal.Zero) {
				grossAmount = decimal.Zero
			}
		}
	}

	va := os.Getenv("IPAYMU_VA")
	apiKey := os.Getenv("IPAYMU_API_KEY")
	appURL := os.Getenv("APP_URL")
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = appURL
	}

	if va == "" || apiKey == "" {
		c.JSON(500, gin.H{"error": "iPaymu credentials not configured"})
		return
	}

	amountInt := grossAmount.Round(0).IntPart()

	buyerName := req.CustomerName
	buyerPhone := formatPhone(req.WaPembeli)
	var buyerEmail string
	if req.Email != nil {
		buyerEmail = *req.Email
	}

	now := time.Now()

	var paymentURL string
	var sessionID string
	var vaNumber string
	var qrString string
	var trxCode string
	var refID string
	var ipaymuExpiry *time.Time

	notifyURL := fmt.Sprintf("%s/api/webhook/ipaymu", appURL)

	switch req.PaymentType {
	case "bank_transfer":
		channel := mapPaymentChannel(req.PaymentMethodCode)
		if channel == "" {
			c.JSON(400, gin.H{"error": "Invalid payment channel for VA"})
			return
		}

		payload := map[string]interface{}{
			"name":           buyerName,
			"phone":          buyerPhone,
			"amount":         float64(amountInt),
			"paymentMethod":  "va",
			"paymentChannel": channel,
			"notifyUrl":      notifyURL,
			"expired":        24,
			"expiredType":    "hours",
			"referenceId":    orderID,
			"product":        []string{req.ProductName},
			"qty":            []int{1},
			"price":          []float64{float64(amountInt)},
		}
		if buyerEmail != "" {
			payload["email"] = buyerEmail
		}

		respData, err := callIpaymuAPI(va, apiKey, payload, "/payment/direct")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		sessionID = ipaymuGetString(respData, "TransactionId")
		vaNumber = ipaymuGetString(respData, "PaymentNo")
		refID = ipaymuGetString(respData, "ReferenceId")
		if expiryStr := ipaymuGetString(respData, "Expired"); expiryStr != "" {
			t, err := time.Parse("2006-01-02 15:04:05", expiryStr)
			if err == nil {
				ipaymuExpiry = &t
			}
		}

	case "qris":
		payload := map[string]interface{}{
			"name":           buyerName,
			"phone":          buyerPhone,
			"amount":         float64(amountInt),
			"paymentMethod":  "qris",
			"paymentChannel": "mpm",
			"notifyUrl":      notifyURL,
			"referenceId":    orderID,
			"product":        []string{req.ProductName},
			"qty":            []int{1},
			"price":          []float64{float64(amountInt)},
		}
		if buyerEmail != "" {
			payload["email"] = buyerEmail
		}

		respData, err := callIpaymuAPI(va, apiKey, payload, "/payment/direct")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		sessionID = ipaymuGetString(respData, "TransactionId")
		qrString = ipaymuGetString(respData, "QrString")
		refID = ipaymuGetString(respData, "ReferenceId")
		if qrString == "" {
			qrString = ipaymuGetString(respData, "Url")
		}
		if expiryStr := ipaymuGetString(respData, "Expired"); expiryStr != "" {
			t, err := time.Parse("2006-01-02 15:04:05", expiryStr)
			if err == nil {
				ipaymuExpiry = &t
			}
		}

	case "cstore":
		channel := mapPaymentChannel(req.PaymentMethodCode)
		if channel == "" {
			c.JSON(400, gin.H{"error": "Invalid payment channel for cstore"})
			return
		}

		payload := map[string]interface{}{
			"name":           buyerName,
			"phone":          buyerPhone,
			"amount":         float64(amountInt),
			"paymentMethod":  "cstore",
			"paymentChannel": channel,
			"notifyUrl":      notifyURL,
			"expired":        24,
			"expiredType":    "hours",
			"referenceId":    orderID,
			"product":        []string{req.ProductName},
			"qty":            []int{1},
			"price":          []float64{float64(amountInt)},
		}
		if buyerEmail != "" {
			payload["email"] = buyerEmail
		}

		respData, err := callIpaymuAPI(va, apiKey, payload, "/payment/direct")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		sessionID = ipaymuGetString(respData, "TransactionId")
		trxCode = ipaymuGetString(respData, "PaymentNo")
		refID = ipaymuGetString(respData, "ReferenceId")
		if expiryStr := ipaymuGetString(respData, "Expired"); expiryStr != "" {
			t, err := time.Parse("2006-01-02 15:04:05", expiryStr)
			if err == nil {
				ipaymuExpiry = &t
			}
		}

	case "ewallet":
		channel := mapPaymentChannel(req.PaymentMethodCode)
		if channel == "" {
			c.JSON(400, gin.H{"error": "Invalid payment channel for ewallet"})
			return
		}

		payload := map[string]interface{}{
			"product":        []string{req.ProductName},
			"qty":            []int{1},
			"price":          []float64{float64(amountInt)},
			"returnUrl":      fmt.Sprintf("%s/history/%s", frontendURL, orderID),
			"cancelUrl":      fmt.Sprintf("%s/history/%s", frontendURL, orderID),
			"notifyUrl":      notifyURL,
			"referenceId":    orderID,
			"buyerName":      buyerName,
			"buyerPhone":     buyerPhone,
			"paymentMethod":  "redirect",
			"paymentChannel": channel,
		}
		if buyerEmail != "" {
			payload["buyerEmail"] = buyerEmail
		}

		respData, err := callIpaymuAPI(va, apiKey, payload, "/payment/")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		paymentURL = ipaymuGetString(respData, "Url")
		sessionID = ipaymuGetString(respData, "SessionID")
		refID = ipaymuGetString(respData, "ReferenceId")
		if expiryStr := ipaymuGetString(respData, "Expired"); expiryStr != "" {
			t, err := time.Parse("2006-01-02 15:04:05", expiryStr)
			if err == nil {
				ipaymuExpiry = &t
			}
		}

	default:
		// Redirect payment (ewallet, paylater)
		channel := mapPaymentChannel(req.PaymentMethodCode)
		payload := map[string]interface{}{
			"product":        []string{req.ProductName},
			"qty":            []int{1},
			"price":          []float64{float64(amountInt)},
			"returnUrl":      fmt.Sprintf("%s/history/%s", frontendURL, orderID),
			"cancelUrl":      fmt.Sprintf("%s/history/%s", frontendURL, orderID),
			"notifyUrl":      notifyURL,
			"referenceId":    orderID,
			"buyerName":      buyerName,
			"buyerPhone":     buyerPhone,
			"paymentMethod":  "redirect",
			"paymentChannel": channel,
		}
		if buyerEmail != "" {
			payload["buyerEmail"] = buyerEmail
		}

		respData, err := callIpaymuAPI(va, apiKey, payload, "/payment/")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		paymentURL = ipaymuGetString(respData, "Url")
		sessionID = ipaymuGetString(respData, "SessionID")
		refID = ipaymuGetString(respData, "ReferenceId")
		if expiryStr := ipaymuGetString(respData, "Expired"); expiryStr != "" {
			t, err := time.Parse("2006-01-02 15:04:05", expiryStr)
			if err == nil {
				ipaymuExpiry = &t
			}
		}
	}

	ipaymuRespJSON, _ := json.Marshal(map[string]interface{}{
		"sessionId":   sessionID,
		"referenceId": refID,
		"vaNumber":    vaNumber,
		"qrString":    qrString,
		"trxCode":     trxCode,
		"paymentUrl":  paymentURL,
		"expiredAt":   ipaymuExpiry,
	})

	transaction := models.Transaction{
		OrderID: orderID,

		UserID:       req.UserID,
		ProductID:    &req.ID,
		ProductName:  &req.ProductName,
		ProductType:  stringPtr(req.ProductType),
		CustomerNo:   req.CustomerNo,
		BuyerSkuCode: req.BuyerSkuCode,
		WaPembeli:    req.WaPembeli,
		Email:        req.Email,

		CategoryID:   req.CategoryID,
		CategoryName: stringPtr(req.CategoryName),

		ProviderName: stringPtr("digiflazz"),

		GrossAmount:    grossAmount,
		SellingPrice:   sellingPrice,
		PurchasePrice:  purchasePrice,
		Fee:            fee,
		MerchantFee:    fee,
		AdminFee:       decimal.NewFromInt(0),
		ApplicationFee: applicationFee,

		PaymentStatus:     "pending",
		DigiflazzStatus:   stringPtr("pending"),
		PaymentType:       &req.PaymentType,
		PaymentMethodName: &req.PaymentMethodName,
		PaymentMethodCode: &req.PaymentMethodCode,

		IpaymuPaymentURL: &paymentURL,
		IpaymuSessionID:  &sessionID,
		IpaymuVa:         &vaNumber,
		IpaymuQRString:   &qrString,
		IpaymuReference:  &trxCode,
		IpaymuExpiry:     ipaymuExpiry,
		IpaymuResponse:   ipaymuRespJSON,

		VoucherCode:     req.VoucherCode,
		VoucherDiscount: req.VoucherDiscount,

		Profit: &profit,

		CreatedByRole: stringPtr("user"),
		RetryCount:    0,

		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := config.DB.Create(&transaction).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	go websocket.BroadcastOrderStatus(orderID)

	// Kirim WA notifikasi pembayaran pending
	if transaction.WaPembeli != "" && transaction.PaymentStatus == "pending" {
		go func(tx models.Transaction) {
			paymentURL := tx.IpaymuPaymentURL
			url := ""
			if paymentURL != nil {
				url = *paymentURL
			}
			err := services.WAService.SendPaymentPendingNotification(&tx, url, tx.IpaymuExpiry)
			if err != nil {
				log.Printf("❌ Gagal kirim WA pending untuk %s: %v", tx.OrderID, err)
			} else {
				config.DB.Model(&tx).UpdateColumn("reminder_count", gorm.Expr("reminder_count + 1"))
			}
		}(transaction)
	}

	c.JSON(200, gin.H{
		"payment_url": paymentURL,
		"order_id":    orderID,
	})
}

func callIpaymuAPI(va, apiKey string, payload map[string]interface{}, path string) (map[string]interface{}, error) {
	jsonData, _ := json.Marshal(payload)

	bodyHash := sha256.Sum256(jsonData)
	bodyHashToString := hex.EncodeToString(bodyHash[:])
	stringToSign := "POST:" + va + ":" + bodyHashToString + ":" + apiKey

	h := hmac.New(sha256.New, []byte(apiKey))
	h.Write([]byte(stringToSign))
	signature := hex.EncodeToString(h.Sum(nil))

	baseURL := "https://sandbox.ipaymu.com/api/v2"
	if os.Getenv("APP_ENV") == "PRODUCTION" {
		baseURL = "https://my.ipaymu.com/api/v2"
	}
	apiURL := baseURL + path

	log.Printf("[iPaymu] URL: %s", apiURL)
	log.Printf("[iPaymu] Payload: %s", string(jsonData))

	httpReq, _ := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("va", va)
	httpReq.Header.Set("signature", signature)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("[iPaymu] HTTP error: %v", err)
		return nil, fmt.Errorf("ipaymu request failed: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	log.Printf("[iPaymu] Response: %d %s", resp.StatusCode, string(body))

	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if resp.StatusCode != 200 {
		msg, _ := result["Message"].(string)
		status, _ := result["Status"].(float64)
		return nil, fmt.Errorf("ipaymu %s: status=%.0f message=%s", path, status, msg)
	}

	data, _ := result["Data"].(map[string]interface{})
	return data, nil
}

func ipaymuGetString(data map[string]interface{}, key string) string {
	if data == nil {
		return ""
	}
	if v, ok := data[key].(string); ok {
		return v
	}
	if n, ok := data[key].(float64); ok {
		return fmt.Sprintf("%.0f", n)
	}
	return ""
}

func mapPaymentChannel(code string) string {
	switch code {
	case "bag":
		return "bag"
	case "bca":
		return "bca"
	case "bni":
		return "bni"
	case "bpd_bali":
		return "bpd_bali"
	case "bri":
		return "bri"
	case "bmi":
		return "bmi"
	case "bsi":
		return "bsi"
	case "mandiri":
		return "mandiri"
	case "permata":
		return "permata"
	case "cimb":
		return "cimb"
	case "danamon":
		return "danamon"
	case "qris":
		return "qris"
	case "gopay":
		return "gopay"
	case "shopeepay":
		return "shopeepay"
	case "dana":
		return "dana"
	case "ovo":
		return "ovo"
	case "alfamart":
		return "alfamart"
	case "indomaret":
		return "indomaret"
	case "kredivo":
		return "kredivo"
	case "akulaku":
		return "akulaku"
	default:
		return ""
	}
}

func formatPhone(phone string) string {
	cleaned := strings.TrimSpace(phone)
	if cleaned == "" {
		return "6281234567890"
	}
	if strings.HasPrefix(cleaned, "0") {
		return "62" + cleaned[1:]
	}
	if strings.HasPrefix(cleaned, "62") {
		return cleaned
	}
	return cleaned
}
