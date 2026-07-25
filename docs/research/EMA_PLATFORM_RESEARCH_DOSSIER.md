# EMA / Digital Phenotyping Platform Research Dossier

Status: research-first selection dossier for EC Map. Goal 1 is platform research and risk screening. Goal 2 is build/integration only after a platform passes the selection and security gates.

## Decision Frame

EC Map should not choose a platform only because it can send surveys. The correct choice controls consent, participant experience, data ownership, export/API workflow, wearable/passive data depth, IRB language, privacy posture, and what must be built in-house.

Required research questions:

- Can it run short repeated EMA prompts with fixed, random, rolling, and event-contingent schedules?
- Can it support EC Map's assessment domains without turning the product into a diagnostic or treatment system?
- Can it collect wearable/passive signals if needed, especially sleep, steps/activity, HR/HRV, screen/app use, and location?
- Can EC Map export raw and processed data in usable formats without vendor lock-in?
- Can real participant data be protected under appropriate HIPAA/IRB/privacy terms before pilot use?
- Can it stay within the target budget of under about $5k/year for an early research/pilot phase?

## Codex Security Gate

Do not proceed to Goal 2 build/integration unless the selected platform can answer these questions in writing:

- Data ownership: EC Map/research sponsor owns participant data and can export it.
- Deletion/export: participant-level deletion and full project export are available.
- Consent: platform supports study consent language or can fit an external consent workflow.
- Sensitive data posture: HIPAA/BAA or equivalent privacy terms are available if real health data/PHI is collected.
- Encryption: TLS in transit and encryption at rest are documented.
- Access control: researcher/admin access is role-based or otherwise tightly controlled.
- Auditability: access, export, deletion, and admin actions can be logged or reconstructed.
- Region/subprocessors: data hosting region and subprocessors are disclosed.
- AI/voice: no raw audio, transcript, or safety/referral responses are sent to AI or third parties by default.
- Safety boundary: the platform does not make clinical, crisis, medication, hormone, or treatment decisions.

Immediate EC Map constraints:

- Use mock data only in the current repo.
- Do not connect current `/api/assessments` to real participants without auth, export/delete, audit logs, and production storage controls.
- Keep safety/referral logic deterministic and outside any vendor automation.
- Treat wearable/passive data as research signal, not diagnosis.

## Evidence Appendix

See `EMA_PLATFORM_EVIDENCE_APPENDIX.md` for the 2026-06-13 primary-source snapshot. The appendix expands the search beyond mindLAMP and records source-backed notes for low-cost hosted tools, open-source/self-hosted tools, formal REDCap paths, passive/wearable platforms, and enterprise eCOA/ePRO platforms.

See `MINDLAMP_OPEN_SOURCE_OPTIONS.md` for a focused breakdown of mindLAMP's open-source code options, including why full self-hosting is a build/security-operations project rather than a quick pilot shortcut.

See `VERBAL_FIRST_OPEN_SOURCE_OPTIONS.md` if the product should start with verbal assessment and only add EMA as a later tier.

## Decision Categories

Several candidates in this scan are research-only or infrastructure-only for EC Map's current stage. That is useful for context, but it should not blur the near-term choice.

Use these categories when deciding what to do next:

| Category | What It Means | Candidates | EC Map Action |
| --- | --- | --- | --- |
| First-wave no-PHI pilot tools | Low-friction tools that can plausibly run a fake-participant or no-PHI EMA test before procurement | m-Path Free, ExpiWell Free Basic, SEMA3, PIEL Survey | Test 5-8 EC Map prompts first; do not enter real participant data |
| Partner-dependent research tools | Strong formal research paths, but only practical if an academic/nonprofit/health-system partner owns the research infrastructure | MyCap + REDCap, REDCap Mobile App, mindLAMP consultation | Explore only if partner access, IRB/privacy support, and data-governance ownership are clear |
| Hosted commercial research platforms | Potentially usable products, but require quote, BAA/DPA/privacy answers, export/delete proof, and sandbox access | Avicenna/Ethica, LifeData, NeuroUX, Curious, EARS, mEMA/ilumivu, movisensXS, SurveySignal, Fitrockr | Send questionnaire before build; reject if pricing or security terms are unclear |
| Open-source or self-hosted infrastructure | Not "free product"; license may be free but EC Map must own hosting, patching, mobile distribution, backups, access control, and incident response | ESMira, ExperienceSampler, formr, mobileQ, Beiwe, JTrack, Sensus, AWARE, Paco/Taqo, MobileCoach, ResearchKit/ResearchStack, ODK/KoBo/SurveyCTO | Treat as build paths, not quick-buy paths; use only with developer/security support |
| Enterprise clinical-trial systems | Credible eCOA/ePRO infrastructure, but likely too expensive or heavy for a lean EC Map pilot | uMotif, TrialKit, RADAR-base for large passive studies | Keep as comparison points unless a sponsor-funded regulated study appears |

