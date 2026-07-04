// config/redis.go
package config

import (
	"context"
	"log"
	"os"

	"github.com/go-redis/redis/v8"
)

var RDB *redis.Client

func InitRedis() {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		log.Println("REDIS_ADDR kosong, Redis tidak digunakan")
		return
	}

	RDB = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	ctx := context.Background()
	_, err := RDB.Ping(ctx).Result()
	if err != nil {
		log.Printf("Redis tidak tersedia (server tetap berjalan): %v", err)
		RDB = nil
		return
	}

	log.Println("Redis connected")
}