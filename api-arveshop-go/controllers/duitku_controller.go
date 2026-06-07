package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/websocket"
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
)

// ===============================
// HELPER TIME (WIB)
// ===============================
func NowWIB() time.Time {
    wib := time.FixedZone("WIB", 7*60*60)
    return time.Now().In(wib)
}

// ===============================
// REQUEST STRUCT
// ===============================
type CreateTransactionRequest struct {
	ID           uint    `json:"id"`
	ProductName  string  `json:"product_name"`
	ProductType  string  `json:"product_type"`
	BuyerSkuCode string  `json:"buyer_sku_code"`
	UserID       *uint   `json:"user_id"`
	ProductID    *uint   `json:"product_id"`
	SellingPrice  float64         `json:"selling_price"`
	PurchasePrice float64         `json:"purchase_price"`
	Fee           decimal.Decimal `json:"fee"`

	CustomerNo   string `json:"customer_no"`
	CustomerName string `json:"customer_name"`
	WaPembeli    string `json:"wa_pembeli"`
	CustomerNote string `json:"customer_note"`

	PaymentMethodName string `json:"payment_method_name"`
	PaymentType       string `json:"payment_type"`
	PaymentMethodCode string `json:"payment_method_code"`

	IsAdmin   bool   `json:"is_admin"`
	AdminID   uint   `json:"admin_id"`
	AdminNote string `json:"admin_note"`

	CategoryID   *uint  `json:"category_id"`
	CategoryName string `json:"category_name"`
}

// ===============================
// CREATE TRANSACTION DUITKU
// ===============================
// func CreateTransactionDuitku(c *gin.Context) {
// 	var req CreateTransactionRequest
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(400, gin.H{"error": err.Error()})
// 		return
// 	}

// 	log.Printf("📥 Request: %+v", req)

// 	if req.PaymentMethodName == "" {
// 		c.JSON(400, gin.H{"error": "Payment method required"})
// 		return
// 	}

// 	// ===============================
// 	// AMBIL PAYMENT METHOD DARI DB
// 	// ===============================
// 	var paymentMethod models.PaymentMethod
// 	if err := config.DB.Where("name = ? AND is_active = ?", req.PaymentMethodName, true).
// 		First(&paymentMethod).Error; err != nil {
// 		log.Printf("❌ Payment method not found: %s", req.PaymentMethodName)
// 		c.JSON(400, gin.H{"error": "Payment method not found: " + req.PaymentMethodName})
// 		return
// 	}

// 	duitkuCode := paymentMethod.Code

// 	// ===============================
// 	// HITUNG
// 	// ===============================
// 	sellingPrice := decimal.NewFromFloat(req.SellingPrice)
// 	purchasePrice := decimal.NewFromFloat(req.PurchasePrice)
// 	fee := paymentMethod.NominalFee
// 	grossAmount := sellingPrice

// 	// ===============================
// 	// CONFIG
// 	// ===============================
// 	merchantCode := os.Getenv("DUITKU_MERCHANT_CODE")
// 	apiKey := os.Getenv("DUITKU_API_KEY")
// 	appURL := os.Getenv("APP_URL")

// 	orderID := fmt.Sprintf("ORD-%d", time.Now().Unix())

// 	// SIGNATURE
// 	signatureRaw := fmt.Sprintf("%s%s%d%s",
// 		merchantCode,
// 		orderID,
// 		int(grossAmount.IntPart()),
// 		apiKey,
// 	)
// 	hash := md5.Sum([]byte(signatureRaw))
// 	signature := hex.EncodeToString(hash[:])

// 	// ===============================
// 	// PAYLOAD DUITKU
// 	// ===============================
// 	returnURL := appURL + "/history/" + orderID
// 	log.Printf("🔗 Return URL: %s", returnURL)

//     amountInt := grossAmount.Round(0).IntPart()

// payload := map[string]interface{}{
//     "merchantCode":    merchantCode,
//     "paymentAmount":   amountInt,
//     "paymentMethod":   duitkuCode,
//     "merchantOrderId": orderID,
//     "productDetails":  req.ProductName,
//     "email":           "customer@gmail.com",
//     "phoneNumber":     req.WaPembeli,
//     "signature":       signature,
//     "callbackUrl":     "https://api.arveshop.web.id/api/webhook/duitku",
//     "returnUrl":       returnURL,
// }

// 	jsonData, _ := json.Marshal(payload)

