package handlers

import (
	"av-control/internal/services"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

type WebSocketHandler struct {
	hub       *services.Hub
	jwtSecret string
	upgrader  websocket.Upgrader
}

func NewWebSocketHandler(hub *services.Hub, jwtSecret string) *WebSocketHandler {
	return &WebSocketHandler{
		hub:       hub,
		jwtSecret: jwtSecret,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// Allow all origins (adjust for production)
				return true
			},
		},
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// 1. Get JWT token from query parameter
	tokenString := c.Query("token")
	if tokenString == "" {
		c.JSON(401, gin.H{"error": "Missing token"})
		return
	}

	// 2. Validate JWT token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(h.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(401, gin.H{"error": "Invalid token"})
		return
	}

	// 3. Extract user info from claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(401, gin.H{"error": "Invalid claims"})
		return
	}

	userID, _ := claims["user_id"].(string)
	username, _ := claims["username"].(string)
	role, _ := claims["role"].(string)

	if userID == "" || username == "" {
		c.JSON(401, gin.H{"error": "Invalid user info"})
		return
	}

	// 4. Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}

	// 5. Create client
	client := &services.Client{
		Hub:      h.hub,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		UserID:   userID,
		Username: username,
		Role:     role,
	}

	// 6. Register client with hub
	h.hub.RegisterClient(client)

	// 7. Start client pumps in goroutines
	go client.WritePump()
	go client.ReadPump()
}
