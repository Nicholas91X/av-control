#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER="192.168.1.100"
PORT="8000"

echo "═══════════════════════════════════════════"
echo "  Deployment Verification"
echo "═══════════════════════════════════════════"
echo ""

# Check if server is reachable
echo -n "Checking server connectivity... "
if ping -c 1 -W 1 $SERVER > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "Cannot reach $SERVER"
    exit 1
fi

# Check backend version
echo -n "Backend version: "
BACKEND_VERSION=$(curl -s http://$SERVER:$PORT/version | grep -o '"version":"[^"]*' | cut -d'"' -f4)
if [ -n "$BACKEND_VERSION" ]; then
    echo -e "${GREEN}$BACKEND_VERSION${NC}"
else
    echo -e "${RED}ERROR - Cannot fetch version${NC}"
fi

# Check backend health
echo -n "Backend health: "
HEALTH=$(curl -s http://$SERVER:$PORT/health | grep -o '"status":"[^"]*' | cut -d'"' -f4)
if [ "$HEALTH" = "ok" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# Check hardware connection
echo -n "Hardware daemon: "
CONNECTED=$(curl -s -H "Authorization: Bearer $(curl -s -X POST http://$SERVER:$PORT/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)" http://$SERVER:$PORT/api/device/status | grep -o '"connected":[^,]*' | cut -d':' -f2)
if [ "$CONNECTED" = "true" ]; then
    echo -e "${GREEN}Connected${NC}"
else
    echo -e "${RED}Disconnected${NC}"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  Verification Complete"
echo "═══════════════════════════════════════════"