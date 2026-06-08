package requests

import "mime/multipart"

type CreateBannerRequest struct {
	Title       string                `form:"title" binding:"required"`
	Description *string               `form:"description"`
	Image       *multipart.FileHeader `form:"image"`
	Link        *string               `form:"link"`
	Order       int                   `form:"order"`
	IsActive    bool                  `form:"is_active"`
}

type UpdateBannerRequest struct {
	Title       string                `form:"title"`
	Description *string               `form:"description"`
	Image       *multipart.FileHeader `form:"image"`
	RemoveImage bool                  `form:"remove_image"`
	Link        *string               `form:"link"`
	Order       int                   `form:"order"`
	IsActive    *bool                 `form:"is_active"`
}
