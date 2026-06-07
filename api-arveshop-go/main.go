package main

import (
	"api-arveshop-go/config"
	"api-arveshop-go/jobs"
	"api-arveshop-go/models"
	"api-arveshop-go/routes"
	"api-arveshop-go/services"
	"api-arveshop-go/utils"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
)

func main() {
	godotenv.Load()
	r := gin.Default()

	// CORS config
	r.Use(cors.New(cors.Config{
		// AllowOrigins: []string{
		// 	"https://arveshop.web.id", "https://arveshop.web.id/wa-api",
		// },
		AllowOrigins: []string{
			"http://localhost:4000", "http://localhost:3000", "http://10.107.72.172:3000",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "x-api-key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Database
	config.ConnectDB()
	config.DB.AutoMigrate(
		&models.Transaction{},
		&models.User{},
		&models.Whatsapp{},
		&models.Service{},
		&models.Product{},
		&models.ProductPasca{},
		&models.PaymentMethod{},
		&models.Category{},
		&models.ProfilAplikasi{},
		&models.CutOffSchedule{},
		&models.EmailVerified{},
		&models.PasswordReset{},
	)

	// seeder.SeedServices(config.DB)

	// Redis untuk Asynq
	config.InitRedis()

	// Cloudinary
	if err := utils.InitCloudinary(); err != nil {
		log.Fatal("Failed to initialize Cloudinary: ", err)
	}

	// 🟢 JALANKAN WORKER DI GOROUTINE
	go startWorker()

	// 🟢 START RETRY MONITOR (untuk job yang pending di database)
	jobs.StartRetryMonitor()

	// 🟢 START RETRY WORKER (untuk queue-based retry)
	jobs.StartRetryWorker()

	// 🟢 START CUT OFF MONITOR (khusus untuk transaksi cut off)
	jobs.StartCutOffMonitor()

	// Routes
	routes.SetupRoutes(r)

	c := cron.New(
		cron.WithChain(
			cron.SkipIfStillRunning(cron.DefaultLogger),
		),
	)

	c.AddFunc("*/10 * * * *", func() {
		log.Println("Sync prepaid started")
		services.SyncDigiflazzProducts("prepaid")
	})

	c.AddFunc("*/10 * * * *", func() {
		log.Println("Sync pasca started")
		services.SyncDigiflazzProducts("pasca")
	})

	c.Start()
	// Jalankan server
	log.Println("🚀 Server running on 0.0.0.0:8080")
	r.Run(":8080")
}

func startWorker() {
	// Set default Redis address
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
	}

	redisOpt := asynq.RedisClientOpt{
		Addr:     redisAddr,
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	}

	// Cek koneksi Redis
	client := asynq.NewClient(redisOpt)
	defer client.Close()
	log.Println("✅ Redis connected for worker")

	// Server config
	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: 10,
		Queues: map[string]int{
			"critical": 6,
			"default":  3,
			"low":      1,
		},
		RetryDelayFunc: func(n int, e error, t *asynq.Task) time.Duration {
			// Cek apakah error karena cut off
			if retryErr, ok := e.(*jobs.RetryableError); ok && retryErr.Code == "CUTOFF" {
				// Untuk cut off, task sudah dihandle oleh monitor
				return 0 * time.Second
			}

			backoff := []time.Duration{1, 3, 5, 10, 15} // dalam menit
			if n == 0 {
				return 0 * time.Second
			}
			if n <= len(backoff) {
				return backoff[n-1] * time.Minute
			}
			return 15 * time.Minute
		},
	})

	// Processor
	processor := jobs.NewDigiflazzProcessor(
		config.DB,
		config.RDB,
		jobs.DigiflazzConfig{
			Username: os.Getenv("DIGIFLAZZ_USERNAME"),
			ProdKey:  os.Getenv("DIGIFLAZZ_PROD_KEY"),
			BaseURL:  "https://api.digiflazz.com",
		},
	)

	// Router
	mux := asynq.NewServeMux()
	mux.HandleFunc(jobs.TaskDigiflazzTopup, processor.ProcessTask)

	log.Println("👷 Worker started, waiting for jobs...")

	// Jalankan server (blocking)
	if err := srv.Run(mux); err != nil {
		log.Printf("❌ Worker error: %v", err)
	}
}
