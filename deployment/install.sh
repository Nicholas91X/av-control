#!/bin/bash
# ==========================================
# AV Control - Installation Script
# ==========================================
# Da eseguire su S-Mix dopo transfer package
# ==========================================

set -e

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo "🚀 VerbumDigital AV Control - Installation"
echo "=========================================="
echo ""

# Check package exists
if [ ! -f "/tmp/av-control-deployment.tar.gz" ]; then
    echo "❌ Deployment package not found in /tmp/"
    echo ""
    echo "Please transfer it first:"
    echo "  scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/"
    exit 1
fi

# Stop service if exists
if systemctl is-active --quiet av-control; then
    echo "⏸️  Stopping existing service..."
    systemctl stop av-control
fi

# Backup current version
if [ -f "/usr/local/bin/av-control" ]; then
    echo "💾 Backing up current version..."
    cp /usr/local/bin/av-control /usr/local/bin/av-control.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p /usr/local/bin
mkdir -p /usr/local/share/av-control
mkdir -p /var/lib/av-control
mkdir -p /var/log/av-control
mkdir -p /var/backups/av-control
mkdir -p /etc/av-control

# Extract package
echo "📦 Extracting package..."
cd /tmp
tar -xzf av-control-deployment.tar.gz

# Install binary
echo "🔧 Installing binary..."
mv av-control /usr/local/bin/
chmod +x /usr/local/bin/av-control

# Install frontend
echo "🎨 Installing frontend..."
rm -rf /usr/local/share/av-control/public.old
if [ -d "/usr/local/share/av-control/public" ]; then
    mv /usr/local/share/av-control/public /usr/local/share/av-control/public.old
fi
mv public /usr/local/share/av-control/

# Install scripts
echo "📜 Installing scripts..."
mv scripts/*.sh /usr/local/bin/
chmod +x /usr/local/bin/*.sh

# Create system user if not exists
if ! id -u av-control >/dev/null 2>&1; then
    echo "👤 Creating system user..."
    useradd -r -s /bin/false av-control
fi

# Set permissions
echo "🔐 Setting permissions..."
chown -R av-control:av-control /usr/local/share/av-control
chown -R av-control:av-control /var/lib/av-control
chown -R av-control:av-control /var/log/av-control
chown -R av-control:av-control /var/backups/av-control

chmod 750 /var/lib/av-control
chmod 750 /var/log/av-control
chmod 750 /var/backups/av-control

# Generate JWT secret if not exists
if [ ! -f "/etc/av-control/config.env" ]; then
    echo "🔑 Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > /etc/av-control/config.env << EOF
GIN_MODE=release
JWT_SECRET=$JWT_SECRET
DATABASE_PATH=/var/lib/av-control/database.db
PORT=8000
CORS_ORIGINS=http://192.168.1.100:8000
EOF
    
    chmod 600 /etc/av-control/config.env
    chown av-control:av-control /etc/av-control/config.env
    echo "✅ Configuration created"
else
    echo "ℹ️  Configuration already exists, keeping current"
fi

# Install systemd service
if [ ! -f "/etc/systemd/system/av-control.service" ]; then
    echo "⚙️  Installing systemd service..."
    
    cat > /etc/systemd/system/av-control.service << 'SERVICEEOF'
[Unit]
Description=VerbumDigital AV Control System
After=network.target
Requires=network.target

[Service]
Type=simple
User=av-control
Group=av-control
WorkingDirectory=/usr/local/share/av-control
ExecStart=/usr/local/bin/av-control
Restart=always
RestartSec=5
EnvironmentFile=/etc/av-control/config.env
StandardOutput=journal
StandardError=journal
SyslogIdentifier=av-control
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/av-control /var/log/av-control
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
SERVICEEOF
    
    systemctl daemon-reload
    systemctl enable av-control
    echo "✅ Service installed and enabled"
fi

# Setup cron job for backup
if ! crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
    echo "⏰ Setting up backup cron job..."
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/av-control/backup.log 2>&1") | crontab -
    echo "✅ Backup scheduled (daily at 2 AM)"
fi

# Cleanup
echo "🧹 Cleaning up..."
cd /tmp
rm -rf public scripts .env.example
rm av-control-deployment.tar.gz

# Start service
echo "▶️  Starting service..."
systemctl start av-control

sleep 3

# Check status
echo ""
echo "📊 Service status:"
systemctl status av-control --no-pager

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Quick checks:"
echo "   Health: curl http://localhost:8000/health"
echo "   Logs: journalctl -u av-control -f"
echo "   Browser: http://192.168.1.100:8000"
echo ""
echo "🔑 Default credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""