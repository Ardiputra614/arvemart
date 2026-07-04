package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "superadmin"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"type:varchar(255);not null" json:"name"`
	Email     string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	NoHp     string          `gorm:"type:varchar(255);not null" json:"no_hp"`
	Password  string         `gorm:"not null" json:"-"`
	Role      Role           `gorm:"type:varchar(50);default:user" json:"role"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	EmailVerified  bool      `gorm:"default:false" json:"email_verified"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
