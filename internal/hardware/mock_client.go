package hardware

import (
	"av-control/internal/models"
	"errors"
	"fmt"
	"time"
)

type MockHardwareClient struct {
	// Presets
	presets       []models.Preset
	currentPreset int

	// Player
	sources          []models.Source
	songs            []models.Song
	currentSource    string
	currentSongID    int
	playerState      string // "playing", "paused", "stopped"
	repeatMode       string // "none", "song", "group"
	currentSongTime  int    // Simulated time
	lastStatusUpdate time.Time

	// Recorder
	recorderState     string // "recording", "stopped"
	recorderFilename  string
	recorderStartTime time.Time

	// Controls
	volume int
	muted  bool
}

func NewMockHardwareClient() *MockHardwareClient {
	return &MockHardwareClient{
		presets: []models.Preset{
			{ID: 1, Name: "Sunday Mass"},
			{ID: 2, Name: "Wedding"},
			{ID: 3, Name: "Funeral"},
		},
		currentPreset: 1,
		sources: []models.Source{
			{ID: "USB", Name: "USB Drive", Type: "storage"},
			{ID: "CD", Name: "CD Player", Type: "device"},
			{ID: "AUX", Name: "Aux Input", Type: "device"},
		},
		songs: []models.Song{
			{ID: 1, Title: "Bohemian Rhapsody", Artist: "Queen", Duration: 354},
			{ID: 2, Title: "Hotel California", Artist: "Eagles", Duration: 391},
			{ID: 3, Title: "Imagine", Artist: "John Lennon", Duration: 183},
			{ID: 4, Title: "Smells Like Teen Spirit", Artist: "Nirvana", Duration: 301},
			{ID: 5, Title: "Billie Jean", Artist: "Michael Jackson", Duration: 294},
			{ID: 6, Title: "Shape of You", Artist: "Ed Sheeran", Duration: 233},
			{ID: 7, Title: "Rolling in the Deep", Artist: "Adele", Duration: 228},
			{ID: 8, Title: "Sweet Child O' Mine", Artist: "Guns N' Roses", Duration: 356},
			{ID: 9, Title: "Stairway to Heaven", Artist: "Led Zeppelin", Duration: 482},
			{ID: 10, Title: "Thriller", Artist: "Michael Jackson", Duration: 357},
			{ID: 11, Title: "Comfortably Numb", Artist: "Pink Floyd", Duration: 382},
			{ID: 12, Title: "Sweet Home Alabama", Artist: "Lynyrd Skynyrd", Duration: 283},
			{ID: 13, Title: "Yesterday", Artist: "The Beatles", Duration: 125},
			{ID: 14, Title: "Wonderwall", Artist: "Oasis", Duration: 258},
			{ID: 15, Title: "Lose Yourself", Artist: "Eminem", Duration: 326},
		},
		currentSource:    "USB",
		currentSongID:    1,
		playerState:      "stopped",
		repeatMode:       "none",
		currentSongTime:  0,
		lastStatusUpdate: time.Now(),
		recorderState:    "stopped",
		volume:           50,
		muted:            false,
	}
}

// Presets
func (m *MockHardwareClient) GetPresets() (*models.PresetsResponse, error) {
	return &models.PresetsResponse{Presets: m.presets}, nil
}

func (m *MockHardwareClient) GetCurrentPreset() (*models.CurrentPresetResponse, error) {
	var presetName string
	for _, p := range m.presets {
		if p.ID == m.currentPreset {
			presetName = p.Name
			break
		}
	}
	return &models.CurrentPresetResponse{PresetID: m.currentPreset, Name: presetName}, nil
}

func (m *MockHardwareClient) LoadPreset(presetID int) error {
	for _, p := range m.presets {
		if p.ID == presetID {
			m.currentPreset = presetID
			return nil
		}
	}
	return errors.New("preset not found")
}

// Player
func (m *MockHardwareClient) GetSources() (*models.SourcesResponse, error) {
	return &models.SourcesResponse{Sources: m.sources}, nil
}

func (m *MockHardwareClient) SelectSource(sourceID string) error {
	for _, s := range m.sources {
		if s.ID == sourceID {
			m.currentSource = sourceID
			m.playerState = "stopped"
			m.currentSongTime = 0
			return nil
		}
	}
	return errors.New("source not found")
}

func (m *MockHardwareClient) GetSongs() (*models.SongsResponse, error) {
	return &models.SongsResponse{Songs: m.songs}, nil
}

func (m *MockHardwareClient) SelectSong(songID int) error {
	for _, s := range m.songs {
		if s.ID == songID {
			m.currentSongID = songID
			m.playerState = "stopped" // Selecting usually stops current playback
			m.currentSongTime = 0
			return nil
		}
	}
	return errors.New("song not found")
}

func (m *MockHardwareClient) Play() error {
	m.playerState = "playing"
	m.lastStatusUpdate = time.Now()
	return nil
}

func (m *MockHardwareClient) Pause() error {
	// Calculate elapsed time before pausing
	if m.playerState == "playing" {
		elapsed := int(time.Since(m.lastStatusUpdate).Seconds())
		m.currentSongTime += elapsed
	}
	m.playerState = "paused"
	return nil
}

