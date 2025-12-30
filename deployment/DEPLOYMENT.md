# VerbumDigital AV Control - Deployment Guide

Guida completa per il deployment del sistema di controllo AV su dispositivo S-Mix.

---

## 📋 Indice

1. [Prerequisiti](#prerequisiti)
2. [Build del Package](#build-del-package)
3. [Preparazione S-Mix](#preparazione-s-mix)
4. [Deployment](#deployment)
5. [Verifica e Test](#verifica-e-test)
6. [Troubleshooting](#troubleshooting)
7. [Manutenzione](#manutenzione)

---

## Prerequisiti

### Hardware

- **S-Mix Device**: Device ARM32 con SD card preparata da Svilen
- **Network**: S-Mix sulla stessa rete del PC (192.168.1.x)
- **Accesso SSH**: Credenziali fornite da Svilen

### Software (PC)

- **Go** 1.21+
- **Node.js** 18+
- **Git**
- **Git Bash** (Windows) o bash shell (Linux/Mac)

### Informazioni Necessarie
```
IP S-Mix:     192.168.1.100
SSH User:     root
SSH Password: password
Daemon Port:  8080 (Svilen's hardware daemon)
```

---

## Build del Package

### Step 1: Verifica Codice
```bash
# Assicurati di essere nella root del progetto
cd av-control/

# Verifica branch
git status

# Commit eventuali modifiche
git add .
git commit -m "Your message"
```

### Step 2: Build Production Package
```bash
# Esegui build script
./build-production.sh

# Output atteso:
# ✅ Build complete!
# 📦 Deployment package: av-control-deployment.tar.gz
# 📏 Package size: ~12-15MB
```

**Il package include:**
- Binary ARM32: `av-control`
- Frontend compilato: `public/`
- Script di gestione: `scripts/*.sh`
- File di esempio: `.env.example`

### Step 3: Verifica Package
```bash
# Lista contenuti
tar -tzf av-control-deployment.tar.gz | head -20

# Verifica dimensione
ls -lh av-control-deployment.tar.gz
```

---

## Preparazione S-Mix

### Verifica Connettività
```bash
# Test ping
ping 192.168.1.100

# Dovrebbe rispondere
# PING 192.168.1.100: 64 bytes from 192.168.1.100: icmp_seq=0 ttl=64 time=1.234 ms
```

### Prima Connessione SSH
```bash
# Connettiti via SSH
ssh root@192.168.1.100
# Password: password

# Verifica sistema
uname -a
# Output: Linux smix ... armv7l GNU/Linux

# Verifica daemon hardware
curl http://localhost:8080/api/device/status

# Output atteso: JSON con status hardware
# Se 404 o errore → Contatta Svilen PRIMA di procedere
```

### Verifica Spazio Disco
```bash
# Check spazio disponibile
df -h

# Serve almeno 500MB liberi in /usr e /var
```

---

## Deployment

### Metodo 1: Script Automatico (RACCOMANDATO)
```bash
# 1. Transfer package
scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/
# Password: password

# 2. Transfer install script
scp deployment/install.sh root@192.168.1.100:/tmp/

# 3. SSH e installa
ssh root@192.168.1.100
cd /tmp
chmod +x install.sh
./install.sh

# Lo script:
# ✅ Crea tutte le directory
# ✅ Installa binary e frontend
# ✅ Configura systemd service
# ✅ Genera JWT secret
# ✅ Imposta permessi corretti
# ✅ Configura backup automatico
# ✅ Avvia il servizio
```

**Output atteso:**
```
🚀 VerbumDigital AV Control - Installation
==========================================

📁 Creating directories...
📦 Extracting package...
🔧 Installing binary...
🎨 Installing frontend...
📜 Installing scripts...
👤 Creating system user...
🔐 Setting permissions...
🔑 Generating JWT secret...
⚙️  Installing systemd service...
⏰ Setting up backup cron job...
▶️  Starting service...

✅ Installation complete!

📝 Quick checks:
   Health: curl http://localhost:8000/health
   Logs: journalctl -u av-control -f
   Browser: http://192.168.1.100:8000
```

---

### Metodo 2: Installazione Manuale

<details>
<summary>Click per espandere procedura manuale</summary>

#### 1. Transfer Package
```bash
scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/
```

#### 2. SSH al Device
```bash
ssh root@192.168.1.100
```

#### 3. Stop Service (se esiste)
```bash
systemctl stop av-control 2>/dev/null || true
```

#### 4. Crea Directory
```bash
mkdir -p /usr/local/bin
mkdir -p /usr/local/share/av-control
mkdir -p /var/lib/av-control
mkdir -p /var/log/av-control
mkdir -p /var/backups/av-control
mkdir -p /etc/av-control
```

#### 5. Estrai Package
```bash
cd /tmp
tar -xzf av-control-deployment.tar.gz
```

#### 6. Installa Binary
```bash
mv av-control /usr/local/bin/
chmod +x /usr/local/bin/av-control
```

#### 7. Installa Frontend
```bash
rm -rf /usr/local/share/av-control/public.old
if [ -d "/usr/local/share/av-control/public" ]; then
    mv /usr/local/share/av-control/public /usr/local/share/av-control/public.old
fi
mv public /usr/local/share/av-control/
```

#### 8. Installa Scripts
```bash
mv scripts/*.sh /usr/local/bin/
chmod +x /usr/local/bin/*.sh
```

#### 9. Crea System User
```bash
useradd -r -s /bin/false av-control
```

#### 10. Imposta Permissions
```bash
chown -R av-control:av-control /usr/local/share/av-control
chown -R av-control:av-control /var/lib/av-control
chown -R av-control:av-control /var/log/av-control
chown -R av-control:av-control /var/backups/av-control

chmod 750 /var/lib/av-control
chmod 750 /var/log/av-control
chmod 750 /var/backups/av-control
```

#### 11. Genera JWT Secret
```bash
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
```

#### 12. Crea Systemd Service
```bash
cat > /etc/systemd/system/av-control.service << 'EOF'
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

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable av-control
```

#### 13. Setup Backup Cron
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/av-control/backup.log 2>&1") | crontab -
```

#### 14. Start Service
```bash
systemctl start av-control
```

#### 15. Cleanup
```bash
cd /tmp
rm -rf public scripts .env.example av-control-deployment.tar.gz
```

</details>

---

## Verifica e Test

### 1. Service Status
```bash
# Check service
systemctl status av-control

# Output atteso:
# ● av-control.service - VerbumDigital AV Control System
#      Active: active (running) since ...
```

### 2. Log Check
```bash
# Follow logs in real-time
journalctl -u av-control -f

# Ultimi 50 log
journalctl -u av-control -n 50

# Log attesi:
# 🔧 Using REAL hardware client (localhost:8080)
# ✅ Hardware daemon connected!
# 🚀 Server starting on :8000
# 🔧 Mode: release
```

### 3. Health Endpoint
```bash
curl http://localhost:8000/health

# Output: {"status":"ok"}
```

### 4. Login Test
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.access_token')

echo $TOKEN
# Output: eyJhbGciOiJIUzI1NiIs...
```

### 5. Device Status (Real Hardware!)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/status | jq

# Output: JSON con status REALE del dispositivo hardware
```

### 6. Browser Test

**Da PC, apri browser:**
```
http://192.168.1.100:8000
```

**Login:**
- Username: `admin`
- Password: `admin123`

**Test funzionalità:**
- ✅ Dashboard si carica
- ✅ Players controllano hardware
- ✅ Recorder funziona
- ✅ Controls (volume/mute) rispondono
- ✅ WebSocket aggiorna status in real-time

---

## Troubleshooting

### Service Non Parte
```bash
# Check logs dettagliati
journalctl -u av-control -n 100 --no-pager

# Possibili cause:

# 1. JWT_SECRET mancante
cat /etc/av-control/config.env
# Fix: Rigenera config (vedi installazione manuale step 11)

# 2. Permessi errati
ls -la /var/lib/av-control
# Fix: chown -R av-control:av-control /var/lib/av-control

# 3. Porta 8000 occupata
netstat -tlnp | grep 8000
# Fix: Cambia PORT in /etc/av-control/config.env

# 4. Daemon Svilen non risponde
curl http://localhost:8080/api/device/status
# Fix: Contatta Svilen
```

### Database Corrotto
```bash
# 1. Stop service
systemctl stop av-control

# 2. Check integrity
/usr/local/bin/db-check.sh

# 3. Restore da backup
cd /var/backups/av-control
LAST_BACKUP=$(ls -t database_*.db | head -1)
cp $LAST_BACKUP /var/lib/av-control/database.db
chown av-control:av-control /var/lib/av-control/database.db

# 4. Start service
systemctl start av-control
```

### WebSocket Non Connette
```bash
# Check firewall
ufw status

# Se firewall attivo, allow port 8000
ufw allow from 192.168.1.0/24 to any port 8000

# Check CORS
cat /etc/av-control/config.env | grep CORS
# Dovrebbe includere l'IP del client
```

### Hardware Non Risponde
```bash
# Test daemon Svilen direttamente
curl -v http://localhost:8080/api/device/status

# Se fallisce:
# 1. Verifica daemon è running
ps aux | grep daemon

# 2. Contatta Svilen per diagnostica hardware
```

---

## Manutenzione

### Comandi Utili
```bash
# Service management
systemctl start av-control      # Avvia
systemctl stop av-control       # Ferma
systemctl restart av-control    # Riavvia
systemctl status av-control     # Status
systemctl enable av-control     # Enable al boot
systemctl disable av-control    # Disable al boot

# Logs
journalctl -u av-control -f              # Follow real-time
journalctl -u av-control -n 100          # Ultimi 100
journalctl -u av-control --since "1h ago"  # Ultima ora
journalctl -u av-control --since today   # Da oggi

# Database
/usr/local/bin/db-check.sh      # Verifica integrità
/usr/local/bin/db-dump.sh       # Export SQL
/usr/local/bin/backup-database.sh  # Backup manuale

# Backup
ls -lh /var/backups/av-control/           # Lista backup
tail -f /var/log/av-control/backup.log    # Log backup
```

### Backup Automatico

**Configurato via cron:**
```
Schedule: Ogni notte alle 2:00 AM
Location: /var/backups/av-control/
Retention: 30 giorni
Log: /var/log/av-control/backup.log
```

**Check backup cron:**
```bash
crontab -l

# Output:
# 0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/av-control/backup.log 2>&1
```

### Update Applicazione

**Procedura sicura per aggiornamenti futuri:**
```bash
# 1. Build nuovo package su PC
./build-production.sh

# 2. Backup database su S-Mix
ssh root@192.168.1.100
/usr/local/bin/backup-database.sh
exit

# 3. Transfer nuovo package
scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/

# 4. Deploy update
ssh root@192.168.1.100
systemctl stop av-control

# Backup binary corrente
cp /usr/local/bin/av-control /usr/local/bin/av-control.backup.$(date +%Y%m%d)

# Extract e install
cd /tmp
tar -xzf av-control-deployment.tar.gz
mv av-control /usr/local/bin/
chmod +x /usr/local/bin/av-control

# Update frontend
rm -rf /usr/local/share/av-control/public.old
mv /usr/local/share/av-control/public /usr/local/share/av-control/public.old
mv public /usr/local/share/av-control/

# Cleanup
rm -rf scripts .env.example av-control-deployment.tar.gz

# Start
systemctl start av-control

# Verifica
systemctl status av-control
curl http://localhost:8000/health

exit
```

### Rollback (Se Update Fallisce)
```bash
ssh root@192.168.1.100

systemctl stop av-control

# Restore binary
LAST_BACKUP=$(ls -t /usr/local/bin/av-control.backup.* | head -1)
cp $LAST_BACKUP /usr/local/bin/av-control

# Restore frontend
rm -rf /usr/local/share/av-control/public
mv /usr/local/share/av-control/public.old /usr/local/share/av-control/public

systemctl start av-control
systemctl status av-control
```

### Cambio Password Admin
```bash
# Via API (da PC o S-Mix)
TOKEN=$(curl -s -X POST http://192.168.1.100:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.access_token')

# TODO: Implement change password endpoint
# Per ora richiede database edit manuale
```

---

## Sicurezza

### Firewall (Raccomandato)
```bash
# Installa ufw
apt-get update
apt-get install -y ufw

# Configure
ufw default deny incoming
ufw default allow outgoing
ufw allow from 192.168.1.0/24 to any port 22   # SSH
ufw allow from 192.168.1.0/24 to any port 8000 # AV Control
ufw --force enable

# Verifica
ufw status verbose
```

### Cambia Password SSH
```bash
# Cambia password root
passwd root

# Crea nuovo utente admin
useradd -m -s /bin/bash avadmin
passwd avadmin
usermod -aG sudo avadmin

# Disabilita root SSH (opzionale, ATTENZIONE!)
nano /etc/ssh/sshd_config
# Cambia: PermitRootLogin no
systemctl restart sshd
```

### JWT Secret Rotation
```bash
# Genera nuovo secret
NEW_SECRET=$(openssl rand -base64 32)

# Update config
nano /etc/av-control/config.env
# Cambia JWT_SECRET=$NEW_SECRET

# Restart (invalida tutti i token esistenti!)
systemctl restart av-control

# Tutti gli utenti dovranno ri-fare login
```

---

## Informazioni di Sistema

### Locations
```
Binary:       /usr/local/bin/av-control
Frontend:     /usr/local/share/av-control/public/
Scripts:      /usr/local/bin/*.sh
Database:     /var/lib/av-control/database.db
Logs:         /var/log/av-control/
Backups:      /var/backups/av-control/
Config:       /etc/av-control/config.env
Service:      /etc/systemd/system/av-control.service
```

### Porte
```
8000:  AV Control Web UI + API
8080:  Svilen Hardware Daemon (interno)
22:    SSH
```

### Environment Variables
```bash
# Vedi config produzione
cat /etc/av-control/config.env

# Output:
GIN_MODE=release
JWT_SECRET=
DATABASE_PATH=/var/lib/av-control/database.db
PORT=8000
CORS_ORIGINS=http://192.168.1.100:8000
```

---

## Contatti Supporto

**Hardware / Daemon:**
- Svilen

**Software / Deploy:**
- Nicholas

**Cliente Finale:**
- Fulvio

---

## Appendice: Quick Reference

### Deploy Checklist

- [ ] Build package su PC: `./build-production.sh`
- [ ] Verifica connettività: `ping 192.168.1.100`
- [ ] Test daemon Svilen: `curl http://192.168.1.100:8080/api/device/status`
- [ ] Transfer package: `scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/`
- [ ] Transfer install script: `scp deployment/install.sh root@192.168.1.100:/tmp/`
- [ ] SSH e installa: `ssh root@192.168.1.100; cd /tmp; ./install.sh`
- [ ] Verifica service: `systemctl status av-control`
- [ ] Test health: `curl http://localhost:8000/health`
- [ ] Test login: Browser → `http://192.168.1.100:8000`
- [ ] Test hardware: Players/Recorder/Controls funzionano
- [ ] Verifica backup cron: `crontab -l`

### One-Liner Deploy
```bash
# Build + Transfer + Install (tutto in uno)
./build-production.sh && \
scp av-control-deployment.tar.gz deployment/install.sh root@192.168.1.100:/tmp/ && \
ssh root@192.168.1.100 "cd /tmp && chmod +x install.sh && ./install.sh"
```

---

**✅ Fine Deployment Guide**

*Ultima modifica: 2025-12-30*