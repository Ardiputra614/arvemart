package models

import "time"

type EmailVerified struct {
	ID uint	`gorm:"primary_key" json:"id"`
	UserID uint `gorm:"type:varchar(255);not null" json:"user_id"`
	Token string `gorm:"type:varchar(255);not null" json:"token"`
	ExpiredAt time.Time `json:"expired_at"`
	CreatedAt time.Time `json:"created_at"`
}