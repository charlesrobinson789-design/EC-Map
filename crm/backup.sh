#!/usr/bin/env bash
# Dumps every database in this instance to backups/<instance>-<timestamp>.sql.gz.
# Schedule on the VPS, e.g. daily at 03:15:  15 3 * * * /opt/crm/backup.sh
# Copy backups off the server (they contain contact data).
set -euo pipefail

cd "$(dirname "$0")"
instance=$(grep -E '^INSTANCE_NAME=' .env | cut -d= -f2)
mkdir -p backups
out="backups/${instance:-crm}-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

docker compose exec -T postgres pg_dumpall -U postgres | gzip > "$out"
chmod 600 "$out"
find backups -name '*.sql.gz' -mtime +14 -delete

echo "Wrote $out"
