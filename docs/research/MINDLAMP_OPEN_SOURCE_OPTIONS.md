# mindLAMP Open-Source Code Options For EC Map

Snapshot: 2026-06-13 PT / 2026-06-14 UTC.

Status: focused Goal 1 research note. This is not a recommendation to integrate yet. It explains what the open-source code gives EC Map, what it does not give, and what Codex Security would require before any real participant data is used.

## Bottom Line

mindLAMP is not one simple open-source app that EC Map can drop in and cheaply rebrand. It is a modular digital-phenotyping platform: mobile app scaffolds, dashboard, server, SDKs, activity/task code, sensor/cognitive data analysis, notification gateway, and protocol documentation.

The open-source code is valuable, but there are three very different ways EC Map could use it:

| Option | What EC Map Would Use | Practical Fit | Security / Operations Burden |
| --- | --- | --- | --- |
| Hosted or supported mindLAMP consultation | Existing LAMP app/dashboard/server, with BIDMC/mindLAMP support or hosted pathway if available | Best if EC Map wants formal digital psychiatry credibility and research support | Must obtain written pricing, BAA/DPA, data ownership, export/delete, admin access, audit-log, hosting-region, and subprocessor terms |
| Self-host full LAMP stack | `LAMP-server`, dashboard, database/cache/message queue, app gateway, mobile app scaffolds, SDKs, Cortex/toolkit | Possible only with a real developer/security operations partner | EC Map owns deployment, patching, keys, database, push notifications, mobile app release, backups, monitoring, incident response, and participant data security |
| Use pieces only | `LAMP-activities`, `LAMP-cortex`/`LAMP-toolkit`, SDK patterns, protocol ideas | Best near-term technical learning path; avoids committing to full platform | Do not send real data; treat as source patterns for EC Map’s own prototype until vendor/security terms are known |

Near-term recommendation: do not self-host or fork the full platform first. Use mindLAMP as a consultation target and source-pattern reference while EC Map tests low-friction no-PHI pilots in simpler tools.

## Current Open-Source Components

The official architecture docs describe the platform as a set of repositories and components. The API server is Node.js, requests use client API keys, authenticated requests use the Credential API, storage is document-oriented, Redis/message queues support synchronization, and automations handle scheduled push/triggered workflows. The docs list dashboard, API server, iOS, Android, Cortex, app gateway, SDKs, activities, and related tooling as separate repositories.

Important repositories from the BIDMCDigitalPsychiatry GitHub organization:

| Repository | Role | Current Read For EC Map |
| --- | --- | --- |
| `LAMP-server` | TypeScript/Node API server for the LAMP Platform | Core backend if self-hosting; not a small plug-in. Requires DB, Redis/NATS, root keys, notification config, and server operations. |
| `LAMP-dashboard` | TypeScript dashboard for managing studies/participants/data | Relevant if EC Map uses LAMP as the operational dashboard. Customizing it is more involved than embedding a survey. |
| `LAMP-activities` | TypeScript/React activity and cognitive-task code | Most useful code-learning area for EC Map. Activities run as standalone React apps embedded in dashboard iframes and communicate results back through the dashboard. |
| `LAMP-core-ios` and `LAMP-core-android` | Swift/Kotlin native app scaffolds | Relevant only if EC Map commits to custom mobile app work. This is not a no-code path. |
| `LAMP-js`, `LAMP-py`, `LAMP-r`, `LAMP-swift`, `LAMP-kotlin` | API clients/SDKs | Useful for extracting data, analysis scripts, or integration prototypes once a LAMP server exists. |
| `LAMP-cortex` | Python/Jupyter data analysis pipeline for LAMP data | Useful for feature extraction from sensor/activity data; can inform research variables even if EC Map does not adopt full LAMP. |
| `LAMP-toolkit` | Python analytics library described as second-generation/successor to Cortex | Worth reviewing before building any analysis pipeline; verify maturity and docs. |
| `LAMP-app-gateway` | Logging and push notification server component | Needed for app notifications/push workflows in full deployment. Security-sensitive. |
| `LAMP-platform` and `LAMP-protocol` | Documentation, issues, OpenAPI/protocol source | Best starting point for understanding integration boundaries and API model. |
| `LAMP-college-study` | Proof-of-concept add-on for researcher-less onboarding/randomized studies/JITAI | Useful conceptually, not a direct EC Map product path. |
| `LAMP-app` and `LAMP-portal` | Deprecated v1 app/backend | Do not use. Official docs mark these deprecated. |

