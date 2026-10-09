#!/bin/sh
# Runs once, on first start of an empty Postgres volume: one database + owner per app.
set -eu

create_db() {
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<SQL
CREATE ROLE "$1" LOGIN PASSWORD '$2';
CREATE DATABASE "$1" OWNER "$1";
SQL
}

create_db leadcms "$LEADCMS_DB_PASSWORD"
create_db n8n "$N8N_DB_PASSWORD"
