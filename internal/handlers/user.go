package handlers

import (
	"av-control/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required,oneof=admin operator viewer"`
	FullName string `json:"full_name" binding:"required"`
	Email    string `json:"email"`
}

type UserResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success:   false,
			Error:     err.Error(),
			ErrorCode: "INVALID_REQUEST",
		})
		return
	}

	// hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to hash password",
			ErrorCode: "INTERNAL_ERROR",
		})
		return
	}

	// get creator details
	creatorID := c.GetString("user_id")

	user := models.User{
		ID:           uuid.New().String(),
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
		FullName:     req.FullName,
		Email:        req.Email,
		IsActive:     true,
		CreatedBy:    creatorID,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to create user (username might be taken)",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Role:      user.Role,
		FullName:  user.FullName,
		Email:     user.Email,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to fetch users",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	var response []UserResponse
	for _, u := range users {
		response = append(response, UserResponse{
			ID:        u.ID,
			Username:  u.Username,
			Role:      u.Role,
			FullName:  u.FullName,
			Email:     u.Email,
			IsActive:  u.IsActive,
			CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	c.JSON(http.StatusOK, response)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success:   false,
			Error:     "Missing user ID",
			ErrorCode: "INVALID_REQUEST",
		})
		return
	}

	// Prevent deleting yourself
	requestorID := c.GetString("user_id")
	if id == requestorID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success:   false,
			Error:     "Cannot delete your own account",
			ErrorCode: "FORBIDDEN_ACTION",
		})
		return
	}

	if err := h.db.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to delete user",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	// Check if any rows were deleted
	// (GORM Delete with soft delete will succeed even if ID doesn't exist, but it's fine for now)

	c.JSON(http.StatusOK, models.SuccessResponse{Success: true})
}
