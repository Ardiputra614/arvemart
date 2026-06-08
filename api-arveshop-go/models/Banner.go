package models

import (
	"time"

	"gorm.io/gorm"
)

type Banner struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Title         string         `gorm:"column:title;size:255;not null" json:"title"`
	Description   *string        `gorm:"column:description;type:text" json:"description"`
	Image         *string        `gorm:"column:image;size:255" json:"image"`
	ImagePublicID *string        `gorm:"column:image_public_id;size:255" json:"image_public_id"`
	Link          *string        `gorm:"column:link;size:255" json:"link"`
	Order         int            `gorm:"column:order;default:0" json:"order"`
	IsActive      bool           `gorm:"column:is_active;default:true;index" json:"is_active"`
	CreatedAt     time.Time      `gorm:"column:created_at;index" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"column:updated_at;index" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}
