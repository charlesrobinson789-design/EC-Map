# Consulting site: deploy and operate

One Docker Compose project (`crm-consulting`) on the Hostinger VPS. Scope is business work only (non-PHI): the intake asks about operations, never clinical information, and the automations handle client coaching updates, not patient data. Keep it that way.

| Service | What it does | Address |
|---|---|---|
| `edge` (Caddy) | HTTPS, landing page, routes | `executivecapacitymap.com`, `assess.`, `automations.` |
| `intake` (Python, stdlib) | Saves each form submission, emails it, notifies n8n | internal `:8000`, public `POST /api/intake` |
| `n8n` | Client automations; Claude builds and edits workflows through its MCP connector | `automations.executivecapacitymap.com` |
| `postgres` | n8n's database: workflows, saved credentials, data tables (client records), run history | internal only |
| `automations-init` | One-shot on every deploy: makes the stack's secrets on first run, emails Charles his n8n sign-in once | none |
| `pg-backup` | Nightly database dump, 14 days kept | none |

A submission is accepted once it is **saved or emailed**, so a mail outage never loses a lead. Saved submissions: `/opt/ecm/data/submissions.jsonl` on the server (root-only; names, emails and answers).

The landing page and intake never wait on the automations stack: if n8n or Postgres fail to start, the site stays up.

## Edit, build, test

Edit the sources (`Caddyfile`, `assess.caddy`, `site/`, `intake.py`, `n8n/`), then:

```sh
python3 consulting/build.py                         # regenerates deploy/docker-compose.yml and rehearsal.yml
python3 -m unittest consulting/test_intake.py       # intake behaviour, including the mail-outage case
```

Never edit `deploy/*.yml` by hand.

## Secrets

Nothing secret is in git, in Hostinger's project environment, or in logs.

- **Mailbox password** (one-time, already done): `/opt/ecm/secrets/smtp_password`, root-only. The intake sends with it, and n8n's IMAP/SMTP credentials are prefilled from it. To set or change it, in the hPanel browser terminal (prompts without echoing):
  ```sh
  sudo bash -c 'umask 077; mkdir -p /opt/ecm/secrets; read -rs -p "Mailbox password: " p; echo; printf %s "$p" > /opt/ecm/secrets/smtp_password && echo "Saved."'
  ```
  Redeploy afterwards so n8n picks up the change (the intake reads it on every send).
- **Everything else is generated** by `automations-init` on the first deploy and kept in the `automation_secrets` Docker volume: the database password, n8n's encryption key, and Charles's n8n password (plus its bcrypt hash). They are never regenerated unless deleted.

## Deploy

Hostinger Docker Manager deploys one self-contained compose file from a URL. Pin it to a commit:

```
https://cdn.jsdelivr.net/gh/charlesrobinson789-design/EC-Map@<commit>/consulting/deploy/docker-compose.yml
```

1. **Rehearsal first:** deploy `deploy/rehearsal.yml` as project `crm-consulting-rehearsal`. It binds only to `127.0.0.1:18080/18443`, uses its own certificate store with Caddy's internal CA (so it never asks Let's Encrypt for certificates it can't prove), writes to `/opt/ecm/rehearsal/` instead of the live data and backup folders, and sends no email. Confirm every container starts and `automations-init` exits 0, then stop it.
2. **Live:** deploy `deploy/docker-compose.yml` as project `crm-consulting` (replaces the running project; volumes and certificates are kept).
3. Check the logs: the `intake` start line names the email recipient, data directory and notify state; `automations-init` lines are listed below.

**Rollback:** redeploy the previous commit's URL. The pre-n8n version is commit `a47fbc4`. Rolling back leaves the n8n and Postgres volumes in place.

## First sign-in (after the first live deploy)

1. An email titled **Your n8n sign-in** arrives at `charles@executivecapacitymap.com` with the password. Sign in at `https://automations.executivecapacitymap.com`, save the password in a password manager, and delete the email.
2. Turn on two-step login: initials (bottom left) > Settings > Personal > Two-factor authentication.
3. Connect Claude: Settings > Instance-level MCP > Connect a client > Claude > One-click setup. (MCP access is already switched on by the server.)

