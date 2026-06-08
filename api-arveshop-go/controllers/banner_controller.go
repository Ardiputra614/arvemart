package controllers

import (
	"log"
	"net/http"

	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/requests"
	"api-arveshop-go/utils"

	"github.com/gin-gonic/gin"
)

func GetBanners(c *gin.Context) {
	var banners []models.Banner
	err := config.DB.Order("`order` ASC, id DESC").Find(&banners).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil data",
			"error":   err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil",
		"data":    banners,
	})
}

func GetBannersActive(c *gin.Context) {
	var banners []models.Banner
	err := config.DB.Where("is_active = ?", true).Order("`order` ASC, id DESC").Find(&banners).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil data",
			"error":   err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil",
		"data":    banners,
	})
}

func CreateBanner(c *gin.Context) {
	var req requests.CreateBannerRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Data tidak valid",
			"error":   err.Error(),
		})
		return
	}

	var imageURL, imagePublicID string

	if req.Image != nil {
		if err := utils.ValidateImage(req.Image); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Gambar tidak valid: " + err.Error(),
			})
			return
		}
		result, err := utils.UploadFile(req.Image, "banners")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Gagal upload gambar",
				"error":   err.Error(),
			})
			return
		}
		imageURL = result.SecureURL
		imagePublicID = result.PublicID
	}

	banner := models.Banner{
		Title:         req.Title,
		Description:   req.Description,
		Image:         stringToPointer(imageURL),
		ImagePublicID: stringToPointer(imagePublicID),
		Link:          req.Link,
		Order:         req.Order,
		IsActive:      req.IsActive,
	}

	if err := config.DB.Create(&banner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal menambah data",
			"error":   err.Error(),
		})
		return
	}

	config.DB.First(&banner, banner.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Berhasil menambah data",
		"data":    banner,
	})
}

func UpdateBanner(c *gin.Context) {
	id := c.Param("id")
	var req requests.UpdateBannerRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Data tidak valid",
			"error":   err.Error(),
		})
		return
	}

	var banner models.Banner
	if err := config.DB.First(&banner, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "Data tidak ditemukan",
		})
		return
	}

	if req.Title != "" {
		banner.Title = req.Title
	}
	if req.Description != nil {
		banner.Description = req.Description
	}
	if req.Link != nil {
		banner.Link = req.Link
	}
	if req.Order != 0 {
		banner.Order = req.Order
	}
	if req.IsActive != nil {
		banner.IsActive = *req.IsActive
	}

	if req.RemoveImage {
		if banner.ImagePublicID != nil && *banner.ImagePublicID != "" {
			if err := utils.DeleteFile(*banner.ImagePublicID); err != nil {
				log.Printf("Warning: Failed to delete image: %v", err)
			}
		}
		banner.Image = nil
		banner.ImagePublicID = nil
	} else if req.Image != nil {
		if banner.ImagePublicID != nil && *banner.ImagePublicID != "" {
			if err := utils.DeleteFile(*banner.ImagePublicID); err != nil {
				log.Printf("Warning: Failed to delete old image: %v", err)
			}
		}
		if err := utils.ValidateImage(req.Image); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Gambar tidak valid",
				"error":   err.Error(),
			})
			return
		}
		result, err := utils.UploadFile(req.Image, "banners")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Gagal upload gambar",
				"error":   err.Error(),
			})
			return
		}
		secureURL := result.SecureURL
		publicId := result.PublicID
		banner.Image = &secureURL
		banner.ImagePublicID = &publicId
	}

	if err := config.DB.Save(&banner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengupdate data",
			"error":   err.Error(),
		})
		return
	}

	config.DB.First(&banner, banner.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil mengupdate data",
		"data":    banner,
	})
}

func DeleteBanner(c *gin.Context) {
	id := c.Param("id")

	var banner models.Banner
	if err := config.DB.First(&banner, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "Data tidak ditemukan",
		})
		return
	}

	if banner.ImagePublicID != nil && *banner.ImagePublicID != "" {
		if err := utils.DeleteFile(*banner.ImagePublicID); err != nil {
			log.Printf("Warning: Failed to delete image from Cloudinary: %v", err)
		}
	}

	if err := config.DB.Delete(&banner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal menghapus data",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data berhasil dihapus!",
		"data": gin.H{
			"id": id,
		},
	})
}
