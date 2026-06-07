package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"strconv"

	"github.com/gin-gonic/gin"
)

func calculateMarginByCategory(
	price uint,
	category string,
	productType string,
	admin uint,
	commission uint,
) uint {

	if price == 0 {
		return 0
	}

	// =========================
	// POSTPAID
	// =========================
	if productType == "postpaid" {

		// fee tambahan
		serviceFee := uint(1000)

		finalPrice := price + admin + serviceFee

		return finalPrice
	}

	// =========================
	// PREPAID
	// =========================

	categoryLower := strings.ToLower(category)

	var marginPercentage float64

	if strings.Contains(categoryLower, "game") {

		marginPercentage = 0.04

	} else if strings.Contains(categoryLower, "pulsa") {

		marginPercentage = 0.02

	} else if strings.Contains(categoryLower, "data") {

		marginPercentage = 0.02

	} else if strings.Contains(categoryLower, "pln") {

		marginPercentage = 0.05

	} else {

		marginPercentage = 0.03
	}

	sellingPrice := float64(price) * (1 + marginPercentage)

	var roundedPrice uint

	if sellingPrice < 10000 {

		roundedPrice = uint(math.Ceil(sellingPrice/100) * 100)

	} else if sellingPrice < 50000 {

		roundedPrice = uint(math.Ceil(sellingPrice/500) * 500)

	} else {

		roundedPrice = uint(math.Ceil(sellingPrice/1000) * 1000)
	}

	return roundedPrice
}

func GetProducts(c *gin.Context) {
	apiURL := "https://api.digiflazz.com/v1/price-list"
	username := os.Getenv("DIGIFLAZZ_USERNAME")
	apiKey := os.Getenv("DIGIFLAZZ_PROD_KEY")

	sign := md5Hash(username + apiKey + "pricelist")

	payload := map[string]interface{}{
		"cmd":      "prepaid",
		"username": username,
		"sign":     sign,
	}

	jsonData, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed create request"})
		return
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed call Digiflazz"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		c.JSON(500, gin.H{
			"error":  "Digiflazz error",
			"body":   string(body),
			"status": resp.StatusCode,
		})
		return
	}

	var responseData map[string]interface{}
	if err := json.Unmarshal(body, &responseData); err != nil {
		c.JSON(500, gin.H{"error": "Invalid JSON response"})
		return
	}

	data, ok := responseData["data"].([]interface{})
	if !ok {
		c.JSON(500, gin.H{
			"error":    "Invalid API response structure",
			"response": responseData,
		})
		return
	}

	for _, item := range data {
		product, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		buyerSkuCode := getString(product, "buyer_sku_code")
		productName := getString(product, "product_name")

		if buyerSkuCode == "" || productName == "" {
			continue
		}

		slug := slugify(getString(product, "brand"))
		category := getString(product, "category")
		
		// Ambil harga dasar dari Digiflazz (konversi ke uint)
		basePrice := uint(getUint(product["price"]))
		
		// Hitung selling price dengan margin berdasarkan kategori
		sellingPrice := calculateMarginByCategory(
	basePrice,
	category,
	"prepaid",
	0,
	0,
)
		

		startCutOff := getString(product, "start_cut_off")
		endCutOff := getString(product, "end_cut_off")

		var existing models.Product
		err := config.DB.Where("buyer_sku_code = ?", buyerSkuCode).First(&existing).Error

		if err == nil {
			// UPDATE
			updates := map[string]interface{}{
				"product_name":           productName,
				"slug":                   slug,
				"category":               category,
				"brand":                  getString(product, "brand"),
				"type":                   getString(product, "type"),
				"product_type":           "prepaid",
				"seller_name":            getString(product, "seller_name"),
				"price":                  int64(basePrice),
				"selling_price":          int64(sellingPrice),
				"buyer_sku_code":         buyerSkuCode,
				"buyer_product_status":   getBool(product, "buyer_product_status", true),
				"seller_product_status":  getBool(product, "seller_product_status", true),
				"unlimited_stock":        getBool(product, "unlimited_stock", false),
				"multi":                  getBool(product, "multi", false),
				"stock":                  getString(product, "stock"),
				"start_cut_off":          startCutOff,
				"end_cut_off":            endCutOff,
				"description":            getString(product, "desc"),
				"updated_at":             time.Now(),
			}

			if err := config.DB.Model(&existing).Updates(updates).Error; err != nil {
				log.Printf("Gagal update: %v", err)
			}

		} else {
			// CREATE
			newProduct := models.Product{
				ProductName:         productName,
				Slug:                slug,
				Category:            category,
				Brand:               getString(product, "brand"),
				Type:                getString(product, "type"),
				ProductType:         "prepaid",
				SellerName:          getString(product, "seller_name"),
				Price:               int64(basePrice),
				SellingPrice:        int64(sellingPrice),
				BuyerSkuCode:        buyerSkuCode,
				BuyerProductStatus:  getBool(product, "buyer_product_status", true),
				SellerProductStatus: getBool(product, "seller_product_status", true),
				UnlimitedStock:      getBool(product, "unlimited_stock", false),
				Multi:               getBool(product, "multi", false),
				Stock:               getString(product, "stock"),
				StartCutOff:         startCutOff,
				EndCutOff:           endCutOff,
				Description:         getString(product, "desc"),
				CreatedAt:           time.Now(),
				UpdatedAt:           time.Now(),
			}

			if err := config.DB.Create(&newProduct).Error; err != nil {
				log.Printf("Gagal create: %v", err)
			}
		}
	}

	c.JSON(200, responseData)
}

