#!/bin/bash
# ==========================================
# AV Control - Database Backup Script
# ==========================================
# Esegue backup hot del database SQLite
# e rimuove backup più vecchi di 30 giorni
# ==========================================

set -e  # Exit on error

BACKUP_DIR="/var/backups/av-control"
DB_PATH="/var/lib/av-control/database.db"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/av-control/backup.log"

# Crea directory se non esiste
mkdir -p $BACKUP_DIR
mkdir -p $(dirname $LOG_FILE)

# Funzione per logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Verifica che il database esista
if [ ! -f "$DB_PATH" ]; then
    log "❌ ERRORE: Database non trovato in $DB_PATH"
    exit 1
fi

# Esegui backup
log "🔄 Inizio backup database..."
BACKUP_FILE="$BACKUP_DIR/database_$DATE.db"

if sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup completato: database_$DATE.db ($BACKUP_SIZE)"
else
    log "❌ ERRORE: Backup fallito"
    exit 1
fi

# Rimuovi backup più vecchi di 30 giorni
log "🧹 Rimozione backup vecchi (>30 giorni)..."
DELETED=$(find $BACKUP_DIR -name "database_*.db" -mtime +30 -type f)

if [ -n "$DELETED" ]; then
    echo "$DELETED" | while read file; do
        rm -f "$file"
        log "   🗑️  Rimosso: $(basename $file)"
    done
else
    log "   ℹ️  Nessun backup vecchio da rimuovere"
fi

# Conta backup totali
TOTAL_BACKUPS=$(find $BACKUP_DIR -name "database_*.db" -type f | wc -l)
log "📊 Backup totali presenti: $TOTAL_BACKUPS"

log "✅ Operazione completata"