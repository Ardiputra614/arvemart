package services

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
)

func slugifySlug(text string) string {
	s := strings.ToLower(text)
	s = strings.ReplaceAll(s, " ", "-")
	return s
}

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

		serviceFee := uint(1000)

		return price + admin + serviceFee
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

type DigiflazzPriceListResponse struct {
	Data []struct {
		ProductName string `json:"product_name"`
		Category    string `json:"category"`
		Brand       string `json:"brand"`
		Type        string `json:"type"`
		SellerName  string `json:"seller_name"`

		Price int `json:"price"`

		BuyerSKUCode string `json:"buyer_sku_code"`

		BuyerProductStatus  bool `json:"buyer_product_status"`
		SellerProductStatus bool `json:"seller_product_status"`

		UnlimitedStock bool   `json:"unlimited_stock"`
		Stock          int    `json:"stock"`
		Multi          bool   `json:"multi"`
		StartCutOff    string `json:"start_cut_off"`
		EndCutOff      string `json:"end_cut_off"`
		Desc           string `json:"desc"`

		Admin      int `json:"admin"`
		Commission int `json:"commission"`
	}
}

func GetDigiflazzPriceList(cmd string) (*DigiflazzPriceListResponse, error) {

	username := os.Getenv("DIGIFLAZZ_USERNAME")
	apiKey := os.Getenv("DIGIFLAZZ_PROD_KEY")

	signData := username + apiKey + "pricelist"

	hash := md5.Sum([]byte(signData))
	sign := hex.EncodeToString(hash[:])

	payload := map[string]interface{}{
		"cmd":      cmd,
		"username": username,
		"sign":     sign,
	}

	jsonPayload, _ := json.Marshal(payload)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest(
		"POST",
		"https://api.digiflazz.com/v1/price-list",
		bytes.NewBuffer(jsonPayload),
	)

	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	log.Printf("DIGIFLAZZ RAW RESPONSE: %s", string(body))

	// =========================
	// PARSE FLEXIBLE
	// =========================

	var raw map[string]interface{}

	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	dataRaw, ok := raw["data"]

	if !ok {
		return nil, fmt.Errorf("data field tidak ditemukan")
	}

	// pastikan data array
	dataArray, ok := dataRaw.([]interface{})

	if !ok {
		return nil, fmt.Errorf("data bukan array: %v", dataRaw)
	}

	// marshal ulang array
	dataBytes, _ := json.Marshal(dataArray)

	var items []struct {
		ProductName string `json:"product_name"`
		Category    string `json:"category"`
		Brand       string `json:"brand"`
		Type        string `json:"type"`
		SellerName  string `json:"seller_name"`

		Price int `json:"price"`

		BuyerSKUCode string `json:"buyer_sku_code"`

		BuyerProductStatus  bool `json:"buyer_product_status"`
		SellerProductStatus bool `json:"seller_product_status"`

		UnlimitedStock bool   `json:"unlimited_stock"`
		Stock          int    `json:"stock"`
		Multi          bool   `json:"multi"`
		StartCutOff    string `json:"start_cut_off"`
		EndCutOff      string `json:"end_cut_off"`
		Desc           string `json:"desc"`

		Admin      int `json:"admin"`
		Commission int `json:"commission"`
	}

	if err := json.Unmarshal(dataBytes, &items); err != nil {
		return nil, err
	}

	result := &DigiflazzPriceListResponse{
		Data: items,
	}

	return result, nil
}

func sendProductDownNotification(
	adminPhone string,
	item struct {
		ProductName string `json:"product_name"`
		Category    string `json:"category"`
		Brand       string `json:"brand"`
		Type        string `json:"type"`
		SellerName  string `json:"seller_name"`

		Price int `json:"price"`

		BuyerSKUCode string `json:"buyer_sku_code"`

		BuyerProductStatus  bool `json:"buyer_product_status"`
		SellerProductStatus bool `json:"seller_product_status"`

		UnlimitedStock bool   `json:"unlimited_stock"`
		Stock          int    `json:"stock"`
		Multi          bool   `json:"multi"`
		StartCutOff    string `json:"start_cut_off"`
		EndCutOff      string `json:"end_cut_off"`
		Desc           string `json:"desc"`

		Admin      int `json:"admin"`
		Commission int `json:"commission"`
	},
	productType string,
) {

	if adminPhone == "" {
		return
	}

	message := fmt.Sprintf(`⚠️ PRODUK DIGIFLAZZ GANGGUAN

Produk: %s
SKU: %s
Type: %s

Buyer Status: %t
Seller Status: %t

Silakan cek dashboard Digiflazz:
https://dashboard.digiflazz.com`,
		item.ProductName,
		item.BuyerSKUCode,
		productType,
		item.BuyerProductStatus,
		item.SellerProductStatus,
	)

	if err := WAService.SendNotification(adminPhone, message); err != nil {

		log.Printf("❌ Gagal kirim notif WA produk gangguan: %v", err)

	} else {

		log.Printf("✅ Notifikasi WA produk gangguan terkirim: %s", item.BuyerSKUCode)
	}
}