The owner account is managed by the server (`N8N_INSTANCE_OWNER_*`), so it exists before n8n first starts and there is never an open setup page. A password changed inside n8n is reset on the next restart.

n8n's first run on the live server was on Postgres (14 Oct 2026), with a fresh `n8n_data` volume and the encryption key from `automation_secrets`. Don't deploy an older SQLite version of n8n over it. If one ever runs first, its data and its encryption key (in `n8n_data/config`) must be migrated before switching to this setup, or n8n refuses to start on the mismatched key.

**If the email didn't arrive**, read the password in the hPanel browser terminal:
```sh
sudo docker run --rm -v crm-consulting_automation_secrets:/s alpine cat /s/owner_password; echo
```

**To rotate the password:** delete `owner_password`, `owner_password_hash` and `welcome_sent` from the volume, then redeploy. A new password is generated and emailed.
```sh
sudo docker run --rm -v crm-consulting_automation_secrets:/s alpine rm -f /s/owner_password /s/owner_password_hash /s/welcome_sent
```

## Mailbox credentials in n8n

`automations-init` writes `CREDENTIALS_OVERWRITE_DATA` for the **IMAP** and **SMTP** credential types: host, port, TLS, user and password for `charles@executivecapacitymap.com`. Create a credential of either type in n8n and save it: the fields are already filled and hidden.

## Backups

- `pg-backup` writes `/opt/ecm/backups/n8n-YYYY-MM-DD.dump` nightly (and once after n8n's first start), keeping 14 days. Dates are UTC; the nightly run starts at 03:00 UTC.
- `/opt/ecm/backups/n8n-2026-10-14.dump` came from the rehearsal (an empty database), before rehearsal had its own folder. Don't restore it; it ages out after 14 days.
- Restore into a running stack:
  ```sh
  sudo docker exec -i crm-consulting-pg-backup-1 sh -c 'PGPASSWORD=$(cat /secrets/pg_password) pg_restore -h postgres -U n8n -d n8n --clean' < /opt/ecm/backups/n8n-YYYY-MM-DD.dump
  ```
- Saved credentials in a dump are encrypted with the key in the `automation_secrets` volume. Hostinger's weekly VPS backup holds both.

## Log lines

| Service | Line | Meaning |
|---|---|---|
| intake | `intake <id> accepted (saved=True, emailed=True)` | Normal |
| intake | `... send failed: RuntimeError: SMTP password not configured` | Mailbox password missing; the lead is still saved |
| intake | `... notify failed: HTTPError: ... 404` | No n8n workflow listens on `ecm-intake` yet; lead is saved and emailed |
| intake | `... save failed` | Check `/opt/ecm/data` on the server |
| automations-init | `<secret>: generated` / `kept` | First run / later runs |
| automations-init | `mailbox credentials: skipped` | No mailbox password on the server; IMAP/SMTP credentials won't be prefilled |
| automations-init | `welcome email: sent` / `already sent` / `failed (...)` | On failure, read the password as above |
| pg-backup | `pg-backup: wrote /backups/n8n-....dump` | Nightly dump done |

## Optional: text alert on each intake

`n8n/intake-alert.json` texts Charles through Inkbox when an intake arrives.

1. Import it (Workflows > Import from file).
2. Create a credential: **Header Auth**, name `X-API-Key`, value = the Inkbox API key. Select it on the *Send iMessage (Inkbox)* node.
3. In the *Settings* node, set `alert_to` (mobile, `+1…`) and `inkbox_identity_id`.
4. iMessage only reaches a phone that has connected: from the iPhone, text `connect @executivecapacity` to Inkbox's router number once.
5. Publish the workflow and submit a test intake. The text contains only name and role; full answers stay in email and the saved file.

## Not included yet

LeadCMS from `crm/` needs an image built on the server, which this one-file deploy cannot do. That is a separate step.
