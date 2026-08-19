#!/usr/bin/env bash
# Backup consistente de la base SQLite (incluye el WAL) con timestamp y rotación.
# Uso: bash scripts/backup.sh   ·   o programado con launchd/cron.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${DB_PATH:-data/bitacora.db}"
DIR="data/backups"
KEEP=30 # cuántas copias conservar

mkdir -p "$DIR"
TS="$(date '+%Y%m%d-%H%M%S')"
OUT="$DIR/bitacora-$TS.db"

# .backup toma una copia consistente aunque la app esté escribiendo.
sqlite3 "$DB" ".backup '$OUT'"
echo "✔ backup: $OUT ($(du -h "$OUT" | cut -f1))"

# Rotación: dejar solo las KEEP más nuevas.
ls -1t "$DIR"/bitacora-*.db 2>/dev/null | tail -n "+$((KEEP + 1))" | xargs -r rm -f
echo "  copias guardadas: $(ls -1 "$DIR"/bitacora-*.db 2>/dev/null | wc -l | tr -d ' ')"