func GetProductsPasca(c *gin.Context) {
	apiURL := "https://api.digiflazz.com/v1/price-list"
	username := os.Getenv("DIGIFLAZZ_USERNAME")
	apiKey := os.Getenv("DIGIFLAZZ_PROD_KEY")

	sign := md5Hash(username + apiKey + "pricelist")

	payload := map[string]interface{}{
		"cmd":      "pasca",
		"username": username,
		"sign":     sign,
	}

	jsonData, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed call Digiflazz"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var responseData map[string]interface{}
	json.Unmarshal(body, &responseData)

	data, ok := responseData["data"].([]interface{})
	if !ok {
		c.JSON(500, gin.H{"error": "Invalid API structure"})
		return
	}

	for _, item := range data {
		product, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		buyerSkuCode, _ := product["buyer_sku_code"].(string)
		productName, _ := product["product_name"].(string)

		if buyerSkuCode == "" || productName == "" {
			continue
		}

		slug := slugify(getString(product, "brand"))
		category := getString(product, "category")
		basePrice := uint(getUint(product["price"]))
		
		// Hitung selling price dengan margin untuk pascabayar
		admin := uint(getUint(product["admin"]))
commission := uint(getUint(product["commission"]))

sellingPrice := calculateMarginByCategory(
	basePrice,
	category,
	"postpaid",
	admin,
	commission,
)

		var existing models.Product
		err := config.DB.Where("buyer_sku_code = ?", buyerSkuCode).First(&existing).Error

		if err == nil {
			// UPDATE
			config.DB.Model(&existing).Updates(models.Product{
				ProductName:  productName,
				Slug:         slug,
				Category:     category,
				Brand:        getString(product, "brand"),
				ProductType:  "postpaid",
				SellerName:   getString(product, "seller_name"),
				SellingPrice: int64(sellingPrice),
				Price:        int64(basePrice),
				Admin:        int64(getUint(product["admin"])),
				Commission:   int64(getUint(product["commission"])),
				UpdatedAt:    time.Now(),
			})
		} else {
			// CREATE
			newProduct := models.Product{
				BuyerSkuCode: buyerSkuCode,
				ProductName:  productName,
				Slug:         slug,
				Category:     category,
				Brand:        getString(product, "brand"),
				ProductType:  "postpaid",
				SellerName:   getString(product, "seller_name"),
				SellingPrice: int64(sellingPrice),
				Price:        int64(basePrice),
				Admin:        int64(getUint(product["admin"])),
				Commission:   int64(getUint(product["commission"])),
			}
			config.DB.Create(&newProduct)
		}
	}

	c.JSON(200, responseData)
}

// Fungsi untuk menghitung margin berdasarkan kategori utama
// func calculateMarginByCategory(price uint, category string, productType string) uint {
// 	if price == 0 {
// 		return 0
// 	}

// 	// Normalisasi category ke lowercase untuk memudahkan pengecekan
// 	categoryLower := strings.ToLower(category)
	
// 	// Konfigurasi margin berdasarkan kategori utama (dalam persen)
// 	var marginPercentage float64
	
