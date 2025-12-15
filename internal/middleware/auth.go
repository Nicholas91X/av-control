package middleware

import (
	"av-control/internal/models"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

func JWTAuthMiddleware(jwtSecret string, db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Extract Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, models.ErrorResponse{
				Success:   false,
				Error:     "Missing authorization header",
				ErrorCode: "UNAUTHORIZED",
			})
			return
		}

		// 2. Check Bearer format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(401, models.ErrorResponse{
				Success:   false,
				Error:     "Invalid authorization format",
				ErrorCode: "UNAUTHORIZED",
			})
			return
		}

		tokenString := parts[1]

		// 3. Parse and validate JWT
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(401, models.ErrorResponse{
				Success:   false,
				Error:     "Invalid or expired token",
				ErrorCode: "INVALID_TOKEN",
			})
			return
		}

		// 4. Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(401, models.ErrorResponse{
				Success:   false,
				Error:     "Invalid token claims",
				ErrorCode: "INVALID_TOKEN",
			})
			return
		}

		userID, _ := claims["user_id"].(string)
		username, _ := claims["username"].(string)
		role, _ := claims["role"].(string)

		// 5. Hash token and verify session exists in DB
		tokenHash := sha256.Sum256([]byte(tokenString))
		tokenHashStr := hex.EncodeToString(tokenHash[:])

		var session models.Session
		result := db.Where("token_hash = ? AND expires_at > ?", tokenHashStr, time.Now()).First(&session)
		if result.Error != nil {
			c.AbortWithStatusJSON(401, models.ErrorResponse{
				Success:   false,
				Error:     "Session not found or expired",
				ErrorCode: "SESSION_EXPIRED",
			})
			return
		}

		// 6. Verify user still exists and is active
		var user models.User
		result = db.First(&user, "id = ? AND is_active = ?", userID, true)
		if result.Error != nil {
			c.AbortWithStatusJSON(401, models.ErrorResponse{
				Success:   false,
				Error:     "User not found or inactive",
				ErrorCode: "USER_INACTIVE",
			})
			return
		}

		// 7. Set user info in context
		c.Set("user_id", userID)
		c.Set("username", username)
		c.Set("role", role)

		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole := c.GetString("role")
		if userRole == "" {
			c.AbortWithStatusJSON(401, models.ErrorResponse{
				Success:   false,
				Error:     "Unauthorized",
				ErrorCode: "UNAUTHORIZED",
			})
			return
		}

		// Check if user's role is in allowed roles
		allowed := false
		for _, role := range roles {
			if userRole == role {
				allowed = true
				break
			}
		}

		if !allowed {
			c.AbortWithStatusJSON(403, models.ErrorResponse{
				Success:   false,
				Error:     "Insufficient permissions",
				ErrorCode: "FORBIDDEN",
			})
			return
		}

		c.Next()
	}
}
