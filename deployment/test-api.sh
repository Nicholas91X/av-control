#!/bin/bash

# Test API endpoints directly on the server
# Usage: Run this ON THE SERVER (192.168.1.100)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "═══════════════════════════════════════════"
echo "  Direct API Testing"
echo "═══════════════════════════════════════════"
echo ""

# Get JWT token
echo "Getting JWT token..."
TOKEN=$(wget -qO- --post-data='{"username":"admin","password":"admin123"}' \
  --header='Content-Type: application/json' \
  http://localhost:8000/api/auth/login | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}ERROR: Cannot get JWT token${NC}"
    exit 1
fi
echo -e "${GREEN}Token obtained${NC}"
echo ""

# Test 1: Repeat Mode
echo "─────────────────────────────────────────────"
echo "TEST 1: Repeat Mode"
echo "─────────────────────────────────────────────"

echo "Current player status:"
wget -qO- --header="Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/player/status | grep repeat_mode
echo ""

echo "Setting repeat mode to 'song'..."
REPEAT_RESULT=$(wget -qO- --post-data='{"mode":"song"}' \
  --header='Content-Type: application/json' \
  --header="Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/player/repeat)
echo "Response: $REPEAT_RESULT"
echo ""

sleep 1

echo "Checking daemon directly:"
wget -qO- http://localhost:8080/api/device/player/status | grep repeat_mode
echo ""

echo "Checking via backend:"
wget -qO- --header="Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/player/status | grep repeat_mode
echo ""

# Test 2: Recorder
echo "─────────────────────────────────────────────"
echo "TEST 2: Recorder"
echo "─────────────────────────────────────────────"

echo "Current recorder status:"
wget -qO- --header="Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/recorder/status
echo ""

echo "Starting recording (empty payload)..."
RECORDER_RESULT=$(wget -qO- --post-data='{}' \
  --header='Content-Type: application/json' \
  --header="Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/recorder/start)
echo "Response: $RECORDER_RESULT"
echo ""

sleep 2

echo "Recorder status:"
wget -qO- --header="Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/recorder/status
echo ""

echo "Stopping recording..."
wget -qO- --post-data='' \
  --header="Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/recorder/stop
echo ""

echo "═══════════════════════════════════════════"
echo "  Testing Complete"
echo "═══════════════════════════════════════════"
echo ""
echo "Check backend logs with:"
echo "  journalctl -u av-control -f"