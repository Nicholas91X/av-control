package models

// Presets
type Preset struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type PresetsResponse struct {
	Presets []Preset `json:"presets"`
}

type CurrentPresetResponse struct {
	PresetID int    `json:"preset_id"`
	Name     string `json:"name"`
}

// Player
type Source struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"` // device, storage, group
}

type SourcesResponse struct {
	Sources []Source `json:"sources"`
}

type Song struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Duration int    `json:"duration"` // seconds
}

type SongsResponse struct {
	Songs []Song `json:"songs"`
}

type PlayerStatus struct {
	SongTitle   string `json:"song_title"`
	State       string `json:"state"`        // playing, paused, stopped
	CurrentTime int    `json:"current_time"` // seconds
	TotalTime   int    `json:"total_time"`   // seconds
	RepeatMode  string `json:"repeat_mode"`  // none, song, group
	Source      string `json:"source"`
}

// Recorder
type RecorderStatus struct {
	State       string `json:"state"` // recording, stopped
	Filename    string `json:"filename,omitempty"`
	CurrentTime int    `json:"current_time,omitempty"`
}

// Controls
type Control struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"` // range, boolean
	Min  *int   `json:"min,omitempty"`
	Max  *int   `json:"max,omitempty"`
}

type ControlsResponse struct {
	Controls []Control `json:"controls"`
}

type ControlValue struct {
	ID    string      `json:"id"`
	Value interface{} `json:"value"` // int for volume, bool for mute
}

// System Status
type SystemStatus struct {
	Preset   CurrentPresetResponse  `json:"preset"`
	Player   PlayerStatus           `json:"player"`
	Recorder RecorderStatus         `json:"recorder"`
	Controls map[string]interface{} `json:"controls"`
}

// Generic responses
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Success   bool   `json:"success"`
	Error     string `json:"error"`
	ErrorCode string `json:"error_code"`
}
