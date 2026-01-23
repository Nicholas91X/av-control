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
	currentPreset string

	// Player
	sources          []models.Source
	songs            []models.Song
	currentSource    int
	currentSongID    int
	playerState      string
	repeatMode       string
	currentSongTime  int
	lastStatusUpdate time.Time

	// Recorder
	recorderState     string
	recorderFilename  string
	recorderStartTime time.Time

	// Controls
	controls []models.Control
	volumes  map[int]float64
	mutes    map[int]bool
}

func NewMockHardwareClient() *MockHardwareClient {
	return &MockHardwareClient{
		presets: []models.Preset{
			{ID: "preset1.smix", Name: "Sunday Mass"},
			{ID: "preset2.smix", Name: "Wedding"},
			{ID: "preset3.smix", Name: "Funeral"},
		},
		currentPreset: "preset1.smix",
		sources: []models.Source{
			{ID: 0, Name: "USB Drive", Type: "storage"},
			{ID: 1, Name: "CD Player", Type: "device"},
			{ID: 2, Name: "Aux Input", Type: "device"},
		},
		songs: []models.Song{
			{ID: 0, Name: "Bohemian Rhapsody"},
			{ID: 1, Name: "Hotel California"},
			{ID: 2, Name: "Imagine"},
			{ID: 3, Name: "Smells Like Teen Spirit"},
			{ID: 4, Name: "Billie Jean"},
			{ID: 5, Name: "Shape of You"},
			{ID: 6, Name: "Rolling in the Deep"},
			{ID: 7, Name: "Sweet Child O' Mine"},
			{ID: 8, Name: "Stairway to Heaven"},
			{ID: 9, Name: "Thriller"},
		},
		currentSource:    0,
		currentSongID:    0,
		playerState:      "stopped",
		repeatMode:       "none",
		currentSongTime:  0,
		lastStatusUpdate: time.Now(),
		recorderState:    "stopped",
		controls: []models.Control{
			{ID: 100000, Name: "Master Volume", Type: "volume_mute", Min: intPtr(-96), Max: intPtr(12)},
			{ID: 200000, Name: "Bus 1", Type: "volume_mute", Min: intPtr(-6), Max: intPtr(6)},
		},
		volumes: map[int]float64{
			100000: -10.0,
			200000: 0.0,
		},
		mutes: map[int]bool{
			100000: false,
			200000: false,
		},
	}
}

func intPtr(i int) *int {
	return &i
}

// Presets
func (m *MockHardwareClient) GetPresets() (*models.PresetsResponse, error) {
	return &models.PresetsResponse{Presets: m.presets}, nil
}

func (m *MockHardwareClient) GetCurrentPreset() (*models.CurrentPresetResponse, error) {
	return &models.CurrentPresetResponse{ID: m.currentPreset}, nil
}

func (m *MockHardwareClient) LoadPreset(presetID string) error {
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

func (m *MockHardwareClient) SelectSource(sourceID int) error {
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
			m.playerState = "stopped"
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
	return nil
}

func (m *MockHardwareClient) Previous() error {
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

func (m *MockHardwareClient) Seek(timeInSeconds int) error {
	m.currentSongTime = timeInSeconds
	m.lastStatusUpdate = time.Now()
	return nil
}

func (m *MockHardwareClient) SetRepeatMode(mode string) error {
	m.repeatMode = mode
	return nil
}

func (m *MockHardwareClient) GetPlayerStatus() (*models.PlayerStatus, error) {
	if m.playerState == "playing" {
		elapsed := int(time.Since(m.lastStatusUpdate).Seconds())
		m.currentSongTime += elapsed
		m.lastStatusUpdate = time.Now()
	}

	var songTitle string
	for _, s := range m.songs {
		if s.ID == m.currentSongID {
			songTitle = s.Name
			break
		}
	}

	totalTime := 300

	if m.currentSongTime > totalTime {
		m.currentSongTime = totalTime
	}

	return &models.PlayerStatus{
		SongTitle:   songTitle,
		State:       m.playerState,
		CurrentTime: m.currentSongTime,
		TotalTime:   totalTime,
		RepeatMode:  m.repeatMode,
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
	return &models.ControlsResponse{
		Controls: m.controls,
	}, nil
}

func (m *MockHardwareClient) GetControlValue(controlID string) (*models.ControlValue, error) {
	var id int
	fmt.Sscanf(controlID, "%d", &id)

	// Try volume
	if vol, ok := m.volumes[id]; ok {
		return &models.ControlValue{ID: controlID, Value: vol}, nil
	}

	// Try mute
	if mute, ok := m.mutes[id]; ok {
		return &models.ControlValue{ID: controlID, Value: mute}, nil
	}

	return nil, errors.New("control not found")
}

func (m *MockHardwareClient) SetControlValue(controlID string, value interface{}) error {
	var id int
	fmt.Sscanf(controlID, "%d", &id)

	switch v := value.(type) {
	case float64:
		m.volumes[id] = v
		return nil
	case int:
		m.volumes[id] = float64(v)
		return nil
	case bool:
		m.mutes[id] = v
		return nil
	default:
		return errors.New("invalid value type")
	}
}

// System
func (m *MockHardwareClient) GetSystemStatus() (*models.SystemStatus, error) {
	preset, _ := m.GetCurrentPreset()
	player, _ := m.GetPlayerStatus()
	recorder, _ := m.GetRecorderStatus()

	return &models.SystemStatus{
		Connected: true,
		Preset:    *preset,
		Player:    *player,
		Recorder:  *recorder,
	}, nil
}
