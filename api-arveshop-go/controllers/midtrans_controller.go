package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/websocket"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"net/http"

	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	// "gorm.io/datatypes"
)

func ExpireTransaction(c *gin.Context) {
    orderID := c.Param("orderid")

    // Validasi user (pastikan user yang punya transaksi ini)
    // userID, exists := c.Get("user_id")
    // if !exists {
    //     c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
    //     return
    // }

    // Cari transaksi
    var transaction models.Transaction
    if err := config.DB.Where("order_id = ?", orderID).First(&transaction).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Transaksi tidak ditemukan"})
        return
    }

    // Cek kalau masih pending
    if transaction.PaymentStatus != "pending" {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Transaksi sudah tidak pending",
            "current_status": transaction.PaymentStatus,
        })
        return
    }

    // Cek expiry time dari Midtrans
    // if transaction.MidtransResponse != nil {
    //     var midtransResp map[string]interface{}
    //     if err := json.Unmarshal(transaction.MidtransResponse, &midtransResp); err == nil {
    //         if expiryStr, ok := midtransResp["expiry_time"].(string); ok {
    //             expiryTime, err := time.Parse(time.RFC3339, expiryStr)
    //             if err == nil && time.Now().Before(expiryTime) {
    //                 c.JSON(http.StatusBadRequest, gin.H{
    //                     "error": "Waktu pembayaran belum habis",
    //                     "expiry_time": expiryTime,
    //                 })
    //                 return
    //             }
    //         }
    //     }
    // }

    // Update status jadi expired
    transaction.PaymentStatus = "expired"
	transaction.DigiflazzStatus = stringPtr("Gagal")
    transaction.StatusMessage = stringPtr("Pembayaran kadaluarsa")

    if err := config.DB.Save(&transaction).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status"})
        return
    }

    // Broadcast via WebSocket kalau ada
    // ws.BroadcastOrderUpdate(orderID, transaction)
	websocket.BroadcastOrderStatus(orderID)

    c.JSON(http.StatusOK, gin.H{
        "message": "Transaksi expired",
        "order_id": orderID,
        "payment_status": "expired",
		"digiflazz_status": "Gagal",
    })
}

// func CreateTransaction(c *gin.Context) {
//    var req CreateTransactionRequest
// if err := c.ShouldBindJSON(&req); err != nil {
//     c.JSON(http.StatusBadRequest, gin.H{
//         "error": "Invalid request format: " + err.Error(),
//     })
//     return
// }

//     // CEK CUT OFF PRODUK SEBELUM MEMBUAT TRANSAKSI
//     if req.ID > 0 {
//         var product models.Product
//         if err := config.DB.First(&product, req.ID).Error; err == nil {
//             if product.IsWithinCutoff() {
//                 nextAvailable := product.GetNextAvailableTime()

//                 c.JSON(http.StatusBadRequest, gin.H{
//                     "error": "Produk sedang dalam masa cut off",
//                     "cut_off": gin.H{
//                         "start": product.StartCutOff,
//                         "end":   product.EndCutOff,
//                         "next_available": nextAvailable,
//                     },
//                     "message": fmt.Sprintf("Produk %s sedang cut off (%s - %s). Tersedia kembali setelah %s",
//                         product.ProductName, product.StartCutOff, product.EndCutOff,
//                         nextAvailable.Format("02/01/2006 15:04")),
//                 })
//                 return
//             }
//         }
//     }

//     // ===============================
//     // VALIDASI BASIC
//     // ===============================
//     if req.ID == 0 {
//         c.JSON(http.StatusBadRequest, gin.H{"error": "Product ID is required"})
//         return
//     }
//     if req.ProductName == "" {
//         c.JSON(http.StatusBadRequest, gin.H{"error": "Product name is required"})
//         return
//     }
//     if req.CustomerNo == "" {
//         c.JSON(http.StatusBadRequest, gin.H{"error": "Customer number is required"})
//         return
//     }
//     if req.WaPembeli == "" {
//         c.JSON(http.StatusBadRequest, gin.H{"error": "WhatsApp number is required"})
//         return
//     }
//     if req.PaymentMethodName == "" {
//         c.JSON(http.StatusBadRequest, gin.H{"error": "Payment method is required"})
//         return
//     }

