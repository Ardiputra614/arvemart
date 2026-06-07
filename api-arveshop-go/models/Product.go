package models

import (
	"fmt"
	"time"
)

type Product struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// Informasi Dasar
	ProductName string `gorm:"column:product_name;size:255;not null" json:"product_name"`
	Slug        string `gorm:"column:slug;size:255;not null" json:"slug"`
	Category    string `gorm:"column:category;size:255;not null;index" json:"category"`
	Brand       string `gorm:"column:brand;size:255;not null" json:"brand"`
	Type        string `gorm:"column:type;size:255;not null" json:"type"`

	// prepaid / postpaid
	ProductType string `gorm:"column:product_type;size:50;not null;index" json:"product_type"`

	SellerName string `gorm:"column:seller_name;size:255;not null" json:"seller_name"`

	// Harga
	Price        int64 `gorm:"column:price;not null" json:"price"`
	SellingPrice int64 `gorm:"column:selling_price;not null" json:"selling_price"`

	Admin      int64 `gorm:"column:admin;size:255;not null" json:"admin"`
	Commission int64 `gorm:"column:commission;size:255;not null" json:"commission"`

	// SKU dan Status
	BuyerSkuCode       string `gorm:"column:buyer_sku_code;size:255;not null;uniqueIndex" json:"buyer_sku_code"`
	BuyerProductStatus bool   `gorm:"column:buyer_product_status;not null;default:true" json:"buyer_product_status"`
	SellerProductStatus bool  `gorm:"column:seller_product_status;not null;default:true" json:"seller_product_status"`
	UnlimitedStock      bool  `gorm:"column:unlimited_stock;not null;default:false" json:"unlimited_stock"`
	Multi               bool  `gorm:"column:multi;not null;default:false" json:"multi"`

	// Stok (string karena Digiflazz kadang kirim "tersedia" / "habis")
	Stock string `gorm:"column:stock;size:50;not null;default:'0'" json:"stock"`

	// 🟢 CUTOFF TIME - Pakai string biasa
	StartCutOff string `gorm:"column:start_cut_off;size:5;not null;default:'00:00'" json:"start_cut_off"`
	EndCutOff   string `gorm:"column:end_cut_off;size:5;not null;default:'23:59'" json:"end_cut_off"`

	// Deskripsi
	Description string `gorm:"column:description;type:text" json:"desc"`

	// 🔴 TAMBAHKAN FIELD UNTUK JOB QUEUE
	Provider         string     `gorm:"column:provider;size:50;default:'digiflazz'" json:"provider"`
	LastSyncAt       *time.Time `gorm:"column:last_sync_at" json:"last_sync_at"`
	IsActive         bool       `gorm:"column:is_active;default:true" json:"is_active"`
	RetryCount       int        `gorm:"column:retry_count;default:0" json:"retry_count"`
	MaxRetry         int        `gorm:"column:max_retry;default:3" json:"max_retry"`
	RetryInterval    int        `gorm:"column:retry_interval;default:5" json:"retry_interval"` // menit

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName mengembalikan nama tabel yang benar
func (Product) TableName() string {
	return "products"
}

// IsWithinCutoff mengecek apakah waktu sekarang dalam cutoff
func (p *Product) IsWithinCutoff() bool {
	if p.StartCutOff == "" || p.EndCutOff == "" {
		return false
	}

	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local
	}

	now := time.Now().In(loc)
	nowTotal := now.Hour()*60 + now.Minute()

	startHour, startMin, err1 := parseCutOffHourMin(p.StartCutOff)
	endHour, endMin, err2 := parseCutOffHourMin(p.EndCutOff)

	if err1 != nil || err2 != nil {
		return false
	}

	startTotal := startHour*60 + startMin
	endTotal := endHour*60 + endMin

	// ✅ NO CUTOFF (00:00 - 00:00)
	if startTotal == endTotal {
		return false
	}

	// ✅ FULL DAY CUTOFF (optional)
	if startTotal == 0 && endTotal == 23*60+59 {
		return true
	}

	// ✅ OVERNIGHT (contoh: 23:00 - 00:30)
	if startTotal > endTotal {
		return nowTotal >= startTotal || nowTotal <= endTotal
	}

	// ✅ NORMAL
	return nowTotal >= startTotal && nowTotal <= endTotal
}

// GetNextAvailableTime mengembalikan waktu berikutnya bisa diproses
func (p *Product) GetNextAvailableTime() *time.Time {
	if p.StartCutOff == "" || p.EndCutOff == "" {
		return nil
	}

	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local
	}

	now := time.Now().In(loc)

	startHour, startMin, err1 := parseCutOffHourMin(p.StartCutOff)
	endHour, endMin, err2 := parseCutOffHourMin(p.EndCutOff)

	if err1 != nil || err2 != nil {
		return nil
	}

	startTotal := startHour*60 + startMin
	endTotal := endHour*60 + endMin
	nowTotal := now.Hour()*60 + now.Minute()

	// ✅ NO CUTOFF
	if startTotal == endTotal {
		return nil
	}

	// ❌ Kalau tidak dalam cutoff → tidak perlu delay
	if !p.IsWithinCutoff() {
		return nil
	}

	// Bangun waktu end hari ini
	nextTime := time.Date(
		now.Year(), now.Month(), now.Day(),
		endHour, endMin, 0, 0, loc,
	)

	isOvernight := startTotal > endTotal

	// ✅ OVERNIGHT logic
	if isOvernight {
		if nowTotal >= startTotal {
			// contoh: 23:30 → end besok
			nextTime = nextTime.AddDate(0, 0, 1)
		}
		// kalau sekarang <= end (misal 00:10), tidak perlu tambah hari
	}

	// ⏱ buffer 5 menit
	nextTime = nextTime.Add(5 * time.Minute)

	return &nextTime
}

// parseCutOffHourMin parse "HH:MM" atau "H:MM" ke hour dan minute
func parseCutOffHourMin(s string) (int, int, error) {
    var hour, min int
    _, err := fmt.Sscanf(s, "%d:%d", &hour, &min)
    if err != nil {
        return 0, 0, fmt.Errorf("invalid cutoff format: %s", s)
    }
    if hour < 0 || hour > 23 || min < 0 || min > 59 {
        return 0, 0, fmt.Errorf("cutoff out of range: %s", s)
    }
    return hour, min, nil
}

// IsStockAvailable mengecek ketersediaan stok
func (p *Product) IsStockAvailable() bool {
	if p.UnlimitedStock {
		return true
	}
	return p.Stock != "0" && p.Stock != "habis" && p.Stock != ""
}

// CanBeProcessed mengecek apakah produk bisa diproses sekarang
func (p *Product) CanBeProcessed() bool {
	return p.IsActive && p.IsStockAvailable() && !p.IsWithinCutoff()
}

// GetTimeoutDuration mengembalikan timeout berdasarkan kategori
func (p *Product) GetTimeoutDuration() time.Duration {
	slowCategories := map[string]bool{
		"PLN": true, 
		"BPJS": true, 
		"TELKOM": true,
		"PASCABAYAR": true,
	}
	
	if slowCategories[p.Category] {
		return 60 * time.Second
	}
	return 30 * time.Second
}

// UpdateStock memperbarui stok produk
func (p *Product) UpdateStock(newStock string) {
	p.Stock = newStock
	p.UpdatedAt = time.Now()
}

// IsPrepaid mengecek apakah produk prepaid
func (p *Product) IsPrepaid() bool {
	return p.ProductType == "prepaid"
}

// IsPostpaid mengecek apakah produk postpaid
func (p *Product) IsPostpaid() bool {
	return p.ProductType == "postpaid"
}