func (m *MockHardwareClient) Stop() error {
	m.playerState = "stopped"
	m.currentSongTime = 0
	return nil
}

func (m *MockHardwareClient) Next() error {
	// Simple cyclic next
	found := false
	for i, s := range m.songs {
		if s.ID == m.currentSongID {
			nextIndex := (i + 1) % len(m.songs)
			m.currentSongID = m.songs[nextIndex].ID
			found = true
			break
		}
	}
	if !found && len(m.songs) > 0 {
		m.currentSongID = m.songs[0].ID
	}
	m.currentSongTime = 0
	// Keep playing if it was playing, or stay stopped
	return nil
}

func (m *MockHardwareClient) Previous() error {
	// Simple cyclic previous
	found := false
	for i, s := range m.songs {
		if s.ID == m.currentSongID {
			prevIndex := (i - 1 + len(m.songs)) % len(m.songs)
			m.currentSongID = m.songs[prevIndex].ID
			found = true
			break
		}
	}
	if !found && len(m.songs) > 0 {
		m.currentSongID = m.songs[0].ID
	}
	m.currentSongTime = 0
	return nil
}

func (m *MockHardwareClient) SetRepeatMode(mode string) error {
	m.repeatMode = mode
	return nil
}

func (m *MockHardwareClient) GetPlayerStatus() (*models.PlayerStatus, error) {
	// Update time if playing
	if m.playerState == "playing" {
		elapsed := int(time.Since(m.lastStatusUpdate).Seconds())
		m.currentSongTime += elapsed
		m.lastStatusUpdate = time.Now() // Reset update time so we don't double count
	}

	var currentSong models.Song
	for _, s := range m.songs {
		if s.ID == m.currentSongID {
			currentSong = s
			break
		}
	}

	// Cap time at duration
	if m.currentSongTime > currentSong.Duration {
		m.currentSongTime = currentSong.Duration
		// In a real loop we might handle auto-next here, but for simple mock status sticking to duration is fine
	}

	return &models.PlayerStatus{
		SongTitle:   currentSong.Title,
		State:       m.playerState,
		CurrentTime: m.currentSongTime,
		TotalTime:   currentSong.Duration,
		RepeatMode:  m.repeatMode,
		Source:      m.currentSource,
	}, nil
}

// Recorder
func (m *MockHardwareClient) StartRecording(filename string) (string, error) {
	if m.recorderState == "recording" {
		return "", errors.New("already recording")
	}
	m.recorderState = "recording"
	if filename == "" {
		filename = fmt.Sprintf("rec_%d.mp3", time.Now().Unix())
	}
	m.recorderFilename = filename
	m.recorderStartTime = time.Now()
	return filename, nil
}

func (m *MockHardwareClient) StopRecording() error {
	m.recorderState = "stopped"
	return nil
}

func (m *MockHardwareClient) GetRecorderStatus() (*models.RecorderStatus, error) {
	recTime := 0
	if m.recorderState == "recording" {
		recTime = int(time.Since(m.recorderStartTime).Seconds())
	}

	return &models.RecorderStatus{
		State:       m.recorderState,
		Filename:    m.recorderFilename,
		CurrentTime: recTime,
	}, nil
}

// Controls
func (m *MockHardwareClient) GetControls() (*models.ControlsResponse, error) {
	var volumeMin = 0
	var volumeMax = 100
	return &models.ControlsResponse{
		Controls: []models.Control{
			{ID: "volume", Name: "Master Volume", Type: "range", Min: &volumeMin, Max: &volumeMax},
			{ID: "mute", Name: "Mute", Type: "boolean"},
		},
	}, nil
}

func (m *MockHardwareClient) GetControlValue(controlID string) (*models.ControlValue, error) {
	switch controlID {
	case "volume":
		return &models.ControlValue{ID: "volume", Value: m.volume}, nil
	case "mute":
		return &models.ControlValue{ID: "mute", Value: m.muted}, nil
	default:
		return nil, errors.New("control not found")
	}
}

func (m *MockHardwareClient) SetControlValue(controlID string, value interface{}) error {
	switch controlID {
	case "volume":
		// Handle float64 from JSON unmarshalling if needed, or int
		if v, ok := value.(float64); ok {
			m.volume = int(v)
		} else if v, ok := value.(int); ok {
			m.volume = v
		} else {
			return errors.New("invalid volume value")
		}
		if m.volume < 0 {
			m.volume = 0
		}
		if m.volume > 100 {
			m.volume = 100
		}
	case "mute":
		if v, ok := value.(bool); ok {
			m.muted = v
		} else {
			return errors.New("invalid mute value")
		}
	default:
		return errors.New("control not found")
	}
	return nil
}

// System
func (m *MockHardwareClient) GetSystemStatus() (*models.SystemStatus, error) {
	preset, _ := m.GetCurrentPreset()
	player, _ := m.GetPlayerStatus()
	recorder, _ := m.GetRecorderStatus()

	return &models.SystemStatus{
		Preset:   *preset,
		Player:   *player,
		Recorder: *recorder,
		Controls: map[string]interface{}{
			"volume": m.volume,
			"mute":   m.muted,
		},
	}, nil
}