//     // ===============================
//     // INIT & DECIMAL CONVERSION
//     // ===============================
//     sellingPrice := decimal.NewFromFloat(req.SellingPrice)
//     fee := req.Fee
//     purchasePrice := decimal.NewFromFloat(req.PurchasePrice)

//     // Hitung gross amount dan profit
//     grossAmount := sellingPrice.Add(fee)
//     profit := sellingPrice.Sub(purchasePrice).Sub(fee)

//     // Hitung profit margin (jika selling price > 0)
//     var profitMargin *float64
//     if sellingPrice.GreaterThan(decimal.Zero) {
//         margin := profit.Div(sellingPrice).Mul(decimal.NewFromInt(100))
//         marginFloat, _ := margin.Float64()
//         profitMargin = &marginFloat
//     }

//     // Generate Order ID
//     orderID := fmt.Sprintf("ORD-%s-%d",
//         time.Now().Format("20060102150405"),
//         rand.Intn(9000)+1000,
//     )

// 	// Cek semua value di context (c.Keys adalah map)
//     for key, value := range c.Keys {
//         slog.Info("Context key", "key", key, "value", value, "type", fmt.Sprintf("%T", value))
//     }

//     // ===============================
//     // ITEM DETAILS UNTUK MIDTRANS
//     // ===============================
//     itemDetails := []map[string]interface{}{
//         {
//             "id":       fmt.Sprintf("%d", req.ID),
//             "price":    int(sellingPrice.IntPart()),
//             "quantity": 1,
//             "name":     req.ProductName,
//         },
//     }

//     if fee.GreaterThan(decimal.Zero) {
//         itemDetails = append(itemDetails, map[string]interface{}{
//             "id":       "fee",
//             "price":    int(fee.IntPart()),
//             "quantity": 1,
//             "name":     "Biaya Admin",
//         })
//     }

//     // ===============================
//     // HANDLE ADMIN TOPUP (CASH)
//     // ===============================
//     if req.IsAdmin {
//         // Admin topup langsung sukses, tanpa Midtrans
//         handleAdminTopup(c, req, sellingPrice, fee, purchasePrice, grossAmount, profit, profitMargin, orderID)
//         return
//     }

//     // ===============================
//     // PAYMENT TYPE LOGIC (MIDTRANS)
//     // ===============================
//     transactionData := map[string]interface{}{
//         "transaction_details": map[string]interface{}{
//             "order_id":     orderID,
//             "gross_amount": int(grossAmount.IntPart()),
//         },
//         "item_details": itemDetails,
//     }

//     paymentType := ""
//     paymentMethodName := req.PaymentMethodName

//     switch req.PaymentMethodName {
//     case "qris":
//         paymentType = "qris"
//         transactionData["payment_type"] = "qris"
//         transactionData["qris"] = map[string]interface{}{
//             "acquirer": "gopay",
//         }

//     case "gopay":
//         paymentType = "gopay"
//         transactionData["payment_type"] = "gopay"
//         transactionData["gopay"] = map[string]interface{}{
//             "enable_callback": true,
//             "callback_url":    os.Getenv("APP_URL") + "/api/callback/midtrans",
//         }

//     case "shopeepay":
//         paymentType = "shopeepay"
//         transactionData["payment_type"] = "shopeepay"
//         transactionData["shopeepay"] = map[string]interface{}{
//             "callback_url": os.Getenv("APP_URL") + "/api/callback/midtrans",
//         }

//     case "bca", "bni", "bri", "permata", "mandiri", "cimb":
//         paymentType = "bank_transfer"
//         transactionData["payment_type"] = "bank_transfer"
//         transactionData["bank_transfer"] = map[string]interface{}{
//             "bank": req.PaymentMethodName,
//         }

//     default:
//         c.JSON(http.StatusBadRequest, gin.H{
//             "error": "Invalid payment method",
//         })
//         return
//     }

