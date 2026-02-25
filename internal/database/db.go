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

type defaultUserSeed struct {
	Username           string
	Password           string
	Role               string
	FullName           string
	MustChangePassword bool
}

// Default system users. Credentials for av-admin and installatore should be
// changed via the admin panel after the first deployment.
// The prete account is forced to change credentials on first login.
var systemUsers = []defaultUserSeed{
	{
		Username:           "av-admin",
		Password:           "AvC#9mX2!kP7",
		Role:               "admin",
		FullName:           "Amministratore Sistema",
		MustChangePassword: false,
	},
	{
		Username:           "installatore",
		Password:           "Inst@24!Xm",
		Role:               "installatore",
		FullName:           "Installatore",
		MustChangePassword: false,
	},
	{
		Username:           "prete",
		Password:           "benvenuto",
		Role:               "prete",
		FullName:           "Parroco",
		MustChangePassword: true,
	},
}

func SeedDatabase(db *gorm.DB) error {
	for _, seed := range systemUsers {
		var existing models.User
		result := db.Where("username = ?", seed.Username).First(&existing)
		if result.Error == nil {
			// User already exists — ensure it is marked as system user
			db.Model(&existing).Update("is_system_user", true)
			log.Printf("System user '%s' already exists, skipping.", seed.Username)
			continue
		}

		log.Printf("Creating system user: %s (%s)...", seed.Username, seed.Role)
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(seed.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		user := models.User{
			ID:                 uuid.New().String(),
			Username:           seed.Username,
			PasswordHash:       string(hashedPassword),
			Role:               seed.Role,
			FullName:           seed.FullName,
			IsActive:           true,
			IsSystemUser:       true,
			MustChangePassword: seed.MustChangePassword,
			CreatedBy:          "system",
		}

		if err := db.Create(&user).Error; err != nil {
			return err
		}
		log.Printf("System user '%s' created.", seed.Username)
	}

	return nil
}
