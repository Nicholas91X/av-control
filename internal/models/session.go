package models

import (
	"time"

	"gorm.io/gorm"
)

type Session struct {
	gorm.Model
	ID               string `gorm:"primaryKey"`
	UserID           string `gorm:"index;not null"`
	TokenHash        string `gorm:"not null"`
	RefreshTokenHash string `gorm:"not null"`
	DeviceInfo       string
	IPAddress        string
	AccessMethod     string    // local, remote
	ExpiresAt        time.Time `gorm:"index"`
}