//     // ===============================
// // CALL MIDTRANS API (FIXED)
// // ===============================
// jsonData, err := json.Marshal(transactionData)
// if err != nil {
//     c.JSON(500, gin.H{"error": "Failed to encode payload"})
//     return
// }

// midtransURL := "https://api.sandbox.midtrans.com/v2/charge"
// if os.Getenv("APP_ENV") == "PRODUCTION" {
//     midtransURL = "https://api.midtrans.com/v2/charge"
// }

// // 🔥 DEBUG WAJIB
// serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
// log.Println("MIDTRANS URL:", midtransURL)
// log.Println("SERVER KEY:", serverKey)
// log.Println("PAYLOAD:", string(jsonData))

// if serverKey == "" {
//     c.JSON(500, gin.H{"error": "Midtrans server key is empty"})
//     return
// }

// httpReq, err := http.NewRequest("POST", midtransURL, bytes.NewBuffer(jsonData))
// if err != nil {
//     c.JSON(500, gin.H{"error": "Failed create request"})
//     return
// }

// httpReq.Header.Set("Content-Type", "application/json")
// httpReq.Header.Set("Accept", "application/json")
// httpReq.SetBasicAuth(serverKey, "")

// client := &http.Client{Timeout: 30 * time.Second}
// resp, err := client.Do(httpReq)
// if err != nil {
//     c.JSON(500, gin.H{"error": "Failed call Midtrans: " + err.Error()})
//     return
// }
// defer resp.Body.Close()

// body, _ := io.ReadAll(resp.Body)

// // 🔥 LOG RESPONSE MIDTRANS
// log.Println("MIDTRANS STATUS:", resp.StatusCode)
// log.Println("MIDTRANS RESPONSE:", string(body))

// // ❗ JANGAN forward status 401 ke frontend
// if resp.StatusCode != 200 && resp.StatusCode != 201 {
//     c.JSON(500, gin.H{
//         "error":   "Midtrans error",
//         "status":  resp.StatusCode,
//         "message": string(body),
//     })
//     return
// }

//     var responseData map[string]interface{}
//     json.Unmarshal(body, &responseData)

//     transactionID, _ := responseData["transaction_id"].(string)
//     statusMessage, _ := responseData["status_message"].(string)
//     urlOrVA := getPaymentURLOrVA(responseData)
//     deeplinkGopay := getDeeplinkGopay(responseData)
//     midtransResponseJSON, _ := json.Marshal(responseData)

//     // ===============================
//     // SIMPAN TRANSACTION KE DATABASE
//     // ===============================
//     transaction := buildTransaction(req, sellingPrice, fee, purchasePrice, grossAmount, profit, profitMargin, orderID, paymentType, paymentMethodName, transactionID, statusMessage, urlOrVA, deeplinkGopay, midtransResponseJSON)

//     if err := config.DB.Create(&transaction).Error; err != nil {
//         c.JSON(500, gin.H{"error": "Failed save transaction: " + err.Error()})
//         return
//     }

//     config.DB.Preload("Product").First(&transaction, transaction.ID)

//     c.JSON(http.StatusOK, gin.H{
//         "message": "Payment created",
//         "data": gin.H{
//             "transaction":   transaction,
//             "payment_url":   urlOrVA,
//             "deeplink":      deeplinkGopay,
//             "midtrans_data": responseData,
//         },
//     })
// }

