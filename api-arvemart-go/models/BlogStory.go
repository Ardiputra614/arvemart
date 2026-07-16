package models

import (
	"time"

	"gorm.io/gorm"
)

type BlogStoryStatus string

const (
	BlogStoryDraft     BlogStoryStatus = "draft"
	BlogStoryPublished BlogStoryStatus = "published"
	BlogStoryArchived  BlogStoryStatus = "archived"
)

type BlogStory struct {
	ID            uint            `gorm:"primaryKey" json:"id"`
	Title         string          `gorm:"column:title;size:500;not null" json:"title"`
	Slug          string          `gorm:"column:slug;size:500;uniqueIndex;not null" json:"slug"`
	Description   *string         `gorm:"column:description;type:text" json:"description"`
	CoverImage    *string         `gorm:"column:cover_image;size:500" json:"cover_image"`
	CoverImagePID *string         `gorm:"column:cover_image_pid;size:255" json:"-"`
	CategoryID    uint            `gorm:"column:category_id;index" json:"category_id"`
	Category      BlogCategory    `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	AuthorName    string          `gorm:"column:author_name;size:255;default:'Admin'" json:"author_name"`
	Status        BlogStoryStatus `gorm:"column:status;size:20;default:draft;index" json:"status"`
	MetaTitle     *string         `gorm:"column:meta_title;size:500" json:"meta_title"`
	MetaDesc      *string         `gorm:"column:meta_desc;type:text" json:"meta_desc"`
	ViewCount     int64           `gorm:"column:view_count;default:0" json:"view_count"`
	TotalPages    int             `gorm:"column:total_pages;default:0" json:"total_pages"`
	AvgRating     float64         `gorm:"column:avg_rating;default:0" json:"avg_rating"`
	RatingCount   int             `gorm:"column:rating_count;default:0" json:"rating_count"`
	PublishedAt   *time.Time      `gorm:"column:published_at;index" json:"published_at"`
	CreatedAt     time.Time       `gorm:"column:created_at;index" json:"created_at"`
	UpdatedAt     time.Time       `gorm:"column:updated_at;index" json:"updated_at"`
	DeletedAt     gorm.DeletedAt  `gorm:"column:deleted_at;index" json:"-"`
}

func (BlogStory) TableName() string {
	return "blog_stories"
}

type BlogStoryPage struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	StoryID   uint           `gorm:"column:story_id;index;not null" json:"story_id"`
	Story     BlogStory      `gorm:"foreignKey:StoryID" json:"-"`
	PageNum   int            `gorm:"column:page_num;not null" json:"page_num"`
	Title     *string        `gorm:"column:title;size:500" json:"title"`
	Content   string         `gorm:"column:content;type:longtext;not null" json:"content"`
	Image     *string        `gorm:"column:image;size:500" json:"image"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (BlogStoryPage) TableName() string {
	return "blog_story_pages"
}
