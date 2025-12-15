package handlers

import (
	"av-control/internal/models"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db        *gorm.DB
	jwtSecret []byte
}

func NewAuthHandler(db *gorm.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		db:        db,
		jwtSecret: []byte(jwtSecret),
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	ExpiresIn    int         `json:"expires_in"`
	User         interface{} `json:"user"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	// 1. Parse request
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, models.ErrorResponse{
			Success:   false,
			Error:     "Invalid request",
			ErrorCode: "INVALID_REQUEST",
		})
		return
	}

	// 2. Find user (case-insensitive username, active only)
	var user models.User
	result := h.db.Where("LOWER(username) = LOWER(?) AND is_active = ?", req.Username, true).First(&user)
	if result.Error != nil {
		c.JSON(401, models.ErrorResponse{
			Success:   false,
			Error:     "Invalid credentials",
			ErrorCode: "INVALID_CREDENTIALS",
		})
		return
	}

	// 3. Verify password
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(401, models.ErrorResponse{
			Success:   false,
			Error:     "Invalid credentials",
			ErrorCode: "INVALID_CREDENTIALS",
		})
		return
	}

	// 4. Check for existing active session (ONLY ONE SESSION ALLOWED)
	var existingSession models.Session
	result = h.db.Where("user_id = ? AND expires_at > ?", user.ID, time.Now()).First(&existingSession)
	if result.Error == nil {
		// Session exists
		c.JSON(409, models.ErrorResponse{
			Success:   false,
			Error:     "User already logged in",
			ErrorCode: "ALREADY_LOGGED_IN",
		})
		return
	}

	// 5. Generate JWT access token (24 HOURS)
	accessTokenExpiry := time.Now().Add(24 * time.Hour)
	accessClaims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      accessTokenExpiry.Unix(),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(h.jwtSecret)
	if err != nil {
		c.JSON(500, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to generate token",
			ErrorCode: "TOKEN_GENERATION_ERROR",
		})
		return
	}

	// 6. Generate refresh token (60 DAYS)
	refreshTokenExpiry := time.Now().Add(60 * 24 * time.Hour)
	refreshClaims := jwt.MapClaims{
		"user_id": user.ID,
		"exp":     refreshTokenExpiry.Unix(),
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(h.jwtSecret)
	if err != nil {
		c.JSON(500, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to generate refresh token",
			ErrorCode: "TOKEN_GENERATION_ERROR",
		})
		return
	}

	// 7. Hash tokens for storage (SHA256)
	accessHash := sha256.Sum256([]byte(accessTokenString))
	accessHashStr := hex.EncodeToString(accessHash[:])

	refreshHash := sha256.Sum256([]byte(refreshTokenString))
	refreshHashStr := hex.EncodeToString(refreshHash[:])

	// 8. Create session in database
	session := models.Session{
		ID:               uuid.New().String(),
		UserID:           user.ID,
		TokenHash:        accessHashStr,
		RefreshTokenHash: refreshHashStr,
		DeviceInfo:       c.GetHeader("User-Agent"),
		IPAddress:        c.ClientIP(),
		AccessMethod:     "local", // TODO: detect remote vs local
		ExpiresAt:        accessTokenExpiry,
	}

	if err := h.db.Create(&session).Error; err != nil {
		c.JSON(500, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to create session",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	// 9. Update user last_login
	now := time.Now()
	h.db.Model(&user).Update("last_login", &now)

	// 10. Return success response
	c.JSON(200, LoginResponse{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    86400, // 24 hours in seconds
		User: gin.H{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
			"name":     user.FullName,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Get user_id from context (set by middleware)
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(401, models.ErrorResponse{
			Success:   false,
			Error:     "Unauthorized",
			ErrorCode: "UNAUTHORIZED",
		})
		return
	}

	// Delete ALL sessions for this user
	result := h.db.Where("user_id = ?", userID).Delete(&models.Session{})
	if result.Error != nil {
		c.JSON(500, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to logout",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	c.JSON(200, models.SuccessResponse{Success: true})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// 1. Parse request
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, models.ErrorResponse{
			Success:   false,
			Error:     "Invalid request",
			ErrorCode: "INVALID_REQUEST",
		})
		return
	}

	// 2. Validate refresh token JWT
	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return h.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		c.JSON(401, models.ErrorResponse{
			Success:   false,
			Error:     "Invalid refresh token",
			ErrorCode: "INVALID_TOKEN",
		})
		return
	}

	// 3. Extract user_id from claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(401, models.ErrorResponse{
			Success:   false,
			Error:     "Invalid token claims",
			ErrorCode: "INVALID_TOKEN",
		})
		return
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		c.JSON(401, models.ErrorResponse{
			Success:   false,
			Error:     "Invalid user_id in token",
			ErrorCode: "INVALID_TOKEN",
		})
		return
	}

	// 4. Hash refresh token and find session
	refreshHash := sha256.Sum256([]byte(req.RefreshToken))
	refreshHashStr := hex.EncodeToString(refreshHash[:])

	var session models.Session
	result := h.db.Where("refresh_token_hash = ? AND user_id = ? AND expires_at > ?",
		refreshHashStr, userID, time.Now()).First(&session)

	if result.Error != nil {
		c.JSON(401, models.ErrorResponse{
			Success:   false,
			Error:     "Session not found or expired",
			ErrorCode: "SESSION_EXPIRED",
		})
		return
	}

	// 5. Get user info for new token
	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(500, models.ErrorResponse{
			Success:   false,
			Error:     "User not found",
			ErrorCode: "USER_NOT_FOUND",
		})
		return
	}

	// 6. Generate new access token (24 HOURS)
	newAccessTokenExpiry := time.Now().Add(24 * time.Hour)
	newAccessClaims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      newAccessTokenExpiry.Unix(),
	}
	newAccessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, newAccessClaims)
	newAccessTokenString, err := newAccessToken.SignedString(h.jwtSecret)
	if err != nil {
		c.JSON(500, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to generate new token",
			ErrorCode: "TOKEN_GENERATION_ERROR",
		})
		return
	}

	// 7. Hash new access token
	newAccessHash := sha256.Sum256([]byte(newAccessTokenString))
	newAccessHashStr := hex.EncodeToString(newAccessHash[:])

	// 8. Update session with new token hash and expiry
	updates := map[string]interface{}{
		"token_hash": newAccessHashStr,
		"expires_at": newAccessTokenExpiry,
	}
	if err := h.db.Model(&session).Updates(updates).Error; err != nil {
		c.JSON(500, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to update session",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	// 9. Return new access token
	c.JSON(200, gin.H{
		"access_token": newAccessTokenString,
		"expires_in":   86400, // 24 hours
	})
}