// 	duitkuURL := "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry"
// 	if os.Getenv("APP_ENV") == "PRODUCTION" {
// 		duitkuURL = "https://passport.duitku.com/webapi/api/merchant/v2/inquiry"
// 	}

// 	reqHTTP, _ := http.NewRequest("POST", duitkuURL, bytes.NewBuffer(jsonData))
// 	reqHTTP.Header.Set("Content-Type", "application/json")

// 	client := &http.Client{Timeout: 30 * time.Second}
// 	resp, err := client.Do(reqHTTP)
// 	if err != nil {
// 		log.Printf("❌ Duitku request error: %v", err)
// 		c.JSON(500, gin.H{"error": err.Error()})
// 		return
// 	}
// 	defer resp.Body.Close()

// 	body, _ := io.ReadAll(resp.Body)
// 	log.Printf("📨 Duitku response: %s", string(body))

// 	var result map[string]interface{}
// 	json.Unmarshal(body, &result)

// 	if result["statusCode"] != "00" {
// 		c.JSON(400, result)
// 		return
// 	}

// 	// ===============================
// 	// PARSE RESPONSE DUITKU
// 	// ===============================
// 	paymentURL, _ := result["paymentUrl"].(string)
// 	reference, _ := result["reference"].(string)
// 	vaNumber, _ := result["vaNumber"].(string)
// 	qrString, _ := result["qrString"].(string)

// 	paymentCode := reference
// 	if vaNumber != "" {
// 		paymentCode = vaNumber
// 	}

// 	// Parse expiry
// 	var duitkuExpiry *time.Time
// 	if expiryStr, ok := result["expiredDate"].(string); ok && expiryStr != "" {
// 		if t, err := time.Parse("2006-01-02 15:04:05", expiryStr); err == nil {
// 			duitkuExpiry = &t
// 		}
// 	}

// 	// Simpan raw response
// 	duitkuResponseJSON, _ := json.Marshal(result)
// 	profit := sellingPrice.Sub(purchasePrice).Sub(fee)

// 	// ===============================
// 	// SIMPAN TRANSAKSI
// 	// ===============================
// 	now := NowWIB()

// 	transaction := models.Transaction{
// 		// Identitas
// 		OrderID:      orderID,
// 		BuyerSkuCode: req.BuyerSkuCode,
// 		ProductID:    req.ProductID,

// 		// User
// 		UserID: req.UserID,

// 		// Produk & Pelanggan
// 		ProductName:  &req.ProductName,
// 		ProductType:  &req.ProductType,
// 		CustomerNo:   req.CustomerNo,
// 		CustomerName: &req.CustomerName,
// 		WaPembeli:    req.WaPembeli,

// 		// Harga
// 		GrossAmount:   grossAmount,
// 		SellingPrice:  sellingPrice,
// 		PurchasePrice: purchasePrice,
// 		Fee:           fee,

// 		// Payment
// 		PaymentMethodName: &req.PaymentMethodName,
// 		PaymentType:       &req.PaymentType,
// 		PaymentStatus:     "pending",

// 		// Duitku
// 		DuitkuReference:  &reference,
// 		DuitkuVA:         &paymentCode,
// 		DuitkuQRString:   &qrString,
// 		DuitkuPaymentURL: &paymentURL,
// 		DuitkuExpiry:     duitkuExpiry,
// 		DuitkuResponse:   duitkuResponseJSON,

// 		// Security
// 		Signature:     &signature,
// 		ProviderTrxID: &orderID,

// 		// Category
// 		CategoryID:   req.CategoryID,
// 		CategoryName: &req.CategoryName,

// 		// Admin
// 		IsAdmin:   req.IsAdmin,
// 		AdminNote: &req.AdminNote,
// 		Profit: &profit,

// 		// Timestamps
// 		CreatedAt: now,
// 		UpdatedAt: now,
// 	}

// 	if err := config.DB.Create(&transaction).Error; err != nil {
// 		log.Printf("❌ Failed to save transaction: %v", err)
// 		c.JSON(500, gin.H{"error": "Failed to save transaction: " + err.Error()})
// 		return
// 	}

// 	log.Printf("✅ Transaction created: %s", orderID)

// 	c.JSON(200, gin.H{
// 		"payment_url": paymentURL,
// 		"va":          vaNumber,
// 		"qr":          qrString,
// 		"data":        transaction,
// 	})
// }

