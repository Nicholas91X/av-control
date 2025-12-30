package hardware

import (
	"av-control/internal/models"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type RealHardwareClient struct {
	baseURL string
	client  *http.Client
}

func NewRealHardwareClient() *RealHardwareClient {
	return &RealHardwareClient{
		baseURL: "http://localhost:8080",
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Helper method for GET requests
func (r *RealHardwareClient) get(path string, result interface{}) error {
	resp, err := r.client.Get(r.baseURL + path)
	if err != nil {
		return fmt.Errorf("HTTP GET failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("hardware error (HTTP %d): %s", resp.StatusCode, string(body))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

// Helper method for POST requests
func (r *RealHardwareClient) post(path string, payload interface{}, result interface{}) error {
	var body io.Reader

	if payload != nil {
		jsonData, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("JSON marshal failed: %w", err)
		}
		body = bytes.NewBuffer(jsonData)
	}

	resp, err := r.client.Post(r.baseURL+path, "application/json", body)
	if err != nil {
		return fmt.Errorf("HTTP POST failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("hardware error (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

// ============================================================================
// PRESETS
// ============================================================================

func (r *RealHardwareClient) GetPresets() (*models.PresetsResponse, error) {
	var response models.PresetsResponse
	err := r.get("/api/device/presets", &response)
	return &response, err
}

func (r *RealHardwareClient) GetCurrentPreset() (*models.CurrentPresetResponse, error) {
	var response models.CurrentPresetResponse
	err := r.get("/api/device/presets/current", &response)
	return &response, err
}

func (r *RealHardwareClient) LoadPreset(presetID int) error {
	payload := map[string]int{"id": presetID}
	return r.post("/api/device/presets/load", payload, nil)
}

// ============================================================================
// PLAYER
// ============================================================================

func (r *RealHardwareClient) GetSources() (*models.SourcesResponse, error) {
	var response models.SourcesResponse
	err := r.get("/api/device/player/sources", &response)
	return &response, err
}

func (r *RealHardwareClient) SelectSource(sourceID string) error {
	payload := map[string]string{"source_id": sourceID}
	return r.post("/api/device/player/source", payload, nil)
}

func (r *RealHardwareClient) GetSongs() (*models.SongsResponse, error) {
	var response models.SongsResponse
	err := r.get("/api/device/player/songs", &response)
	return &response, err
}

func (r *RealHardwareClient) SelectSong(songID int) error {
	payload := map[string]int{"song_id": songID}
	return r.post("/api/device/player/song", payload, nil)
}

func (r *RealHardwareClient) Play() error {
	return r.post("/api/device/player/play", nil, nil)
}

func (r *RealHardwareClient) Pause() error {
	return r.post("/api/device/player/pause", nil, nil)
}

func (r *RealHardwareClient) Stop() error {
	return r.post("/api/device/player/stop", nil, nil)
}

func (r *RealHardwareClient) Next() error {
	return r.post("/api/device/player/next", nil, nil)
}

func (r *RealHardwareClient) Previous() error {
	return r.post("/api/device/player/previous", nil, nil)
}

func (r *RealHardwareClient) SetRepeatMode(mode string) error {
	payload := map[string]string{"mode": mode}
	return r.post("/api/device/player/repeat", payload, nil)
}

func (r *RealHardwareClient) GetPlayerStatus() (*models.PlayerStatus, error) {
	var response models.PlayerStatus
	err := r.get("/api/device/player/status", &response)
	return &response, err
}

// ============================================================================
// RECORDER
// ============================================================================

func (r *RealHardwareClient) StartRecording(filename string) (string, error) {
	payload := map[string]string{"filename": filename}

	// Response structure for recording start
	var response struct {
		Filename string `json:"filename"`
	}

	err := r.post("/api/device/recorder/start", payload, &response)
	if err != nil {
		return "", err
	}

	return response.Filename, nil
}

func (r *RealHardwareClient) StopRecording() error {
	return r.post("/api/device/recorder/stop", nil, nil)
}

func (r *RealHardwareClient) GetRecorderStatus() (*models.RecorderStatus, error) {
	var response models.RecorderStatus
	err := r.get("/api/device/recorder/status", &response)
	return &response, err
}

// ============================================================================
// CONTROLS
// ============================================================================

func (r *RealHardwareClient) GetControls() (*models.ControlsResponse, error) {
	var response models.ControlsResponse
	err := r.get("/api/device/controls", &response)
	return &response, err
}

func (r *RealHardwareClient) GetControlValue(controlID string) (*models.ControlValue, error) {
	var response models.ControlValue
	err := r.get("/api/device/controls/"+controlID, &response)
	return &response, err
}

func (r *RealHardwareClient) SetControlValue(controlID string, value interface{}) error {
	payload := map[string]interface{}{"value": value}
	return r.post("/api/device/controls/"+controlID, payload, nil)
}

// ============================================================================
// SYSTEM
// ============================================================================

func (r *RealHardwareClient) GetSystemStatus() (*models.SystemStatus, error) {
	var response models.SystemStatus
	err := r.get("/api/device/status", &response)
	return &response, err
}