## What EC Map Could Build From It

### 1. Custom EC Map activity inside LAMP

This is the cleanest technical integration idea if EC Map eventually chooses LAMP. EC Map’s assessment could become a LAMP activity rather than a separate app.

Why this is attractive:

- EC Map already has deterministic prompts/scoring/report logic that could be packaged as an activity.
- `LAMP-activities` shows a pattern where an activity is a standalone React app embedded in an iframe.
- The dashboard handles API calls, while the activity sends results back through the dashboard.

Why it is not the next step:

- EC Map would still need a LAMP server/dashboard environment.
- The activity would still handle sensitive functional-health responses.
- Safety/referral responses must remain deterministic and not delegated to LAMP automations or AI.

### 2. Use Cortex/toolkit as research analysis reference

If EC Map later collects passive signals such as sleep/activity/location/screen-use, Cortex/toolkit may help with feature extraction concepts.

Good fit:

- sleep/activity/location/sedentary/screen-use style features
- research analysis after data collection
- comparing EMA answers with passive-signal features

Bad fit:

- replacing EC Map’s deterministic assessment logic
- handling crisis/safety decisions
- making diagnostic claims

### 3. Self-host LAMP

This is possible but should be treated as a technical product project, not a cheap shortcut.

You would need:

- server deployment and monitoring
- database/cache/message queue operations
- key management and root credential protection
- mobile app deployment strategy
- push notification setup
- backups and restore tests
- access control and role model
- export/delete workflows
- audit logs and incident-response process
- BAA/DPA or no-PHI study design

Codex Security read: self-hosting may reduce vendor lock-in, but it increases your direct responsibility for PHI/security operations.

### 4. Use mindLAMP as a research partner/vendor path

This may be the safest way to understand the platform without owning full deployment immediately.

Questions to ask mindLAMP/BIDMC:

- Is there hosted, supported, or consultative deployment for small external pilots?
- What does a 25, 50, and 100 participant 4-8 week no-PHI pilot cost?
- Who owns participant data?
- Can EC Map export full raw and processed data?
- Is participant-level deletion supported?
- What BAA/DPA or IRB/security language is available?
- What admin audit logs exist?
- Can safety/referral responses be excluded from LAMP or stored separately?
- Can raw audio/transcripts be disabled entirely?
- Can EC Map run an EMA-only pilot without passive sensors first?

## What Not To Do

- Do not fork deprecated `LAMP-app` or `LAMP-portal`.
- Do not self-host with real participant data until production security controls are proven.
- Do not treat open-source availability as HIPAA readiness.
- Do not connect EC Map safety/referral answers to LAMP automations, AI summaries, or alerts without a separate safety review.
- Do not build full LAMP integration before simpler no-PHI pilots show which EC Map prompt schedule actually works.

## Recommended EC Map Path

1. Keep mindLAMP on the shortlist as the formal digital-phenotyping/research-consult option.
2. Ask for consultation/pricing/security answers using `EMA_VENDOR_SECURITY_QUESTIONNAIRE.md`.
3. In parallel, test EC Map prompts in simpler no-PHI tools first: m-Path Free, ExpiWell Free Basic, SEMA3, and PIEL.
4. If mindLAMP remains attractive after pricing/security answers, prototype only a fake-data EC Map activity pattern.
5. Do not commit to self-hosting unless EC Map has a developer/security operations partner.

## Sources

- mindLAMP product page: https://digitalpsych.org/mindlamp/
- mindLAMP platform components: https://docs.lamp.digital/developer/architecture/components/
- LAMP GitHub organization: https://github.com/BIDMCDigitalPsychiatry
- `LAMP-server`: https://github.com/BIDMCDigitalPsychiatry/LAMP-server
- `LAMP-dashboard`: https://github.com/BIDMCDigitalPsychiatry/LAMP-dashboard
- `LAMP-activities`: https://github.com/BIDMCDigitalPsychiatry/LAMP-activities
- `LAMP-cortex`: https://github.com/BIDMCDigitalPsychiatry/LAMP-cortex
- `LAMP-toolkit`: https://github.com/BIDMCDigitalPsychiatry/LAMP-toolkit
- `LAMP-core-ios`: https://github.com/BIDMCDigitalPsychiatry/LAMP-core-ios
- `LAMP-core-android`: https://github.com/BIDMCDigitalPsychiatry/LAMP-core-android

