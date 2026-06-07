package controllers

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetHistory(h *gin.Context) {
	orderID := h.Param("order_id")

	var history models.Transaction

	err := config.DB.Where("order_id = ?", orderID).First(&history).Error

	if err != nil {
		h.JSON(http.StatusNotFound, gin.H{"code": 400, "message": "data tidak ditemukan"})
		return
	}

	// Jika user terautentikasi, pastikan transaksi miliknya
	if userID, exists := h.Get("user_id"); exists {
		if uid, ok := userID.(uint); ok && history.UserID != nil && *history.UserID != uid {
			h.JSON(http.StatusForbidden, gin.H{"message": "Bukan transaksi anda"})
			return
		}
	}

	h.JSON(http.StatusOK, gin.H{"message": "Berhasil", "data": history})
}