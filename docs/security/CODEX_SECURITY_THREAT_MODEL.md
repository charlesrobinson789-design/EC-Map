# EC Map Repository Threat Model

Generated using the Codex Security threat-model phase for the Voice EC Map repository.

## Overview

EC Map is currently a local-first prototype for structured functional capacity intake in midlife cognition. The app renders a browser-based assessment, stores local progress in `localStorage`, generates a client report and coach packet, and includes a Docker/Postgres preview for saving mock-patient assessment sessions.

Primary runtime surfaces:

- `src/app.js`: browser application, local state, API calls, generated report/coach packet HTML.
- `server/index.js`: Express server, static file serving, JSON API, and Postgres-backed persistence preview.
- `server/db.js`, `server/schema.sql`, `server/assessment-contract.js`: database initialization, seed data, save/list/get assessment operations, and payload normalization.
- `docker-compose.yml` and `Dockerfile`: local preview deployment path.

The current product boundary is prototype-only. The app must not collect real patient data, PHI, raw audio, medication details, or production coach/client records until authentication, authorization, encryption, export/delete, audit logging, consent, retention, and incident-response controls exist.

## Threat Model, Trust Boundaries, and Assumptions

Important assets:

- Assessment responses, narrative answers, safety/referral answers, generated reports, and coach packets.
- Future account identities, coach/client relationships, organization membership, and billing data.
- Future voice transcripts or audio, if added.
- Database connection strings and deployment secrets.
- Evidence/copy guardrails that keep the app non-diagnostic and non-treatment-oriented.

Trust boundaries:

- Browser to local storage: sensitive answers persist in the user's browser. Anyone with access to the device/browser profile may read them.
- Browser to Express API: `/api/*` accepts JSON from the browser. There is no authentication or CSRF boundary yet, so the API is local-preview only.
- Express API to Postgres: server code writes JSON payloads to Postgres using parameterized SQL.
- Static app to external source links: report/method pages link out to third-party sources, but the app should not send assessment data to those sources.
- Developer/operator to runtime: environment variables and Docker Compose control database connectivity and reset behavior.
- Future research-platform integration: any external EMA, wearable, voice, or analytics platform becomes a separate data processor/subprocessor and must pass privacy/security review before real use.

Attacker-controlled inputs:

- Browser form values, narrative text, adaptive follow-up values, and safety responses.
- API request bodies and query parameters such as `limit` and assessment IDs.
- Future uploaded transcripts, voice text, wearable exports, platform webhooks, or imported EMA data.

Operator-controlled inputs:

- `DATABASE_URL`, `PGSSLMODE`, `PORT`, `ENABLE_DEV_RESET`, Docker Compose environment values, and deployment configuration.

Developer-controlled inputs:

- The generated spine, evidence registry, copy rules, seeded mock patients, Dockerfile, schema, tests, and static assets.

Assumptions:

- Current Docker/Postgres persistence is for mock-patient preview only.
- No real user data should be entered into the prototype.
- There is no production tenant model, account model, coach role model, or permission model yet.
- Future clinical/research use requires a separate legal, IRB, HIPAA/BAA, privacy, and product-safety review.

## Attack Surface, Mitigations, and Attacker Stories

Current attack surface:

- Unauthenticated API endpoints for mock-patient listing and saved assessment sessions.
- Local browser storage of assessment state.
- Dynamic HTML rendering through `innerHTML`.
- JSONB storage of assessment/report payloads.
- Docker preview app and database ports bound to localhost on the host.
- Public static file serving from the repository root.
- External links in evidence/method pages.

Existing mitigations:

- SQL statements in `server/db.js` use parameterized queries for user-controlled values.
- API JSON body size is capped at 2 MB.
- The save contract only accepts seeded mock-patient IDs, so arbitrary client-supplied patient IDs are rejected before database write.
- The save contract requires an explicit `mockDataOnly` acknowledgement with `scope: prototype-preview` before Postgres persistence.
- Saved session/report payloads redact private safety answers and detailed safety flags; persistence stores only redaction markers and counts.
- Saved preview records can be exported as redacted JSON and deleted through the local preview UI/API.
- `src/app.js` includes an `escapeHtml` helper and uses it for user-controlled rendered values.
- Safety answers are separated from normal scoring/report summary logic.
- Copy guardrails and tests constrain diagnostic/treatment claims.
- `/api/dev/reset` is opt-in only through `ENABLE_DEV_RESET=true`.
- Docker Compose binds the app and Postgres ports to `127.0.0.1` only for local preview use.
- The Express server sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store`.
- The Express server also sends a local-preview Content Security Policy, `X-Frame-Options: DENY`, and a restrictive `Permissions-Policy` for camera, microphone, and geolocation.

Realistic attacker stories:

- A same-machine user could access the preview server and read or write saved mock assessment sessions because there is no authentication.
- A malicious form value or imported platform payload could become stored XSS if future rendering bypasses `escapeHtml`.
- A future deployment could accidentally expose `/api/*` publicly before auth, deletion/export, audit logs, and tenant boundaries exist.
- A future EMA/wearable/voice vendor could become the weak link if data ownership, retention, deletion, region, encryption, and subcontractor terms are not verified.
- A future AI/voice feature could leak sensitive text if raw transcripts/audio are stored by default or sent to a model without explicit consent and vendor controls.

Out-of-scope or lower-realism stories for the current prototype:

- Multi-tenant privilege escalation is not applicable yet because there are no users, organizations, or roles.
- Payment compromise is not applicable yet because billing is not implemented.
- Production PHI breach is not a current-state claim if the prototype is used only with mock data; it becomes high/critical once real users enter sensitive data.

Security invariants:

- Do not collect real client/patient data in the current prototype.
- Do not persist any assessment unless the user explicitly acknowledges demo/mock-data-only use.
- Do not persist raw private safety/referral answers or detailed safety flags in preview storage.
- Preserve preview-level export/delete controls for saved mock records until a production account-level export/delete workflow replaces them.
- Do not recommend a research or EMA platform unless data ownership, export/delete, consent, encryption, and access-control posture are understood.
- Do not allow AI, voice, or external platforms to handle safety/crisis decisions.
- Do not store raw audio by default in a future voice workflow.
- Keep deterministic scoring and safety routing outside free-form AI generation.
- Preserve escaping for all user-controlled text rendered through `innerHTML`.
- Disable development/reset tooling by default.
- Preserve seeded mock-patient validation, CSP/frame protections, and local-only port bindings until a production auth/tenant model exists.

## Severity Calibration

Critical:

- Public production deployment with real client data and no authentication/authorization.
- Cross-tenant access to assessment sessions or coach packets once accounts/organizations exist.
- Sending safety responses, raw audio, or PHI to an external AI/vendor without consent, BAA/DPA where required, retention control, and deletion/export path.

High:

- Stored XSS in reports or coach packets that can read assessment data or future auth tokens.
- Exposed database credentials or production `DATABASE_URL`.
- Research-platform integration that lacks written data ownership, deletion, encryption, or access-control commitments.
- Voice/transcript storage that captures sensitive health details without explicit confirmation and retention limits.

Medium:

- Unauthenticated local preview APIs exposed beyond localhost during demos if deployment/port bindings are changed.
- Missing rate limits or body-size controls on future public APIs.
- Weak validation that causes malformed assessment sessions, report corruption, or misleading coach packets.
- Docker/Postgres port exposure in a trusted local environment if localhost-only bindings are removed.

Low:

- UI-only copy issues that do not change stored data, safety routing, or claim boundaries.
- Static source-link failures.
- Local smoke-test or mock-patient seed issues that do not affect production data or real users.
