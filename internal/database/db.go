package database

import (
	"av-control/internal/models"
	"log"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func InitDB(dbPath string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Enable WAL mode for better concurrency
	if err := db.Exec("PRAGMA journal_mode=WAL;").Error; err != nil {
		return nil, err
	}

	// Auto-migrate models
	err = db.AutoMigrate(
		&models.User{},
		&models.Session{},
		&models.CommandLog{},
		&models.UserAuditLog{},
	)
	if err != nil {
		return nil, err
	}

	return db, nil
}

func SeedDatabase(db *gorm.DB) error {
	var count int64
	db.Model(&models.User{}).Where("role = ?", "admin").Count(&count)

	if count == 0 {
		log.Println("Creating default admin user...")
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		admin := models.User{
			ID:           uuid.New().String(),
			Username:     "admin",
			PasswordHash: string(hashedPassword),
			Role:         "admin",
			FullName:     "Administrator",
			IsActive:     true,
			CreatedBy:    "system",
		}

		if err := db.Create(&admin).Error; err != nil {
			return err
		}
		log.Println("Default admin user created.")
	} else {
		log.Println("Admin user already exists, skipping seed.")
	}

	return nil
}
