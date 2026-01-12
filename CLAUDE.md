# CLAUDE.md - Project Documentation & Instructions

This file provides comprehensive guidance for working with the **AV Control System**. Use this as a reference for technology stack, architecture, workflows, and coding standards.

## Project Overview
AV Control is a full-stack system designed to control professional audio/video hardware (specifically S-Mix devices). It consists of a **Go backend** acting as a gateway and a **React frontend** for the user interface.

## Technology Stack

### Backend (Go)
- **Framework**: Gin (HTTP)
- **Database**: SQLite (via GORM) with WAL mode enabled.
- **Auth**: JWT-based (HS256), session management (one session per user).
- **Communication**: REST API + WebSockets for real-time notifications.
- **Hardware Gateway**: Connects to a local hardware daemon on `localhost:8080`.

### Frontend (React)
- **Framework**: React 18+ with TypeScript & Vite.
- **Styling**: Tailwind CSS + Vanilla CSS for custom components.
- **Icons**: Lucide React.
- **State/Fetching**: TanStack Query (React Query) for API synchronization.
- **Communication**: Axios with interceptors for JWT auth.

## Project Structure

```text
.
├── cmd/server/             # Application entry point (main.go, version.go)
├── internal/
│   ├── database/           # GORM initialization & SQLite setup
│   ├── handlers/           # HTTP handlers (Device control & Auth)
│   ├── hardware/           # Hardware Client (Mock vs Real implementation)
│   ├── middleware/         # JWT Auth & Role-based access control
│   ├── models/             # Database (GORM) and API/Hardware models
│   └── services/           # Business logic (Audit logs, WebSocket)
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (Layout, Cards, Buttons)
│   │   ├── context/        # React Context (Auth, WebSocket)
│   │   ├── lib/            # Shared utilities (API client)
│   │   └── pages/          # Main views (Dashboard, Controls, Players, etc.)
└── scripts/                # Database backup & management tools
└── deployment/             # Service files and install scripts
```

## Hardware Interaction Workflow
The Go backend usually communicates with a **RealHardwareClient** which makes internal requests to a C++ hardware daemon running on the same board:
- **Volume/Mute**: Handled separately via `/api/device/controls/volume/:id` and `/api/device/controls/mute/:id`.
- **Polling**: Frontend polls `/device/player/status` every 1s and `/device/status` every 2s for real-time dashboard updates.

## Development Commands

### Backend
- Run with mock hardware: `go run ./cmd/server -mock`
- Build for development: `go build ./cmd/server`

### Frontend
- Install: `cd frontend && npm install`
- Run dev: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`

### Build & Deploy
- **Production Build (ARM32)**: `./build-production.sh`
  - Cross-compiles Go for `linux/arm/v7`.
  - Builds and bundles the React app into `public/`.
  - Creates a deployment tarball `av-control-deployment.tar.gz`.

## Coding Guidelines & Best Practices

### Backend
- **Error Handling**: Use `h.respondError(c, code, message, error_id)` for consistent API responses.
- **Audit Logging**: Every hardware command must be logged via `auditService`.
- **Version Info**: Update `Version` in `cmd/server/version.go` or let `build-production.sh` inject it via ldflags.

### Frontend
- **API Requests**: Always use the `api` instance from `lib/api` (it handles the Authorization header).
- **React Query**: 
  - Use `useQuery` for data fetching with appropriate `refetchInterval`.
  - Use `useMutation` with **Optimistic Updates** for interactive elements like volume sliders to prevent UI "jump-back".
- **Responsive Design**: Ensure everything works on small touchscreens (600px - 1024px).

## Deployment Info
- **Target OS**: Debian-based linux on ARM32.
- **Port**: Default 8000.
- **Environment Variables**:
  - `GIN_MODE`: `release` or `debug`
  - `JWT_SECRET`: Mandatory in release mode.
  - `DATABASE_PATH`: Path to SQLite file.
  - `PORT`: Server port.
  - `CORS_ORIGINS`: Allowed frontend origins.