func CreateTransactionMidtrans(c *gin.Context) {
    var req CreateTransactionRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // ===============================
    // VALIDASI
    // ===============================
    if req.ProductName == "" || req.CustomerNo == "" || req.PaymentMethodName == "" {
        c.JSON(400, gin.H{"error": "Invalid request"})
        return
    }

    // ===============================
    // HITUNG
    // ===============================
    sellingPrice := decimal.NewFromFloat(req.SellingPrice)
    // fee := decimal.NewFromFloat(req.Fee)
    fee := req.Fee
    purchasePrice := decimal.NewFromFloat(req.PurchasePrice)

    grossAmount := sellingPrice.Add(fee)
    profit := sellingPrice.Sub(purchasePrice).Sub(fee)

    // ===============================
    // ORDER ID
    // ===============================
    orderID := fmt.Sprintf("ORD-%d", time.Now().Unix())

    // ===============================
    // CASH (ADMIN TOPUP) — langsung settlement
    // ===============================
    if req.PaymentType == "cash" {
        if req.AdminID == 0 && req.UserID != nil {
            req.AdminID = *req.UserID
        }
        var profitMargin *float64
        handleAdminTopup(c, req, sellingPrice, fee, purchasePrice, grossAmount, profit, profitMargin, orderID)
        return
    }

    // ===============================
    // ITEM DETAILS
    // ===============================
    itemDetails := []map[string]interface{}{
        {
            "id":       fmt.Sprintf("%d", req.ID),
            "price": int(sellingPrice.Round(0).IntPart()),
            "quantity": 1,
            "name":     req.ProductName,
        },
    }

    if fee.GreaterThan(decimal.Zero) {
        itemDetails = append(itemDetails, map[string]interface{}{
            "id":       "fee",
            "price": int(fee.Round(0).IntPart()),
            "quantity": 1,
            "name":     "Biaya Admin",
        })
    }

    // ===============================
    // SNAP PAYLOAD
    // ===============================
    snapPayload := map[string]interface{}{
        "transaction_details": map[string]interface{}{
            "order_id":     orderID,
            "gross_amount": int(grossAmount.Round(0).IntPart()),
        },
        "item_details": itemDetails,
        "enabled_payments": []string{
            mapPaymentMethod(req.PaymentMethodCode),
        },
        "callbacks": map[string]interface{}{
        "finish": fmt.Sprintf("%s/history/%s", os.Getenv("APP_URL"), orderID),
    },
    }

    jsonData, _ := json.Marshal(snapPayload)


    // serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
    // fmt.Println("SERVER KEY USED:", serverKey)
    // fmt.Println("KEY PREFIX:", serverKey[:10]) // lihat prefixnya
    // ===============================
    // MIDTRANS URL
    // ===============================
    midtransURL := "https://app.sandbox.midtrans.com/snap/v1/transactions"
    if os.Getenv("APP_ENV") == "PRODUCTION" {
        midtransURL = "https://app.midtrans.com/snap/v1/transactions"
    }

    // ===============================
    // REQUEST
    // ===============================
    httpReq, _ := http.NewRequest("POST", midtransURL, bytes.NewBuffer(jsonData))
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.SetBasicAuth(os.Getenv("MIDTRANS_SERVER_KEY"), "")

    client := &http.Client{Timeout: 30 * time.Second}
    resp, err := client.Do(httpReq)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)

    var result map[string]interface{}
    json.Unmarshal(body, &result)

    if resp.StatusCode != 201 {
        c.JSON(500, gin.H{
            "error":   "Midtrans error",
            "message": string(body),
        })
        return
    }

    // ===============================
    // PARSE RESPONSE
    // ===============================
    snapToken, _ := result["token"].(string)
    redirectURL, _ := result["redirect_url"].(string)

    midtransJSON, _ := json.Marshal(result)

    // ===============================
    // SIMPAN DB
    // ===============================
    now := time.Now()

    transaction := models.Transaction{
    OrderID: orderID,

    // User & Product Info
    UserID:       req.UserID,
    ProductID:    &req.ID,
    ProductName:  &req.ProductName,
    ProductType:  stringPtr(req.ProductType),
    CustomerNo:   req.CustomerNo,
    BuyerSkuCode: req.BuyerSkuCode,
    WaPembeli:    req.WaPembeli,

    // Category
    CategoryID:   req.CategoryID,
    CategoryName: stringPtr(req.CategoryName),

    // Provider
    ProviderName: stringPtr("digiflazz"),

    // Payment Info
    GrossAmount:       grossAmount,
    SellingPrice:      sellingPrice,
    PurchasePrice:     purchasePrice,
    Fee:               fee,
    MerchantFee:       fee,
    AdminFee:          decimal.NewFromInt(0),

    PaymentStatus:     "pending",
    DigiflazzStatus:   stringPtr("pending"),
    PaymentMethodName: &req.PaymentMethodName,
    PaymentMethodCode: &req.PaymentMethodCode,

    // Midtrans
    MidtransOrderID:    &orderID,
    MidtransPaymentURL: &redirectURL,
    MidtransSnapToken:  &snapToken,
    MidtransResponse:   midtransJSON,

    // Reporting
    Profit:        &profit,

    // Admin tracking
    CreatedByRole: stringPtr("user"),
    RetryCount:    0,

    CreatedAt: now,
    UpdatedAt: now,
}

    if err := config.DB.Create(&transaction).Error; err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    // ===============================
    // RESPONSE
    // ===============================
    c.JSON(200, gin.H{
        "payment_url": redirectURL,
        "snap_token":  snapToken,
        "order_id":    orderID,
    })
}

