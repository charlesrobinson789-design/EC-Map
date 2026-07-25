# Antigravity Build Brief — Phase 1: Developer-Grade Migration

Prepared 2026-07-25 for use in Google Antigravity (Manager View or Editor View agents).
Scope: **Phase 1 only** — "Make The Prototype Developer-Grade," per `DEVELOPER_HANDOFF.md`. Phases 2-4 and the Stage 2 self-serve product are explicitly out of scope — see "Out of scope" below before touching anything adjacent to them.

---

## 1. Orient before you write any code

EC Map is a structured, pre-session executive-capacity intake for midlife cognition (attention, working memory, initiation, organization, emotional load, body-state factors), built by a licensed PMHNP. It is **not** a diagnostic tool, not therapy, and not a chatbot. Two design facts drive every constraint below:

- The product's entire safety/compliance posture depends on **deterministic scoring and safety routing that no LLM touches**.
- Every public and generated-report claim is filtered through coded guardrails that block diagnostic, validation, treatment, certainty, and protected-style language.

An autonomous agent refactoring this codebase can easily "clean up" or "simplify" exactly the code that exists to enforce those two facts. Read Section 2 before starting.

Background reading already in this repo, in order of relevance to this task:

- `DEVELOPER_HANDOFF.md` — full phased roadmap and the original Phase 1 spec this brief refines
- `README.md` — product scope, active vs. paused assessment sections, how to run the app
- `docs/CORE_SEVEN_ARCHITECTURE_REVIEW.md` — implementation boundary and release checks
- `docs/security/CODEX_SECURITY_THREAT_MODEL.md` — current threat model
- `VOICE_EC_MAP_BUSINESS_MODEL_CANVAS.pdf` (repo root) — business context: this prototype is funding a live consulting service today (Stage 1) while a self-serve product (Stage 2) stays a roadmap item pending regulatory review. Phase 1 supports both futures; it does not commit to either.

## 2. Hard constraints — do not violate, do not route around

1. **Never let an LLM/AI layer decide a score.** `src/scoring.js` must stay a pure, deterministic, fully-tested module. Migrating it to TypeScript must not change a single point value, threshold, or scoring rule without a separate, explicitly-flagged, human-reviewed decision.
2. **Safety routing stays outside any AI call and outside every generated summary.** Private safety-check answers must remain excluded from client reports, coach packets, persisted preview payloads, and any surface an LLM reads or writes. If the migration touches this path, add a test proving exclusion — do not just preserve the existing behavior by assumption.
3. **Claim guardrails (`src/copy-rules.js`) are not boilerplate.** Do not weaken, bypass, special-case, or "refactor for simplicity" the blocked-language rules (diagnostic, validation, treatment, certainty, protected-style claims). If a rule looks redundant, flag it for human review — do not remove it.
4. **`npm run verify` is the non-negotiable merge gate, and it must stay honest.** If a check fails, fix the underlying code. Do not edit `scripts/verify.mjs`, test assertions, or CI config to make a failure disappear. Widen or migrate the gate's *implementation* (e.g., add `tsc --noEmit`, ESLint) freely — never weaken what it *checks*.
5. **The paused H1/H2 Sleep and Hormonal Variability section stays paused.** Do not re-include it in active navigation, scoring, or reports as a side effect of restructuring `src/sections.js` or `src/spine.js`.
6. **Mock-patient-only stays mock-patient-only.** Phase 1 is tooling and typing, not a path to real participant data. Do not wire the migrated app to production auth or real user storage — that is explicitly Phase 2.
7. **The Stage 2 self-serve build (no human review before a client sees a report) is out of scope for this task entirely.** Do not build toward it opportunistically. See "Out of scope."

If any Phase 1 task seems to require touching #1–#3, stop and surface it as a question rather than proceeding.

## 3. Current state — what you're actually migrating

Stack today: vanilla ESM JavaScript, no framework, no TypeScript, no ESLint/Prettier configured. Express 5 + `pg` backend. Tests run on the native `node --test` runner. A custom verification pipeline already exists and already runs in CI.

```
src/
  app.js                 60 KB   single-page app: rendering, routing, state, report screens
  spine.js                41 KB   64-item source bank + context/narrative/safety/response options
  styles.css               27 KB
  report-model.js          17 KB   client report, coach packet, differential lens, claim-tagged phrases
  evidence.js               13 KB   source registry, evidence theme mapping
  sol-governance.js         12 KB   scope-of-license governance logic (see docs/SOL_GOVERNANCE_MVP.md)
  sections.js                6 KB   active 7-section profile, paused H1/H2 module, context profile
  followups.js               6 KB
  scoring.js                  5 KB   deterministic scoring + report card selection
  source-blueprints.js        5 KB   external product/code patterns (concierge method page)
  summary.js                  2 KB
  session-profile.js          2 KB   legacy-session migration, active-profile persistence filtering
  copy-rules.js               2 KB   claim guardrails

server/
  index.js                  Express app, static serving, assessment persistence API
  db.js                     Postgres schema init, seed data, assessment queries
  mock-patients.js          fictional mock-patient profiles
  assessment-contract.js    API payload validation
  schema.sql

test/
  app.test.js               20 KB  existing unit tests
  sol-governance.test.js    11 KB  existing unit tests

scripts/
  verify.mjs                13 KB  syntax + data-integrity + evidence-reference + claim-guardrail checks
  smoke.mjs                  4 KB  local static-server smoke test
  export_spine.py           19 KB  regenerates spine.js from the source item-bank Excel/PDF (Python, not part of the JS build)

.github/workflows/verify.yml    already runs `npm run verify` on every push/PR
```

