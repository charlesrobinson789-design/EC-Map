# EMA Platform Scorecard

Status: preliminary rubric. Scores are not final until a vendor has answered `EMA_VENDOR_SECURITY_QUESTIONNAIRE.md` or equivalent documentation has been reviewed.

## Hard Disqualifiers

Reject a platform for real participant data if any required item is missing:

- Written data ownership terms.
- Full project export.
- Participant-level deletion.
- Hosting region and subprocessors disclosed.
- Encryption in transit and at rest documented.
- Researcher/admin access control documented.
- BAA or equivalent path available if PHI is collected.
- AI/model-training use can be disabled or contractually prohibited for sensitive responses.
- Safety/crisis/medication/hormone/treatment decisions are not delegated to the platform.
- Pilot cost can stay under the selected budget or the platform supports a lower-risk EMA-only first phase.

## Weighted Scoring Rubric

Use a 0-5 score for each category, then multiply by weight.

| Category | Weight | What A 5 Requires |
| --- | ---: | --- |
| Security, privacy, and compliance | 30 | Clear ownership, BAA/DPA path, encryption, RBAC, audit logs, deletion, region/subprocessors, no forced AI/model training |
| Research and EMA fit | 20 | Flexible EMA scheduling, iOS/Android, low burden, event-contingent prompts, missingness/compliance support |
| Data depth | 15 | Optional wearable/passive data with raw and processed exports; can also run EMA-only |
| Data portability | 15 | Full CSV/JSON/API export with timestamps, metadata, participant IDs, and no lock-in |
| Cost realism | 10 | Plausible under $5k/year or under $5k for early study; no hidden setup/export/API costs |
| Setup burden | 5 | Can run a no-PHI sandbox and pilot without custom engineering |
| Strategic fit | 5 | Supports EC Map's non-diagnostic, human-reviewed, coach/research workflow |

Score interpretation:

- 85-100: strong finalist if hard disqualifiers are cleared.
- 70-84: viable finalist with specific risks to resolve.
- 55-69: pilot only if budget or partnership makes it uniquely useful.
- Under 55: do not prioritize.
- Any hard disqualifier: reject for real participant data regardless of score.

## Preliminary Candidate Matrix

This is a starting point for research prioritization, not a final vendor decision.

| Candidate | Pre-Screen Tier | Security Gate Status | Budget Risk | Technical Burden | Recommended Next Action |
| --- | --- | --- | --- | --- | --- |
| m-Path | Primary finalist | Needs vendor answers | Medium if sensing/cognitive add-ons are required | Low-medium | Run free/sandbox pilot and request EMA-only plus sensing quote |
| ExpiWell | Primary finalist | Needs vendor answers | Medium; Sensor+ requires quote | Low | Test Free Basic, request Plus/Premium/Sensor+ quote and BAA/DPA terms |
| MyCap + REDCap | Primary finalist if partner exists | Depends on REDCap institution controls | Low if academic/nonprofit partner available | Medium | Identify partner institution and confirm MyCap/passive-data limits |
| SEMA3 | Primary free EMA-only fallback | Needs privacy/hosting review | Low | Low-medium | Run no-PHI prompt test and verify export/deletion workflow |
| Avicenna/Ethica | Primary data-depth candidate | Needs vendor answers | Unknown | Low-medium | Request quote, BAA/DPA, wearable/passive data export details |
| mindLAMP | Formal research consult | Needs deployment/pricing terms | Unknown | Medium-high unless supported | Use consultation to understand hosted vs self-deploy costs and data control |
| NeuroUX | Secondary cognition candidate | Needs vendor answers | Unknown | Low | Request cognitive-test, wearable, pricing, and security documentation |
| LifeData | Secondary hosted EMA | Needs vendor answers | Unknown | Low | Request pricing and export/deletion/security terms |
| EARS | Secondary passive-sensing candidate | Needs vendor answers | Unknown | Low-medium vendor setup; high privacy sensitivity | Request demo, quote, sensor list, BAA/DPA, export/delete, and audit-log details |
| Curious | Secondary cognition/research platform | Needs vendor answers | Unknown | Low | Request quote, export/delete, security documentation, and cognitive-task details |
| ilumivu/mEMA | Secondary sensor/JITAI candidate | Needs vendor answers | Medium-high | Low-medium | Request updated pricing and whether simple EMA pilot fits budget |
| ESMira | Secondary open-source self-host candidate | Needs deployment review | Low license, higher ops | Medium-high | Test install only if EC Map can own hosting, backups, access control, and patching |
| JTrack/JTrack-EMA+ | Secondary open-source control | Needs deployment review | Low license, higher ops | High | Review deployment docs if open-source control becomes priority |
| Beiwe | Secondary open-source research | Needs deployment review | Low license, AWS/dev cost | High | Consider only with research/dev partner |
| RADAR-base | Defer unless large funded passive study | Needs deployment review | Low license, high ops | High | Defer for now; too heavy for early EC Map pilot |
| PIEL Survey | Free simple EMA fallback | Needs data flow review | Low | Low | Test as no-server/offline fallback for simplest study design |
| ExperienceSampler / Paco / Taqo | Open-source fallback | Needs maintenance/security review | Low license, engineering cost | High | Keep as fallback if hosted options fail |
| formr | Web survey fallback | Needs hosting/privacy review | Low | Medium | Consider only for web/email/SMS longitudinal survey flow, not native EMA/passive data |
| mobileQ | Historical open-source fallback | Hosted service stopped; self-host only | Low license, high maintenance risk | High | Do not prioritize unless a developer wants to revive/audit it |
| Fitrockr | Wearable-first option | Needs vendor answers | Unknown | Low-medium | Use only if wearable data becomes primary study object |
| uMotif | Enterprise eCOA/ePRO comparison | Needs vendor answers | High likely | Low-medium | Defer unless a regulated clinical-trial sponsor appears |
| TrialKit | Enterprise eCOA/ePRO/EDC comparison | Needs vendor answers | High likely | Low-medium | Defer unless sponsor-funded regulated-trial infrastructure is required |

## Minimum Evidence Needed Before Finalist Selection

For each finalist, collect:

- Completed vendor questionnaire or equivalent documentation.
- Quote for 25, 50, and 100 participants.
- Written export and deletion workflow.
- Written BAA/DPA/privacy terms or proof the pilot can avoid PHI.
- Sample export file or API documentation.
- Sandbox test result using fake participants.
- Notes on whether safety/referral data can be excluded or separated.
- Known limitations for iOS/Android, wearables, missed prompts, and offline use.

## Current Working Ranking

Use this order for the next outreach/testing wave:

1. m-Path.
2. ExpiWell.
3. MyCap + REDCap, if a partner exists.
4. SEMA3.
5. Avicenna/Ethica.
6. mindLAMP consultation.
7. LifeData.
8. NeuroUX or Curious if cognitive testing becomes central.
9. EARS if passive smartphone sensing becomes central and privacy terms pass.
10. ESMira if hosted/free candidates fail and EC Map can own self-hosting security.
11. mEMA or movisensXS if the first wave does not satisfy cost/security requirements.
