package handlers

import (
	"av-control/internal/hardware"
	"av-control/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db       *gorm.DB
	hwClient hardware.HardwareClient
}

func NewHandler(db *gorm.DB, hwClient hardware.HardwareClient) *Handler {
	return &Handler{
		db:       db,
		hwClient: hwClient,
	}
}

// Helper to return error response
func (h *Handler) respondError(c *gin.Context, code int, msg string, errCode string) {
	c.JSON(code, models.ErrorResponse{
		Success:   false,
		Error:     msg,
		ErrorCode: errCode,
	})
}

// Helper to return success response
func (h *Handler) respondSuccess(c *gin.Context, data interface{}) {
	if data == nil {
		c.JSON(http.StatusOK, models.SuccessResponse{Success: true})
	} else {
		c.JSON(http.StatusOK, data)
	}
}

// --- Presets ---

func (h *Handler) GetPresets(c *gin.Context) {
	presets, err := h.hwClient.GetPresets()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, presets)
}

func (h *Handler) GetCurrentPreset(c *gin.Context) {
	preset, err := h.hwClient.GetCurrentPreset()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, preset)
}

func (h *Handler) LoadPreset(c *gin.Context) {
	var req struct {
		ID int `json:"id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error(), "INVALID_REQUEST")
		return
	}

	if err := h.hwClient.LoadPreset(req.ID); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

// --- Player ---

func (h *Handler) GetSources(c *gin.Context) {
	sources, err := h.hwClient.GetSources()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, sources)
}

func (h *Handler) SelectSource(c *gin.Context) {
	var req struct {
		ID string `json:"id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error(), "INVALID_REQUEST")
		return
	}

	if err := h.hwClient.SelectSource(req.ID); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) GetSongs(c *gin.Context) {
	songs, err := h.hwClient.GetSongs()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, songs)
}

func (h *Handler) SelectSong(c *gin.Context) {
	var req struct {
		ID int `json:"id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error(), "INVALID_REQUEST")
		return
	}

	if err := h.hwClient.SelectSong(req.ID); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) Play(c *gin.Context) {
	if err := h.hwClient.Play(); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) Pause(c *gin.Context) {
	if err := h.hwClient.Pause(); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) Stop(c *gin.Context) {
	if err := h.hwClient.Stop(); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) Next(c *gin.Context) {
	if err := h.hwClient.Next(); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) Previous(c *gin.Context) {
	if err := h.hwClient.Previous(); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) SetRepeatMode(c *gin.Context) {
	var req struct {
		Mode string `json:"mode" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error(), "INVALID_REQUEST")
		return
	}

	if err := h.hwClient.SetRepeatMode(req.Mode); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) GetPlayerStatus(c *gin.Context) {
	status, err := h.hwClient.GetPlayerStatus()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, status)
}

// --- Recorder ---

func (h *Handler) StartRecording(c *gin.Context) {
	var req struct {
		Filename string `json:"filename" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error(), "INVALID_REQUEST")
		return
	}

	actualFilename, err := h.hwClient.StartRecording(req.Filename)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, gin.H{"filename": actualFilename})
}

func (h *Handler) StopRecording(c *gin.Context) {
	if err := h.hwClient.StopRecording(); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

func (h *Handler) GetRecorderStatus(c *gin.Context) {
	status, err := h.hwClient.GetRecorderStatus()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, status)
}

// --- Controls ---

func (h *Handler) GetControls(c *gin.Context) {
	controls, err := h.hwClient.GetControls()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, controls)
}

func (h *Handler) GetControlValue(c *gin.Context) {
	controlID := c.Param("id")
	if controlID == "" {
		h.respondError(c, http.StatusBadRequest, "Missing control ID", "INVALID_REQUEST")
		return
	}

	val, err := h.hwClient.GetControlValue(controlID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, val)
}

func (h *Handler) SetControlValue(c *gin.Context) {
	controlID := c.Param("id")
	if controlID == "" {
		h.respondError(c, http.StatusBadRequest, "Missing control ID", "INVALID_REQUEST")
		return
	}

	var req struct {
		Value interface{} `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error(), "INVALID_REQUEST")
		return
	}

	if err := h.hwClient.SetControlValue(controlID, req.Value); err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, nil)
}

// --- System ---

func (h *Handler) GetSystemStatus(c *gin.Context) {
	status, err := h.hwClient.GetSystemStatus()
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, err.Error(), "HARDWARE_ERROR")
		return
	}
	h.respondSuccess(c, status)
}
