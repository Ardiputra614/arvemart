package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/requests"
	"api-arveshop-go/utils"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func blogSlugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	// Remove special chars except hyphens
	result := make([]rune, 0, len(s))
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result = append(result, r)
		}
	}
	return string(result)
}

// ===== BLOG UPLOAD =====

func UploadBlogImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "File tidak ditemukan"})
		return
	}
	if err := utils.ValidateImage(file); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid: " + err.Error()})
		return
	}
	result, err := utils.UploadFile(file, "blog/content")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "url": result.SecureURL})
}

// ===== BLOG CATEGORIES =====

func GetBlogCategoriesHome(c *gin.Context) {
	typeParam := c.DefaultQuery("type", "")
	var categories []models.BlogCategory
	query := config.DB.Where("is_active = ?", true)
	if typeParam != "" {
		query = query.Where("type = ? OR type = ?", typeParam, "both")
	}
	if err := query.Order("`order` ASC, id DESC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": categories})
}

func GetBlogCategories(c *gin.Context) {
	typeParam := c.DefaultQuery("type", "")
	var categories []models.BlogCategory
	query := config.DB
	if typeParam != "" {
		query = query.Where("type = ? OR type = ?", typeParam, "both")
	}
	if err := query.Order("`order` ASC, id DESC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": categories})
}

func CreateBlogCategory(c *gin.Context) {
	var req requests.CreateBlogCategoryRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	slug := req.Slug
	if slug == "" {
		slug = blogSlugify(req.Name)
	}

	var imageURL *string
	if req.Image != nil {
		if err := utils.ValidateImage(req.Image); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid: " + err.Error()})
			return
		}
		result, err := utils.UploadFile(req.Image, "blog/categories")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		imageURL = &result.SecureURL
	}

	categoryType := models.BlogCategoryType(req.Type)
	if categoryType == "" {
		categoryType = models.BlogCategoryTypeBoth
	}

	category := models.BlogCategory{
		Name:        req.Name,
		Slug:        slug,
		Type:        categoryType,
		Description: req.Description,
		Image:       imageURL,
		IsActive:    req.IsActive,
		Order:       req.Order,
	}

	if err := config.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menambah kategori: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Berhasil", "data": category})
}

func UpdateBlogCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.BlogCategory
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Kategori tidak ditemukan"})
		return
	}

	var req requests.UpdateBlogCategoryRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Slug != "" {
		category.Slug = req.Slug
	}
	if req.Type != "" {
		category.Type = models.BlogCategoryType(req.Type)
	}
	if req.Description != nil {
		category.Description = req.Description
	}
	if req.IsActive != nil {
		category.IsActive = *req.IsActive
	}
	if req.Order != nil {
		category.Order = *req.Order
	}

	if req.RemoveImage {
		if category.Image != nil {
			_ = utils.DeleteFile(*category.Image)
		}
		category.Image = nil
	} else if req.Image != nil {
		if category.Image != nil {
			_ = utils.DeleteFile(*category.Image)
		}
		if err := utils.ValidateImage(req.Image); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid"})
			return
		}
		result, err := utils.UploadFile(req.Image, "blog/categories")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		category.Image = &result.SecureURL
	}

	if err := config.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate kategori"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": category})
}

func DeleteBlogCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.BlogCategory
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Kategori tidak ditemukan"})
		return
	}

	if category.Image != nil {
		_ = utils.DeleteFile(*category.Image)
	}

	if err := config.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus kategori"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil menghapus"})
}

// ===== BLOG ARTICLES =====

func GetBlogArticlesPublic(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "12")
	categorySlug := c.DefaultQuery("category", "")
	search := c.DefaultQuery("search", "")
	status := c.DefaultQuery("status", "published")

	var articles []models.BlogArticle
	query := config.DB.Preload("Category")

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if categorySlug != "" {
		query = query.Joins("JOIN blog_categories ON blog_categories.id = blog_articles.category_id AND blog_categories.slug = ?", categorySlug)
	}
	if search != "" {
		query = query.Where("title LIKE ? OR excerpt LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Model(&models.BlogArticle{}).Count(&total)

	var p, l int
	p = 1
	l = 12
	if page != "" {
		parsed := 0
		for _, ch := range page {
			if ch >= '0' && ch <= '9' {
				parsed = parsed*10 + int(ch-'0')
			}
		}
		if parsed > 0 {
			p = parsed
		}
	}
	if limit != "" {
		parsed := 0
		for _, ch := range limit {
			if ch >= '0' && ch <= '9' {
				parsed = parsed*10 + int(ch-'0')
			}
		}
		if parsed > 0 {
			l = parsed
		}
	}

	offset := (p - 1) * l
	if err := query.Order("published_at DESC, id DESC").Offset(offset).Limit(l).Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}

	totalPages := int(total) / l
	if int(total)%l != 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil",
		"data":    articles,
		"meta": gin.H{
			"page":       p,
			"limit":      l,
			"total":      total,
			"total_page": totalPages,
		},
	})
}

