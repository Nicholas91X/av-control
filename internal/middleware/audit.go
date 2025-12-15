package middleware

import (
	"av-control/internal/services"
	"time"

	"github.com/gin-gonic/gin"
)

func AuditMiddleware(auditService *services.AuditService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Record start time
		startTime := time.Now()

		// Process request
		c.Next()

		// Skip audit for non-device endpoints
		if !shouldAudit(c.FullPath()) {
			return
		}

		// Calculate execution time
		executionTime := time.Since(startTime).Milliseconds()

		// Get user info from context (set by auth middleware)
		userID := c.GetString("user_id")
		username := c.GetString("username")

		// If no user (shouldn't happen for protected routes), skip
		if userID == "" {
			return
		}

		// Determine command type from path and method
		commandType := getCommandType(c)

		// Get request body for payload (if applicable)
		payload := ""
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			if bodyBytes, exists := c.Get("request_body"); exists {
				payload = string(bodyBytes.([]byte))
			}
		}

		// Determine success from status code
		success := c.Writer.Status() >= 200 && c.Writer.Status() < 300

		// Get error message if failed
		errorMsg := ""
		if !success {
			if errMsg, exists := c.Get("error_message"); exists {
				errorMsg = errMsg.(string)
			}
		}

		// Detect remote vs local access
		isRemote := isRemoteAccess(c.ClientIP())

		// Queue audit log entry (async, non-blocking)
		auditService.LogCommand(services.CommandLogEntry{
			UserID:          userID,
			Username:        username,
			CommandType:     commandType,
			CommandPayload:  payload,
			Success:         success,
			ErrorMessage:    errorMsg,
			ExecutionTimeMs: executionTime,
			IsRemoteAccess:  isRemote,
			ClientIP:        c.ClientIP(),
		})
	}
}

func shouldAudit(path string) bool {
	// Only audit device command endpoints
	return len(path) > 0 &&
		(path == "/api/device/status" ||
			path == "/api/device/presets/load" ||
			path == "/api/device/player/source" ||
			path == "/api/device/player/song" ||
			path == "/api/device/player/play" ||
			path == "/api/device/player/pause" ||
			path == "/api/device/player/stop" ||
			path == "/api/device/player/next" ||
			path == "/api/device/player/previous" ||
			path == "/api/device/player/repeat" ||
			path == "/api/device/recorder/start" ||
			path == "/api/device/recorder/stop" ||
			path == "/api/device/controls/:id")
}

func getCommandType(c *gin.Context) string {
	// Map path to command type
	path := c.FullPath()
	method := c.Request.Method

	// Examples:
	// POST /api/device/player/play -> "player.play"
	// POST /api/device/presets/load -> "presets.load"
	// POST /api/device/controls/:id -> "controls.set"

	switch path {
	case "/api/device/presets/load":
		return "presets.load"
	case "/api/device/player/source":
		return "player.source.select"
	case "/api/device/player/song":
		return "player.song.select"
	case "/api/device/player/play":
		return "player.play"
	case "/api/device/player/pause":
		return "player.pause"
	case "/api/device/player/stop":
		return "player.stop"
	case "/api/device/player/next":
		return "player.next"
	case "/api/device/player/previous":
		return "player.previous"
	case "/api/device/player/repeat":
		return "player.repeat"
	case "/api/device/recorder/start":
		return "recorder.start"
	case "/api/device/recorder/stop":
		return "recorder.stop"
	case "/api/device/controls/:id":
		controlID := c.Param("id")
		if method == "POST" {
			return "controls." + controlID + ".set"
		}
		return "controls." + controlID + ".get"
	default:
		return "unknown"
	}
}

func isRemoteAccess(clientIP string) bool {
	// Simple local detection (localhost, 192.168.x.x, 10.x.x.x)
	if clientIP == "127.0.0.1" || clientIP == "::1" || clientIP == "localhost" {
		return false
	}
	// TODO: More sophisticated detection based on network configuration
	return true
}
