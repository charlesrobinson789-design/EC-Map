#!/usr/bin/env bash
# Generates leadcms/.env from env.example with random secrets.
set -euo pipefail

cd "$(dirname "$0")"

if [ -f .env ] && [ "${1:-}" != "--force" ]; then
  echo ".env already exists. Re-run with --force to overwrite (existing Postgres volume keeps the old password)."
  exit 1
fi

rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

jwt_secret=$(rand 64)
pg_password=$(rand 24)
# LeadCMS identity policy requires upper, lower, digit and a symbol.
admin_password="$(rand 16)Aa1!"

sed \
  -e "s|^JWT__SECRET=.*|JWT__SECRET=${jwt_secret}|" \
  -e "s|^POSTGRES__PASSWORD=.*|POSTGRES__PASSWORD=${pg_password}|" \
  -e "s|^DEFAULTUSERS__0__PASSWORD=.*|DEFAULTUSERS__0__PASSWORD=${admin_password}|" \
  env.example > .env
chmod 600 .env

echo "Wrote leadcms/.env (admin login: admin / see DEFAULTUSERS__0__PASSWORD in .env)."
echo "Next: docker compose up -d"
