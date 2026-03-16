package hardware

import (
	"av-control/internal/models"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"time"
)

const (
	maxGetRetries = 2
	retryDelay    = 300 * time.Millisecond
)

type RealHardwareClient struct {
	baseURL string
	client  *http.Client
	cb      *CircuitBreaker
}

func NewRealHardwareClient() *RealHardwareClient {
	transport := &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 5,
		IdleConnTimeout:     60 * time.Second,
		DisableKeepAlives:   false,
	}

	return &RealHardwareClient{
		baseURL: "http://localhost:8080",
		client: &http.Client{
			Timeout:   3 * time.Second,
			Transport: transport,
		},
		cb: NewCircuitBreaker(),
	}
}

// get executes a single GET request (no retry). Protected by circuit breaker.
func (r *RealHardwareClient) get(path string, result interface{}) error {
	if !r.cb.Allow() {
		return ErrCircuitOpen
	}

	resp, err := r.client.Get(r.baseURL + path)
	if err != nil {
		r.cb.RecordFailure()
		return fmt.Errorf("HTTP GET failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// Don't count application-level errors as circuit failures
		return fmt.Errorf("hardware error (HTTP %d): %s", resp.StatusCode, string(body))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	r.cb.RecordSuccess()
	return nil
}

// getRetry executes a GET request with automatic retry on transient failures.
// Safe for all GET endpoints since they are idempotent.
func (r *RealHardwareClient) getRetry(path string, result interface{}) error {
	var lastErr error
	for attempt := 0; attempt <= maxGetRetries; attempt++ {
		if attempt > 0 {
			delay := retryDelay * time.Duration(attempt)
			log.Printf("⚠️  Hardware GET retry %d/%d for %s (wait %v)", attempt, maxGetRetries, path, delay)
			time.Sleep(delay)
		}

		lastErr = r.get(path, result)
		if lastErr == nil {
			if attempt > 0 {
				log.Printf("✅ Hardware GET %s succeeded after %d retries", path, attempt)
			}
			return nil
		}
	}
	log.Printf("❌ Hardware GET %s failed after %d retries: %v", path, maxGetRetries, lastErr)
	return lastErr
}

// post executes a single POST request (never retried to avoid duplicate commands).
// Protected by circuit breaker.
func (r *RealHardwareClient) post(path string, payload interface{}, result interface{}) error {
	if !r.cb.Allow() {
		return ErrCircuitOpen
	}

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
		r.cb.RecordFailure()
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

	r.cb.RecordSuccess()
	return nil
}

// ============================================================================
// PRESETS
// ============================================================================

func (r *RealHardwareClient) GetPresets() (*models.PresetsResponse, error) {
	var response models.PresetsResponse
	err := r.getRetry("/api/device/presets", &response)
	return &response, err
}

func (r *RealHardwareClient) GetCurrentPreset() (*models.CurrentPresetResponse, error) {
	var response models.CurrentPresetResponse
	err := r.getRetry("/api/device/presets/current", &response)
	return &response, err
}

func (r *RealHardwareClient) LoadPreset(presetID string) error {
	payload := map[string]string{"id": presetID}
	return r.post("/api/device/presets/load", payload, nil)
}

func (r *RealHardwareClient) SavePreset(presetID string) error {
	payload := map[string]string{"id": presetID}
	return r.post("/api/device/presets/save", payload, nil)
}

// ============================================================================
// PLAYER
// ============================================================================

func (r *RealHardwareClient) GetSources() (*models.SourcesResponse, error) {
	var response models.SourcesResponse
	err := r.getRetry("/api/device/player/sources", &response)
	return &response, err
}

func (r *RealHardwareClient) SelectSource(sourceID int) error {
	payload := map[string]int{"id": sourceID}
	return r.post("/api/device/player/source", payload, nil)
}

func (r *RealHardwareClient) GetSongs() (*models.SongsResponse, error) {
	var response models.SongsResponse
	err := r.getRetry("/api/device/player/songs", &response)
	return &response, err
}

func (r *RealHardwareClient) SelectSong(songID int) error {
	payload := map[string]int{"id": songID}
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

func (r *RealHardwareClient) Seek(time int) error {
	payload := map[string]int{"pos": time}
	return r.post("/api/device/player/seek", payload, nil)
}

func (r *RealHardwareClient) SetRepeatMode(mode string) error {
	payload := map[string]string{"mode": mode}
	return r.post("/api/device/player/repeat", payload, nil)
}

func (r *RealHardwareClient) GetPlayerStatus() (*models.PlayerStatus, error) {
	var response models.PlayerStatus
	err := r.getRetry("/api/device/player/status", &response)
	return &response, err
}

func (r *RealHardwareClient) SetFade(fade int) error {
	payload := map[string]int{"fade": fade}
	return r.post("/api/device/player/fade", payload, nil)
}

// ============================================================================
// RECORDER
// ============================================================================

func (r *RealHardwareClient) StartRecording(filename string) (string, error) {
	// Se filename vuoto, non inviare payload (daemon genera automatico)
	var payload interface{}
	if filename != "" {
		payload = map[string]string{"filename": filename}
	}

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
	err := r.getRetry("/api/device/recorder/status", &response)
	return &response, err
}

func (r *RealHardwareClient) GetRecorderSources() (map[string]interface{}, error) {
	var response map[string]interface{}
	err := r.getRetry("/api/device/recorder/sources", &response)
	return response, err
}

func (r *RealHardwareClient) SetRecorderSource(left, right int) error {
	payload := map[string]int{"left": left, "right": right}
	return r.post("/api/device/recorder/source", payload, nil)
}

// ============================================================================
// CONTROLS
// ============================================================================

func (r *RealHardwareClient) GetControls() (*models.ControlsResponse, error) {
	var response models.ControlsResponse
	err := r.getRetry("/api/device/controls", &response)
	return &response, err
}

func (r *RealHardwareClient) GetControlValue(controlID string) (*models.ControlValue, error) {
	var volumeResp struct {
		ID     int     `json:"id"`
		Volume float64 `json:"volume"`
	}

	// Try volume first
	err := r.get("/api/device/controls/volume/"+controlID, &volumeResp)
	if err == nil {
		return &models.ControlValue{
			ID:    controlID,
			Value: volumeResp.Volume,
		}, nil
	}

	// Try mute
	var muteResp struct {
		ID   int  `json:"id"`
		Mute bool `json:"mute"`
	}

	err = r.get("/api/device/controls/mute/"+controlID, &muteResp)
	if err != nil {
		return nil, err
	}

	return &models.ControlValue{
		ID:    controlID,
		Value: muteResp.Mute,
	}, nil
}

func (r *RealHardwareClient) SetControlValue(controlID string, value interface{}) error {
	payload := map[string]interface{}{"value": value}

	switch v := value.(type) {
	case float64, int:
		return r.post("/api/device/controls/volume/"+controlID, payload, nil)
	case bool:
		return r.post("/api/device/controls/mute/"+controlID, payload, nil)
	default:
		return fmt.Errorf("unsupported control value type: %T", v)
	}
}

// ============================================================================
// STREAMING
// ============================================================================

func (r *RealHardwareClient) GetStreamingStatus() (*models.StreamingStatus, error) {
	var response models.StreamingStatus
	err := r.getRetry("/api/device/st1/status", &response)
	return &response, err
}

func (r *RealHardwareClient) StartStreaming() error {
	return r.post("/api/device/st1/play", nil, nil)
}

func (r *RealHardwareClient) StopStreaming() error {
	return r.post("/api/device/st1/stop", nil, nil)
}

// ============================================================================
// SYSTEM
// ============================================================================

func (r *RealHardwareClient) GetSystemStatus() (*models.SystemStatus, error) {
	var response models.SystemStatus
	err := r.getRetry("/api/device/status", &response)
	return &response, err
}

func (r *RealHardwareClient) GetSystemInfo() (*models.SystemInfo, error) {
	var response models.SystemInfo
	err := r.getRetry("/api/device/info", &response)
	return &response, err
}

// GetDirect esegue una GET request diretta (pubblico per handler)
func (r *RealHardwareClient) GetDirect(path string, result interface{}) error {
	return r.getRetry(path, result)
}
