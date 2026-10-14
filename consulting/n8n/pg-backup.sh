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

# First run: wait for the database, then take a baseline dump.
until pg_isready -h postgres -U n8n -d n8n -q; do sleep 5; done
ls /backups/n8n-*.dump >/dev/null 2>&1 || dump

while :; do
  hour=$(date +%H)
  hour=${hour#0}
  if [ ! -s "/backups/n8n-$(date +%F).dump" ] && [ "${hour:-0}" -ge 3 ]; then
    dump
  fi
  sleep 3600
done