func GetBlogArticlesAdmin(c *gin.Context) {
	var articles []models.BlogArticle
	if err := config.DB.Preload("Category").Order("id DESC").Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": articles})
}

func GetBlogArticleBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var article models.BlogArticle
	if err := config.DB.Preload("Category").Where("slug = ? AND status = ?", slug, "published").First(&article).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Artikel tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": article})
}

func GetBlogArticleByID(c *gin.Context) {
	id := c.Param("id")
	var article models.BlogArticle
	if err := config.DB.Preload("Category").First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Artikel tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": article})
}

func CreateBlogArticle(c *gin.Context) {
	var req requests.CreateBlogArticleRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	slug := req.Slug
	if slug == "" {
		slug = blogSlugify(req.Title)
	}

	status := models.BlogArticleStatus(req.Status)
	if status == "" {
		status = models.BlogArticleDraft
	}

	authorName := req.AuthorName
	if authorName == "" {
		authorName = "Admin"
	}

	var coverImage, coverPID *string
	if req.CoverImage != nil {
		if err := utils.ValidateImage(req.CoverImage); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid: " + err.Error()})
			return
		}
		result, err := utils.UploadFile(req.CoverImage, "blog/articles")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		coverImage = &result.SecureURL
		coverPID = &result.PublicID
	}

	var publishedAt *time.Time
	if status == models.BlogArticlePublished {
		now := time.Now()
		publishedAt = &now
	}

	article := models.BlogArticle{
		Title:         req.Title,
		Slug:          slug,
		Excerpt:       req.Excerpt,
		Content:       req.Content,
		CoverImage:    coverImage,
		CoverImagePID: coverPID,
		CategoryID:    req.CategoryID,
		AuthorName:    authorName,
		Status:        status,
		IsFeatured:    req.IsFeatured,
		MetaTitle:     req.MetaTitle,
		MetaDesc:      req.MetaDesc,
		PublishedAt:   publishedAt,
	}

	if err := config.DB.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan artikel: " + err.Error()})
		return
	}

	config.DB.Preload("Category").First(&article, article.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Berhasil", "data": article})
}

func UpdateBlogArticle(c *gin.Context) {
	id := c.Param("id")
	var article models.BlogArticle
	if err := config.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Artikel tidak ditemukan"})
		return
	}

	var req requests.UpdateBlogArticleRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	if req.Title != "" {
		article.Title = req.Title
	}
	if req.Slug != "" {
		article.Slug = req.Slug
	}
	if req.Excerpt != nil {
		article.Excerpt = req.Excerpt
	}
	if req.Content != "" {
		article.Content = req.Content
	}
	if req.CategoryID != nil {
		article.CategoryID = *req.CategoryID
	}
	if req.AuthorName != "" {
		article.AuthorName = req.AuthorName
	}
	if req.Status != "" {
		article.Status = models.BlogArticleStatus(req.Status)
		if article.Status == models.BlogArticlePublished && article.PublishedAt == nil {
			now := time.Now()
			article.PublishedAt = &now
		}
	}
	if req.IsFeatured != nil {
		article.IsFeatured = *req.IsFeatured
	}
	if req.MetaTitle != nil {
		article.MetaTitle = req.MetaTitle
	}
	if req.MetaDesc != nil {
		article.MetaDesc = req.MetaDesc
	}

	if req.RemoveImage {
		if article.CoverImagePID != nil {
			_ = utils.DeleteFile(*article.CoverImagePID)
		}
		article.CoverImage = nil
		article.CoverImagePID = nil
	} else if req.CoverImage != nil {
		if article.CoverImagePID != nil {
			_ = utils.DeleteFile(*article.CoverImagePID)
		}
		if err := utils.ValidateImage(req.CoverImage); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid"})
			return
		}
		result, err := utils.UploadFile(req.CoverImage, "blog/articles")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		article.CoverImage = &result.SecureURL
		article.CoverImagePID = &result.PublicID
	}

	if err := config.DB.Save(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate artikel"})
		return
	}

	config.DB.Preload("Category").First(&article, article.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": article})
}

