package models

import (
	"time"

	"gorm.io/gorm"
)

type BlogCategoryType string

const (
	BlogCategoryTypeArticle BlogCategoryType = "article"
	BlogCategoryTypeStory   BlogCategoryType = "story"
	BlogCategoryTypeBoth    BlogCategoryType = "both"
)

type BlogCategory struct {
	ID          uint              `gorm:"primaryKey" json:"id"`
	Name        string            `gorm:"column:name;size:255;not null" json:"name"`
	Slug        string            `gorm:"column:slug;size:255;uniqueIndex;not null" json:"slug"`
	Type        BlogCategoryType  `gorm:"column:type;size:20;default:both;index" json:"type"`
	Description *string           `gorm:"column:description;type:text" json:"description"`
	Image       *string           `gorm:"column:image;size:500" json:"image"`
	IsActive    bool              `gorm:"column:is_active;default:true;index" json:"is_active"`
	Order       int               `gorm:"column:order;default:0" json:"order"`
	CreatedAt   time.Time         `gorm:"column:created_at;index" json:"created_at"`
	UpdatedAt   time.Time         `gorm:"column:updated_at;index" json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"column:deleted_at;index" json:"-"`
}

func (BlogCategory) TableName() string {
	return "blog_categories"
}
