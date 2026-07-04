package models

import (
	"time"
)

type Faq struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	Question  string `gorm:"column:question;type:text;not null" json:"question"`
	Answer    string `gorm:"column:answer;type:longtext;not null" json:"answer"`
	Order     int    `gorm:"column:order;default:0" json:"order"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Faq) TableName() string {
	return "faqs"
}