// ===============================
// CALLBACK DUITKU
// ===============================
func DuitkuCallback(c *gin.Context) {
	merchantCode := c.PostForm("merchantCode")
	amount := c.PostForm("amount")
	orderID := c.PostForm("merchantOrderId")
	resultCode := c.PostForm("resultCode")
	reference := c.PostForm("reference")
	signature := c.PostForm("signature")

	log.Printf("📩 Duitku Webhook received: order=%s result=%s amount=%s", orderID, resultCode, amount)

	apiKey := os.Getenv("DUITKU_API_KEY")

	// =============================
	// VALIDASI SIGNATURE
	// =============================
	raw := fmt.Sprintf("%s%s%s%s", merchantCode, amount, orderID, apiKey)
	hash := md5.Sum([]byte(raw))
	expected := hex.EncodeToString(hash[:])

	if signature != expected {
		log.Printf("❌ Invalid signature for order %s", orderID)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
		return
	}

	// =============================
	// CARI TRANSAKSI
	// =============================
	var trx models.Transaction
	if err := config.DB.Where("order_id = ?", orderID).First(&trx).Error; err != nil {
		log.Printf("❌ Transaction not found: %s", orderID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// =============================
	// VALIDASI AMOUNT
	// =============================
	if trx.GrossAmount.StringFixed(0) != amount {
		log.Printf("❌ Amount mismatch: DB=%s Duitku=%s", trx.GrossAmount.StringFixed(0), amount)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount mismatch"})
		return
	}

	now := NowWIB()

	// =============================
	// MAP STATUS
	// =============================
	var newStatus string

	switch resultCode {
	case "00":
		newStatus = "settlement"
	case "01":
		newStatus = "pending"
	default:
		newStatus = "failure"
	}

	// =============================
	// RESPONSE JSON
	// =============================
	responseMap := map[string]interface{}{
		"merchantCode": merchantCode,
		"amount":       amount,
		"orderID":      orderID,
		"resultCode":   resultCode,
		"reference":    reference,
	}
	jsonData, _ := json.Marshal(responseMap)

	// =============================
	// UPDATE DB
	// =============================
	updateData := map[string]interface{}{
		"payment_status":  newStatus,
		"duitku_response": datatypes.JSON(jsonData),
		"updated_at":      now,
	}

	// Hanya isi paid_at dan transaction_id kalau settlement
	if newStatus == "settlement" {
		updateData["transaction_id"] = reference
		updateData["paid_at"] = now
	}

	if err := config.DB.Model(&models.Transaction{}).
		Where("order_id = ?", orderID).
		Updates(updateData).Error; err != nil {
		log.Printf("❌ Failed update transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB update failed"})
		return
	}

	// =============================
	// AMBIL DATA TERBARU
	// =============================
	var updatedTransaction models.Transaction
	if err := config.DB.Where("order_id = ?", orderID).First(&updatedTransaction).Error; err != nil {
		log.Printf("❌ Failed fetch updated transaction: %v", err)
	}

	// =============================
	// WEBSOCKET BROADCAST
	// =============================
	log.Printf("📢 Broadcasting update for order %s", orderID)
	websocket.BroadcastOrderStatusWithData(orderID, updatedTransaction)

	// =============================
	// TRIGGER DIGIFLAZZ
	// =============================
	if newStatus == "settlement" {
		if updatedTransaction.ProductType != nil {
			switch *updatedTransaction.ProductType {
			case "postpaid":
				log.Printf("📞 Postpaid → bayarTagihan: %s", orderID)
				go bayarTagihan(orderID)
			case "prepaid":
				log.Printf("💎 Prepaid → triggerDigiflazzProcessing: %s", orderID)
				go triggerDigiflazzProcessing(&updatedTransaction)
			default:
				log.Printf("⚠️ Unknown product type → fallback prepaid: %s", orderID)
				go triggerDigiflazzProcessing(&updatedTransaction)
			}
		} else {
			if isPascabayar(updatedTransaction) {
				log.Printf("📞 Fallback Postpaid: %s", orderID)
				go bayarTagihan(orderID)
			} else {
				log.Printf("💎 Fallback Prepaid: %s", orderID)
				go triggerDigiflazzProcessing(&updatedTransaction)
			}
		}
	}

	// =============================
	// RESPONSE KE DUITKU
	// =============================
	c.JSON(http.StatusOK, gin.H{
		"status":  newStatus,
		"message": "Duitku webhook processed",
	})
}

// ===============================
// GET PAYMENT METHOD + INSERT DB
// ===============================
func GetPaymentMethodDuitku(c *gin.Context) {
	merchantCode := os.Getenv("DUITKU_MERCHANT_CODE")
	apiKey := os.Getenv("DUITKU_API_KEY")

	if merchantCode == "" || apiKey == "" {
		c.JSON(500, gin.H{"error": "Env Duitku belum diset"})
		return
	}

	amount := 10000
	datetime := time.Now().Format("2006-01-02 15:04:05")

	raw := fmt.Sprintf("%s%d%s%s", merchantCode, amount, datetime, apiKey)
	hash := sha256.Sum256([]byte(raw))
	signature := hex.EncodeToString(hash[:])

	payload := map[string]interface{}{
		"merchantcode": merchantCode,
		"amount":       amount,
		"datetime":     datetime,
		"signature":    signature,
	}

	jsonData, _ := json.Marshal(payload)

	duitkuURL := "https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod"
	if os.Getenv("APP_ENV") == "PRODUCTION" {
		duitkuURL = "https://passport.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod"
	}

	req, _ := http.NewRequest("POST", duitkuURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if result["responseCode"] != "00" {
		c.JSON(400, gin.H{
			"error":   "Duitku error",
			"message": result["responseMessage"],
		})
		return
	}

	methods, ok := result["paymentFee"].([]interface{})
	if !ok {
		c.JSON(500, gin.H{"error": "Format response tidak valid"})
		return
	}

	for _, m := range methods {
		item := m.(map[string]interface{})

		code := item["paymentMethod"].(string)
		name := item["paymentName"].(string)
		logo := item["paymentImage"].(string)

		// ==============================================
		// INI AJA ANJING, SIMPEL
		// ==============================================
		var nominalFee decimal.Decimal = decimal.Zero
		var percentFee float64 = 0
		feeType := "flat"

		// Cek format totalFee
		if totalFee, ok := item["totalFee"]; ok {
			// Kalau string -> flat fee
			if str, ok := totalFee.(string); ok {
				nominalFee, _ = decimal.NewFromString(str)
				feeType = "flat"
			}
			
			// Kalau object -> cek flat & percent
			if obj, ok := totalFee.(map[string]interface{}); ok {
				// Ambil flat
				if flat, ok := obj["flat"]; ok {
					switch v := flat.(type) {
					case float64:
						nominalFee = decimal.NewFromFloat(v)
					case string:
						nominalFee, _ = decimal.NewFromString(v)
					}
				}
				
				// Ambil percent
				if percent, ok := obj["percent"]; ok {
					switch v := percent.(type) {
					case float64:
						percentFee = v
					case string:
						percentFee, _ = strconv.ParseFloat(v, 64)
					}
				}
				
				// Tentukan fee type
				if nominalFee.GreaterThan(decimal.Zero) && percentFee > 0 {
					feeType = "mixed"
				} else if percentFee > 0 {
					feeType = "percentage"
				} else {
					feeType = "flat"
				}
			}
		}

		methodType := mapPaymentType(code)

		var pm models.PaymentMethod
		err := config.DB.Where("code = ?", code).First(&pm).Error

		if err != nil {
			// Create baru
			pm = models.PaymentMethod{
				Code:          code,
				Name:          name,
				Type:          methodType,
				NominalFee:    nominalFee,
				PercentageFee: percentFee,
				FeeType:       feeType,
				IsActive:      true,
				Logo:          logo,
			}
			config.DB.Create(&pm)
		} else {
			// Update
			pm.Name = name
			pm.Type = methodType
			pm.NominalFee = nominalFee
			pm.PercentageFee = percentFee
			pm.FeeType = feeType
			pm.IsActive = true
			pm.Logo = logo
			config.DB.Save(&pm)
		}
	}

	c.JSON(200, gin.H{
		"message": "Berhasil sync payment method",
		"data":    result,
	})
}

func mapPaymentType(code string) string {
	switch code {
	case "BC", "BR", "M2", "BT", "I1", "B1", "A1", "AG", "BV", "NC":
		return "bank_transfer"
	case "OV", "SA", "DA", "LA", "OL":
		return "ewallet"
	case "SP", "LQ", "NQ", "GQ":
		return "qris"
	case "VC":
		return "cc"
	case "FT", "IR":
		return "cstore"
	default:
		return "other"
	}
}