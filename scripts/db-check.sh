#!/bin/bash
# ==========================================
# AV Control - Database Check Script
# ==========================================
# Verifica integrità e mostra statistiche
# ==========================================

set -e

DB_PATH="/var/lib/av-control/database.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database non trovato: $DB_PATH"
    exit 1
fi

echo "🔍 AV Control - Database Check"
echo "================================"
echo ""

# Informazioni file
echo "📁 File:"
echo "   Path: $DB_PATH"
echo "   Size: $(du -h $DB_PATH | cut -f1)"
echo "   Modified: $(stat -c %y $DB_PATH 2>/dev/null || stat -f %Sm $DB_PATH)"
echo ""

# Integrità
echo "🔐 Integrity Check:"
INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")
if [ "$INTEGRITY" = "ok" ]; then
    echo "   ✅ Database integro"
else
    echo "   ❌ Problemi rilevati: $INTEGRITY"
fi
echo ""

# Statistiche tabelle
echo "📊 Tabelle e Record:"
sqlite3 "$DB_PATH" "
SELECT 
    name as 'Tabella',
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as 'Esiste'
FROM sqlite_master m
WHERE type='table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;
" -header -column

echo ""

# Conta record per tabella
echo "📈 Record Count:"
for table in users sessions command_logs user_audit_logs; do
    if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" | grep -q "$table"; then
        COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;")
        printf "   %-20s %s\n" "$table:" "$COUNT"
    fi
done

echo ""

# Ultimo backup
BACKUP_DIR="/var/backups/av-control"
if [ -d "$BACKUP_DIR" ]; then
    LAST_BACKUP=$(ls -t $BACKUP_DIR/database_*.db 2>/dev/null | head -1)
    if [ -n "$LAST_BACKUP" ]; then
        echo "💾 Ultimo Backup:"
        echo "   File: $(basename $LAST_BACKUP)"
        echo "   Data: $(stat -c %y $LAST_BACKUP 2>/dev/null || stat -f %Sm $LAST_BACKUP)"
        echo "   Size: $(du -h $LAST_BACKUP | cut -f1)"
    else
        echo "⚠️  Nessun backup trovato"
    fi
fi

echo ""
echo "✅ Check completato"
