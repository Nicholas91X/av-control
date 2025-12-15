package main

import (
	"av-control/internal/database"
	"av-control/internal/handlers"
	"av-control/internal/hardware"
	"av-control/internal/middleware"
	"av-control/internal/models"
	"crypto/rand"
	"encoding/base64"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Initialize Database
	db, err := database.InitDB("./av-control.db")
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	if err := database.SeedDatabase(db); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	// 2. Load or generate JWT secret
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// Generate random 32-byte secret
		bytes := make([]byte, 32)
		rand.Read(bytes)
		jwtSecret = base64.StdEncoding.EncodeToString(bytes)
		log.Println("⚠️  Generated random JWT secret (set JWT_SECRET env var for production)")
	}

	// 3. Create Mock Hardware Client
	hwClient := hardware.NewMockHardwareClient()

	// 4. Setup Gin Router
	r := gin.Default()

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 5. Routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ========================================
	// DEBUG ENDPOINTS (Rimuovi in produzione)
	// ========================================
	debug := r.Group("/debug")
	{
		debug.GET("/db-info", func(c *gin.Context) {
			var userCount, sessionCount, logCount int64
			db.Model(&models.User{}).Count(&userCount)
			db.Model(&models.Session{}).Count(&sessionCount)
			db.Model(&models.CommandLog{}).Count(&logCount)

			c.JSON(http.StatusOK, gin.H{
				"users_count":    userCount,
				"sessions_count": sessionCount,
				"logs_count":     logCount,
				"database_path":  "./av-control.db",
			})
		})

		debug.GET("/users", func(c *gin.Context) {
			var users []models.User
			db.Find(&users)

			// Rimuovi password hash dalla risposta
			type SafeUser struct {
				ID       string `json:"id"`
				Username string `json:"username"`
				Role     string `json:"role"`
				FullName string `json:"full_name"`
				Email    string `json:"email"`
				IsActive bool   `json:"is_active"`
			}

			safeUsers := make([]SafeUser, len(users))
			for i, u := range users {
				safeUsers[i] = SafeUser{
					ID:       u.ID,
					Username: u.Username,
					Role:     u.Role,
					FullName: u.FullName,
					Email:    u.Email,
					IsActive: u.IsActive,
				}
			}

			c.JSON(http.StatusOK, safeUsers)
		})

		debug.GET("/mock-status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "Mock client is active",
				"type":    "MockHardwareClient",
			})
		})
	}

	// ========================================
	// API ROUTES
	// ========================================
	api := r.Group("/api")
	{
		// Create handlers
		authHandler := handlers.NewAuthHandler(db, jwtSecret)
		deviceHandler := handlers.NewHandler(db, hwClient)

		// AUTH ENDPOINTS
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", middleware.JWTAuthMiddleware(jwtSecret, db), authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// DEVICE ENDPOINTS (Protected with JWT)
		device := api.Group("/device")
		device.Use(middleware.JWTAuthMiddleware(jwtSecret, db))
		{
			// System Status
			device.GET("/status", deviceHandler.GetSystemStatus)

			// PRESETS
			presets := device.Group("/presets")
			{
				presets.GET("", deviceHandler.GetPresets)
				presets.GET("/current", deviceHandler.GetCurrentPreset)
				presets.POST("/load", deviceHandler.LoadPreset)
			}

			// PLAYER
			player := device.Group("/player")
			{
				player.GET("/sources", deviceHandler.GetSources)
				player.POST("/source", deviceHandler.SelectSource)
				player.GET("/songs", deviceHandler.GetSongs)
				player.POST("/song", deviceHandler.SelectSong)
				player.POST("/play", deviceHandler.Play)
				player.POST("/pause", deviceHandler.Pause)
				player.POST("/stop", deviceHandler.Stop)
				player.POST("/next", deviceHandler.Next)
				player.POST("/previous", deviceHandler.Previous)
				player.POST("/repeat", deviceHandler.SetRepeatMode)
				player.GET("/status", deviceHandler.GetPlayerStatus)
			}

			// RECORDER
			recorder := device.Group("/recorder")
			{
				recorder.POST("/start", deviceHandler.StartRecording)
				recorder.POST("/stop", deviceHandler.StopRecording)
				recorder.GET("/status", deviceHandler.GetRecorderStatus)
			}

			// CONTROLS
			controls := device.Group("/controls")
			{
				controls.GET("", deviceHandler.GetControls)
				controls.GET("/:id", deviceHandler.GetControlValue)
				controls.POST("/:id", deviceHandler.SetControlValue)
			}
		}
	}

	// 6. Serve Static Files
	r.Static("/public", "./public")

	// 7. Listen on port 8000
	log.Println("🚀 Server starting on :8000")
	log.Println("🔐 Auth endpoints:")
	log.Println("   - POST http://localhost:8000/api/auth/login")
	log.Println("   - POST http://localhost:8000/api/auth/logout")
	log.Println("   - POST http://localhost:8000/api/auth/refresh")
	log.Println("📊 Debug endpoints:")
	log.Println("   - http://localhost:8000/debug/db-info")
	log.Println("   - http://localhost:8000/debug/users")
	log.Println("   - http://localhost:8000/debug/mock-status")
	log.Println("✅ Health check: http://localhost:8000/health")
	log.Println("📡 API base: http://localhost:8000/api")
	log.Println("📝 Default credentials: admin / admin123")

	if err := r.Run(":8000"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