// 	// Cek kategori Games
// 	if strings.Contains(categoryLower, "game") || 
// 	   strings.Contains(categoryLower, "voucher game") ||
// 	   strings.Contains(categoryLower, "free fire") ||
// 	   strings.Contains(categoryLower, "mobile legends") ||
// 	   strings.Contains(categoryLower, "pubg") ||
// 	   strings.Contains(categoryLower, "valorant") ||
// 	   strings.Contains(categoryLower, "garena") ||
// 	   strings.Contains(categoryLower, "steam") ||
// 	   strings.Contains(categoryLower, "google play") ||
// 	   strings.Contains(categoryLower, "playstation") ||
// 	   strings.Contains(categoryLower, "xbox") ||
// 	   strings.Contains(categoryLower, "nintendo") {
// 		marginPercentage = 0.04 // 4% untuk Games
// 	} else if strings.Contains(categoryLower, "pulsa") {
// 		// Kategori Pulsa
// 		marginPercentage = 0.02 // 2% untuk Pulsa
// 	} else if strings.Contains(categoryLower, "data") || 
// 			  strings.Contains(categoryLower, "paket data") ||
// 			  strings.Contains(categoryLower, "internet") {
// 		// Kategori Data/Internet
// 		marginPercentage = 0.02 // 2% untuk Paket Data
// 	} else if strings.Contains(categoryLower, "pln") || 
// 			  strings.Contains(categoryLower, "listrik") ||
// 			  strings.Contains(categoryLower, "token") {
// 		// Kategori PLN/Token Listrik
// 		marginPercentage = 0.05 // 5% untuk PLN
// 	} else if strings.Contains(categoryLower, "ovo") ||
// 			  strings.Contains(categoryLower, "gopay") ||
// 			  strings.Contains(categoryLower, "dana") ||
// 			  strings.Contains(categoryLower, "linkaja") ||
// 			  strings.Contains(categoryLower, "emoney") ||
// 			  strings.Contains(categoryLower, "e-money") {
// 		// Kategori E-Money
// 		marginPercentage = 0.02 // 2% untuk E-Money
// 	} else if strings.Contains(categoryLower, "grab") ||
// 			  strings.Contains(categoryLower, "gofood") ||
// 			  strings.Contains(categoryLower, "voucher makanan") {
// 		// Kategori Voucher Makanan
// 		marginPercentage = 0.03 // 3% untuk Voucher Makanan
// 	} else if productType == "postpaid" {
// 		// Kategori Pascabayar (BPJS, PDAM, Telkom, dll)
// 		marginPercentage = 0.07 // 7% untuk Pascabayar
// 	} else {
// 		// Default untuk kategori lain
// 		marginPercentage = 0.03 // 3% default
// 	}
	
// 	// Hitung harga jual
// 	sellingPrice := float64(price) * (1 + marginPercentage)
	
	
// 	// Pembulatan ke atas berdasarkan nominal
// 	var roundedPrice uint
// 	if sellingPrice < 10000 {
// 		// Untuk nominal kecil, bulatkan ke kelipatan 100
// 		roundedPrice = uint(math.Ceil(sellingPrice/100) * 100)
// 	} else if sellingPrice < 50000 {
// 		// Untuk nominal menengah, bulatkan ke kelipatan 500
// 		roundedPrice = uint(math.Ceil(sellingPrice/500) * 500)
// 	} else {
// 		// Untuk nominal besar, bulatkan ke kelipatan 1000
// 		roundedPrice = uint(math.Ceil(sellingPrice/1000) * 1000)
// 	}
	
// 	return roundedPrice
// }


func getBool(data map[string]interface{}, key string, defaultValue bool) bool {
    // Cek apakah key ada dan tidak nil
    if val, ok := data[key]; ok && val != nil {
        // Coba konversi ke bool
        if b, ok := val.(bool); ok {
            return b
        }
        
        // Coba konversi dari string
        if str, ok := val.(string); ok {
            strLower := strings.ToLower(str)
            switch strLower {
            case "true", "1", "yes", "aktif", "on":
                return true
            case "false", "0", "no", "tidak", "off":
                return false
            }
        }
        
        // Coba konversi dari number
        if num, ok := val.(float64); ok {
            return num != 0
        }
        if num, ok := val.(int); ok {
            return num != 0
        }
        if num, ok := val.(int64); ok {
            return num != 0
        }
    }
    
    // Jika tidak ada atau tidak valid, kembalikan defaultValue
    return defaultValue
}

func md5Hash(text string) string {
	hash := md5.Sum([]byte(text))
	return hex.EncodeToString(hash[:])
}

func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key].(string); ok {
		return val
	}
	return ""
}

func getUint(val interface{}) int64 {
	switch v := val.(type) {
	case float64:
		return int64(v)
	case int:
		return int64(v)
	case string:
		parsed, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			return 0
		}
		return parsed
	default:
		return 0
	}
}



func slugify(text string) string {
	s := strings.ToLower(text)
	s = strings.ReplaceAll(s, " ", "-")
	return s
}



// Request dari frontend
type PLNInquiryRequest struct {
	CustomerNo string `json:"customer_no" binding:"required"`
}

