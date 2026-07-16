package requests

import "mime/multipart"

// Blog Category
type CreateBlogCategoryRequest struct {
	Name        string                `form:"name" binding:"required"`
	Slug        string                `form:"slug" binding:"required"`
	Type        string                `form:"type"`
	Description *string               `form:"description"`
	Image       *multipart.FileHeader `form:"image"`
	IsActive    bool                  `form:"is_active"`
	Order       int                   `form:"order"`
}

type UpdateBlogCategoryRequest struct {
	Name        string                `form:"name"`
	Slug        string                `form:"slug"`
	Type        string                `form:"type"`
	Description *string               `form:"description"`
	Image       *multipart.FileHeader `form:"image"`
	RemoveImage bool                  `form:"remove_image"`
	IsActive    *bool                 `form:"is_active"`
	Order       *int                  `form:"order"`
}

// Blog Article
type CreateBlogArticleRequest struct {
	Title       string                `form:"title" binding:"required"`
	Slug        string                `form:"slug" binding:"required"`
	Excerpt     *string               `form:"excerpt"`
	Content     string                `form:"content" binding:"required"`
	CoverImage  *multipart.FileHeader `form:"cover_image"`
	CategoryID  uint                  `form:"category_id" binding:"required"`
	AuthorName  string                `form:"author_name"`
	Status      string                `form:"status"`
	IsFeatured  bool                  `form:"is_featured"`
	MetaTitle   *string               `form:"meta_title"`
	MetaDesc    *string               `form:"meta_desc"`
}

type UpdateBlogArticleRequest struct {
	Title       string                `form:"title"`
	Slug        string                `form:"slug"`
	Excerpt     *string               `form:"excerpt"`
	Content     string                `form:"content"`
	CoverImage  *multipart.FileHeader `form:"cover_image"`
	RemoveImage bool                  `form:"remove_image"`
	CategoryID  *uint                 `form:"category_id"`
	AuthorName  string                `form:"author_name"`
	Status      string                `form:"status"`
	IsFeatured  *bool                 `form:"is_featured"`
	MetaTitle   *string               `form:"meta_title"`
	MetaDesc    *string               `form:"meta_desc"`
}

// Blog Story
type CreateBlogStoryRequest struct {
	Title       string                `form:"title" binding:"required"`
	Slug        string                `form:"slug" binding:"required"`
	Description *string               `form:"description"`
	CoverImage  *multipart.FileHeader `form:"cover_image"`
	CategoryID  uint                  `form:"category_id" binding:"required"`
	AuthorName  string                `form:"author_name"`
	Status      string                `form:"status"`
	MetaTitle   *string               `form:"meta_title"`
	MetaDesc    *string               `form:"meta_desc"`
}

type UpdateBlogStoryRequest struct {
	Title       string                `form:"title"`
	Slug        string                `form:"slug"`
	Description *string               `form:"description"`
	CoverImage  *multipart.FileHeader `form:"cover_image"`
	RemoveImage bool                  `form:"remove_image"`
	CategoryID  *uint                 `form:"category_id"`
	AuthorName  string                `form:"author_name"`
	Status      string                `form:"status"`
	MetaTitle   *string               `form:"meta_title"`
	MetaDesc    *string               `form:"meta_desc"`
}

// Blog Story Page
type CreateBlogStoryPageRequest struct {
	PageNum int                   `form:"page_num" binding:"required"`
	Title   *string               `form:"title"`
	Content string                `form:"content" binding:"required"`
	Image   *multipart.FileHeader `form:"image"`
}

type UpdateBlogStoryPageRequest struct {
	PageNum     *int                  `form:"page_num"`
	Title       *string               `form:"title"`
	Content     string                `form:"content"`
	Image       *multipart.FileHeader `form:"image"`
	RemoveImage bool                  `form:"remove_image"`
}

// Blog Comment
type CreateBlogCommentRequest struct {
	ArticleID   *uint  `json:"article_id"`
	StoryID     *uint  `json:"story_id"`
	StoryPageID *uint  `json:"story_page_id"`
	UserName    string `json:"user_name" binding:"required"`
	Email       string `json:"email"`
	Content     string `json:"content" binding:"required"`
}

// Blog Rating
type CreateBlogRatingRequest struct {
	ArticleID *uint `json:"article_id"`
	StoryID   *uint `json:"story_id"`
	Rating    int   `json:"rating" binding:"required,min=1,max=5"`
}
