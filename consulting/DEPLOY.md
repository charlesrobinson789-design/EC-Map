# Consulting site: deploy and operate

One Docker Compose project (`crm-consulting`) on the Hostinger VPS. Scope is business intake only (non-PHI): the form asks about operations, never clinical information. Keep it that way.

| Service | What it does | Address |
|---|---|---|
| `edge` (Caddy) | HTTPS, landing page, routes | `executivecapacitymap.com`, `assess.`, `automations.` |
| `intake` (Python, stdlib) | Saves each form submission, emails it, notifies n8n | internal `:8000`, public `POST /api/intake` |
| `n8n` | Automations (texts Charles on each intake) | `automations.executivecapacitymap.com`, behind a password |

A submission is accepted once it is **saved or emailed**, so a mail outage never loses a lead. Saved submissions: `/opt/ecm/data/submissions.jsonl` on the server (root-only; names, emails and answers).

## Edit, build, test

Edit the sources (`Caddyfile`, `assess.caddy`, `site/`, `intake.py`), then:

```sh
python3 consulting/build.py                         # regenerates deploy/docker-compose.yml and rehearsal.yml
python3 -m unittest consulting/test_intake.py       # intake behaviour, including the mail-outage case
```

Never edit `deploy/*.yml` by hand.

## One-time server setup (browser terminal in hPanel)

Secrets live in root-only files under `/opt/ecm/secrets`, never in git or in Hostinger's project environment. Each command prompts without echoing.

1. Mailbox password (the intake emails through `charles@executivecapacitymap.com`). No restart needed: it is read on every send.
   ```sh
   sudo bash -c 'umask 077; mkdir -p /opt/ecm/secrets; read -rs -p "Mailbox password: " p; echo; printf %s "$p" > /opt/ecm/secrets/smtp_password && echo "Saved."'
   ```
2. Password for the automations site (username `charles`). Only the hash is stored. Takes effect on the next deploy; until then `automations.` stays locked.
   ```sh
   sudo bash -c 'umask 077; mkdir -p /opt/ecm/secrets; read -rs -p "New automations password: " p; echo; h=$(printf "%s\n" "$p" | docker run --rm -i caddy:2.11.7-alpine caddy hash-password) && [ -n "$h" ] && printf "N8N_EDITOR_HASH=%s\n" "$(printf %s "$h" | base64 -w0)" > /opt/ecm/secrets/edge.env && echo "Saved."'
   ```

## Deploy

Hostinger Docker Manager deploys one self-contained compose file from a URL. Pin it to a commit:

```
https://cdn.jsdelivr.net/gh/charlesrobinson789-design/EC-Map@<commit>/consulting/deploy/docker-compose.yml
```

1. **Rehearsal first:** deploy `deploy/rehearsal.yml` as project `crm-consulting-rehearsal`. It binds only to `127.0.0.1:18080/18443`, so the live site is untouched. Confirm all three containers start, then stop it.
2. **Live:** deploy `deploy/docker-compose.yml` as project `crm-consulting` (replaces the running project; volumes and certificates are kept).
3. Check the `intake` log line on start: it names the email recipient, the data directory and whether notify is on.

**Rollback:** redeploy the previous commit's URL. The pre-n8n version is commit `a47fbc4`.

## Turn on the text alert (after the first deploy with n8n)

1. Open `https://automations.executivecapacitymap.com`, sign in as `charles` with the automations password, then create the n8n owner account.
2. Import `consulting/n8n/intake-alert.json` (Workflows → Import from file).
3. Create a credential: **Header Auth**, name `X-API-Key`, value = your Inkbox API key. Select it on the *Send iMessage (Inkbox)* node. The key stays encrypted inside n8n.
4. In the *Settings* node, set `alert_to` (your mobile, `+1…`) and `inkbox_identity_id`.
5. iMessage only reaches a phone that has connected: from your iPhone, text `connect @executivecapacity` to Inkbox's router number once.
6. Activate the workflow and submit a test intake. The text contains only name and role; full answers stay in email and the saved file.

## Log lines (intake)

| Line | Meaning |
|---|---|
| `intake <id> accepted (saved=True, emailed=True)` | Normal |
| `... send failed: RuntimeError: SMTP password not configured` | Step 1 of server setup is missing; the lead is still saved |
| `... notify failed: HTTPError: ... 404` | n8n workflow not active yet; lead is saved and emailed |
| `... save failed` | Check `/opt/ecm/data` on the server |

## Not included yet

LeadCMS and Postgres from `crm/` need an image built on the server, which this one-file deploy cannot do. That is a separate step.
