package jobs

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"api-arveshop-go/services"
	"log"
	"time"
)

var lastSaldoNotified float64

func StartSaldoMonitor() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			checkSaldo()
		}
	}()
	log.Println("✅ Saldo monitor started (every 5 min)")
}

func checkSaldo() {
	var profil models.ProfilAplikasi
	if err := config.DB.First(&profil).Error; err != nil {
		log.Printf("❌ Saldo monitor: gagal ambil profil: %v", err)
		return
	}

	if profil.Saldo < 200000 && profil.Saldo != lastSaldoNotified {
		log.Printf("💰 Saldo rendah: Rp %.0f, kirim notif Telegram", profil.Saldo)
		services.Telegram.SendSaldoLowNotification(profil.Saldo)
		lastSaldoNotified = profil.Saldo
	}

	if profil.Saldo >= 200000 {
		lastSaldoNotified = 0
	}
}
