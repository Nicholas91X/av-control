#!/bin/bash
# ==========================================
# AV Control - Database Restore Script
# ==========================================
# Ripristina il database da un dump SQL
# ATTENZIONE: Sovrascrive il database corrente!
# ==========================================

set -e

DB_PATH="/var/lib/av-control/database.db"
DUMP_FILE="database-dump.sql"

# Se viene passato un argomento, usalo come file dump
if [ -n "$1" ]; then
    DUMP_FILE="$1"
fi

# Verifica che il file dump esista
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ ERRORE: File dump non trovato: $DUMP_FILE"
    echo ""
    echo "📝 Uso: $0 [file-dump.sql]"
    echo "   Default: database-dump.sql"
    exit 1
fi

# Conferma utente
echo "⚠️  ATTENZIONE: Questa operazione sovrascriverà il database corrente!"
echo "📁 Database: $DB_PATH"
echo "📄 Dump da ripristinare: $DUMP_FILE"
echo ""
read -p "Continuare? (yes/NO): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Operazione annullata"
    exit 0
fi

# Backup del database corrente
BACKUP_FILE="${DB_PATH}.before-restore-$(date +%Y%m%d_%H%M%S)"
echo ""
echo "💾 Backup database corrente..."
cp "$DB_PATH" "$BACKUP_FILE"
echo "✅ Backup salvato in: $BACKUP_FILE"

# Restore
echo ""
echo "🔄 Ripristino database da dump..."

if sqlite3 "$DB_PATH" < "$DUMP_FILE"; then
    echo "✅ Database ripristinato con successo!"
    echo ""
    echo "📊 Statistiche:"
    echo "   Database: $(du -h $DB_PATH | cut -f1)"
    echo "   Backup precedente: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "❌ ERRORE: Ripristino fallito"
    echo "💾 Database originale salvato in: $BACKUP_FILE"
    exit 1
fi