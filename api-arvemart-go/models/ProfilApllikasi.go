package models

import (
	"time"
)

type ProfilAplikasi struct {
	ID uint `gorm:"primaryKey" json:"id"`

	ApplicationName string `gorm:"column:application_name;size:255;not null" json:"application_name"`
	ApplicationFee  string `gorm:"column:application_fee;size:255;not null" json:"application_fee"` // nominal (string sesuai Laravel)

	Saldo float64 `gorm:"column:saldo;default:0" json:"saldo"`

	TermsCondition string `gorm:"column:terms_condition;type:longtext;not null" json:"terms_condition"`
	PrivacyPolicy  string `gorm:"column:privacy_policy;type:longtext;not null" json:"privacy_policy"`
	RefundPolicy   string `gorm:"column:refund_policy;type:longtext;not null" json:"refund_policy"`

	Logo string `gorm:"column:logo;size:255;not null" json:"logo"`

	NoWa        string `gorm:"column:no_wa;size:255;not null" json:"no_wa"`
	Instagram   string `gorm:"column:instagram;size:255;not null" json:"instagram"`
	Facebook    string `gorm:"column:facebook;size:255;not null" json:"facebook"`
	Twitter     string `gorm:"column:twitter;size:255;not null" json:"twitter"`
	BusinessEmail string `gorm:"column:business_email;size:255;not null" json:"business_email"`
	BusinessPhone string `gorm:"column:business_phone;size:255;not null" json:"business_phone"`
	BusinessAddress string `gorm:"column:business_address;size:255;not null" json:"business_address"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}
