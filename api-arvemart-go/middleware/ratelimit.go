package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var (
	rateLimiters     sync.Map
	highRateLimiters sync.Map
	cleanupOnce      sync.Once
)

const (
	// Limit default untuk semua endpoint lain
	rateLimitPerSec = 1
	rateLimitBurst  = 5

	// Limit lebih besar khusus untuk path di highLimitExact
	highRateLimitPerSec = 10
	highRateLimitBurst  = 30
)

// noLimitPrefixes: path yang diawali salah satu prefix ini TANPA LIMIT SAMA SEKALI.
var noLimitPrefixes = []string{
	"/api/webhook/",
}

// highLimitExact: path yang persis sama dengan salah satu ini pakai limit LEBIH BESAR
// (bukan tanpa limit).
var highLimitExact = map[string]bool{
	"/api/categories":      true,
	"/api/services":        true,
	"/api/banners":         true,
	"/api/profil-aplikasi": true,
}

func init() {
	cleanupOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(5 * time.Minute)
			for range ticker.C {
				rateLimiters.Range(func(key, value interface{}) bool {
					limiter := value.(*rate.Limiter)
					if limiter.Tokens() >= float64(rateLimitBurst) {
						rateLimiters.Delete(key)
					}
					return true
				})
				highRateLimiters.Range(func(key, value interface{}) bool {
					limiter := value.(*rate.Limiter)
					if limiter.Tokens() >= float64(highRateLimitBurst) {
						highRateLimiters.Delete(key)
					}
					return true
				})
			}
		}()
	})
}

func isNoLimit(path string) bool {
	for _, prefix := range noLimitPrefixes {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}
	return false
}

func isHighLimit(path string) bool {
	return highLimitExact[path]
}

func getVisitorLimiter(ip string) *rate.Limiter {
	limiter, ok := rateLimiters.Load(ip)
	if !ok {
		l := rate.NewLimiter(rateLimitPerSec, rateLimitBurst)
		rateLimiters.Store(ip, l)
		return l
	}
	return limiter.(*rate.Limiter)
}

func getVisitorLimiterHigh(ip string) *rate.Limiter {
	limiter, ok := highRateLimiters.Load(ip)
	if !ok {
		l := rate.NewLimiter(highRateLimitPerSec, highRateLimitBurst)
		highRateLimiters.Store(ip, l)
		return l
	}
	return limiter.(*rate.Limiter)
}

// RateLimit adalah middleware utama.
//   - /api/webhook/*                         -> TANPA LIMIT sama sekali
//   - /api/categories, /api/services,
//     /api/banners, /api/profil-aplikasi      -> limit LEBIH BESAR (10 req/detik, burst 30)
//   - path lainnya                            -> limit default (1 req/detik, burst 5)
func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		if isNoLimit(path) {
			c.Next()
			return
		}

		ip := c.ClientIP()

		var limiter *rate.Limiter
		if isHighLimit(path) {
			limiter = getVisitorLimiterHigh(ip)
		} else {
			limiter = getVisitorLimiter(ip)
		}

		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Terlalu banyak permintaan. Silakan coba lagi nanti.",
				"retry_after": "60 detik",
			})
			return
		}
		c.Next()
	}
}