func DeleteBlogArticle(c *gin.Context) {
	id := c.Param("id")
	var article models.BlogArticle
	if err := config.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Artikel tidak ditemukan"})
		return
	}

	if article.CoverImagePID != nil {
		_ = utils.DeleteFile(*article.CoverImagePID)
	}

	if err := config.DB.Delete(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus artikel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil menghapus"})
}

func ToggleBlogArticle(c *gin.Context) {
	id := c.Param("id")
	var article models.BlogArticle
	if err := config.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Artikel tidak ditemukan"})
		return
	}

	if article.Status == models.BlogArticlePublished {
		article.Status = models.BlogArticleDraft
		article.PublishedAt = nil
	} else {
		article.Status = models.BlogArticlePublished
		now := time.Now()
		article.PublishedAt = &now
	}

	if err := config.DB.Save(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate status"})
		return
	}

	config.DB.Preload("Category").First(&article, article.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": article})
}

// ===== BLOG STORIES =====

func GetBlogStoriesPublic(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "12")
	categorySlug := c.DefaultQuery("category", "")
	search := c.DefaultQuery("search", "")

	var stories []models.BlogStory
	query := config.DB.Preload("Category").Where("status = ?", "published")

	if categorySlug != "" {
		query = query.Joins("JOIN blog_categories ON blog_categories.id = blog_stories.category_id AND blog_categories.slug = ?", categorySlug)
	}
	if search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Model(&models.BlogStory{}).Count(&total)

	p, _ := strconv.Atoi(page)
	l, _ := strconv.Atoi(limit)
	if p < 1 {
		p = 1
	}
	if l < 1 {
		l = 12
	}

	offset := (p - 1) * l
	if err := query.Order("created_at DESC").Offset(offset).Limit(l).Find(&stories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}

	totalPages := int(total) / l
	if int(total)%l != 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil",
		"data":    stories,
		"meta": gin.H{
			"page":       p,
			"limit":      l,
			"total":      total,
			"total_page": totalPages,
		},
	})
}

func GetBlogStoriesAdmin(c *gin.Context) {
	var stories []models.BlogStory
	if err := config.DB.Preload("Category").Order("id DESC").Find(&stories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": stories})
}

func GetBlogStoryBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var story models.BlogStory
	if err := config.DB.Preload("Category").Where("slug = ? AND status = ?", slug, "published").First(&story).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cerita tidak ditemukan"})
		return
	}

	var pages []models.BlogStoryPage
	config.DB.Where("story_id = ?", story.ID).Order("page_num ASC").Find(&pages)
	story.TotalPages = len(pages)

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": story, "pages": pages})
}

func GetBlogStoryByID(c *gin.Context) {
	id := c.Param("id")
	var story models.BlogStory
	if err := config.DB.Preload("Category").First(&story, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cerita tidak ditemukan"})
		return
	}

	var pages []models.BlogStoryPage
	config.DB.Where("story_id = ?", story.ID).Order("page_num ASC").Find(&pages)
	story.TotalPages = len(pages)

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": story, "pages": pages})
}

func CreateBlogStory(c *gin.Context) {
	var req requests.CreateBlogStoryRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	slug := req.Slug
	if slug == "" {
		slug = blogSlugify(req.Title)
	}

	status := models.BlogStoryStatus(req.Status)
	if status == "" {
		status = models.BlogStoryDraft
	}

	authorName := req.AuthorName
	if authorName == "" {
		authorName = "Admin"
	}

	var coverImage, coverPID *string
	if req.CoverImage != nil {
		if err := utils.ValidateImage(req.CoverImage); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid"})
			return
		}
		result, err := utils.UploadFile(req.CoverImage, "blog/stories")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		coverImage = &result.SecureURL
		coverPID = &result.PublicID
	}

	var publishedAt *time.Time
	if status == models.BlogStoryPublished {
		now := time.Now()
		publishedAt = &now
	}

	story := models.BlogStory{
		Title:         req.Title,
		Slug:          slug,
		Description:   req.Description,
		CoverImage:    coverImage,
		CoverImagePID: coverPID,
		CategoryID:    req.CategoryID,
		AuthorName:    authorName,
		Status:        status,
		MetaTitle:     req.MetaTitle,
		MetaDesc:      req.MetaDesc,
		PublishedAt:   publishedAt,
	}

	if err := config.DB.Create(&story).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan cerita: " + err.Error()})
		return
	}

	config.DB.Preload("Category").First(&story, story.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Berhasil", "data": story})
}

