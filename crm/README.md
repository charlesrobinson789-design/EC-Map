# CRM stack (self-hosted, GoHighLevel-style)

One isolated instance per business: its own folder, `.env`, databases and domain. Start with one instance; copy the folder for each additional client.

**How the CRM is organized** (tags, segments, sequences, pipelines, consent rules): see [STRUCTURE.md](STRUCTURE.md). The structure itself is code: `blueprint/ecmap.json`, applied with `blueprint/apply.py`.

| Service | Local URL | What it does |
|---|---|---|
| LeadCMS + admin UI | http://localhost:8080 | Contacts, accounts, segments, email campaigns and drip sequences, email templates, content/blog, media, link tracking, orders |
| n8n | http://localhost:5678 | Automations: form → contact → sequence, booking/payment webhooks, notifications |
| Postgres 17 | `localhost:5433` | One server; separate database and owner for `leadcms` and `n8n` |
| Mailpit (dev only) | http://localhost:8025 | Catches all outgoing email locally |

## Run locally

```sh
cd crm
./setup.sh --name mypractice      # writes .env with random secrets
docker compose up -d --build      # first build ~3-5 min (compiles the admin UI)
python3 blueprint/apply.py        # loads lists, templates, segments, pipelines, sequences
```

- Admin login: `admin@crm.local` with `DEFAULTUSERS__0__PASSWORD` from `.env`.
- n8n: create the owner account on first visit.
- Stop: `docker compose down`. Wipe all data: `docker compose down -v`.

## Production (Hostinger VPS or any Ubuntu server with Docker)

1. **DNS:** point two A records at the server IP, e.g. `crm.yourdomain.com` and `automations.yourdomain.com`.
2. **Code:** copy this `crm/` folder to the server (e.g. `/opt/crm`).
3. **Config:** `./setup.sh --name mypractice --domain crm.yourdomain.com`, then edit `.env`:
   - `ACME_EMAIL`: your email, used for certificate expiry notices.
   - `EMAIL__*`: real SMTP. For a Hostinger mailbox: `EMAIL__SERVER=smtp.hostinger.com`, `EMAIL__PORT=465`, `EMAIL__USESSL=true`, plus the mailbox address and password.
   - `DEFAULTUSERS__0__EMAIL`: your real admin email.
   - `SITE_URL` / `SITE_URL_WWW`: your marketing site (set from `--domain`; check them). Signup forms on this site may post to the CRM.
   - `CONTACTUS__TO__0` and `SUPPORTEMAIL`: where contact-form notifications go.
4. **Start:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
   Caddy gets HTTPS certificates automatically. Only ports 80 and 443 are exposed; everything else stays on 127.0.0.1.
5. **Load the CRM structure:** `python3 blueprint/apply.py` (safe to re-run any time).
6. **Signup forms:** paste `public/embed-form.html` into your site and set `CRM_URL`. Confirmation and unsubscribe pages are already served at `https://<CRM_DOMAIN>/confirm-subscription` and `/unsubscribe`.
7. **Backups:** add `15 3 * * * /opt/crm/backup.sh` to crontab, and copy `backups/` off the server.

## New client instance

Use a separate VPS per client (simplest isolation), or the same VPS with different host ports and domains:

```sh
cp -r crm /opt/crm-clientname && cd /opt/crm-clientname
rm -f .env && ./setup.sh --name clientname --domain crm.clientdomain.com
```

Same-VPS instances also need unique host ports (`POSTGRES_HOST_PORT` in `.env`; the 8080/5678/1025/8025 bindings in `docker-compose.yml`), and one shared Caddy instead of one per instance.

## Coverage vs GoHighLevel

| Covered | Partial | Not included (add later) |
|---|---|---|
| Contacts, accounts, tag-based segments | Deal pipelines: 4 pipelines created, API only (no admin screen) | Calendar booking: Cal.com cloud, webhook into n8n |
| Double opt-in signup, drip sequences routed by tags, templates, unsubscribe | Forms: email-only double opt-in signup (`public/embed-form.html`) | Payments: Stripe, webhook into n8n |
| Content/blog, media, redirects | SMS: send-only plugin | Two-way SMS/inbox: Twilio + n8n |
| Link tracking, orders, promotions | | Drag-and-drop funnel builder: pages are coded (Next.js) |

## Notes

- **Data boundary:** this is a marketing CRM. Hostinger does not sign a BAA. Keep PHI (clinical intake, assessment answers, diagnoses) out of it; route clinical data to BAA-covered systems.
- **Versions:** LeadCMS `1.5.155-pre` (upstream publishes pre-release tags only), admin UI pinned to commit `3faac23`, n8n `2.42.5`, Postgres `17.11`, Caddy `2.11.7`. Upgrade one at a time; run `backup.sh` first.
- `.env` holds every secret. It is gitignored; keep it out of chat, email and screenshots.
