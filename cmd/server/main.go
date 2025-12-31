package main

import (
	"av-control/internal/database"
	"av-control/internal/handlers"
	"av-control/internal/hardware"
	"av-control/internal/middleware"
	"av-control/internal/models"
	"av-control/internal/services"
	"crypto/rand"
	"encoding/base64"
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	// Load .env file (se esiste)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// 0. Parse command line flags
	useMock := flag.Bool("mock", false, "Use mock hardware client for testing")
	flag.Parse()

	// Set Gin mode from environment
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 1. Initialize Database
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./av-control.db" // Development default
	}
	db, err := database.InitDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	if err := database.SeedDatabase(db); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	// 2. Load or generate JWT secret
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if os.Getenv("GIN_MODE") == "release" {
			log.Fatal("❌ JWT_SECRET environment variable is required in production")
		}
		// Development fallback
		bytes := make([]byte, 32)
		rand.Read(bytes)
		jwtSecret = base64.StdEncoding.EncodeToString(bytes)
		log.Println("⚠️  Using random JWT secret (development only)")
	}

	// 3. Create Hardware Client (MOCK or REAL)
	var hwClient hardware.HardwareClient
	if *useMock {
		log.Println("🔧 Using MOCK hardware client (testing mode)")
		hwClient = hardware.NewMockHardwareClient()
	} else {
		log.Println("🔧 Using REAL hardware client (localhost:8080)")
		hwClient = hardware.NewRealHardwareClient()

		// Test connection to hardware daemon
		if _, err := hwClient.GetSystemStatus(); err != nil {
			log.Printf("⚠️  Warning: Cannot connect to hardware daemon: %v", err)
			log.Println("⚠️  Make sure Svilen's daemon is running on localhost:8080")
		} else {
			log.Println("✅ Hardware daemon connected!")
		}
	}

	// 4. Setup Gin Router
	r := gin.Default()

	// Trust proxy from local network only
	if err := r.SetTrustedProxies([]string{"127.0.0.1", "192.168.0.0/16"}); err != nil {
		log.Printf("⚠️  Failed to set trusted proxies: %v", err)
	}

	// CORS Middleware
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:5173" // Development default
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{corsOrigins},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// ========================================
	// CRITICAL: Serve Static Files FIRST!
	// Must be before API routes to avoid conflicts
	// ========================================
	r.Static("/", "./public")

	// 5. Routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ========================================
	// DEBUG ENDPOINTS (Solo in development)
	// ========================================
	if os.Getenv("GIN_MODE") != "release" {
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
					"database_path":  dbPath,
				})
			})

			debug.GET("/users", func(c *gin.Context) {
				var users []models.User
				db.Find(&users)

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
	}

	// ========================================
	// API ROUTES
	// ========================================
	// Create WebSocket hub and start it
	hub := services.NewHub()
	go hub.Run()

	// Create status poller (polls every 5 seconds)
	statusPoller := services.NewStatusPoller(hwClient, hub, 5*time.Second)
	statusPoller.Start()
	defer statusPoller.Stop()

	// Create and start audit service
	auditService := services.NewAuditService(db)
	auditService.Start()
	defer auditService.Shutdown()

	// Create handlers
	authHandler := handlers.NewAuthHandler(db, jwtSecret)
	deviceHandler := handlers.NewHandler(db, hwClient, hub)
	wsHandler := handlers.NewWebSocketHandler(hub, jwtSecret)
	userHandler := handlers.NewUserHandler(db)

	// WebSocket endpoint
	r.GET("/ws", wsHandler.HandleWebSocket)

	api := r.Group("/api")
	{
		// AUTH ENDPOINTS
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", middleware.JWTAuthMiddleware(jwtSecret, db), authHandler.Logout)
			auth.GET("/me", middleware.JWTAuthMiddleware(jwtSecret, db), authHandler.GetMe)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// USER MANAGEMENT (Admin Only)
		users := api.Group("/users")
		users.Use(middleware.JWTAuthMiddleware(jwtSecret, db))
		users.Use(middleware.RequireRole("admin"))
		{
			users.POST("", userHandler.CreateUser)
			users.GET("", userHandler.ListUsers)
			users.DELETE("/:id", userHandler.DeleteUser)
		}

		// DEVICE ENDPOINTS (Protected with JWT and Audited)
		device := api.Group("/device")
		device.Use(middleware.JWTAuthMiddleware(jwtSecret, db))
		device.Use(middleware.AuditMiddleware(auditService))
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

	// 7. Listen on port 8000
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("🚀 Server starting on :%s", port)
	log.Printf("🔧 Mode: %s", gin.Mode())
	log.Printf("🗄️  Database: %s", dbPath)

	if gin.Mode() != gin.ReleaseMode {
		log.Println("📝 Default credentials: admin / admin123")
		log.Printf("🔌 WebSocket: ws://localhost:%s/ws?token=<JWT>", port)
		log.Printf("📊 Debug endpoints: http://localhost:%s/debug/*", port)
	}

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
