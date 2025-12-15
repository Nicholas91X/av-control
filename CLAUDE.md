# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Av-Control is an Audio/Video control system built with Go and Gin framework. The system provides a REST API for controlling audio/video hardware, managing presets, player controls, recording functionality, and user authentication.

## Development Commands

### Running the Server
```bash
go run cmd/server/main.go
```
Server starts on port 8000 at `http://localhost:8000`

### Building
```bash
go build -o av-control.exe cmd/server/main.go
```

### Dependencies
```bash
go mod download
go mod tidy
```

## Architecture

### Layer Structure

The codebase follows a clean architecture pattern with clear separation of concerns:

**`cmd/server/main.go`** - Application entry point. Initializes database, creates hardware client (currently MockHardwareClient), sets up Gin router with CORS, and defines all routes. The server is configured to run on port 8000.

**`internal/database/`** - Database initialization using GORM with SQLite (glebarez/sqlite). Handles auto-migration and database seeding. Creates default admin user (username: "admin", password: "admin123") on first run. SQLite is configured with WAL mode for better concurrency.

**`internal/handlers/`** - HTTP request handlers that bridge the API layer and hardware layer. Two handler types:
- `Handler` - Device control handlers with references to database and hardware client
- `AuthHandler` - Authentication handlers for login, logout, and token refresh
All handlers follow a consistent pattern using helper methods `respondError()` and `respondSuccess()`.

**`internal/hardware/`** - Hardware abstraction layer with two implementations:
- `HardwareClient` interface defines all hardware operations
- `MockHardwareClient` is the current implementation providing simulated hardware behavior for development and testing

**`internal/middleware/`** - HTTP middleware functions:
- `JWTAuthMiddleware` - Validates JWT tokens, verifies sessions in database, checks user status
- `RequireRole` - Role-based access control middleware

**`internal/models/`** - Data models split into two categories:
- Database models (User, Session, CommandLog, UserAuditLog) using GORM
- API/Hardware models (Preset, Source, Song, PlayerStatus, etc.) for JSON serialization

### Hardware Client Pattern

The hardware layer uses an interface-based design (`HardwareClient`) to allow swapping between mock and real hardware implementations without changing handler code. Currently, the system uses `MockHardwareClient` which simulates all hardware operations with in-memory state.

To switch to real hardware: implement the `HardwareClient` interface in a new struct and replace the instantiation in `cmd/server/main.go:28`.

### Authentication System

Complete JWT-based authentication system with the following features:

**Session Management:**
- Only ONE active session allowed per user (enforced at login)
- Access tokens: 24 hours expiry
- Refresh tokens: 60 days expiry
- Tokens stored as SHA256 hashes in database for security
- Session validation on every protected endpoint access

**Endpoints:**
- `POST /api/auth/login` - Login with username/password (case-insensitive username)
- `POST /api/auth/logout` - Logout and invalidate all user sessions (requires auth)
- `POST /api/auth/refresh` - Generate new access token using refresh token

**Security Features:**
- Passwords hashed with bcrypt
- Token-based authentication using JWT (HS256)
- JWT secret auto-generated on startup (set `JWT_SECRET` env var for production)
- Session tracking with device info and IP address
- Active user check on authentication
- All device endpoints protected with JWT middleware

**User Roles:** admin, priest, technician, volunteer

**Default Credentials:** username: `admin`, password: `admin123`

## API Structure

Base URL: `http://localhost:8000/api`

**Authentication** (Public) - `/api/auth/*`:
- Login, logout, and refresh token endpoints
- No authentication required except logout

**Device Endpoints** (Protected) - `/api/device/*`:
- All endpoints require valid JWT in `Authorization: Bearer <token>` header
- **Presets** - `/api/device/presets/*` - Load and manage audio/video configuration presets
- **Player** - `/api/device/player/*` - Control media playback including source selection, song management, play/pause/stop, repeat modes
- **Recorder** - `/api/device/recorder/*` - Start/stop recording with filename management
- **Controls** - `/api/device/controls/*` - Manage hardware controls (volume, mute)
- **System** - `/api/device/status` - Get unified system status including preset, player, recorder, and controls state

**Debug Endpoints** - `/debug/*` - Development endpoints for database inspection and mock client verification (unprotected, remove in production)

## Database

SQLite database at `./av-control.db` with GORM ORM. Tables: users, sessions, command_logs, user_audit_logs.

WAL mode enabled for concurrent access. Auto-migration runs on startup.

## Key Dependencies

- `gin-gonic/gin` - HTTP framework
- `gorm.io/gorm` - ORM
- `glebarez/sqlite` - SQLite driver
- `golang.org/x/crypto/bcrypt` - Password hashing
- `golang-jwt/jwt/v5` - JWT authentication
- `google/uuid` - UUID generation
- `gin-contrib/cors` - CORS middleware (currently allows all origins)
