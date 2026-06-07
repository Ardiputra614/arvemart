package models

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
)



type Transaction struct {
    ID uint `gorm:"primaryKey" json:"id"`

    // User & Product Info
    UserID       *uint  `gorm:"column:user_id;index" json:"user_id"`
    ProductID    *uint  `gorm:"column:product_id" json:"product_id"`
    ProductName  *string `gorm:"column:product_name" json:"product_name"`
    ProductType  *string `gorm:"column:product_type;index" json:"product_type"`
    CustomerNo   string  `gorm:"column:customer_no;index;not null" json:"customer_no"`
    BuyerSkuCode string  `gorm:"column:buyer_sku_code;not null" json:"buyer_sku_code"`

    // Transaction IDs
    OrderID       string  `gorm:"column:order_id;unique;not null" json:"order_id"`
    TransactionID *string `gorm:"column:transaction_id;unique" json:"transaction_id"`

    // Payment Info
    GrossAmount   decimal.Decimal `gorm:"column:gross_amount;not null" json:"gross_amount"`
    SellingPrice  decimal.Decimal `gorm:"column:selling_price" json:"selling_price"`
    PurchasePrice decimal.Decimal `gorm:"column:purchase_price" json:"purchase_price"`

    PaymentType       *string `gorm:"column:payment_type" json:"payment_type"`
    PaymentMethodName *string `gorm:"column:payment_method_name" json:"payment_method_name"`
    PaymentMethodCode *string `gorm:"column:payment_method_code" json:"payment_method_code"`

    // Status
    PaymentStatus    string  `gorm:"column:payment_status;default:pending;index" json:"payment_status"`
    DigiflazzStatus  *string `json:"digiflazz_status" gorm:"default:pending"`
    StatusMessage    *string `gorm:"column:status_message" json:"status_message"`

    // Product Specific
    RefID        *string `gorm:"column:ref_id;index" json:"ref_id"`
    SerialNumber *string `gorm:"column:serial_number" json:"serial_number"`
    CustomerName *string `gorm:"column:customer_name" json:"customer_name"`

    // Contact
    WaPembeli string `gorm:"column:wa_pembeli;not null" json:"wa_pembeli"`

    // Raw JSON Data
    DigiflazzRequest  datatypes.JSON `gorm:"column:digiflazz_request" json:"digiflazz_request"`
    DigiflazzResponse datatypes.JSON `gorm:"column:digiflazz_response" json:"digiflazz_response"`
    DigiflazzCallback datatypes.JSON `gorm:"column:digiflazz_callback" json:"digiflazz_callback"`
    DigiflazzFlag     *string        `gorm:"column:digiflazz_flag" json:"digiflazz_flag"`

    // Retry & Timing
    RetryAt         *time.Time `gorm:"column:retry_at" json:"retry_at"`
    RetryCount      int        `gorm:"column:retry_count;default:0" json:"retry_count"`
    LastErrorCode   *string    `gorm:"column:last_error_code;size:10" json:"last_error_code"`
    SaldoDebitedAt  *time.Time `gorm:"column:saldo_debited_at" json:"saldo_debited_at"`
    DigiflazzSentAt *time.Time `gorm:"column:digiflazz_sent_at" json:"digiflazz_sent_at"`
    NextRetryAt     *time.Time `gorm:"column:next_retry_at" json:"next_retry_at"`

    // Admin tracking
    IsAdmin       bool    `gorm:"column:is_admin;default:false" json:"is_admin"`
    CreatedBy     *uint   `gorm:"column:created_by" json:"created_by"`
    CreatedByRole *string `gorm:"column:created_by_role" json:"created_by_role"`
    AdminNote     *string `gorm:"column:admin_note;type:text" json:"admin_note"`

    // Fee breakdown
    AdminFee    decimal.Decimal `gorm:"column:admin_fee;default:0" json:"admin_fee"`
    Fee         decimal.Decimal `gorm:"column:fee;default:0" json:"fee"`
    MerchantFee decimal.Decimal `gorm:"column:merchant_fee;default:0" json:"merchant_fee"`

    // Product details
    CategoryID   *uint   `gorm:"column:category_id;index" json:"category_id"`
    CategoryName *string `gorm:"column:category_name" json:"category_name"`

    // Provider Info
    ProviderName  *string `gorm:"column:provider_name" json:"provider_name"`
    ProviderTrxID *string `gorm:"column:provider_trx_id" json:"provider_trx_id"`
    PhoneNumber   *string `gorm:"column:phone_number" json:"phone_number"`

    // Reporting
    Profit       *decimal.Decimal `gorm:"column:profit" json:"profit"`
    ProfitMargin *float64         `gorm:"column:profit_margin" json:"profit_margin"`

    // Duitku Data
    // DuitkuReference  *string        `gorm:"column:duitku_reference;index" json:"duitku_reference"`
    // DuitkuVA         *string        `gorm:"column:duitku_va" json:"duitku_va"`
    // DuitkuQRString   *string        `gorm:"column:duitku_qr_string" json:"duitku_qr_string"`
    // DuitkuPaymentURL *string        `gorm:"column:duitku_payment_url" json:"duitku_payment_url"`
    // DuitkuExpiry     *time.Time     `gorm:"column:duitku_expiry" json:"duitku_expiry"`
    // DuitkuResponse   datatypes.JSON `gorm:"column:duitku_response" json:"duitku_response"`

    // Midtrans Data
    MidtransTransactionID *string        `gorm:"column:midtrans_transaction_id;index" json:"midtrans_transaction_id"`
    MidtransOrderID       *string        `gorm:"column:midtrans_order_id" json:"midtrans_order_id"`
    MidtransPaymentType   *string        `gorm:"column:midtrans_payment_type" json:"midtrans_payment_type"`
    MidtransPaymentURL    *string        `gorm:"column:midtrans_payment_url" json:"midtrans_payment_url"`
    MidtransSnapToken     *string        `gorm:"column:midtrans_snap_token" json:"midtrans_snap_token"`
    MidtransVA            *string        `gorm:"column:midtrans_va" json:"midtrans_va"`
    MidtransQRString      *string        `gorm:"column:midtrans_qr_string" json:"midtrans_qr_string"`
    MidtransExpiry        *time.Time     `gorm:"column:midtrans_expiry" json:"midtrans_expiry"`
    MidtransResponse      datatypes.JSON `gorm:"column:midtrans_response" json:"midtrans_response"`

    // Security
    Signature        *string `gorm:"column:signature" json:"signature"`
    CallbackVerified bool    `gorm:"column:callback_verified;default:false" json:"callback_verified"`

    
	PaidAt *time.Time `json:"paid_at" gorm:"default:null"`
    CreatedAt time.Time  `gorm:"column:created_at" json:"created_at"`
    UpdatedAt time.Time  `gorm:"column:updated_at" json:"updated_at"`
    DeletedAt *time.Time `gorm:"column:deleted_at;index" json:"deleted_at,omitempty"`
}
