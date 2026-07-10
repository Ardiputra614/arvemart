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
	rateLimiters sync.Map
	cleanupOnce  sync.Once
)

const (
	rateLimitPerSec = 1
	rateLimitBurst  = 5
)

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
			}
		}()
	})
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

func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/webhook/") {
			c.Next()
			return
		}
		ip := c.ClientIP()
		limiter := getVisitorLimiter(ip)
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
