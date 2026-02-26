package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID                 string     `gorm:"primaryKey"`
	Username           string     `gorm:"uniqueIndex;not null"`
	PasswordHash       string     `gorm:"not null"`
	Role               string     `gorm:"not null"` // admin, installatore, prete
	FullName           string     `gorm:"not null"`
	Email              string
	LastLogin          *time.Time
	IsActive           bool       `gorm:"default:true"`
	IsSystemUser       bool       `gorm:"default:false"` // system users cannot be deleted
	MustChangePassword bool       `gorm:"default:false"` // force credential change on next login
	CreatedBy          string
}
