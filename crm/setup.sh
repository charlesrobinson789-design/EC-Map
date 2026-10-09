#!/usr/bin/env bash
# Generates crm/.env from env.example with random secrets.
# Usage: ./setup.sh [--name <instance>] [--domain <crm.example.com>] [--force]
set -euo pipefail

cd "$(dirname "$0")"

name="" domain="" force=""
while [ $# -gt 0 ]; do
  case "$1" in
    --name) name="$2"; shift 2 ;;
    --domain) domain="$2"; shift 2 ;;
    --force) force=1; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [ -f .env ] && [ -z "$force" ]; then
  echo ".env already exists. Re-run with --force to overwrite (an existing Postgres volume keeps the old passwords)."
  exit 1
fi

rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

# LeadCMS identity policy requires upper, lower, digit and a symbol.
sed \
  -e "s|^POSTGRES_ADMIN_PASSWORD=.*|POSTGRES_ADMIN_PASSWORD=$(rand 24)|" \
  -e "s|^JWT__SECRET=.*|JWT__SECRET=$(rand 64)|" \
  -e "s|^POSTGRES__PASSWORD=.*|POSTGRES__PASSWORD=$(rand 24)|" \
  -e "s|^DEFAULTUSERS__0__PASSWORD=.*|DEFAULTUSERS__0__PASSWORD=$(rand 16)Aa1!|" \
  -e "s|^N8N_DB_PASSWORD=.*|N8N_DB_PASSWORD=$(rand 24)|" \
  -e "s|^N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=$(rand 48)|" \
  -e "s|^SUBSCRIPTION_TOKEN_SECRET=.*|SUBSCRIPTION_TOKEN_SECRET=$(rand 64)|" \
  env.example > .env

if [ -n "$name" ]; then
  sed -i.bak -e "s|^INSTANCE_NAME=.*|INSTANCE_NAME=${name}|" .env
fi
if [ -n "$domain" ]; then
  apex="${domain#*.}"
  sed -i.bak \
    -e "s|^CRM_DOMAIN=.*|CRM_DOMAIN=${domain}|" \
    -e "s|^AUTOMATION_DOMAIN=.*|AUTOMATION_DOMAIN=automations.${apex}|" \
    -e "s|^SITE_URL=.*|SITE_URL=https://${apex}|" \
    -e "s|^SITE_URL_WWW=.*|SITE_URL_WWW=https://www.${apex}|" \
    .env
fi
rm -f .env.bak
chmod 600 .env

echo "Wrote crm/.env. Admin login: admin@crm.local / DEFAULTUSERS__0__PASSWORD in .env"
echo "Local:      docker compose up -d --build"
echo "Production: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
echo "Then load the CRM structure: python3 blueprint/apply.py"