Existing `package.json` scripts to preserve or cleanly migrate: `dev`, `static`, `check`, `smoke`, `test`, `verify`, `import:spine`. Treat `npm run verify` (= check + test + smoke) as the contract — whatever framework you land on, this command must still exist and still mean the same thing.

## 4. Phase 1 scope

1. **Choose and scaffold a typed framework.** Default recommendation: **Next.js** (larger ecosystem, most autonomous-agent-familiar territory). SvelteKit is an acceptable alternative per `DEVELOPER_HANDOFF.md` — if you pick it instead, say so explicitly rather than silently deciding; this is a reversible but consequential choice.
2. **Port the pure logic modules to TypeScript first, before touching the UI:** `scoring.js`, `copy-rules.js`, `evidence.js`, `sections.js`, `session-profile.js`, `report-model.js`, `source-blueprints.js`, `summary.js`, `sol-governance.js`. Each keeps its existing test coverage passing (ported to the new test setup if you change test runners) before you move on.
3. **Define the 8 core types from the actual runtime shapes** — read the source, do not guess field names:
   - `AssessmentSession`, `ContextResponses`, `ScoredResponses`, `SafetyResponses`, `DifferentialLens`, `ClientReport`, `CoachPacket`, `EvidenceSource`
4. **Port the UI** (`app.js`, `styles.css`) into framework components once the logic layer is typed and tested underneath it.
5. **Port the server.** Decide (and state) whether Express stays a separate service or becomes framework API routes — either is defensible, but the decision must preserve the persistence-preview constraints in `server/db.js` and `server/assessment-contract.js` (mock-patient acknowledgement, redaction of safety answers, export/delete for preview records).
6. **Add tooling:** ESLint, Prettier, `tsc --noEmit` in CI, and version metadata fields on the assessment/scoring/evidence/report models (so future instrument changes are traceable).
7. **Keep `npm run verify` green throughout** — not just at the end. If it goes red mid-migration, stop and fix before adding more surface area.

## 5. Suggested execution order

Treat this as checkpoints, not one giant PR:

1. Scaffold the new framework app alongside the existing static app (both run; nothing breaks) + wire CI to build both.
2. Migrate logic modules to TS with tests green (item 2 above).
3. Migrate UI into framework components, screen by screen, checked against the existing app's behavior.
4. Migrate/decide the server boundary.
5. Retire the old static app once parity is confirmed via the Docker/Postgres mock-patient preview (`docker compose up --build` → `Preview report` → `Coach packet` → `Method`, per the existing demo path in `DEVELOPER_HANDOFF.md`).
6. Final `npm run verify` (or its migrated equivalent) green, ESLint/Prettier/`tsc` clean.

## 6. Definition of done

- [ ] App runs on the typed framework; old static entry point removed only after parity confirmed
- [ ] All 8 core types defined and used at the relevant boundaries
- [ ] `scoring.js` logic is unchanged in behavior (same inputs → same outputs), now typed and pure
- [ ] Safety-answer exclusion has an explicit test, not just inherited behavior
- [ ] Claim-guardrail rules unchanged in behavior, now typed
- [ ] ESLint + Prettier + `tsc --noEmit` all pass in CI
- [ ] `npm run verify` (or migrated equivalent) is still the required CI gate and still green
- [ ] Version metadata present on assessment, scoring, evidence, and report models
- [ ] Mock-patient-only Docker preview still works end to end

## 7. Out of scope for this brief

Do not start these opportunistically, even if the migration makes them look easy:

- **Phase 2** (auth, encrypted persistence, coach dashboard, audit logging) — real user data must not enter this codebase before Phase 2 is deliberately scoped and reviewed.
- **Phase 3** (voice pipeline) and **Phase 4** (coach packet as paid product) — later briefs.
- **Stage 2 self-serve productized app** — a materially different product (no human review gate before a client sees output). Blocked on a regulatory review of that boundary (FDA SaMD exposure, FTC health-claim risk at scale, PMHNP scope-of-practice) before any engineering starts. See `VOICE_EC_MAP_BUSINESS_MODEL_CANVAS.pdf`, page 2.

## 8. Using this brief in Antigravity

- Open this folder (`Voice EC Map`) as a **Project** — it's already a local Git checkout.
- Given the size of this migration (13 source files, 2 test files, a server boundary decision), start the task in **New Worktree mode** rather than Local mode — it isolates the agent's changes into their own worktree and avoids conflicts with your own edits while it runs.
- Point the agent at this file directly (e.g., "Read `ANTIGRAVITY_BUILD_BRIEF.md` and execute Phase 1") rather than re-typing the brief into the chat.
- Given Section 2 touches safety-relevant code, review each checkpoint via Antigravity's artifact/comment flow before merging rather than approving the whole migration in one pass — this is the one codebase in your project list where "looks like it works" isn't sufficient review.