func UpdateBlogStory(c *gin.Context) {
	id := c.Param("id")
	var story models.BlogStory
	if err := config.DB.First(&story, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cerita tidak ditemukan"})
		return
	}

	var req requests.UpdateBlogStoryRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	if req.Title != "" {
		story.Title = req.Title
	}
	if req.Slug != "" {
		story.Slug = req.Slug
	}
	if req.Description != nil {
		story.Description = req.Description
	}
	if req.CategoryID != nil {
		story.CategoryID = *req.CategoryID
	}
	if req.AuthorName != "" {
		story.AuthorName = req.AuthorName
	}
	if req.Status != "" {
		story.Status = models.BlogStoryStatus(req.Status)
		if story.Status == models.BlogStoryPublished && story.PublishedAt == nil {
			now := time.Now()
			story.PublishedAt = &now
		}
	}
	if req.MetaTitle != nil {
		story.MetaTitle = req.MetaTitle
	}
	if req.MetaDesc != nil {
		story.MetaDesc = req.MetaDesc
	}

	if req.RemoveImage {
		if story.CoverImagePID != nil {
			_ = utils.DeleteFile(*story.CoverImagePID)
		}
		story.CoverImage = nil
		story.CoverImagePID = nil
	} else if req.CoverImage != nil {
		if story.CoverImagePID != nil {
			_ = utils.DeleteFile(*story.CoverImagePID)
		}
		if err := utils.ValidateImage(req.CoverImage); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid"})
			return
		}
		result, err := utils.UploadFile(req.CoverImage, "blog/stories")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		story.CoverImage = &result.SecureURL
		story.CoverImagePID = &result.PublicID
	}

	if err := config.DB.Save(&story).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate cerita"})
		return
	}

	config.DB.Preload("Category").First(&story, story.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": story})
}

func DeleteBlogStory(c *gin.Context) {
	id := c.Param("id")
	var story models.BlogStory
	if err := config.DB.First(&story, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cerita tidak ditemukan"})
		return
	}

	if story.CoverImagePID != nil {
		_ = utils.DeleteFile(*story.CoverImagePID)
	}

	// Delete all pages
	config.DB.Where("story_id = ?", id).Delete(&models.BlogStoryPage{})

	if err := config.DB.Delete(&story).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus cerita"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil menghapus"})
}

func ToggleBlogStory(c *gin.Context) {
	id := c.Param("id")
	var story models.BlogStory
	if err := config.DB.First(&story, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cerita tidak ditemukan"})
		return
	}

	if story.Status == models.BlogStoryPublished {
		story.Status = models.BlogStoryDraft
		story.PublishedAt = nil
	} else {
		story.Status = models.BlogStoryPublished
		now := time.Now()
		story.PublishedAt = &now
	}

	if err := config.DB.Save(&story).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate status"})
		return
	}

	config.DB.Preload("Category").First(&story, story.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": story})
}

// ===== BLOG STORY PAGES =====

func GetBlogStoryPages(c *gin.Context) {
	storyID := c.Param("id")
	var pages []models.BlogStoryPage
	if err := config.DB.Where("story_id = ?", storyID).Order("page_num ASC").Find(&pages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": pages})
}

func CreateBlogStoryPage(c *gin.Context) {
	storyID := c.Param("id")
	var story models.BlogStory
	if err := config.DB.First(&story, storyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cerita tidak ditemukan"})
		return
	}

	var req requests.CreateBlogStoryPageRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	var image *string
	if req.Image != nil {
		if err := utils.ValidateImage(req.Image); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid"})
			return
		}
		result, err := utils.UploadFile(req.Image, "blog/story-pages")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		image = &result.SecureURL
	}

	page := models.BlogStoryPage{
		StoryID: story.ID,
		PageNum: req.PageNum,
		Title:   req.Title,
		Content: req.Content,
		Image:   image,
	}

	if err := config.DB.Create(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan halaman: " + err.Error()})
		return
	}

	// Update total pages
	var count int64
	config.DB.Model(&models.BlogStoryPage{}).Where("story_id = ?", story.ID).Count(&count)
	config.DB.Model(&story).Update("total_pages", count)

	c.JSON(http.StatusCreated, gin.H{"message": "Berhasil", "data": page})
}

