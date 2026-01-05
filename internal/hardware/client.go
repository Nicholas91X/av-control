package hardware

import "av-control/internal/models"

type HardwareClient interface {
	// Presets
	GetPresets() (*models.PresetsResponse, error)
	GetCurrentPreset() (*models.CurrentPresetResponse, error)
	LoadPreset(presetID string) error

	// Player
	GetSources() (*models.SourcesResponse, error)
	SelectSource(sourceID int) error
	GetSongs() (*models.SongsResponse, error)
	SelectSong(songID int) error
	Play() error
	Pause() error
	Stop() error
	Next() error
	Previous() error
	SetRepeatMode(mode string) error
	GetPlayerStatus() (*models.PlayerStatus, error)

	// Recorder
	StartRecording(filename string) (string, error)
	StopRecording() error
	GetRecorderStatus() (*models.RecorderStatus, error)

	// Controls
	GetControls() (*models.ControlsResponse, error)
	GetControlValue(controlID string) (*models.ControlValue, error)
	SetControlValue(controlID string, value interface{}) error

	// System
	GetSystemStatus() (*models.SystemStatus, error)
}