Near-term rule: EC Map should only touch `First-wave no-PHI pilot tools` until one or two finalists have passed the Codex Security gate. The other categories are not wrong; they are not the immediate build path.

## Candidate Universe

| Candidate | Category | Best Fit | Current Read |
| --- | --- | --- | --- |
| mindLAMP | Open-source digital phenotyping / clinical research | Formal research, mental health, EMA + passive + cognition | Strong research credibility; pricing/deployment requires consultation. Source: https://docs.lamp.digital/ |
| Beiwe | Open-source digital phenotyping | Academic smartphone passive + survey research | Free source/apps, but self-hosting/AWS/dev burden. Source: https://hsph.harvard.edu/research/onnela-lab/digital-phenotyping-and-beiwe-research-platform/ |
| RADAR-base | Open-source remote monitoring | Wearables/passive data at scale | Powerful but likely too heavy for solo early EC Map pilot. Source: https://radar-base.org/about/ |
| JTrack / JTrack-EMA+ | Open-source digital phenotyping / EMA | GDPR-aware clinical/behavioral research | Promising open-source option with smartphone usage/sensor/EMA focus. Source: https://www.abcd-j.de/software/jtrack/ |
| Sensus | Open-source mobile sensing | Sensor-triggered surveys and mobile sensing | Strong sensing concept; verify maintenance and deployment effort. Source: https://predictive-technology-laboratory.github.io/sensus/ |
| AWARE | Open-source mobile sensing framework | Custom app/data collection engineering | Useful if building custom, not a turnkey pilot platform. Source: https://awareframework.com/ |
| MindLogger | Open-source mental health / cognitive assessment app | Mental-health/cognitive applets and repeated assessments | Worth adding to research longlist; verify active stack, hosting, export/delete, and passive-sensing limits. Source: https://github.com/ChildMindInstitute/mindlogger-app |
| ESMira | Open-source decentralized ESM/EMA | Self-hosted low-cost EMA with Android/iOS apps | Stronger open-source fallback than a fully custom app; EC Map would own hosting/security. Source: https://github.com/KL-Psychological-Methodology/ESMira |
| mobileQ | Free/open-source EMA | Historical Android/web EMA with local-host option | Useful reference, but hosted service stopped in 2021 and support is limited. Source: https://mobileq.org/ |
| formr | Open-source web survey framework | Low-cost longitudinal web surveys/reminders | Good web fallback when native push/passive sensing is not required. Source: https://formr.org/ |
| MyCap + REDCap | Free academic/nonprofit research app | Formal research when a REDCap institution is available | Very attractive if EC Map has academic/nonprofit partner access; less passive/wearable depth. Source: https://projectmycap.org/ |
| SEMA3 | Free smartphone EMA platform | Low-cost EMA study with iOS/Android apps | Strong free EMA option for intensive longitudinal surveys; likely limited passive/wearable data. Source: https://sema3.com/about.html |
| PIEL Survey | Free EMA app | Very low-cost simple EMA | No third-party server required; good for simple offline EMA, weaker for centralized dashboard/wearables. Source: https://pielsurvey.org/ |
| ExperienceSampler | Open-source EMA scaffold | Low-cost custom EMA app | Cheap and flexible, but requires app/server setup and maintenance. Source: https://www.experiencesampler.com/ |
| Paco / Taqo | Open-source behavioral research | Developer-led behavioral studies | Worth checking as open-source fallback; verify current mobile support and compliance fit. Source: https://github.com/google/paco |
| MobileCoach | Open-source digital intervention | Rule-based interventions / EMI | Useful if EC Map later adds structured coaching/intervention content. Source: https://www.mobile-coach.eu/ |
| ResearchKit / ResearchStack | Open-source app SDKs | Building native medical research apps | Build foundation, not premade platform; use only if custom mobile app becomes the strategy. Sources: https://opensource.apple.com/projects/researchkit and https://researchstack.org/ |
| m-Path | Hosted EMA/ESM platform | Affordable no/low-code EMA research | Very strong early candidate; base pricing fits budget, but sensing/cognitive add-ons may exceed it. Source: https://m-path.io/pricing/ |
| ExpiWell | Hosted EMA/ESM platform | Practical EMA pilot with dashboards and app | Free Basic is generous; paid/sensor tiers require quote. Source: https://www.expiwell.com/subscription |
| Avicenna / Ethica | Hosted EMA + sensing platform | EMA plus smartphone/wearable sensing | Strong data-depth fit; pricing requires confirmation. Source: https://avicennaresearch.com/features/sensor-based-data/ |
| LifeData | Hosted EMA/eDiary/ePRO | Research and clinical trial style EMA | Good practical candidate; pricing not public. Source: https://www.lifedatacorp.com/ |
| NeuroUX | EMA + mobile cognitive testing | Cognition-focused EMA with wearables | Strong fit for cognitive testing angle; custom pricing. Source: https://www.getneuroux.com/ecological-momentary-assessments |
| Curious | No-code research assessment platform | Assessments, interventions, cognitive tasks, EMA | Worth pricing if cognitive tasks and no-code deployment matter. Source: https://www.gettingcurious.com/ |
| EARS | Hosted mobile sensing + EMA research | Passive smartphone sensing and EMA with services | Strong sensing option, likely demo/quote-based; needs vendor security review. Source: https://ksanahealth.com/ears/ |
| ilumivu / mEMA | Hosted mobile EMA/EMI | EMA, JITAI, sensors, wearables | Comprehensive; older public pricing starts around paid license territory and must be re-quoted. Source: https://ilumivu.com/solutions/ecological-momentary-assessment-app/ |
| MetricWire / Catalyst | Hosted research app | Institutional EMA programs | Keep on longlist; verify current maintenance and access model. |
| MovisensXS | Hosted EMA + sensors ecosystem | Ambulatory assessment with sensors | Keep on longlist; verify maintenance, pricing, and US privacy fit. |
| SurveySignal | EMA/ESM platform | Lower-complexity survey delivery | Useful comparison; likely less digital-phenotyping depth. Source: https://www.surveysignal.com/ |
| Fitrockr | Wearable-first research platform | Garmin/wearable-heavy studies | Consider if wearable data becomes primary rather than companion EMA. Source: https://www.fitrockr.com/research/ |
| uMotif | Enterprise eCOA/ePRO platform | Regulated clinical-trial data capture | Keep as comparison point; likely overbuilt for early EC Map. Source: https://umotif.com/ecoa/ |
| TrialKit | Enterprise eCOA/ePRO/EDC platform | Regulated clinical-trial and wearable/ePRO workflows | Keep as comparison point; likely sponsor-funded rather than early pilot. Source: https://www.crucialdatasolutions.com/epro-ecoa/ |
| ODK / KoBo / SurveyCTO | General mobile data collection | Field surveys, offline forms | Useful fallback for low-cost data collection; not purpose-built for EC Map EMA/passive phenotyping. |