func UpdateBlogStoryPage(c *gin.Context) {
	pageID := c.Param("pageId")
	var page models.BlogStoryPage
	if err := config.DB.First(&page, pageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Halaman tidak ditemukan"})
		return
	}

	var req requests.UpdateBlogStoryPageRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	if req.PageNum != nil {
		page.PageNum = *req.PageNum
	}
	if req.Title != nil {
		page.Title = req.Title
	}
	if req.Content != "" {
		page.Content = req.Content
	}

	if req.RemoveImage {
		page.Image = nil
	} else if req.Image != nil {
		if err := utils.ValidateImage(req.Image); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Gambar tidak valid"})
			return
		}
		result, err := utils.UploadFile(req.Image, "blog/story-pages")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal upload gambar"})
			return
		}
		page.Image = &result.SecureURL
	}

	if err := config.DB.Save(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate halaman"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": page})
}

func DeleteBlogStoryPage(c *gin.Context) {
	pageID := c.Param("pageId")
	var page models.BlogStoryPage
	if err := config.DB.First(&page, pageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Halaman tidak ditemukan"})
		return
	}

	storyID := page.StoryID

	if err := config.DB.Delete(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus halaman"})
		return
	}

	// Update total pages & renumber
	var pages []models.BlogStoryPage
	config.DB.Where("story_id = ?", storyID).Order("page_num ASC").Find(&pages)
	for i, p := range pages {
		newNum := i + 1
		if p.PageNum != newNum {
			config.DB.Model(&p).Update("page_num", newNum)
		}
	}
	config.DB.Model(&models.BlogStory{}).Where("id = ?", storyID).Update("total_pages", len(pages))

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil menghapus"})
}

