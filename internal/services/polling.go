package services

import (
	"av-control/internal/hardware"
	"log"
	"time"
)

type StatusPoller struct {
	hwClient hardware.HardwareClient
	hub      *Hub
	interval time.Duration
	stopChan chan struct{}
}

func NewStatusPoller(hwClient hardware.HardwareClient, hub *Hub, interval time.Duration) *StatusPoller {
	return &StatusPoller{
		hwClient: hwClient,
		hub:      hub,
		interval: interval,
		stopChan: make(chan struct{}),
	}
}

func (p *StatusPoller) Start() {
	go p.pollLoop()
	log.Println("📊 Status polling started")
}

func (p *StatusPoller) pollLoop() {
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			status, err := p.hwClient.GetSystemStatus()
			if err != nil {
				log.Printf("❌ Failed to poll status: %v", err)
				continue
			}

			// Broadcast status update
			p.hub.BroadcastStatusUpdate(status)

		case <-p.stopChan:
			log.Println("✅ Status polling stopped")
			return
		}
	}
}

func (p *StatusPoller) Stop() {
	close(p.stopChan)
}
