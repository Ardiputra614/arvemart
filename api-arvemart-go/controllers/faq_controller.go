package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetFaqs(c *gin.Context) {
	var faqs []models.Faq
	if err := config.DB.Order("\"order\" ASC").Find(&faqs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal mengambil data FAQ",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": faqs,
	})
}

func CreateFaq(c *gin.Context) {
	var input models.Faq
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Format input tidak valid: " + err.Error(),
		})
		return
	}

	if input.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Pertanyaan wajib diisi"})
		return
	}
	if input.Answer == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Jawaban wajib diisi"})
		return
	}

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal menyimpan FAQ: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code":    201,
		"message": "FAQ berhasil ditambahkan",
		"data":    input,
	})
}

func UpdateFaq(c *gin.Context) {
	id := c.Param("id")

	var faq models.Faq
	if err := config.DB.First(&faq, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "FAQ tidak ditemukan!",
		})
		return
	}

	var input models.Faq
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Format input tidak valid: " + err.Error(),
		})
		return
	}

	if input.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Pertanyaan wajib diisi"})
		return
	}
	if input.Answer == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "Jawaban wajib diisi"})
		return
	}

	if err := config.DB.Model(&faq).Updates(map[string]interface{}{
		"question": input.Question,
		"answer":   input.Answer,
		"order":    input.Order,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal mengupdate FAQ: " + err.Error(),
		})
		return
	}

	config.DB.First(&faq, id)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "FAQ berhasil diupdate",
		"data":    faq,
	})
}

func DeleteFaq(c *gin.Context) {
	id := c.Param("id")

	var faq models.Faq
	if err := config.DB.First(&faq, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "FAQ tidak ditemukan!",
		})
		return
	}

	if err := config.DB.Delete(&faq).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Gagal menghapus FAQ: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "FAQ berhasil dihapus",
	})
}
