package middleware

import (
	"net/http"
	"sync"
	"time"

	"sdm-apip-backend/utils"

	"github.com/gin-gonic/gin"
)

type client struct {
	lastSeen time.Time
	count    int
}

var (
	clients = make(map[string]*client)
	mu      sync.Mutex
)

// RateLimiter mengimplementasikan pembatas kecepatan (rate limiter) sederhana berbasis memori
func RateLimiter(limit int, window time.Duration) gin.HandlerFunc {
	// Rutinitas pembersihan (cleanup)
	go func() {
		for {
			time.Sleep(window)
			mu.Lock()
			for ip, c := range clients {
				if time.Since(c.lastSeen) > window {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		mu.Lock()
		defer mu.Unlock()

		if _, found := clients[ip]; !found {
			clients[ip] = &client{lastSeen: time.Now(), count: 1}
			c.Next()
			return
		}

		if time.Since(clients[ip].lastSeen) > window {
			clients[ip].count = 1
			clients[ip].lastSeen = time.Now()
			c.Next()
			return
		}

		if clients[ip].count >= limit {
			utils.ErrorResponse(c, http.StatusTooManyRequests, "Terlalu banyak permintaan", "Batas tingkat terlampaui. Harap coba lagi nanti.")
			c.Abort()
			return
		}

		clients[ip].count++
		clients[ip].lastSeen = time.Now()
		c.Next()
	}
}