func mapPaymentMethod(method string) string {
    switch method {

    // ===== VIRTUAL ACCOUNT =====
    case "bca":
        return "bca_va"
    case "bni":
        return "bni_va"
    case "bri":
        return "bri_va"
    case "permata":
        return "permata_va"
    case "cimb":
        return "cimb_va"
    case "mandiri":
        return "echannel"
    case "other_va":
        return "other_va"

    // ===== E-WALLET =====
    case "gopay":
        return "gopay"
    case "shopeepay":
        return "shopeepay"
    case "dana":
        return "dana"
    case "uob":
        return "uob_ezpay"

    // ===== QRIS =====
    case "qris":
        return "qris"

    // ===== KARTU KREDIT/DEBIT =====
    case "credit_card":
        return "credit_card"

    // ===== OVER THE COUNTER (Minimarket) =====
    case "indomaret":
        return "indomaret"
    case "alfamart":
        return "alfamart"

    // ===== PAYLATER =====
    case "akulaku":
        return "akulaku"
    case "kredivo":
        return "kredivo"

    default:
        return method
    }
}

// // =============================================
// // FUNGSI UNTUK ADMIN TOPUP (CASH LANGSUNG)
// // =============================================
func handleAdminTopup(c *gin.Context, req CreateTransactionRequest, sellingPrice, fee, purchasePrice, grossAmount, profit decimal.Decimal, profitMargin *float64, orderID string) {
    
    // Admin topup langsung sukses
    paymentStatus := "settlement"
    statusMessage := "Pembayaran cash admin"
    
    transaction := buildTransaction(
        req, sellingPrice, fee, purchasePrice, grossAmount, profit, profitMargin,
        orderID, "cash", "CASH", 
        fmt.Sprintf("ADM-%d", time.Now().UnixNano()), 
        statusMessage, "", "", []byte("{}"),		
    )
    
    // Set admin specific fields
    transaction.PaymentStatus = paymentStatus
    transaction.CreatedBy = &req.AdminID
    transaction.CreatedByRole = stringPtr("admin")
    transaction.AdminNote = stringPtr(req.AdminNote)
    transaction.AdminFee = decimal.NewFromInt(0) // Admin no fee

    if err := config.DB.Create(&transaction).Error; err != nil {
        c.JSON(500, gin.H{"error": "Failed save transaction: " + err.Error()})
        return
    }

    // Trigger Digiflazz processing (async)
    go triggerDigiflazzProcessing(&transaction)

    c.JSON(http.StatusOK, gin.H{
        "message": "Admin topup successful",
        "data": gin.H{
            "transaction": transaction,
        },
    })
 }


