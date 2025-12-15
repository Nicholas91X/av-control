package models

import (
	"time"

	"gorm.io/gorm"
)

type CommandLog struct {
	gorm.Model
	UserID          string `gorm:"index;not null"`
	CommandType     string `gorm:"index;not null"`
	CommandPayload  string
	ExecutedAt      time.Time `gorm:"index"`
	Success         bool
	ErrorMessage    string
	ExecutionTimeMs int64
	IsRemoteAccess  bool
	ClientIP        string
}

type UserAuditLog struct {
	gorm.Model
	Action       string `gorm:"not null"` // create, update, delete, password_reset
	TargetUserID string `gorm:"index;not null"`
	PerformedBy  string `gorm:"index;not null"`
	Changes      string // JSON
	Timestamp    time.Time
}
