package hardware

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// CircuitBreaker protects against cascading failures when smixRest becomes unresponsive.
// States:
//   - Closed:   normal operation, requests pass through
//   - Open:     requests are rejected immediately (smixRest is down)
//   - HalfOpen: one probe request is allowed to test recovery
type CircuitBreaker struct {
	mu sync.RWMutex

	state          circuitState
	failureCount   int
	successCount   int
	lastFailure    time.Time
	lastStateChange time.Time

	// Configuration
	failureThreshold int           // consecutive failures to open
	recoveryTimeout  time.Duration // how long to wait before half-open
	successThreshold int           // successes in half-open to close
}

type circuitState int

const (
	stateClosed   circuitState = iota
	stateOpen
	stateHalfOpen
)

func (s circuitState) String() string {
	switch s {
	case stateClosed:
		return "CLOSED"
	case stateOpen:
		return "OPEN"
	case stateHalfOpen:
		return "HALF-OPEN"
	default:
		return "UNKNOWN"
	}
}

var ErrCircuitOpen = fmt.Errorf("circuit breaker is open: smixRest unresponsive")

func NewCircuitBreaker() *CircuitBreaker {
	return &CircuitBreaker{
		state:            stateClosed,
		failureThreshold: 3,
		recoveryTimeout:  15 * time.Second,
		successThreshold: 2,
	}
}

// Allow checks if a request should be allowed through.
func (cb *CircuitBreaker) Allow() bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	switch cb.state {
	case stateClosed:
		return true
	case stateOpen:
		// Check if recovery timeout has elapsed
		if time.Since(cb.lastFailure) > cb.recoveryTimeout {
			return true // will transition to half-open on next call
		}
		return false
	case stateHalfOpen:
		return true
	}
	return false
}

// RecordSuccess records a successful request.
func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case stateClosed:
		cb.failureCount = 0

	case stateOpen:
		// Transitioned to half-open via Allow()
		cb.state = stateHalfOpen
		cb.successCount = 1
		cb.lastStateChange = time.Now()
		log.Printf("🔄 Circuit breaker: OPEN → HALF-OPEN (probe succeeded)")

	case stateHalfOpen:
		cb.successCount++
		if cb.successCount >= cb.successThreshold {
			cb.state = stateClosed
			cb.failureCount = 0
			cb.successCount = 0
			cb.lastStateChange = time.Now()
			log.Printf("✅ Circuit breaker: HALF-OPEN → CLOSED (smixRest recovered)")
		}
	}
}

// RecordFailure records a failed request.
func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.lastFailure = time.Now()

	switch cb.state {
	case stateClosed:
		cb.failureCount++
		if cb.failureCount >= cb.failureThreshold {
			cb.state = stateOpen
			cb.lastStateChange = time.Now()
			log.Printf("🔴 Circuit breaker: CLOSED → OPEN after %d consecutive failures (blocking requests for %v)",
				cb.failureCount, cb.recoveryTimeout)
		}

	case stateHalfOpen:
		cb.state = stateOpen
		cb.successCount = 0
		cb.lastStateChange = time.Now()
		log.Printf("🔴 Circuit breaker: HALF-OPEN → OPEN (probe failed, back to blocking)")
	}
}

// State returns the current state as a string.
func (cb *CircuitBreaker) State() string {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state.String()
}

// IsOpen returns true if the circuit breaker is blocking requests.
func (cb *CircuitBreaker) IsOpen() bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	if cb.state == stateOpen {
		return time.Since(cb.lastFailure) <= cb.recoveryTimeout
	}
	return false
}
