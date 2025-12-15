package services

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type Client struct {
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	UserID   string
	Username string
	Role     string
}

type BroadcastMessage struct {
	Type      string      `json:"type"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data"`
}

type CommandExecutedData struct {
	UserID   string      `json:"user_id"`
	Username string      `json:"username"`
	Command  string      `json:"command"`
	Payload  interface{} `json:"payload,omitempty"`
}

type StatusUpdateData struct {
	Status interface{} `json:"status"`
}

type UserConnectionData struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 54 * time.Second
	maxMessageSize = 512
)

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

func (h *Hub) Run() {
	log.Println("🔌 WebSocket hub started")

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			log.Printf("✅ WebSocket client connected: %s (%d total)", client.Username, len(h.clients))

			// Broadcast user connection to all clients
			h.BroadcastUserConnected(client.UserID, client.Username)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				log.Printf("❌ WebSocket client disconnected: %s (%d remaining)", client.Username, len(h.clients))

				// Broadcast user disconnection
				h.BroadcastUserDisconnected(client.UserID, client.Username)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
					// Message sent successfully
				default:
					// Client send channel full, close connection
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) BroadcastCommandExecuted(userID, username, command string, payload interface{}) {
	msg := BroadcastMessage{
		Type:      "command_executed",
		Timestamp: time.Now().Format(time.RFC3339),
		Data: CommandExecutedData{
			UserID:   userID,
			Username: username,
			Command:  command,
			Payload:  payload,
		},
	}
	h.broadcastMessage(msg)
}

func (h *Hub) BroadcastStatusUpdate(status interface{}) {
	msg := BroadcastMessage{
		Type:      "status_update",
		Timestamp: time.Now().Format(time.RFC3339),
		Data: StatusUpdateData{
			Status: status,
		},
	}
	h.broadcastMessage(msg)
}

func (h *Hub) BroadcastUserConnected(userID, username string) {
	msg := BroadcastMessage{
		Type:      "user_connected",
		Timestamp: time.Now().Format(time.RFC3339),
		Data: UserConnectionData{
			UserID:   userID,
			Username: username,
		},
	}
	h.broadcastMessage(msg)
}

func (h *Hub) BroadcastUserDisconnected(userID, username string) {
	msg := BroadcastMessage{
		Type:      "user_disconnected",
		Timestamp: time.Now().Format(time.RFC3339),
		Data: UserConnectionData{
			UserID:   userID,
			Username: username,
		},
	}
	h.broadcastMessage(msg)
}

func (h *Hub) broadcastMessage(msg BroadcastMessage) {
	jsonData, err := json.Marshal(msg)
	if err != nil {
		log.Printf("❌ Failed to marshal broadcast message: %v", err)
		return
	}

	h.broadcast <- jsonData
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle incoming messages from client (if needed)
		// For now, we only broadcast from server to clients
		log.Printf("Received message from %s: %s", c.Username, string(message))
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