func SyncDigiflazzProducts(cmd string) {

	log.Println("====================================")
	log.Println("SYNC DIGIFLAZZ START:", cmd)
	log.Println("====================================")

	adminPhone := os.Getenv("WA_ADMIN")

	result, err := GetDigiflazzPriceList(cmd)

	if err != nil {

		log.Printf("❌ Sync gagal: %v", err)

		if adminPhone != "" {

			message := fmt.Sprintf(`❌ SYNC DIGIFLAZZ GAGAL

Type: %s

Error:
%s

Cek server atau Digiflazz sekarang.`, cmd, err.Error())

			if err := WAService.SendNotification(adminPhone, message); err != nil {

				log.Printf("❌ Gagal kirim notif WA sync gagal: %v", err)

			} else {

				log.Printf("✅ Notifikasi WA sync gagal terkirim")
			}
		}

		return
	}

	for _, item := range result.Data {

		var product models.Product

		err := config.DB.
			Where("buyer_sku_code = ?", item.BuyerSKUCode).
			First(&product).Error

		basePrice := uint(item.Price)

		productType := "prepaid"

		if cmd == "pasca" {
			productType = "postpaid"
		}

		sellingPrice := calculateMarginByCategory(
			basePrice,
			item.Category,
			productType,
			uint(item.Admin),
			uint(item.Commission),
		)

		// =========================
		// NOTIF PRODUK GANGGUAN
		// =========================

		if !item.BuyerProductStatus || !item.SellerProductStatus {

			sendProductDownNotification(
				adminPhone,
				item,
				productType,
			)
		}

		// =========================
		// INSERT BARU
		// =========================

		if err != nil {

			newProduct := models.Product{
				ProductName: item.ProductName,

				Slug: slugifySlug(item.Brand),

				Category: item.Category,
				Brand:    item.Brand,
				Type:     item.Type,

				ProductType: productType,

				SellerName: item.SellerName,

				BuyerSkuCode: item.BuyerSKUCode,

				BuyerProductStatus:  item.BuyerProductStatus,
				SellerProductStatus: item.SellerProductStatus,

				UnlimitedStock: item.UnlimitedStock,
				Multi:          item.Multi,

				Stock: fmt.Sprintf("%d", item.Stock),

				StartCutOff: item.StartCutOff,
				EndCutOff:   item.EndCutOff,

				Description: item.Desc,

				Provider: "digiflazz",

				IsActive:      true,
				RetryCount:    0,
				MaxRetry:      3,
				RetryInterval: 5,

				Price:         int64(basePrice),
				SellingPrice: int64(sellingPrice),
			}

			// postpaid
			if cmd == "pasca" {

				newProduct.Admin = int64(item.Admin)
				newProduct.Commission = int64(item.Commission)
			}

			if err := config.DB.Create(&newProduct).Error; err != nil {

				log.Printf("❌ Gagal create product %s: %v", item.BuyerSKUCode, err)

			} else {

				log.Printf("✅ Product baru dibuat: %s", item.BuyerSKUCode)
			}

			continue
		}

		// =========================
		// UPDATE
		// =========================

		updates := map[string]interface{}{
			"buyer_product_status":  item.BuyerProductStatus,
			"seller_product_status": item.SellerProductStatus,

			"price":         int64(basePrice),
			"selling_price": int64(sellingPrice),

			"updated_at": time.Now(),
		}

		if cmd == "pasca" {

			updates["admin"] = int64(item.Admin)
			updates["commission"] = int64(item.Commission)
		}

		if err := config.DB.Model(&product).Updates(updates).Error; err != nil {

			log.Printf("❌ Gagal update product %s: %v", item.BuyerSKUCode, err)

		} else {

			log.Printf("✅ Product updated: %s", item.BuyerSKUCode)
		}
	}

	log.Println("====================================")
	log.Println("SYNC DIGIFLAZZ FINISHED:", cmd)
	log.Println("====================================")
}