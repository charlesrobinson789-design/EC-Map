# EC Map Guided Capacity App

A local-first, evidence-informed guided capacity assessment for midlife cognition, built around ADHD-consistent and menopause-amplified pathways as co-equal interpretations.

The v1 participant experience uses the curated 64-item EC Map spine. The broader Cognition + Chemistry bank is kept as source material for later expansion, not shown in the first app flow.

The completed intake now produces three local outputs:

- Client Report: plain-language capacity signature, top signals, small experiments, and care-conversation prompts.
- Coach Packet: pre-session review notes for a midlife cognition coach or reviewer, including readiness, client context, first-session priorities, verification questions, referral/scope notes, evidence themes, and claim caveats.
- Concierge Method: source-informed product architecture from open digital-health, survey, voice, and conversational-health patterns.

## Lean UX Principles

The app follows a small digital-health UX rule set:

- Clear path: context, eight short conversations, narrative, safety check, report.
- Progressive disclosure: evidence and source notes stay in drawers until requested.
- Privacy first: local beta answers stay in this browser, and safety flags are excluded from generated summaries.
- Accessible controls: large response targets, readable labels, visible states, and stable layouts.
- Evidence without overload: source-backed, but not academic-heavy.
- Coach-ready review: separate client-facing reflection from structured professional review notes.
- Claim control: keep report language functional, educational, evidence-informed, or referral-oriented.

## Run Locally

```sh
npm run dev
```

Then open `http://localhost:5173`.

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

## Source Material

- 64-item spine: `/Users/charlesrobinson/Documents/Claude/Projects/Women NFP/EC_Map_Item_Bank_v1.0/ECMap_v1.1_Guided_Interview_64_Spine.xlsx`
- Broad Cognition + Chemistry bank: `/Users/charlesrobinson/Downloads/ECMap_v1_0_Item_Bank_Cognition_Chemistry - Cognition + Chemistry.pdf`

The app is construct-informed and experimental. It does not diagnose, validate clinical status, recommend treatment, or replace medical or mental health care.
