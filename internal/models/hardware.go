package models

// Presets
type Preset struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type PresetsResponse struct {
	Presets []Preset `json:"presets"`
}

type CurrentPresetResponse struct {
	ID string `json:"id"`
}

// Player
type Source struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type SourcesResponse struct {
	Sources []Source `json:"sources"`
}

type Song struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type SongsResponse struct {
	Songs []Song `json:"songs"`
}

type PlayerStatus struct {
	SongTitle   string `json:"song_title"`
	State       string `json:"state"`
	CurrentTime int    `json:"current_time"`
	TotalTime   int    `json:"total_time"`
	RepeatMode  string `json:"repeat_mode"`
}

// Recorder
type RecorderStatus struct {
	State       string `json:"state"`
	Filename    string `json:"filename,omitempty"`
	CurrentTime int    `json:"current_time,omitempty"`
}

// Controls
type Control struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Min      *int   `json:"min,omitempty"`
	Max      *int   `json:"max,omitempty"`
	SecondID *int   `json:"second_id,omitempty"`
}

type ControlsResponse struct {
	Controls []Control `json:"controls"`
}

type ControlValue struct {
	ID    string      `json:"id"`
	Value interface{} `json:"value"`
}

// System Status
type SystemStatus struct {
	Connected bool                  `json:"connected"`
	Preset    CurrentPresetResponse `json:"preset"`
	Player    PlayerStatus          `json:"player"`
	Recorder  RecorderStatus        `json:"recorder"`
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
