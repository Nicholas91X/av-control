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
	Role     string `json:"role" binding:"required,oneof=admin installatore prete"`
	FullName string `json:"full_name" binding:"required"`
	Email    string `json:"email"`
}

type UpdateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	IsActive *bool  `json:"is_active"`
}

type UserResponse struct {
	ID                 string `json:"id"`
	Username           string `json:"username"`
	Role               string `json:"role"`
	FullName           string `json:"full_name"`
	Email              string `json:"email"`
	IsActive           bool   `json:"is_active"`
	IsSystemUser       bool   `json:"is_system_user"`
	MustChangePassword bool   `json:"must_change_password"`
	CreatedAt          string `json:"created_at"`
}

func toUserResponse(u models.User) UserResponse {
	return UserResponse{
		ID:                 u.ID,
		Username:           u.Username,
		Role:               u.Role,
		FullName:           u.FullName,
		Email:              u.Email,
		IsActive:           u.IsActive,
		IsSystemUser:       u.IsSystemUser,
		MustChangePassword: u.MustChangePassword,
		CreatedAt:          u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// canManageUser returns true if the requestor is allowed to edit the target user.
//
//   - admin: can manage everyone
//   - installatore: can manage self or any prete
//   - prete: can only manage self
func canManageUser(requestorID, requestorRole string, target models.User) bool {
	switch requestorRole {
	case "admin":
		return true
	case "installatore":
		return requestorID == target.ID || target.Role == "prete"
	case "prete":
		return requestorID == target.ID
	}
	return false
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	requestorRole := c.GetString("role")

	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success:   false,
			Error:     err.Error(),
			ErrorCode: "INVALID_REQUEST",
		})
		return
	}

	// installatore can only create prete accounts
	if requestorRole == "installatore" && req.Role != "prete" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success:   false,
			Error:     "Installatore can only create prete accounts",
			ErrorCode: "FORBIDDEN",
		})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to hash password",
			ErrorCode: "INTERNAL_ERROR",
		})
		return
	}

	creatorID := c.GetString("user_id")
	user := models.User{
		ID:                 uuid.New().String(),
		Username:           req.Username,
		PasswordHash:       string(hashedPassword),
		Role:               req.Role,
		FullName:           req.FullName,
		Email:              req.Email,
		IsActive:           true,
		IsSystemUser:       false,
		MustChangePassword: req.Role == "prete", // new prete accounts must change password
		CreatedBy:          creatorID,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to create user (username might be taken)",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, toUserResponse(user))
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	requestorID := c.GetString("user_id")
	requestorRole := c.GetString("role")

	var users []models.User
	switch requestorRole {
	case "admin":
		h.db.Find(&users)
	case "installatore":
		// sees self + all prete accounts
		h.db.Where("id = ? OR role = ?", requestorID, "prete").Find(&users)
	default:
		// prete: sees only self
		h.db.Where("id = ?", requestorID).Find(&users)
	}

	var response []UserResponse
	for _, u := range users {
		response = append(response, toUserResponse(u))
	}

	if response == nil {
		response = []UserResponse{}
	}

	c.JSON(http.StatusOK, response)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success:   false,
			Error:     "Missing user ID",
			ErrorCode: "INVALID_REQUEST",
		})
		return
	}

	requestorID := c.GetString("user_id")
	requestorRole := c.GetString("role")

	var target models.User
	if err := h.db.First(&target, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Success:   false,
			Error:     "User not found",
			ErrorCode: "NOT_FOUND",
		})
		return
	}

	if !canManageUser(requestorID, requestorRole, target) {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success:   false,
			Error:     "Insufficient permissions",
			ErrorCode: "FORBIDDEN",
		})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success:   false,
			Error:     err.Error(),
			ErrorCode: "INVALID_REQUEST",
		})
		return
	}

	updates := map[string]interface{}{}

	if req.Username != "" && req.Username != target.Username {
		updates["username"] = req.Username
	}
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	// Only admin can toggle active status or change roles
	if requestorRole == "admin" {
		if req.IsActive != nil {
			updates["is_active"] = *req.IsActive
		}
		if req.Role != "" && req.Role != target.Role {
			validRoles := map[string]bool{"admin": true, "installatore": true, "prete": true}
			if validRoles[req.Role] {
				updates["role"] = req.Role
			}
		}
	}

	// Password change resets the must_change_password flag
	if req.Password != "" {
		if len(req.Password) < 6 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Success:   false,
				Error:     "Password must be at least 6 characters",
				ErrorCode: "INVALID_REQUEST",
			})
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success:   false,
				Error:     "Failed to hash password",
				ErrorCode: "INTERNAL_ERROR",
			})
			return
		}
		updates["password_hash"] = string(hashedPassword)
		updates["must_change_password"] = false
	}

	if len(updates) == 0 {
		c.JSON(http.StatusOK, toUserResponse(target))
		return
	}

	if err := h.db.Model(&target).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success:   false,
			Error:     "Failed to update user",
			ErrorCode: "DATABASE_ERROR",
		})
		return
	}

	// Reload to return fresh data
	h.db.First(&target, "id = ?", id)
	c.JSON(http.StatusOK, toUserResponse(target))
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

	requestorID := c.GetString("user_id")
	if id == requestorID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success:   false,
			Error:     "Cannot delete your own account",
			ErrorCode: "FORBIDDEN_ACTION",
		})
		return
	}

	var target models.User
	if err := h.db.First(&target, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Success:   false,
			Error:     "User not found",
			ErrorCode: "NOT_FOUND",
		})
		return
	}

	if target.IsSystemUser {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success:   false,
			Error:     "System users cannot be deleted",
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

	c.JSON(http.StatusOK, models.SuccessResponse{Success: true})
}
