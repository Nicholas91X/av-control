#!/bin/bash
# AV Control - Automated Installation Script
# Version: 1.0

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   AV CONTROL - INSTALLAZIONE AUTOMATICA       ║"
echo "║   VerbumDigital © 2026                        ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Verifica esecuzione come root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}ERROR: Questo script deve essere eseguito come root${NC}"
   echo "Usa: sudo bash install.sh"
   exit 1
fi

# ============================================
# FASE 1: VERIFICA PREREQUISITI
# ============================================
echo -e "${YELLOW}[1/8]${NC} Verifica prerequisiti..."

# Verifica tar.gz
if [ ! -f /tmp/av-control-deployment.tar.gz ]; then
    echo -e "${RED}ERROR: File /tmp/av-control-deployment.tar.gz non trovato!${NC}"
    echo "Carica prima il pacchetto con:"
    echo "  scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/"
    exit 1
fi

# Verifica daemon Svilen
if ! wget -q --spider http://localhost:8080/api/device/status; then
    echo -e "${RED}WARNING: Daemon Svilen non risponde su porta 8080${NC}"
    echo "Il sistema verrà installato ma non funzionerà senza il daemon."
    read -p "Continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ Prerequisiti verificati${NC}"
echo ""

# ============================================
# FASE 2: CREAZIONE DIRECTORY
# ============================================
echo -e "${YELLOW}[2/8]${NC} Creazione struttura directory..."

mkdir -p /usr/local/share/av-control
mkdir -p /var/lib/av-control

echo -e "${GREEN}✓ Directory create${NC}"
echo ""

# ============================================
# FASE 3: ESTRAZIONE PACCHETTO
# ============================================
echo -e "${YELLOW}[3/8]${NC} Estrazione pacchetto..."

cd /tmp
tar -xzf av-control-deployment.tar.gz 2>&1 | grep -v "time stamp.*in the future" || true

echo -e "${GREEN}✓ Pacchetto estratto${NC}"
echo ""

# ============================================
# FASE 4: INSTALLAZIONE BACKEND
# ============================================
echo -e "${YELLOW}[4/8]${NC} Installazione backend..."

# Backup se esiste
if [ -f /usr/local/bin/av-control ]; then
    cp /usr/local/bin/av-control /usr/local/bin/av-control.backup-$(date +%Y%m%d-%H%M%S)
    echo "  → Backup creato"
fi

# Installa nuovo binario
cp /tmp/av-control /usr/local/bin/av-control
chmod +x /usr/local/bin/av-control

echo -e "${GREEN}✓ Backend installato${NC}"
echo ""

# ============================================
# FASE 5: INSTALLAZIONE FRONTEND
# ============================================
echo -e "${YELLOW}[5/8]${NC} Installazione frontend..."

# Backup se esiste
if [ -d /usr/local/share/av-control/public ]; then
    rm -rf /usr/local/share/av-control/public.backup 2>/dev/null || true
    mv /usr/local/share/av-control/public /usr/local/share/av-control/public.backup
    echo "  → Backup creato"
fi

# Installa nuovo frontend
cp -r /tmp/public /usr/local/share/av-control/

echo -e "${GREEN}✓ Frontend installato${NC}"
echo ""

# ============================================
# FASE 6: CONFIGURAZIONE SYSTEMD
# ============================================
echo -e "${YELLOW}[6/8]${NC} Configurazione systemd service..."

# Genera JWT secret casuale se non esiste
if [ ! -f /var/lib/av-control/.jwt_secret ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "$JWT_SECRET" > /var/lib/av-control/.jwt_secret
    chmod 600 /var/lib/av-control/.jwt_secret
    echo "  → JWT Secret generato"
else
    JWT_SECRET=$(cat /var/lib/av-control/.jwt_secret)
    echo "  → JWT Secret esistente riutilizzato"
fi

# Crea systemd service
cat > /etc/systemd/system/av-control.service << EOF
[Unit]
Description=VerbumDigital AV Control System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/usr/local/share/av-control
ExecStart=/usr/local/bin/av-control
Restart=on-failure
RestartSec=5s

Environment="GIN_MODE=release"
Environment="PORT=8000"
Environment="DATABASE_PATH=/var/lib/av-control/database.db"
Environment="JWT_SECRET=$JWT_SECRET"
Environment="CORS_ORIGINS=*"

[Install]
WantedBy=multi-user.target
EOF

# Ricarica systemd
systemctl daemon-reload

# Abilita avvio automatico
systemctl enable av-control

echo -e "${GREEN}✓ Systemd configurato${NC}"
echo ""

# ============================================
# FASE 7: AVVIO SERVIZIO
# ============================================
echo -e "${YELLOW}[7/8]${NC} Avvio servizio..."

# Stop se già attivo
systemctl stop av-control 2>/dev/null || true

# Avvia
systemctl start av-control

# Attendi inizializzazione
sleep 3

echo -e "${GREEN}✓ Servizio avviato${NC}"
echo ""

# ============================================
# FASE 8: VERIFICA INSTALLAZIONE
# ============================================
echo -e "${YELLOW}[8/8]${NC} Verifica installazione..."

# Verifica servizio attivo
if systemctl is-active --quiet av-control; then
    echo -e "${GREEN}  ✓ Servizio attivo${NC}"
else
    echo -e "${RED}  ✗ Servizio NON attivo${NC}"
    systemctl status av-control --no-pager
    exit 1
fi

# Verifica versione
VERSION_INFO=$(wget -qO- http://localhost:8000/version 2>/dev/null || echo "")
if [ -n "$VERSION_INFO" ]; then
    echo -e "${GREEN}  ✓ Backend risponde${NC}"
    echo "    $VERSION_INFO"
else
    echo -e "${RED}  ✗ Backend non risponde${NC}"
    exit 1
fi

# Verifica connessione hardware
DEVICE_STATUS=$(wget -qO- http://localhost:8000/api/device/status 2>/dev/null || echo "")
if echo "$DEVICE_STATUS" | grep -q '"connected":true'; then
    echo -e "${GREEN}  ✓ Hardware connesso${NC}"
elif echo "$DEVICE_STATUS" | grep -q '"connected":false'; then
    echo -e "${YELLOW}  ⚠ Hardware NON connesso (verificare daemon Svilen)${NC}"
else
    echo -e "${RED}  ✗ Impossibile verificare hardware${NC}"
fi

echo ""

# ============================================
# INSTALLAZIONE COMPLETATA
# ============================================
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════╗"
echo "║   ✓ INSTALLAZIONE COMPLETATA CON SUCCESSO     ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Informazioni di accesso:${NC}"
echo "  URL:      http://192.168.1.100:8000"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${BLUE}Comandi utili:${NC}"
echo "  systemctl status av-control    # Stato servizio"
echo "  systemctl restart av-control   # Riavvia servizio"
echo "  journalctl -u av-control -f    # Log real-time"
echo ""
echo -e "${YELLOW}⚠ IMPORTANTE: Cambia la password di admin dopo il primo accesso!${NC}"
echo ""