package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type PaymentMethod struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// =========================================
	// BASIC INFO
	// =========================================
	Name string `gorm:"column:name;size:255;not null" json:"name"`

	// KODE DARI DUITKU (WAJIB)
	Code string `gorm:"column:code;size:20;unique;not null;index" json:"code"`
	// contoh: QRIS, BC, BR, OV, dll

	// =========================================
	// TYPE
	// =========================================
	// cc | qris | bank_transfer | ewallet | cstore
	Type string `gorm:"column:type;size:20;not null;index" json:"type"`

	// =========================================
	// FEE (PAKAI DECIMAL, BUKAN FLOAT)
	// =========================================
	NominalFee    decimal.Decimal `gorm:"column:nominal_fee;type:decimal(18,2);default:0" json:"nominal_fee"`
	PercentageFee  float64 `gorm:"column:percentage_fee;size:255" json:"percentage_fee"`

	// flat | percentage | mixed
	FeeType string `gorm:"column:fee_type;size:20;default:flat" json:"fee_type"`

	// =========================================
	// UI / DISPLAY
	// =========================================
	Logo         string `gorm:"column:logo;size:255" json:"logo"`
	LogoPublicID *string `gorm:"column:logo_public_id;size:255" json:"logo_public_id"`

	SortOrder int `gorm:"column:sort_order;default:0" json:"sort_order"`

	// =========================================
	// STATUS
	// =========================================
	IsActive bool `gorm:"column:is_active;default:true;index" json:"is_active"`

	// =========================================
	// TIMESTAMP
	// =========================================
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (p PaymentMethod) CalculateFee(amount decimal.Decimal) decimal.Decimal {
	switch p.FeeType {
	case "flat":
		return p.NominalFee

	case "percentage":
		percent := amount.
			Mul(decimal.NewFromFloat(p.PercentageFee)).
			Div(decimal.NewFromInt(100))
		return percent

	case "mixed":
		percent := amount.
			Mul(decimal.NewFromFloat(p.PercentageFee)).
			Div(decimal.NewFromInt(100))
		return p.NominalFee.Add(percent)

	default:
		return decimal.Zero
	}
}


// package models

// import (
// 	"time"
// )

// type PaymentMethod struct {
// 	ID uint `gorm:"primaryKey" json:"id"`

// 	Name           string  `gorm:"column:name;size:255;not null" json:"name"`
// 	NominalFee     float64 `gorm:"column:nominal_fee;size:255" json:"nominal_fee"`
// 	PercentageFee  float64 `gorm:"column:percentase_fee;size:255" json:"percentase_fee"`
// 	FeeType 		string `gorm:"column:fee_type;size:255" json:"fee_type"`

// 	// cc | qris | bank_transfer | ewallet | cstore
// 	Type string `gorm:"column:type;size:20;not null;index" json:"type"`

// 	Logo string `gorm:"column:logo;size:255" json:"logo"`
// 	LogoPublicID string `gorm:"column:logo_public_id;size:255" json:"logo_public_id"`

// 	// true | false
// 	IsActive    bool `gorm:"column:is_active;default:true;index" json:"is_active"`	

// 	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
// 	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
// }

