package services

import (
	"av-control/internal/models"
	"log"
	"time"

	"gorm.io/gorm"
)

type AuditService struct {
	db            *gorm.DB
	commandQueue  chan CommandLogEntry
	stopChan      chan struct{}
	flushInterval time.Duration
}

type CommandLogEntry struct {
	UserID          string
	Username        string
	CommandType     string
	CommandPayload  string
	Success         bool
	ErrorMessage    string
	ExecutionTimeMs int64
	IsRemoteAccess  bool
	ClientIP        string
}

func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{
		db:            db,
		commandQueue:  make(chan CommandLogEntry, 1000), // Buffer 1000 commands
		stopChan:      make(chan struct{}),
		flushInterval: 2 * time.Second,
	}
}

func (s *AuditService) Start() {
	go s.flushWorker()
	log.Println("📊 Audit service started")
}

func (s *AuditService) flushWorker() {
	ticker := time.NewTicker(s.flushInterval)
	defer ticker.Stop()

	batch := make([]models.CommandLog, 0, 100)

	for {
		select {
		case entry := <-s.commandQueue:
			// Convert entry to CommandLog model
			log := models.CommandLog{
				UserID:          entry.UserID,
				CommandType:     entry.CommandType,
				CommandPayload:  entry.CommandPayload,
				ExecutedAt:      time.Now(),
				Success:         entry.Success,
				ErrorMessage:    entry.ErrorMessage,
				ExecutionTimeMs: entry.ExecutionTimeMs,
				IsRemoteAccess:  entry.IsRemoteAccess,
				ClientIP:        entry.ClientIP,
			}
			batch = append(batch, log)

			// Flush if batch size reaches 100
			if len(batch) >= 100 {
				s.writeBatch(batch)
				batch = batch[:0] // Clear batch
			}

		case <-ticker.C:
			// Periodic flush (every 2 seconds)
			if len(batch) > 0 {
				s.writeBatch(batch)
				batch = batch[:0]
			}

		case <-s.stopChan:
			// Final flush on shutdown
			if len(batch) > 0 {
				s.writeBatch(batch)
			}
			return
		}
	}
}

func (s *AuditService) writeBatch(logs []models.CommandLog) {
	if len(logs) == 0 {
		return
	}

	// Batch insert all logs in single query
	if err := s.db.Create(&logs).Error; err != nil {
		log.Printf("❌ Failed to write audit logs batch: %v", err)
		return
	}

	log.Printf("✅ Wrote %d audit logs to database", len(logs))
}

func (s *AuditService) LogCommand(entry CommandLogEntry) {
	// Non-blocking send to channel
	select {
	case s.commandQueue <- entry:
		// Successfully queued
	default:
		// Queue full, log warning but don't block
		log.Println("⚠️  Audit queue full, dropping log entry")
	}
}

func (s *AuditService) Shutdown() {
	log.Println("🛑 Shutting down audit service...")
	close(s.stopChan)

	// Wait a bit for final flush
	time.Sleep(100 * time.Millisecond)

	// Drain remaining items in queue
	remaining := 0
	for {
		select {
		case <-s.commandQueue:
			remaining++
		default:
			if remaining > 0 {
				log.Printf("⚠️  Dropped %d audit logs during shutdown", remaining)
			}
			log.Println("✅ Audit service stopped")
			return
		}
	}
}
