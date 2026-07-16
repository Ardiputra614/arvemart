package models

import (
	"time"

	"gorm.io/gorm"
)

type BlogArticleStatus string

const (
	BlogArticleDraft     BlogArticleStatus = "draft"
	BlogArticlePublished BlogArticleStatus = "published"
	BlogArticleArchived  BlogArticleStatus = "archived"
)

type BlogArticle struct {
	ID             uint               `gorm:"primaryKey" json:"id"`
	Title          string             `gorm:"column:title;size:500;not null" json:"title"`
	Slug           string             `gorm:"column:slug;size:500;uniqueIndex;not null" json:"slug"`
	Excerpt        *string            `gorm:"column:excerpt;type:text" json:"excerpt"`
	Content        string             `gorm:"column:content;type:longtext;not null" json:"content"`
	CoverImage     *string            `gorm:"column:cover_image;size:500" json:"cover_image"`
	CoverImagePID  *string            `gorm:"column:cover_image_pid;size:255" json:"-"`
	CategoryID     uint               `gorm:"column:category_id;index" json:"category_id"`
	Category       BlogCategory       `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	AuthorName     string             `gorm:"column:author_name;size:255;default:'Admin'" json:"author_name"`
	Status         BlogArticleStatus `gorm:"column:status;size:20;default:draft;index" json:"status"`
	IsFeatured     bool               `gorm:"column:is_featured;default:false" json:"is_featured"`
	MetaTitle      *string            `gorm:"column:meta_title;size:500" json:"meta_title"`
	MetaDesc       *string            `gorm:"column:meta_desc;type:text" json:"meta_desc"`
	ViewCount      int64              `gorm:"column:view_count;default:0" json:"view_count"`
	PublishedAt    *time.Time         `gorm:"column:published_at;index" json:"published_at"`
	CreatedAt      time.Time          `gorm:"column:created_at;index" json:"created_at"`
	UpdatedAt      time.Time          `gorm:"column:updated_at;index" json:"updated_at"`
	DeletedAt      gorm.DeletedAt     `gorm:"column:deleted_at;index" json:"-"`
}

func (BlogArticle) TableName() string {
	return "blog_articles"
}
