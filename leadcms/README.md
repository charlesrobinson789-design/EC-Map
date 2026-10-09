# LeadCMS (marketing/content backend)

Self-contained [LeadCMS](https://github.com/LeadCMS/leadcms.core) stack with its own Postgres, separate from the EC-Map app database.

| Service | URL | Notes |
|---|---|---|
| LeadCMS API + Swagger | http://localhost:8080 | `GET /api/version` for a health check |
| Postgres (LeadCMS only) | `localhost:5433` | db/user `leadcms`, password in `.env` |
| Mailpit inbox | http://localhost:8025 | Catches all outgoing email locally |

EC-Map's own Postgres stays on `5432`; the two never share a database.

## Run

```sh
cd leadcms
./setup.sh            # writes .env with random JWT, Postgres and admin secrets
docker compose up -d
```

First start applies the LeadCMS migrations automatically. Admin login: `admin@ecmap.local` with the `DEFAULTUSERS__0__PASSWORD` value from `.env`.

Stop: `docker compose down`. Wipe data: `docker compose down -v`.

## Notes

- **Version pin:** upstream docs use `leadcms/core:latest`, which is not published. Only `-pre` tags exist; this stack pins `LEADCMS_VERSION` in `.env`.
- **Data boundary:** LeadCMS stores contacts and visitor tracking. Keep assessment responses and any clinical data in EC-Map, never in LeadCMS.
- **Local only:** all ports bind to `127.0.0.1`. Production needs TLS, backups, and real SMTP (replace the Mailpit `EMAIL__*` values).
