package controllers

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SaldoController struct {
	db *gorm.DB
}

func NewSaldoController(db *gorm.DB) *SaldoController {
	return &SaldoController{db: db}
}

// ─── Digiflazz structs ─────────────────────────────────────────────────────────

type digiflazzSaldoRequest struct {
	Cmd      string `json:"cmd"`
	Username string `json:"username"`
	Sign     string `json:"sign"`
}

type digiflazzSaldoResponse struct {
	Data struct {
		Deposit float64 `json:"deposit"`
	} `json:"data"`
}

// ─── ProfilAplikasi model (partial, sesuaikan dengan model aslimu) ─────────────

type profilAplikasiSaldo struct {
	ID     uint    `gorm:"primaryKey"`
	Saldo  float64 `gorm:"column:saldo"`
}

func (profilAplikasiSaldo) TableName() string {
	return "profil_aplikasis"
}

// ─── Helper: buat signature md5(username + apiKey + "depo") ───────────────────

func makeDigiflazzSign(username, apiKey string) string {
	raw := username + apiKey + "depo"
	return fmt.Sprintf("%x", md5.Sum([]byte(raw)))
}

// ─── POST /api/admin/saldo/sync ───────────────────────────────────────────────

func (sc *SaldoController) SyncSaldo(c *gin.Context) {
	username := os.Getenv("DIGIFLAZZ_USERNAME")
	apiKey   := os.Getenv("DIGIFLAZZ_PROD_KEY")

	if username == "" || apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Konfigurasi Digiflazz tidak ditemukan. Pastikan DIGIFLAZZ_USERNAME dan DIGIFLAZZ_PROD_KEY tersedia di .env",
		})
		return
	}

	// ── 1. Panggil API Digiflazz ───────────────────────────────────────────
	reqBody := digiflazzSaldoRequest{
		Cmd:      "deposit",
		Username: username,
		Sign:     makeDigiflazzSign(username, apiKey),
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat request body"})
		return
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Post(
		"https://api.digiflazz.com/v1/cek-saldo",
		"application/json",
		bytes.NewBuffer(bodyBytes),
	)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Gagal menghubungi server Digiflazz: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca response Digiflazz"})
		return
	}

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{
			"error":   "Digiflazz mengembalikan status tidak OK",
			"status":  resp.StatusCode,
			"details": string(respBytes),
		})
		return
	}

	var digiResp digiflazzSaldoResponse
	if err := json.Unmarshal(respBytes, &digiResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Gagal parsing response Digiflazz",
			"details": string(respBytes),
		})
		return
	}

	newSaldo := digiResp.Data.Deposit

	// ── 2. Ambil ID profil dulu (hindari MySQL error 1093) ─────────────────
	var profil profilAplikasiSaldo
	if err := sc.db.Order("id ASC").First(&profil).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Data profil aplikasi belum ada. Buat profil terlebih dahulu."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil profil: " + err.Error()})
		}
		return
	}

	// ── 3. Update pakai primary key langsung ───────────────────────────────
	if err := sc.db.Model(&profil).Update("saldo", newSaldo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan saldo ke database: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Saldo berhasil disinkronkan",
		"saldo":     newSaldo,
		"synced_at": time.Now(),
	})
}

// ─── Tambahkan di routes/routes.go dalam admin group ──────────────────────────
//
//	sc := controllers.NewSaldoController(config.DB)
//	admin.POST("/saldo/sync", sc.SyncSaldo)