## Shortlist For Deeper Evaluation

Primary shortlist:

- m-Path: best first hosted candidate under budget if EC Map can start with EMA and delay continuous sensing.
- ExpiWell: best practical EMA candidate if paid scheduling/sensor tier is affordable.
- MyCap + REDCap: best formal research path if an academic/nonprofit REDCap partner is available.
- SEMA3: best free EMA-only research path.
- Avicenna/Ethica: best hosted data-depth candidate if pricing and privacy terms are acceptable.
- mindLAMP: best consult target for formal digital psychiatry/digital phenotyping credibility.

Secondary shortlist:

- NeuroUX if EC Map needs mobile cognitive testing as a core outcome.
- LifeData if EC Map needs a practical hosted eDiary/ePRO platform with anonymous collection and team roles.
- EARS if passive smartphone sensing becomes central and vendor terms fit.
- ESMira if EC Map wants a self-hosted open-source EMA fallback.
- JTrack or Beiwe if EC Map has developer/research infrastructure and wants open-source control.
- RADAR-base only if wearable/passive monitoring becomes large-scale and funded.
- ilumivu/mEMA if JITAI or sensor-triggered interventions become part of the study design.
- uMotif and TrialKit only if a regulated clinical-trial sponsor or formal eCOA/ePRO requirement appears.

## Recommended Next Research Actions

1. Run no-PHI sandbox tests in m-Path Free, ExpiWell Free Basic, SEMA3, and PIEL using 5-8 EC Map prompts.
2. Send `EMA_VENDOR_SECURITY_QUESTIONNAIRE.md` to mindLAMP, m-Path, ExpiWell, Avicenna/Ethica, NeuroUX, LifeData, EARS, Curious, and mEMA.
3. Ask each vendor for a quote for 25, 50, and 100 participants; 4-8 weeks; EMA scheduling; export/API; optional Fitbit/Apple Health/Garmin; and no raw audio.
4. Ask MyCap/REDCap feasibility through any available academic/nonprofit partner.
5. Review ESMira, ExperienceSampler, formr, and mobileQ only as open-source/self-hosted fallbacks after hosted/free tools are tested.
6. Score each platform with `EMA_PLATFORM_SCORECARD.md` and the evidence appendix before any integration code is written.

## Current Recommendation

Do not build platform integration yet. Build only a small internal research harness after Goal 1 narrows the field to 2 finalists. The safest near-term path is:

- Use EC Map's current app with mock data for product review.
- Use m-Path, ExpiWell, SEMA3, PIEL, or MyCap/REDCap as external pilot candidates.
- Keep mindLAMP as a formal consultation path, not the assumed default.
- Reject any platform that cannot provide data ownership, export/delete, consent, access control, and privacy/security terms in writing.
