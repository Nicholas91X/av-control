# AV Control - Scripts Documentation

Documentazione completa degli script di gestione database.

---

## 📋 Indice

1. [Script Disponibili](#script-disponibili)
2. [Backup Automatico](#backup-automatico)
3. [Dump e Restore](#dump-e-restore)
4. [Check Database](#check-database)
5. [Installazione Produzione](#installazione-produzione)

---

## Script Disponibili

### `backup-database.sh`
Backup automatico del database con rimozione backup vecchi.

### `db-dump.sh`
Esporta database in formato SQL testuale.

### `db-restore.sh`
Ripristina database da dump SQL.

### `db-check.sh`
Verifica integrità e mostra statistiche database.

---

## Backup Automatico

### Esecuzione Manuale
```bash
# Su S-Mix (produzione)
sudo /usr/local/bin/backup-database.sh

# Output:
[2025-12-30 14:30:15] 🔄 Inizio backup database...
[2025-12-30 14:30:16] ✅ Backup completato: database_20251230_143015.db (8.2M)
[2025-12-30 14:30:16] 🧹 Rimozione backup vecchi (>30 giorni)...
[2025-12-30 14:30:16]    ℹ️  Nessun backup vecchio da rimuovere
[2025-12-30 14:30:16] 📊 Backup totali presenti: 15
[2025-12-30 14:30:16] ✅ Operazione completata
```

### Backup Salvati In
```
/var/backups/av-control/
├── database_20251201_020000.db
├── database_20251202_020000.db
├── database_20251203_020000.db
└── ...
```

### Log
```bash
# Visualizza log backup
tail -f /var/log/av-control/backup.log

# Ultimi 50 backup
tail -50 /var/log/av-control/backup.log
```

### Automazione (Cron)

Il backup viene eseguito automaticamente ogni notte alle 2:00 AM.
```bash
# Verifica cron job attivo
crontab -l

# Output atteso:
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/av-control/backup.log 2>&1
```

### Modifica Orario Backup
```bash
# Modifica cron
crontab -e

# Esempi:
0 3 * * *     # Ore 3:00 AM
0 */6 * * *   # Ogni 6 ore
30 1 * * *    # 1:30 AM
```

### Ritenzione Backup

- **Automatica**: Backup più vecchi di 30 giorni vengono eliminati automaticamente
- **Modifica**: Cambia `+30` in `backup-database.sh` (linea 45)

---

## Dump e Restore

### Dump - Esportazione

Esporta database in formato SQL leggibile.
```bash
# Dump con nome default (database-dump.sql)
./db-dump.sh

# Dump con nome personalizzato
./db-dump.sh mio-export-20251230.sql

# Output:
🔄 Esportazione database in formato SQL...
✅ Dump completato: database-dump.sql (12M)

📝 Per ripristinare questo dump:
   ./db-restore.sh database-dump.sql
```

**Utilità:**
- ✅ Backup leggibile da umani
- ✅ Trasferibile tra sistemi
- ✅ Versionabile con Git
- ✅ Modificabile manualmente

### Restore - Ripristino

⚠️ **ATTENZIONE**: Sovrascrive completamente il database!
```bash
# Restore da database-dump.sql (default)
./db-restore.sh

# Restore da file specifico
./db-restore.sh mio-export-20251230.sql

# Output:
⚠️  ATTENZIONE: Questa operazione sovrascriverà il database corrente!
📁 Database: /var/lib/av-control/database.db
📄 Dump da ripristinare: database-dump.sql

Continuare? (yes/NO): yes

💾 Backup database corrente...
✅ Backup salvato in: /var/lib/av-control/database.db.before-restore-20251230_143520

🔄 Ripristino database da dump...
✅ Database ripristinato con successo!

📊 Statistiche:
   Database: 8.2M
   Backup precedente: 8.1M
```

### Restore Sicuro (Best Practice)
```bash
# 1. Ferma applicazione
sudo systemctl stop av-control

# 2. Backup manuale (extra safety)
sudo cp /var/lib/av-control/database.db /tmp/database-emergency-backup.db

# 3. Restore
sudo ./db-restore.sh database-dump.sql

# 4. Verifica database
sudo ./db-check.sh

# 5. Riavvia applicazione
sudo systemctl start av-control

# 6. Testa login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Check Database

Verifica integrità e mostra statistiche.
```bash
./db-check.sh

# Output:
🔍 AV Control - Database Check
================================

📁 File:
   Path: /var/lib/av-control/database.db
   Size: 8.2M
   Modified: 2025-12-30 14:35:20

🔐 Integrity Check:
   ✅ Database integro

📊 Tabelle e Record:
Tabella              Esiste
-------------------  ------
command_logs         1
sessions             1
user_audit_logs      1
users                1

📈 Record Count:
   users:               3
   sessions:            5
   command_logs:        1247
   user_audit_logs:     89

💾 Ultimo Backup:
   File: database_20251230_020000.db
   Data: 2025-12-30 02:00:15
   Size: 8.1M

✅ Check completato
```

**Quando usarlo:**
- ✅ Dopo restore
- ✅ Diagnostica problemi
- ✅ Verifica backup
- ✅ Check periodico

---

## Installazione Produzione

### Workflow Completo Installazione su S-Mix

#### Fase 1: Preparazione SD Card (Fulvio)
```bash
# 1. Ricevi immagine da Svilen
#    - File: smix-os-v1.img (2-4GB)
#    - Contiene: Debian/Ubuntu ARM32 + Daemon hardware

# 2. Scrivi su SD card con Balena Etcher
#    - Tool: https://etcher.balena.io/
#    - Target: SD card 16GB+
#    - Durata: 5-10 minuti

# 3. Inserisci SD in S-Mix e accendi
#    - Boot automatico (30-60s)
#    - IP statico: 192.168.1.100
#    - SSH: root / emixsvfl
```

---

#### Fase 2: Build Deployment Package (PC)
```bash
# 1. Assicurati che tutto sia committato
git status

# 2. Build frontend
cd frontend
npm install
npm run build
cd ..

# 3. Copia frontend in public/
rm -rf public/*
cp -r frontend/dist/* public/

# 4. Cross-compile Go per ARM32
GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build \
  -ldflags="-s -w" \
  -o av-control-arm32 \
  cmd/server/main.go

# 5. Crea deployment package
tar -czf av-control-deployment.tar.gz \
  av-control-arm32 \
  public/ \
  scripts/

# 6. Verifica package
tar -tzf av-control-deployment.tar.gz | head -20

# Output: av-control-deployment.tar.gz (~12-15MB)
```

---

#### Fase 3: Prima Connessione S-Mix
```bash
# 1. Test connettività
ping 192.168.1.100

# 2. SSH connect
ssh root@192.168.1.100
# Password: emixsvfl

# 3. Verifica daemon Svilen
curl http://localhost:8080/api/device/status

# Output atteso: JSON con hardware status
# Se errore: contatta Svilen prima di procedere
```

---

#### Fase 4: Transfer Files
```bash
# Da PC (nuovo terminale, NON SSH)
scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/
# Password: emixsvfl

# Tempo: ~5-10 secondi (12MB)
```

---

#### Fase 5: Creazione Struttura Directory
```bash
# Su S-Mix (terminale SSH)

# Crea directory principali
mkdir -p /usr/local/bin
mkdir -p /usr/local/share/av-control
mkdir -p /var/lib/av-control
mkdir -p /var/log/av-control
mkdir -p /var/backups/av-control
mkdir -p /etc/av-control

# Verifica
ls -la /usr/local/
ls -la /var/lib/
```

---

#### Fase 6: Estrazione e Installazione
```bash
# Vai in /tmp
cd /tmp

# Estrai package
tar -xzf av-control-deployment.tar.gz

# Verifica contenuti estratti
ls -la

# Installa binary
mv av-control-arm32 /usr/local/bin/av-control
chmod +x /usr/local/bin/av-control

# Installa frontend
mv public /usr/local/share/av-control/

# Installa scripts
mv scripts/*.sh /usr/local/bin/
chmod +x /usr/local/bin/*.sh

# Cleanup
rm av-control-deployment.tar.gz
```

---

#### Fase 7: User e Permissions
```bash
# Crea system user
useradd -r -s /bin/false av-control

# Set ownership
chown -R av-control:av-control /usr/local/share/av-control
chown -R av-control:av-control /var/lib/av-control
chown -R av-control:av-control /var/log/av-control
chown -R av-control:av-control /var/backups/av-control

# Set permissions
chmod 750 /var/lib/av-control
chmod 750 /var/log/av-control
chmod 750 /var/backups/av-control

# Verifica
ls -la /var/lib/ | grep av-control
ls -la /var/log/ | grep av-control
```

---

#### Fase 8: Configurazione Environment
```bash
# Genera JWT secret sicuro
JWT_SECRET=$(openssl rand -base64 32)

# Crea file config
cat > /etc/av-control/config.env << EOF
GIN_MODE=release
JWT_SECRET=$JWT_SECRET
DATABASE_PATH=/var/lib/av-control/database.db
PORT=8000
CORS_ORIGINS=http://192.168.1.100:8000
EOF

# Proteggi config (contiene segreti!)
chmod 600 /etc/av-control/config.env
chown av-control:av-control /etc/av-control/config.env

# Verifica
cat /etc/av-control/config.env
```

---

#### Fase 9: Systemd Service
```bash
# Crea service file
cat > /etc/systemd/system/av-control.service << 'EOF'
[Unit]
Description=VerbumDigital AV Control System
Documentation=https://github.com/yourusername/av-control
After=network.target
Requires=network.target

[Service]
Type=simple
User=av-control
Group=av-control
WorkingDirectory=/usr/local/share/av-control

# Binary (senza flag -mock = usa real hardware)
ExecStart=/usr/local/bin/av-control

# Restart policy
Restart=always
RestartSec=5
StartLimitBurst=5
StartLimitIntervalSec=60

# Environment
EnvironmentFile=/etc/av-control/config.env

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=av-control

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/av-control /var/log/av-control

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service (start al boot)
systemctl enable av-control

# Start service
systemctl start av-control

# Check status
systemctl status av-control
```

**Output atteso:**
```
● av-control.service - VerbumDigital AV Control System
     Loaded: loaded (/etc/systemd/system/av-control.service; enabled)
     Active: active (running) since Mon 2025-12-30 14:45:30 CET; 5s ago
   Main PID: 1234 (av-control)
      Tasks: 8
     Memory: 12.3M
        CPU: 250ms
     CGroup: /system.slice/av-control.service
             └─1234 /usr/local/bin/av-control

Dec 30 14:45:30 smix systemd[1]: Started VerbumDigital AV Control System.
Dec 30 14:45:30 smix av-control[1234]: 🔧 Using REAL hardware client (localhost:8080)
Dec 30 14:45:30 smix av-control[1234]: ✅ Hardware daemon connected!
Dec 30 14:45:30 smix av-control[1234]: 🚀 Server starting on :8000
Dec 30 14:45:30 smix av-control[1234]: 🔧 Mode: release
Dec 30 14:45:30 smix av-control[1234]: 🗄️  Database: /var/lib/av-control/database.db
```

---

#### Fase 10: Verifica Funzionamento
```bash
# 1. Check service
systemctl status av-control

# 2. Check logs
journalctl -u av-control -f

# 3. Health check
curl http://localhost:8000/health
# Output: {"status":"ok"}

# 4. Login test
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Output: {"access_token":"eyJ...","refresh_token":"eyJ..."}

# 5. Device status (richiede token)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/device/status | jq

# Output: JSON con status hardware REALE
```

---

#### Fase 11: Setup Backup Automatico
```bash
# Configura cron job per backup notturno
crontab -e

# Aggiungi (backup alle 2 AM):
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/av-control/backup.log 2>&1

# Salva e chiudi (Ctrl+X, Y, Enter)

# Verifica cron
crontab -l

# Test manuale backup
/usr/local/bin/backup-database.sh

# Verifica backup creato
ls -lh /var/backups/av-control/
```

---

#### Fase 12: Test da Browser
```bash
# Da PC, apri browser:
http://192.168.1.100:8000

# Login:
Username: admin
Password: admin123

# Testa:
✅ Login funziona
✅ Dashboard si carica
✅ Players controllano hardware REALE
✅ Recorder funziona
✅ Controls cambiano volume/mute
✅ WebSocket aggiorna in real-time
```

---

#### Fase 13: Firewall (Opzionale ma Raccomandato)
```bash
# Installa ufw
apt-get update
apt-get install -y ufw

# Policy default
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANTE!)
ufw allow from 192.168.1.0/24 to any port 22

# Allow AV Control
ufw allow from 192.168.1.0/24 to any port 8000

# Enable firewall
ufw --force enable

# Verifica
ufw status verbose

# Output:
Status: active
To                         Action      From
--                         ------      ----
22                         ALLOW       192.168.1.0/24
8000                       ALLOW       192.168.1.0/24
```

---

#### Fase 14: Documentazione Finale
```bash
# Salva info importanti
cat > /etc/av-control/INSTALLATION_INFO.txt << EOF
========================================
AV Control - Installation Info
========================================

Data Installazione: $(date)
Versione: v1.0.0

ACCESSI:
- SSH: root / emixsvfl
- IP: 192.168.1.100
- Web: http://192.168.1.100:8000
- Admin: admin / admin123

SERVIZI:
- systemctl status av-control
- journalctl -u av-control -f

BACKUP:
- Directory: /var/backups/av-control
- Automatico: Ogni notte 2:00 AM
- Ritenzione: 30 giorni
- Log: /var/log/av-control/backup.log

DATABASE:
- Path: /var/lib/av-control/database.db
- Check: /usr/local/bin/db-check.sh
- Dump: /usr/local/bin/db-dump.sh
- Restore: /usr/local/bin/db-restore.sh

CONTATTI:
- Hardware: Svilen
- Software: Nicholas
- Cliente: Fulvio

========================================
EOF

# Leggi info
cat /etc/av-control/INSTALLATION_INFO.txt
```

---

### Post-Installazione

#### Comandi Utili
```bash
# Service management
systemctl start av-control      # Avvia
systemctl stop av-control       # Ferma
systemctl restart av-control    # Riavvia
systemctl status av-control     # Status
systemctl enable av-control     # Enable al boot
systemctl disable av-control    # Disable al boot

# Logs
journalctl -u av-control -f     # Follow logs real-time
journalctl -u av-control -n 100 # Ultimi 100 log
journalctl -u av-control --since "1 hour ago"

# Database
/usr/local/bin/db-check.sh      # Verifica DB
/usr/local/bin/db-dump.sh       # Export SQL
/usr/local/bin/backup-database.sh  # Backup manuale

# Backup
ls -lh /var/backups/av-control/ # Lista backup
tail -f /var/log/av-control/backup.log  # Log backup

# Network
netstat -tlnp | grep 8000       # Verifica porta
curl http://localhost:8000/health  # Health check
```

#### Troubleshooting
```bash
# Service non parte
systemctl status av-control -l
journalctl -u av-control -n 50

# Hardware daemon non risponde
curl http://localhost:8080/api/device/status
# Se fallisce: contatta Svilen

# Database corrotto
/usr/local/bin/db-check.sh
# Se integrity_check fallisce: restore da backup

# Permessi errati
chown -R av-control:av-control /var/lib/av-control
chmod 750 /var/lib/av-control
systemctl restart av-control
```

---

### Update Applicazione (Future)
```bash
# 1. Backup database
/usr/local/bin/backup-database.sh

# 2. Stop service
systemctl stop av-control

# 3. Backup binary corrente
cp /usr/local/bin/av-control /usr/local/bin/av-control.backup

# 4. Transfer nuovo package
# (da PC) scp av-control-deployment.tar.gz root@192.168.1.100:/tmp/

# 5. Extract e install
cd /tmp
tar -xzf av-control-deployment.tar.gz
mv av-control-arm32 /usr/local/bin/av-control
chmod +x /usr/local/bin/av-control

# Update frontend
rm -rf /usr/local/share/av-control/public.old
mv /usr/local/share/av-control/public /usr/local/share/av-control/public.old
mv public /usr/local/share/av-control/

# 6. Start service
systemctl start av-control

# 7. Verifica
systemctl status av-control
curl http://localhost:8000/health
```

---

## 🚨 Emergenze

### Database Corrotto
```bash
# 1. Stop service
systemctl stop av-control

# 2. Check integrity
/usr/local/bin/db-check.sh

# 3. Restore ultimo backup
cd /var/backups/av-control
LAST_BACKUP=$(ls -t database_*.db | head -1)
cp $LAST_BACKUP /var/lib/av-control/database.db

# 4. Start service
systemctl start av-control
```

### Service Non Parte
```bash
# Check logs
journalctl -u av-control -n 100 --no-pager

# Possibili cause:
# - JWT_SECRET mancante → Check /etc/av-control/config.env
# - Database locked → Check permessi
# - Port 8000 occupata → netstat -tlnp | grep 8000
# - Daemon Svilen down → curl http://localhost:8080/api/device/status
```

### Rollback Completo
```bash
# 1. Stop service
systemctl stop av-control

# 2. Restore binary vecchio
mv /usr/local/bin/av-control.backup /usr/local/bin/av-control

# 3. Restore frontend vecchio
rm -rf /usr/local/share/av-control/public
mv /usr/local/share/av-control/public.old /usr/local/share/av-control/public

# 4. Restore database (se necessario)
# ... vedi sezione Database Corrotto ...

# 5. Start service
systemctl start av-control
```

---

## 📞 Supporto

**Problemi hardware/daemon:**
- Contatto: Svilen

**Problemi software/deploy:**
- Contatto: Nicholas

**Problemi installazione:**
- Contatto: Fulvio

---

✅ **Installazione Completata!**