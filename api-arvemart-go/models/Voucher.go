package models

import (
	"time"

	"gorm.io/gorm"
)

type Voucher struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Code          string         `gorm:"column:code;size:50;not null;uniqueIndex" json:"code"`
	DiscountType  string         `gorm:"column:discount_type;size:20;not null" json:"discount_type"`
	DiscountValue float64        `gorm:"column:discount_value;not null" json:"discount_value"`
	MinPurchase   float64        `gorm:"column:min_purchase;default:0" json:"min_purchase"`
	MaxUses       int            `gorm:"column:max_uses;default:0" json:"max_uses"`
	UsedCount     int            `gorm:"column:used_count;default:0" json:"used_count"`
	ValidFrom     time.Time      `gorm:"column:valid_from" json:"valid_from"`
	ValidUntil    time.Time      `gorm:"column:valid_until" json:"valid_until"`
	IsActive      bool           `gorm:"column:is_active;default:true;index" json:"is_active"`
	CreatedAt     time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Voucher) TableName() string {
	return "vouchers"
}