// // =============================================
// // FUNGSI BUILD TRANSACTION DENGAN IF-ELSE PER JENIS
// // =============================================
func buildTransaction(
    req CreateTransactionRequest,
    sellingPrice, fee, purchasePrice, grossAmount, profit decimal.Decimal,
    profitMargin *float64,
    orderID, paymentType, paymentMethodName, transactionID, statusMessage, urlOrVA, deeplinkGopay string,
    midtransResponseJSON []byte,	
	
) models.Transaction {
	
    
    transaction := models.Transaction{
        // Basic Info
        ProductID:         &req.ID,
        ProductName:       stringPtr(req.ProductName),
        ProductType:       stringPtr(req.ProductType),
        CustomerNo:        req.CustomerNo,
        BuyerSkuCode:      req.BuyerSkuCode,
		UserID: 		req.UserID,
        
        // Transaction IDs
        OrderID:           orderID,
        TransactionID:     stringPtr(transactionID),
        
        // Payment Info
        GrossAmount:       grossAmount,
        SellingPrice:      sellingPrice,
        PurchasePrice:     purchasePrice,
        PaymentType:       stringPtr(paymentType),
        PaymentMethodName: stringPtr(paymentMethodName),        
        
        // Status
        PaymentStatus:     "pending",
        StatusMessage:     stringPtr(statusMessage),
        
        // URLs & Contact        
        WaPembeli:         req.WaPembeli,
        
        // Admin fields
        CreatedByRole:     stringPtr("user"),
        AdminFee:          decimal.NewFromInt(0),
        MerchantFee:       fee,
        
        // Category
        CategoryID:        req.CategoryID,
        CategoryName:      stringPtr(req.CategoryName),
        
        // Provider
        ProviderName:      stringPtr("digiflazz"),
        
        // Reporting
        Profit:            &profit,
        ProfitMargin:      profitMargin,
        
        // Default values
        RetryCount:        0,
    }    

    return transaction
}

// =============================================
// HELPER FUNCTIONS
// =============================================

func stringPtr(s string) *string {
    if s == "" {
        return nil
    }
    return &s
}

func decimalPtr(d decimal.Decimal) *decimal.Decimal {
    return &d
}

// Cek apakah string mengandung keyword tertentu
func contains(keywords []string, values ...string) bool {
    for _, value := range values {
        for _, keyword := range keywords {
            if strings.Contains(strings.ToLower(value), strings.ToLower(keyword)) {
                return true
            }
        }
    }
    return false
}

// // Request struct yang lengkap
// // type CreateTransactionRequest struct {
// //     // Basic
// //     ID              uint    `json:"id"`
// //     ProductName     string  `json:"product_name"`
// //     ProductType     string  `json:"product_type"`
// //     BuyerSkuCode    string  `json:"buyer_sku_code"`
// // 	UserID 			*uint	`json:"user_id"`
// // 	ProductID 			*uint	`json:"product_id"`
    
// //     // Prices
// //     SellingPrice    float64 `json:"selling_price"`
// //     PurchasePrice   float64 `json:"purchase_price"`
// //     Fee decimal.Decimal `json:"fee"`
    
// //     // Customer
// //     CustomerNo      string  `json:"customer_no"`
// //     CustomerName    string  `json:"customer_name"`
// //     WaPembeli       string  `json:"wa_pembeli"`
// //     CustomerNote    string  `json:"customer_note"`
    
// //     // Payment
// //     PaymentMethodName string `json:"payment_method_name"`
// //     PaymentType string `json:"payment_type"`
    
// //     // Admin specific
// //     IsAdmin         bool   `json:"is_admin"`
// //     AdminID         uint   `json:"admin_id"`
// //     AdminNote       string `json:"admin_note"`
    
// //     // Category
// //     CategoryID      *uint  `json:"category_id"`
// //     CategoryName    string `json:"category_name"`
    
// //     // Game/Voucher
// //     VoucherCode     string `json:"voucher_code"`
    
// //     // PLN Specific
// //     MeterNo         string   `json:"meter_no"`
// //     SubscriberID    string   `json:"subscriber_id"`
// //     Kwh             *float64 `json:"kwh"`
    
// //     // Tagihan (PLN Pasca, PDAM, BPJS)
// //     BillPeriod      string   `json:"bill_period"`
// //     BillAmount      *float64 `json:"bill_amount"`
// //     AdminCharge     *float64 `json:"admin_charge"`
    
// //     // PDAM Specific
// //     RegionCode      string `json:"region_code"`
// //     RegionName      string `json:"region_name"`
    
// //     // BPJS Specific
// //     ParticipantName string `json:"participant_name"`
// //     ParticipantType string `json:"participant_type"`
// // }



