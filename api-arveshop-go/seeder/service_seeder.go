package seeder

import (
	"api-arveshop-go/models"
	"fmt"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

func SeedServices(db *gorm.DB) {
	rand.Seed(time.Now().UnixNano())

	logo := "https://res.cloudinary.com/dzdjh1mps/image/upload/v1773848093/services/logos/shopeepay_1773848092.jpg"
	logoPublicID := "services/logos/shopeepay_1773848092"

	var services []models.Service

	for i := 1; i <= 100; i++ {
		// Random format
		format := "satu_input"
		if rand.Intn(2) == 1 {
			format = "dua_input"
		}

		// Optional fields
		var field2Label *string
		var field2Placeholder *string

		if format == "dua_input" {
			label := "Zone ID"
			placeholder := "Masukkan Zone ID"
			field2Label = &label
			field2Placeholder = &placeholder
		}

		// Optional description
		var description *string
		if rand.Intn(2) == 1 {
			desc := fmt.Sprintf("Deskripsi service ke-%d", i)
			description = &desc
		}

		// Optional notes
		var notes *string
		if rand.Intn(2) == 1 {
			n := "Pastikan data yang dimasukkan benar"
			notes = &n
		}

		// Example format
		var example *string
		if format == "dua_input" {
			ex := "123456(1234)"
			example = &ex
		} else {
			ex := "12345678"
			example = &ex
		}

		service := models.Service{
			Name:        fmt.Sprintf("Service %d", i),
			Slug:        fmt.Sprintf("service-%d", i),
			Logo:        &logo,
			LogoPublicID: &logoPublicID,
			Icon:        nil,
			IconPublicID: nil,
			CategoryID:  uint(rand.Intn(2) + 1), // random category 1-5

			Description: description,
			HowToTopup:  nil,
			Notes:       notes,

			CustomerNoFormat: format,

			ExampleFormat:     example,
			Field1Label:       "User ID",
			Field1Placeholder: "Masukkan User ID",
			Field2Label:       field2Label,
			Field2Placeholder: field2Placeholder,

			IsActive:  rand.Intn(2) == 1,
			IsPopular: rand.Intn(5) == 1, // lebih jarang popular
			ViewCount: rand.Intn(1000),

			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		services = append(services, service)
	}

	// Insert batch
	if err := db.Create(&services).Error; err != nil {
		panic(err)
	}

	fmt.Println("✅ Seeder Service 100 data berhasil")
}