package models

import (
	"time"

	"gorm.io/gorm"
)

type BlogComment struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ArticleID   *uint          `gorm:"column:article_id;index" json:"article_id"`
	Article     *BlogArticle   `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
	StoryID     *uint          `gorm:"column:story_id;index" json:"story_id"`
	Story       *BlogStory     `gorm:"foreignKey:StoryID" json:"story,omitempty"`
	StoryPageID *uint          `gorm:"column:story_page_id;index" json:"story_page_id"`
	UserName    string         `gorm:"column:user_name;size:255;not null" json:"user_name"`
	Email       *string        `gorm:"column:email;size:255" json:"email"`
	Content     string         `gorm:"column:content;type:text;not null" json:"content"`
	IsApproved  bool           `gorm:"column:is_approved;default:true" json:"is_approved"`
	CreatedAt   time.Time      `gorm:"column:created_at;index" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (BlogComment) TableName() string {
	return "blog_comments"
}

type BlogRating struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ArticleID   *uint          `gorm:"column:article_id;index" json:"article_id"`
	StoryID     *uint          `gorm:"column:story_id;index" json:"story_id"`
	IPAddress   string         `gorm:"column:ip_address;size:100;index" json:"ip_address"`
	Rating      int            `gorm:"column:rating;not null" json:"rating"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (BlogRating) TableName() string {
	return "blog_ratings"
}

type BlogView struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ArticleID *uint     `gorm:"column:article_id;index" json:"article_id"`
	StoryID   *uint     `gorm:"column:story_id;index" json:"story_id"`
	IPAddress string    `gorm:"column:ip_address;size:100;index" json:"ip_address"`
	UserAgent string    `gorm:"column:user_agent;size:500" json:"-"`
	Referer   *string   `gorm:"column:referer;size:500" json:"-"`
	CreatedAt time.Time `gorm:"column:created_at;index" json:"created_at"`
}

func (BlogView) TableName() string {
	return "blog_views"
}
