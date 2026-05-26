# EC Map Developer Handoff

## Executive Review

This is a coherent local-first prototype, not a production SaaS yet. The product idea is strong because it is not trying to be a generic chatbot or a diagnostic test. It is a structured pre-session intake that maps functional cognition in midlife, with ADHD-consistent and menopause-amplified pathways treated as co-equal possibilities.

The current code is intentionally simple: static HTML, browser `localStorage`, deterministic scoring, evidence/source metadata, claim guardrails, client report, coach packet, and a concierge-method page. That simplicity is useful for review and early product feedback.

The honest limitation: this is not investor-grade code yet. It needs a typed application layer, formal state model, backend/API boundary, authentication, data deletion/export controls, voice pipeline, CI, accessibility audit, and a stronger release process before real users enter sensitive health information.

## What Exists Now

- 64-item EC Map scored spine.
- 8 short conversation sections, each with 8 scored prompts.
- Context anchors for role, sleep, menopause transition, ADHD-relevant history, setting spread, and timeline.
- Deterministic scoring for cognition, chemistry/body-state, modifiability, driver confidence, and safety flags.
- Client report with capacity signature, differential lens, small experiments, and care-conversation prompts.
- Coach packet with readiness, context, priorities, verification questions, referral/scope notes, and claim caveats.
- Evidence registry and source-backed drawers.
- Copy rules blocking diagnostic, validation, treatment, certainty, and protected-style claims.
- Tests for section structure, scoring, evidence mapping, coach review, safety exclusion, and claim controls.

## How To Run

```sh
npm start
```

Open:

```text
http://localhost:5173/
```

Run tests:

```sh
npm test
```

Run the full local verification gate:

```sh
npm run verify
```

Current verification status:

```text
Full verification passing: syntax checks, integrity checks, claim guardrails, 14 unit tests, and static-server smoke test.
```

## Source Map

- `src/app.js`: single-page application rendering, routing, state handling, report screens.
- `src/spine.js`: 64 scored items plus context, narrative, safety, and response options.
- `src/sections.js`: 8 conversation section definitions and section helpers.
- `src/scoring.js`: deterministic scoring and report card selection.
- `src/report-model.js`: client report, coach review, experiments, differential lens, and claim-tagged phrases.
- `src/evidence.js`: source registry and evidence theme mapping.
- `src/source-blueprints.js`: external product/code patterns that inform the concierge method.
- `src/copy-rules.js`: unsupported-claim and protected-language guardrails.
- `scripts/verify.mjs`: syntax, data-integrity, evidence-reference, and claim-guardrail verification.
- `scripts/smoke.mjs`: local static-server smoke test for core app assets.
- `test/app.test.js`: unit tests for the current deterministic behavior.
- `.github/workflows/verify.yml`: GitHub Actions workflow for running `npm run verify`.

## Sincere Code Review

### Strengths

- The product boundary is unusually clear: functional intake, not diagnosis or treatment.
- The app has a real scoring spine instead of vague AI conversation.
- Safety routing is deterministic and excluded from AI-style summary payloads.
- ADHD and menopause are now structurally co-equal, not just mentioned in copy.
- The coach packet is the strongest SaaS wedge because it converts self-report into pre-session signal.
- The code is easy for a developer to read because there is little framework overhead.

### Weaknesses

- The app is not typed. A TypeScript migration should happen before complex voice or backend work.
- State is browser-only and informal. A future SaaS needs explicit session, assessment, scoring, evidence, and report schemas.
- There is no backend. Voice-to-text, text-to-speech, secure storage, auth, export, deletion, and audit events all require one.
- The UI is static and custom. It is acceptable for prototype review, but a production developer may want React, Next.js, SvelteKit, or another maintainable app layer.
- Accessibility has good intent but has not been audited against WCAG 2.2.
- The evidence layer is source-informed but not a clinical validation file. Product claims must stay conservative.
- There is no CI/CD, linting, formatting, deployment config, or environment-management strategy.
- There is no real data-security posture yet. Do not collect live sensitive health data in this version.

## Recommended Developer Path

### Phase 1: Make The Prototype Developer-Grade

- Move the app into a typed framework such as Next.js or SvelteKit.
- Convert core models into TypeScript types:
  - `AssessmentSession`
  - `ContextResponses`
  - `ScoredResponses`
  - `SafetyResponses`
  - `DifferentialLens`
  - `ClientReport`
  - `CoachPacket`
  - `EvidenceSource`
- Preserve deterministic scoring as a pure module with tests.
- Add ESLint, Prettier, TypeScript checking, and GitHub Actions.
- Add version metadata for assessment, scoring, evidence, and report models.
- Keep `npm run verify` or an equivalent CI gate as the non-negotiable merge requirement.

### Phase 2: Add The SaaS Boundary

- Add authentication and invite-only beta access.
- Add encrypted persistence for assessment sessions.
- Add export and delete controls.
- Add a coach dashboard with client packet review.
- Add audit events for report generation, export, deletion, and safety routing.
- Keep safety/referral logic deterministic and outside any AI prompt.

### Phase 3: Add Voice Correctly

- Voice flow should be:
  1. app speaks the section frame and prompt
  2. user answers naturally
  3. app transcribes
  4. app summarizes the answer in one sentence
  5. user confirms or edits
  6. app records the scored value and optional narrative snippet
- Do not free-chat around crisis, diagnosis, medication, hormone therapy, or treatment.
- Do not store raw audio by default.
- Store transcript only after explicit confirmation.
- Keep a non-voice fallback for accessibility and privacy.

### Phase 4: Make The Coach Packet The Paid Product

- Add "What to know before the first session."
- Add top working hypotheses.
- Add contradictions to verify.
- Add quote snippets from narrative answers.
- Add first-session agenda.
- Add "do not over-interpret" warnings.
- Add referral/scope flags.
- Add longitudinal comparison after multiple check-ins.

## What To Send A Developer

Send the developer:

1. This repository or the zipped folder.
2. `DEVELOPER_HANDOFF.md`.
3. `README.md`.
4. A short demo path:
   - open app
   - click `Preview report`
   - inspect client report
   - click `Coach packet`
   - inspect coach packet
   - click `Method`
   - inspect source-informed architecture
5. The development ask:
   - "Please turn this into a private-beta SaaS with a typed frontend, backend persistence, coach dashboard, export/delete controls, and voice-to-voice assessment flow."

## Developer Selection Criteria

The right developer should be able to explain:

- how they would preserve deterministic scoring while adding AI voice
- how they would prevent AI from handling safety/crisis decisions
- how they would structure session/report schemas
- how they would protect sensitive data
- how they would support export/delete
- how they would build coach review without overcomplicating client intake
- how they would ship a private beta in small increments

Avoid a developer who wants to turn this into a generic chatbot, add diagnosis claims, embed proprietary scales without rights review, or build the voice layer before the core data model is stable.

## Immediate Next Build Brief

Build a private-beta version with:

- client intake
- coach packet
- account/login
- encrypted session storage
- export/delete
- typed scoring model
- voice-to-text and text-to-speech prototype
- deterministic safety routing
- no diagnostic or treatment claims

The product should remain simple for the client and high-signal for the coach.