// Payload ke Digiflazz
type DigiflazzPLNPayload struct {
	Username   string `json:"username"`
	CustomerNo string `json:"customer_no"`
	Sign       string `json:"sign"`
}

// Response dari Digiflazz
type DigiflazzPLNResponse struct {
	Data struct {
		Message      string `json:"message"`
		Status       string `json:"status"`
		Rc           string `json:"rc"`
		CustomerNo   string `json:"customer_no"`
		MeterNo      string `json:"meter_no"`
		SubscriberID string `json:"subscriber_id"`
		Name         string `json:"name"`
		SegmentPower string `json:"segment_power"`
	} `json:"data"`
}

// Response ke frontend
type PLNInquiryResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	Name         string `json:"name,omitempty"`
	CustomerNo   string `json:"customer_no,omitempty"`
	MeterNo      string `json:"meter_no,omitempty"`
	SubscriberID string `json:"subscriber_id,omitempty"`
	SegmentPower string `json:"segment_power,omitempty"`
}

// =============================================
// HTTP CLIENT
// =============================================

var httpClient = &http.Client{
	Timeout: 15 * time.Second,
}

// =============================================
// GENERATE SIGN MD5
// Format: MD5(username + api_key + customer_no)
// =============================================

func generatePLNSign(username, apiKey, customerNo string) string {
	raw := username + apiKey + customerNo
	hash := md5.Sum([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// =============================================
// HANDLER: POST /api/inquiry-pln
// =============================================

func HandlePLNInquiry(c *gin.Context) {
	var req PLNInquiryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, PLNInquiryResponse{
			Success: false,
			Message: "customer_no wajib diisi",
		})
		return
	}

	// Ambil dari env
	username := os.Getenv("DIGIFLAZZ_USERNAME")
	apiKey := os.Getenv("DIGIFLAZZ_PROD_KEY")

	if username == "" || apiKey == "" {
		c.JSON(http.StatusInternalServerError, PLNInquiryResponse{
			Success: false,
			Message: "Konfigurasi server tidak lengkap",
		})
		return
	}

	// Bersihkan customer_no (hapus spasi)
	customerNo := strings.TrimSpace(req.CustomerNo)

	// Generate sign
	sign := generatePLNSign(username, apiKey, customerNo)

	// Build payload
	payload := DigiflazzPLNPayload{
		Username:   username,
		CustomerNo: customerNo,
		Sign:       sign,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, PLNInquiryResponse{
			Success: false,
			Message: "Gagal memproses request",
		})
		return
	}

	// Hit Digiflazz
	digiURL := "https://api.digiflazz.com/v1/inquiry-pln"
	httpReq, err := http.NewRequest("POST", digiURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, PLNInquiryResponse{
			Success: false,
			Message: "Gagal membuat request ke Digiflazz",
		})
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, PLNInquiryResponse{
			Success: false,
			Message: "Gagal menghubungi server Digiflazz",
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, PLNInquiryResponse{
			Success: false,
			Message: "Gagal membaca response",
		})
		return
	}

	// Parse response Digiflazz
	var digiResp DigiflazzPLNResponse
	if err := json.Unmarshal(body, &digiResp); err != nil {
		c.JSON(http.StatusInternalServerError, PLNInquiryResponse{
			Success: false,
			Message: "Gagal memproses response Digiflazz",
		})
		return
	}

    log.Printf("[Digiflazz RAW] Status: %d | Body: %s", resp.StatusCode, string(body))
// log.Printf("[Digiflazz PARSED] Status: %s | RC: %s | Name: %s | CustomerNo: %s",
//     digiResp.Data.Status,
//     digiResp.Data.Rc,
//     digiResp.Data.Name,
    // digiResp.Data.CustomerNo,
// )

	// Cek status dari Digiflazz
	if digiResp.Data.Status != "Sukses" || digiResp.Data.Rc != "00" {
		c.JSON(http.StatusOK, PLNInquiryResponse{
			Success: false,
			Message: "Nomor PLN tidak ditemukan. Periksa kembali nomor meter/ID pelanggan.",
		})
		return
	}

	// Sukses — kembalikan data ke frontend
	c.JSON(http.StatusOK, PLNInquiryResponse{
		Success:      true,
		Message:      "Data pelanggan ditemukan",
		Name:         digiResp.Data.Name,
		CustomerNo:   digiResp.Data.CustomerNo,
		MeterNo:      digiResp.Data.MeterNo,
		SubscriberID: digiResp.Data.SubscriberID,
		SegmentPower: digiResp.Data.SegmentPower,
	})
}