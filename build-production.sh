#!/bin/bash
# ==========================================
# AV Control - Production Build Script
# ==========================================
# Cross-compila per ARM32 e crea package
# ==========================================

# Increment version on each build
VERSION="1.0.3"
BUILD_DATE=$(date +%Y-%m-%d)
BUILD_TIME=$(date +%H:%M:%S)

echo "═══════════════════════════════════════════"
echo "  Building AV Control v$VERSION"
echo "  Date: $BUILD_DATE $BUILD_TIME"
echo "═══════════════════════════════════════════"

set -e  # Exit on error

echo "🏗️  VerbumDigital AV Control - Production Build"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica Git status
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected${NC}"
    git status -s
    echo ""
    read -p "Continue anyway? (yes/NO): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        echo "❌ Build cancelled"
        exit 0
    fi
fi

# Get version from git
VERSION=$(git rev-parse --short HEAD)
BUILD_TIME=$(date -u +%Y%m%dT%H%M%S)

echo "📦 Version: $VERSION"
echo "🕐 Build time: $BUILD_TIME"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf frontend/dist
rm -rf public/*
rm -f av-control-arm32
rm -f av-control-deployment.tar.gz
rm -rf deploy-package

echo "✅ Cleanup done"
echo ""

# Build frontend
echo "📦 Building frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

npm run build

cd ..
echo "✅ Frontend build complete"
echo ""

# Copy frontend to public
echo "📁 Copying frontend to public/..."
mkdir -p public
cp -r frontend/dist/* public/
echo "✅ Frontend copied"
echo ""

# Cross-compile Go for ARM32
echo "🔨 Cross-compiling Go backend for ARM32..."
GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build \
  -ldflags="-s -w -X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME" \
  -trimpath \
  -o av-control-arm32 \
  ./cmd/server

if [ ! -f "av-control-arm32" ]; then
    echo -e "${RED}❌ Build failed: binary not created${NC}"
    exit 1
fi

BINARY_SIZE=$(du -h av-control-arm32 | cut -f1)
echo "✅ Backend compiled ($BINARY_SIZE)"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p deploy-package

# Copy binary
cp av-control-arm32 deploy-package/av-control

# Copy frontend
cp -r public deploy-package/

# Copy scripts
mkdir -p deploy-package/scripts
cp scripts/*.sh deploy-package/scripts/
chmod +x deploy-package/scripts/*.sh

# Copy README
if [ -f "scripts/README.md" ]; then
    cp scripts/README.md deploy-package/scripts/
fi

# Copy install script
if [ -f "install.sh" ]; then
    cp install.sh deploy-package/
    chmod +x deploy-package/install.sh
    echo "✅ Install script included"
else
    echo -e "${YELLOW}⚠️  Warning: install.sh not found${NC}"
fi

# Create example env file
cat > deploy-package/.env.example << 'EOF'
# AV Control - Production Environment
GIN_MODE=release
JWT_SECRET=<GENERATE_WITH_OPENSSL>
DATABASE_PATH=/var/lib/av-control/database.db
PORT=8000
CORS_ORIGINS=http://192.168.1.100:8000
EOF

# Create tarball
tar -czf av-control-deployment.tar.gz -C deploy-package .

PACKAGE_SIZE=$(du -h av-control-deployment.tar.gz | cut -f1)
echo "✅ Package created: av-control-deployment.tar.gz ($PACKAGE_SIZE)"
echo ""

# Cleanup temp directory
rm -rf deploy-package

# Show package contents
echo "📋 Package contents:"
tar -tzf av-control-deployment.tar.gz | head -20
if [ $(tar -tzf av-control-deployment.tar.gz | wc -l) -gt 20 ]; then
    echo "... ($(tar -tzf av-control-deployment.tar.gz | wc -l) files total)"
fi
echo ""

# Final summary
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📦 Deployment package: av-control-deployment.tar.gz"
echo "📏 Package size: $PACKAGE_SIZE"
echo "🔢 Version: $VERSION"
echo ""
echo "📤 Next steps:"
echo "   1. Transfer to S-Mix: scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/"
echo "   2. Follow deployment guide in scripts/README.md"
echo ""