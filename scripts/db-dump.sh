#!/bin/bash
# ==========================================
# AV Control - Database Dump Script
# ==========================================
# Esporta il database in formato SQL testuale
# ==========================================

set -e

DB_PATH="/var/lib/av-control/database.db"
OUTPUT_FILE="database-dump.sql"
DATE=$(date +%Y%m%d_%H%M%S)

# Se viene passato un argomento, usalo come nome file
if [ -n "$1" ]; then
    OUTPUT_FILE="$1"
fi

# Verifica che il database esista
if [ ! -f "$DB_PATH" ]; then
    echo "❌ ERRORE: Database non trovato in $DB_PATH"
    exit 1
fi

echo "🔄 Esportazione database in formato SQL..."

if sqlite3 "$DB_PATH" .dump > "$OUTPUT_FILE"; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "✅ Dump completato: $OUTPUT_FILE ($FILE_SIZE)"
    echo ""
    echo "📝 Per ripristinare questo dump:"
    echo "   ./db-restore.sh $OUTPUT_FILE"
else
    echo "❌ ERRORE: Dump fallito"
    exit 1
fi