func ReorderBlogStoryPages(c *gin.Context) {
	storyID := c.Param("id")
	var body struct {
		PageIDs []uint `json:"page_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	for i, pageID := range body.PageIDs {
		config.DB.Model(&models.BlogStoryPage{}).Where("id = ? AND story_id = ?", pageID, storyID).Update("page_num", i+1)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil mengurutkan"})
}

// ===== BLOG COMMENTS =====

func GetBlogComments(c *gin.Context) {
	articleID := c.Query("article_id")
	storyID := c.Query("story_id")
	storyPageID := c.Query("story_page_id")

	var comments []models.BlogComment
	query := config.DB.Where("is_approved = ?", true)

	if articleID != "" {
		query = query.Where("article_id = ?", articleID)
	}
	if storyID != "" {
		query = query.Where("story_id = ? AND story_page_id IS NULL", storyID)
	}
	if storyPageID != "" {
		query = query.Where("story_page_id = ?", storyPageID)
	}

	if err := query.Order("created_at DESC").Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": comments})
}

func GetBlogCommentsAdmin(c *gin.Context) {
	var comments []models.BlogComment
	query := config.DB

	articleID := c.Query("article_id")
	storyID := c.Query("story_id")
	if articleID != "" {
		query = query.Where("article_id = ?", articleID)
	}
	if storyID != "" {
		query = query.Where("story_id = ?", storyID)
	}

	if err := query.Preload("Article").Preload("Story").Order("created_at DESC").Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": comments})
}

func CreateBlogComment(c *gin.Context) {
	var req requests.CreateBlogCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	comment := models.BlogComment{
		ArticleID:   req.ArticleID,
		StoryID:     req.StoryID,
		StoryPageID: req.StoryPageID,
		UserName:    req.UserName,
		Email:       &req.Email,
		Content:     req.Content,
	}

	if err := config.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan komentar"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Berhasil", "data": comment})
}

func DeleteBlogComment(c *gin.Context) {
	id := c.Param("id")
	var comment models.BlogComment
	if err := config.DB.First(&comment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Komentar tidak ditemukan"})
		return
	}
	if err := config.DB.Delete(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus komentar"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil menghapus"})
}

func ToggleBlogComment(c *gin.Context) {
	id := c.Param("id")
	var comment models.BlogComment
	if err := config.DB.First(&comment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Komentar tidak ditemukan"})
		return
	}
	comment.IsApproved = !comment.IsApproved
	if err := config.DB.Save(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengupdate komentar"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": comment})
}

// ===== BLOG RATINGS =====

func GetBlogRatings(c *gin.Context) {
	articleID := c.Query("article_id")
	storyID := c.Query("story_id")

	var avgRating float64
	var ratingCount int64

	query := config.DB.Model(&models.BlogRating{})
	if articleID != "" {
		query = query.Where("article_id = ?", articleID)
	}
	if storyID != "" {
		query = query.Where("story_id = ?", storyID)
	}

	query.Count(&ratingCount)
	query.Select("COALESCE(AVG(rating), 0)").Row().Scan(&avgRating)

	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil",
		"data": gin.H{
			"avg":   avgRating,
			"count": ratingCount,
		},
	})
}

func CreateBlogRating(c *gin.Context) {
	var req requests.CreateBlogRatingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	ip := c.ClientIP()

	// Check duplicate
	var existing models.BlogRating
	query := config.DB.Where("ip_address = ?", ip)
	if req.ArticleID != nil {
		query = query.Where("article_id = ?", *req.ArticleID)
	}
	if req.StoryID != nil {
		query = query.Where("story_id = ?", *req.StoryID)
	}

	if err := query.First(&existing).Error; err == nil {
		existing.Rating = req.Rating
		config.DB.Save(&existing)
		c.JSON(http.StatusOK, gin.H{"message": "Rating diperbarui", "data": existing})
		return
	}

	rating := models.BlogRating{
		ArticleID: req.ArticleID,
		StoryID:   req.StoryID,
		IPAddress: ip,
		Rating:    req.Rating,
	}

	if err := config.DB.Create(&rating).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan rating"})
		return
	}

	// Update story avg rating
	if req.StoryID != nil {
		var avg float64
		var count int64
		config.DB.Model(&models.BlogRating{}).Where("story_id = ?", *req.StoryID).Count(&count)
		config.DB.Model(&models.BlogRating{}).Where("story_id = ?", *req.StoryID).Select("COALESCE(AVG(rating), 0)").Row().Scan(&avg)
		config.DB.Model(&models.BlogStory{}).Where("id = ?", *req.StoryID).Updates(map[string]interface{}{
			"avg_rating":   avg,
			"rating_count": count,
		})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Berhasil", "data": rating})
}

// ===== BLOG VIEWS =====

func RecordBlogView(c *gin.Context) {
	var body struct {
		ArticleID *uint `json:"article_id"`
		StoryID   *uint `json:"story_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	ip := c.ClientIP()
	ua := c.GetHeader("User-Agent")
	referer := c.GetHeader("Referer")

	// Deduplicate: max 1 view per IP per hour per content
	var count int64
	query := config.DB.Model(&models.BlogView{}).Where(
		"ip_address = ? AND created_at > ?", ip, time.Now().Add(-1*time.Hour),
	)
	if body.ArticleID != nil {
		query = query.Where("article_id = ?", *body.ArticleID)
	}
	if body.StoryID != nil {
		query = query.Where("story_id = ?", *body.StoryID)
	}
	query.Count(&count)

	if count > 0 {
		c.JSON(http.StatusOK, gin.H{"message": "Already counted"})
		return
	}

	view := models.BlogView{
		ArticleID: body.ArticleID,
		StoryID:   body.StoryID,
		IPAddress: ip,
		UserAgent: ua,
		Referer:   &referer,
	}

	if err := config.DB.Create(&view).Error; err != nil {
		log.Printf("Failed to record view: %v", err)
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
		return
	}

	// Increment counter
	if body.ArticleID != nil {
		config.DB.Model(&models.BlogArticle{}).Where("id = ?", *body.ArticleID).UpdateColumn("view_count", gorm.Expr("view_count + 1"))
	}
	if body.StoryID != nil {
		config.DB.Model(&models.BlogStory{}).Where("id = ?", *body.StoryID).UpdateColumn("view_count", gorm.Expr("view_count + 1"))
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Recorded"})
}
