#!/bin/sh
# Nightly dump of the n8n database (workflows, credentials, data tables, history).
# Writes /backups/n8n-YYYY-MM-DD.dump (pg_dump custom format, compressed) and keeps 14 days.
# Restore: pg_restore -h postgres -U n8n -d n8n --clean <file>
# Saved credentials are encrypted with the key in the automation_secrets volume; Hostinger's
# weekly VPS backup holds both.
set -u
export PGPASSWORD="$(cat /secrets/pg_password)"
echo "pg-backup: started, writing to /backups"

dump() {
  f="/backups/n8n-$(date +%F).dump"
  if pg_dump -h postgres -U n8n -d n8n -Fc -f "$f.tmp"; then
    mv "$f.tmp" "$f"
    echo "pg-backup: wrote $f"
  else
    rm -f "$f.tmp"
    echo "pg-backup: dump failed"
  fi
  find /backups -name 'n8n-*.dump' -mtime +14 -delete
}

# Wait until n8n has finished its first start (migrations run, owner set up), so no dump
# captures a half-built database. Then take a baseline dump if there is none yet.
until [ "$(psql -h postgres -U n8n -d n8n -tAc "select value from settings where key = 'userManagement.isInstanceOwnerSetUp'" 2>/dev/null)" = "true" ]; do
  sleep 15
done
ls /backups/n8n-*.dump >/dev/null 2>&1 || dump

while :; do
  hour=$(date +%H)
  hour=${hour#0}
  if [ ! -s "/backups/n8n-$(date +%F).dump" ] && [ "${hour:-0}" -ge 3 ]; then
    dump
  fi
  sleep 3600
done
