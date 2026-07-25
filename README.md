# EC Map Guided Capacity App

A local-first, evidence-informed executive-capacity assessment for adults of any sex. It separates longstanding cognition patterns from current body-state, context, and recovery amplifiers without making diagnostic or causal claims.

The shared-core MVP uses seven assessments with eight prompts each, for 56 active scored prompts. The original 64-item source bank remains intact. Its combined Sleep and Hormonal Variability section, eight prompts across H1 and H2, is explicitly paused and excluded from active navigation, scoring, reports, and saved active sessions while future male and female modules are designed.

The completed intake now produces three outputs:

- Client Report: plain-language capacity signature, top signals, small experiments, and care-conversation prompts.
- Coach Packet: pre-session review notes for an executive-capacity coach or reviewer, including readiness, client context, first-session priorities, verification questions, referral/scope notes, evidence themes, and claim caveats.
- Concierge Method: source-informed product architecture from open digital-health, survey, voice, and conversational-health patterns.

The current build also includes a lightweight Docker/Postgres preview so mock-patient assessments can be saved and reviewed without using real user data.

## Lean UX Principles

The app follows a small digital-health UX rule set:

- Clear path: context, seven shared assessments, narrative, safety check, report.
- Progressive disclosure: evidence and source notes stay in drawers until requested.
- Privacy first: local beta answers stay in this browser, and safety flags are excluded from generated summaries.
- Accessible controls: large response targets, readable labels, visible states, and stable layouts.
- Evidence without overload: source-backed, but not academic-heavy.
- Coach-ready review: separate client-facing reflection from structured professional review notes.
- Claim control: keep report language functional, educational, evidence-informed, or referral-oriented.

## Assessment Profile Decision

- Active profile: `core-seven-v1` / `ec-map-core-56-v1`.
- Active sections: the original sections 1-4 and 6-8, unchanged and in their original order.
- Paused source module: the original section 5, `Sleep and Hormonal Variability`, including H1 and H2.
- Active context: six sex-neutral anchors; the hormonal-transition anchor is paused.
- Migration: browser sessions from the 64-item flow are remapped to the 56-item core, and paused responses are removed from active saved state.
- Known tradeoff: H1 Sleep Restoration is currently paused with H2 because they were combined in one section. Restore sleep only through a separately reviewed instrument change rather than silently moving prompts between the seven unchanged assessments.

See `docs/CORE_SEVEN_ARCHITECTURE_REVIEW.md` for the implementation boundary and release checks.

## Run With Docker And Postgres

```sh
docker compose up --build
```

Then open `http://localhost:3000`.

Use the mock-patient selector on the home screen, click `Preview report`, then click `Save assessment` on the report or coach packet. Saved sessions are written to Postgres in the `assessment_sessions` table.

Docker Compose binds both the app and Postgres to `127.0.0.1` for local preview only. Saving requires an explicit demo/mock-data acknowledgement and a seeded mock-patient ID; private safety answers are redacted from persisted preview payloads. Recent saved sessions can be exported as redacted JSON or deleted from the preview UI. Do not use this stack for real participant data.

Inspect saved rows:

```sh
docker compose exec postgres psql -U ec_map -d ec_map -c "select id, patient_id, status, created_at from assessment_sessions order by created_at desc;"
```

## Run Static Only

```sh
npm run static
```

Then open `http://localhost:5173`. Static mode keeps answers in this browser and does not save to Postgres.

## Run Node Server Locally

Install dependencies first:

```sh
npm install
npm run dev
```

Set `DATABASE_URL` if you want the Node server to connect to a local Postgres instance. Docker Compose provides this automatically.

## Test

```sh
npm test
```

## Verify Before Handoff

Use the full verification gate before sending changes to another developer:

```sh
npm run verify
```

This runs:

- syntax checks for JS/MJS files
- spine and section integrity checks
- evidence/source reference checks
- claim/copy guardrail checks
- unit tests
- local static-server smoke test

## Developer Handoff

Read `DEVELOPER_HANDOFF.md` before turning this prototype into a private-beta SaaS. It includes the sincere code review, current limitations, developer selection criteria, and the recommended build sequence for backend, voice, coach dashboard, and privacy controls.

Security and platform-selection notes:

- `docs/security/CODEX_SECURITY_THREAT_MODEL.md`: Codex Security threat-model phase output for the current prototype.
- `docs/research/EMA_PLATFORM_RESEARCH_DOSSIER.md`: research-first EMA/digital-phenotyping platform scan with security gates before any build integration.
- `docs/research/EMA_PLATFORM_EVIDENCE_APPENDIX.md`: primary-source platform evidence snapshot for low-cost, open-source, hosted, passive-sensing, and eCOA/ePRO options.
- `docs/research/MINDLAMP_OPEN_SOURCE_OPTIONS.md`: focused mindLAMP code-option breakdown and self-hosting/security implications.
- `docs/research/VERBAL_FIRST_OPEN_SOURCE_OPTIONS.md`: verbal-first open-source options and how to add EMA as a later tier.
- `docs/research/EMA_VENDOR_SECURITY_QUESTIONNAIRE.md`: sendable vendor questionnaire for pricing, privacy, export/delete, BAA/DPA, and AI/voice boundaries.
- `docs/research/EMA_PLATFORM_SCORECARD.md`: scoring rubric and preliminary shortlist for safe pilot selection.

## Source Material

- 64-item spine: `/Users/charlesrobinson/Documents/Claude/Projects/Women NFP/EC_Map_Item_Bank_v1.0/ECMap_v1.1_Guided_Interview_64_Spine.xlsx`
- Broad Cognition + Chemistry bank: `/Users/charlesrobinson/Downloads/ECMap_v1_0_Item_Bank_Cognition_Chemistry - Cognition + Chemistry.pdf`

The app is construct-informed and experimental. It does not diagnose, validate clinical status, recommend treatment, or replace medical or mental health care.