func getPaymentURLOrVA(data map[string]interface{}) string {
	// QRIS / e-wallet
	if actions, ok := data["actions"].([]interface{}); ok {
		for _, a := range actions {
			if action, ok := a.(map[string]interface{}); ok {
				if name, ok := action["name"].(string); ok && name == "generate-qr-code" {
					if url, ok := action["url"].(string); ok {
						return url
					}
				}
				// Fallback ke url pertama
				if url, ok := action["url"].(string); ok {
					return url
				}
			}
		}
	}

	// VA
	if vaNumbers, ok := data["va_numbers"].([]interface{}); ok {
		if len(vaNumbers) > 0 {
			if va, ok := vaNumbers[0].(map[string]interface{}); ok {
				if number, ok := va["va_number"].(string); ok {
					return number
				}
			}
		}
	}

	// Redirect URL
	if redirectURL, ok := data["redirect_url"].(string); ok {
		return redirectURL
	}

	return ""
}

func getDeeplinkGopay(data map[string]interface{}) string {
	if actions, ok := data["actions"].([]interface{}); ok {
		for _, a := range actions {
			if action, ok := a.(map[string]interface{}); ok {
				if name, ok := action["name"].(string); ok && name == "deeplink-redirect" {
					if url, ok := action["url"].(string); ok {
						return url
					}
				}
			}
		}
	}
	return ""
}

// // controllers/transaction_controller.go - Modifikasi GetStatusPayment

func GetStatusPayment(c *gin.Context) {
    orderID := c.Param("order_id")

    var transaction models.Transaction

    err := config.DB.Where("order_id = ?", orderID).First(&transaction).Error

    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"message": "data tidak ditemukan"})
        return
    }

    response := gin.H{
        "order_id":         transaction.OrderID,
        "payment_status":   transaction.PaymentStatus,
        "digiflazz_status": transaction.DigiflazzStatus,
        "gross_amount":     transaction.GrossAmount,
        "payment_type":     transaction.PaymentType,
        "updated_at":       transaction.UpdatedAt,
    }
    
    // Tambahkan info cut off jika ada next_retry_at karena cut off
    if transaction.LastErrorCode != nil && *transaction.LastErrorCode == "CUTOFF" {
        if transaction.NextRetryAt != nil {
            response["cut_off"] = gin.H{
                "status": "ditunda",
                "next_retry": transaction.NextRetryAt,
                "message": safeString(transaction.StatusMessage),
            }
        }
    }
    
    // Tambahkan info retry
    if transaction.NextRetryAt != nil && transaction.NextRetryAt.After(time.Now()) {
        response["next_retry"] = transaction.NextRetryAt
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Berhasil",
        "data":    response,
    })
}

// // WebSocket endpoint
func WebSocketConnection(c *gin.Context) {
	websocket.HandleWebSocket(c)
}

// // UpdatePaymentStatus - Contoh fungsi yang memicu WebSocket broadcast
func UpdatePaymentStatus(c *gin.Context) {
	var req struct {
		OrderID        string `json:"order_id"`
		PaymentStatus  string `json:"payment_status"`
		DigiflazzStatus string `json:"digiflazz_status"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Update database
	var transaction models.Transaction
	if err := config.DB.Where("order_id = ?", req.OrderID).First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}
	
	updates := map[string]interface{}{
		"payment_status":   req.PaymentStatus,
		"digiflazz_status": req.DigiflazzStatus,
		"updated_at":       time.Now(),
	}
	
	config.DB.Model(&transaction).Updates(updates)
	
	// Broadcast update via WebSocket
	websocket.BroadcastOrderStatus(req.OrderID)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Status updated and broadcasted",
	})
}

// // Webhook handler yang memicu WebSocket
// // func HandleMidtransWebhook(c *gin.Context) {
// // 	// ... existing webhook code ...
	
// // 	// After updating transaction status
// // 	// websocket.BroadcastOrderStatus(notification.OrderID)
	
// // 	c.JSON(http.StatusOK, gin.H{"status": "success"})
// // }


