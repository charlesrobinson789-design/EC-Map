# EMA Platform Evidence Appendix

Primary-source snapshot date: 2026-06-13.

Status: evidence appendix for Goal 1 research. This document expands the candidate universe and records source-backed notes before any Goal 2 EC Map build/integration work.

## Codex Security Interpretation

Do not treat source claims as approval for PHI, real patient data, safety/referral workflows, or production integration. Marketing pages, app-store listings, papers, and open-source repositories are only pre-screen evidence.

Before EC Map uses any platform with real participants, the platform still needs written answers for:

- data ownership and sponsor export rights
- participant-level deletion and project-level deletion
- encryption in transit and at rest
- admin access control, MFA, and audit logging
- hosting region and subprocessors
- BAA/DPA or a confirmed no-PHI study design
- AI/model-training opt-out for sensitive responses
- no delegation of crisis, medication, hormone, treatment, or diagnosis decisions

## Practical Sorting

Plain-language read:

- Not every candidate below is a practical product choice for EC Map right now.
- "Research-only" means the tool may be credible for formal studies, but it usually assumes IRB support, a university/health-system sponsor, developer operations, or a research team.
- "Open-source" does not mean safer or easier; it usually moves hosting, patching, mobile deployment, backups, access control, and incident response onto EC Map.
- "Enterprise eCOA/ePRO" means useful benchmark, not first-wave pilot, unless a regulated study sponsor is paying for it.

Best low-cost hosted/no-code starting points:

- m-Path: strong first candidate because it has a free tier for small pilots, published pricing for research tiers, EMA, JITAI, cognitive tests, sensing/wearable add-ons, and privacy-by-design claims.
- ExpiWell: strong first candidate because the Free Basic tier allows unlimited participants/responses/projects/mobile surveys; paid tiers add scheduled/rolling EMA and e-consent; Sensor+ adds Fitbit, Apple Watch/HealthKit, GPS, and other data.
- SEMA3: strong free EMA-only fallback with iOS/Android apps, fixed/random/event-contingent surveys, and academic provenance.
- PIEL Survey: strongest ultra-low-cost/offline/simple fallback when no central server is desired.

Best formal research or institutional paths:

- MyCap + REDCap: best if EC Map can use an academic, nonprofit, government, or health-system REDCap environment.
- LifeData: practical hosted EMA/eCOA/ePRO option with onboarding, random/fixed scheduling, offline collection, exports, anonymous collection, and team roles.
- NeuroUX: strong if mobile cognitive testing plus EMA becomes central, but pricing and alert/safety boundaries must be clarified.

Best passive/wearable/digital-phenotyping paths:

- mindLAMP: strongest psychiatry/digital-phenotyping consult target because it combines surveys, smartphone sensors, cognition, app/dashboard/database/Cortex components, and open-source code.
- Avicenna/Ethica: strong hosted data-depth candidate with smartphone sensors, location, digital footprint, cognitive-task triggering, and Garmin/Apple/Fitbit/Google Fit support.
- EARS: strong research/mobile-sensing option, but likely custom/demo-priced and needs vendor security terms.
- RADAR-base, Beiwe, AWARE, and JTrack remain stronger when EC Map has developer/research infrastructure.

Focused mindLAMP note: see `MINDLAMP_OPEN_SOURCE_OPTIONS.md` before treating mindLAMP as a build path. Its open-source code is modular and useful, but full self-hosting would shift deployment, mobile app, database, key-management, notification, audit, backup, deletion/export, and incident-response responsibilities onto EC Map.

If the product should start with verbal assessment and add EMA later as a higher tier, see `VERBAL_FIRST_OPEN_SOURCE_OPTIONS.md` for the open-source options that fit that shape better than a pure EMA platform.

Best open-source/self-hosted control:

- ESMira: free, decentralized, open-source Android/iOS ESM/EMA platform; can be installed on a PHP webserver.
- ExperienceSampler: open-source Cordova scaffold for iOS/Android experience sampling; low license cost but requires app customization, server, and distribution work.
- formr: free, open-source web survey framework with reminders, SSL, R-driven logic, feedback, and mobile-responsive surveys; not a native app/passive-sensing platform.
- mobileQ: free/open-source Android EMA option with CSV/XLSX/ODS exports, fixed/random scheduling, local hosting option, but public service stopped in 2021 and support is limited.

Enterprise or likely-overbuilt clinical-trial paths:

- uMotif and TrialKit: credible eCOA/ePRO clinical-trial platforms with wearables, roles, compliance/audit claims, and demo-based sales. Keep as comparison points, not first-wave EC Map pilots unless a regulated trial sponsor is involved.

## Source-Backed Candidate Notes

| Candidate | Source Evidence | EC Map Fit | Security / Cost Follow-Up |
| --- | --- | --- | --- |
| m-Path | Official site describes EMA/ESM, EMI/JITAI, cognitive tests, daily diary, sensing/wearables, visual feedback, privacy-by-design, GDPR/HIPAA compliance, and no identifiable information requirement. Pricing page lists Free at EUR 0 for 50 participants/year, Essential from EUR 1599/year, and add-ons for cognitive tests, sensing, smartwatch integration, API, and external servers. Sources: https://m-path.io/ and https://m-path.io/pricing/ | Top hosted/no-code finalist for EMA-first pilot. Can defer expensive sensing/API add-ons. | Verify DPA/BAA, US HIPAA terms, export format, deletion, API cost, subcontractors, and whether add-ons push the pilot over budget. |
| ExpiWell | Subscription page lists Free Basic with unlimited participants/responses/projects/mobile surveys and CSV/TSV/XML export; Plus adds notifications, calendar/rolling schedules, offline data, and e-consent; Premium adds event-triggering, GPS, audio/video transcription, and cognitive testing; Sensor+ adds Fitbit, Apple Watch/HealthKit, GPS, and other sensor data. Source: https://www.expiwell.com/subscription | Top practical no/low-code EMA pilot candidate; free tier is useful for event-contingent tests. | AI transcription appears in Premium; require opt-out/no-AI terms for sensitive content. Confirm BAA/DPA, deletion, audit logs, and Sensor+ pricing. |
| MyCap + REDCap | MyCap says it is a participant-facing app for survey data and active tasks, syncs with REDCap, and is no cost for academic/nonprofit/government research teams; app uses a 6-digit passcode and stores encrypted data locally until sync. Source: https://projectmycap.org/ | Strongest institutional research path if EC Map has REDCap partner access. | Confirm partner institution, REDCap hosting controls, MyCap task limits, participant deletion/export, and BAA/HIPAA boundary. |
| REDCap Mobile App | REDCap says the mobile app supports offline data collection on iPhone/iPad/Android and must be used alongside REDCap at a REDCap partner institution. Source: https://projectredcap.org/software/mobile-app/ | Useful if field/offline collection through an institution matters; less ideal for participant-facing EMA than MyCap. | Depends on the REDCap institution's security posture, mobile policy, and project setup. |
| SEMA3 | Official about page describes free iOS/Android intensive longitudinal surveys, fixed/random intervals from minutes to months, and participant-triggered/event-contingent sampling. Legal page states research content ownership terms and University of Melbourne operation. Sources: https://sema3.com/about.html and https://sema3.com/legal.html | Strong free EMA-only fallback for a no-PHI prompt pilot. | Confirm current access approval, hosting region, deletion/export workflow, US privacy fit, and whether EC Map can avoid identifiers. |
| PIEL Survey | PIEL says data uses device storage, no remote server/database, no automatic transfer, researcher/participant control transmission, deletion by app command or app deletion, and no data sent to Blue Jay Ventures or third parties. Source: https://pielsurvey.org/piel-data/confidentiality/ | Best simple/offline/privacy-minimal fallback when centralized dashboards are not needed. | Export is participant/researcher mediated and text responses can still expose PHI; create no-free-text/no-identifiers pilot rules. |
| Avicenna / Ethica | Official pages describe eCOA/ePRO/EMA/cognitive tasks, smartphone sensors/wearables, location, digital footprint, real-time raw/processed data, sensor-triggered EMA/cognitive tasks, and Garmin/Apple/Fitbit/Google Fit support. Sources: https://avicennaresearch.com/ and https://avicennaresearch.com/features/sensor-based-data/ | Best hosted data-depth candidate if sleep/activity/HR/HRV/location/app-use become important. | Pricing unknown; require BAA/DPA, data export, deletion, audit logs, AI boundaries, and passive-data minimization. |
| mindLAMP | BIDMC Digital Psychiatry describes mindLAMP as open-source digital phenotyping with surveys, smartphone sensors, cognition, app/dashboard/database/Cortex components, and code on GitHub. Source: https://digitalpsych.org/mindlamp/ | Best formal digital psychiatry consultation target; not automatically the cheapest or easiest EC Map pilot. | Clarify hosted vs self-deployed cost, support model, data ownership, deletion, BAA/DPA, and whether EC Map has enough technical support. |
| MindLogger | GitHub states MindLogger is a React Native data collection app for Android/iOS; academic paper/search evidence describes open-source, restricted access, end-to-end encryption, and data collection features. Source: https://github.com/ChildMindInstitute/mindlogger-app | Add to shortlist for mental-health/cognitive assessment applets and open-source review. | Current repository shown is older; verify active maintained stack, deployment model, hosting, deletion/export, and passive-sensing limits. |
| EARS | Ksana Health describes EARS as an end-to-end mobile sensing and EMA research solution with passive smartphone apps, secure storage, survey control, dashboard, and data science services. Source: https://ksanahealth.com/ears/ | Strong if EC Map prioritizes passive smartphone sensing over low-cost EMA. | Demo/quote likely; require vendor questionnaire, BAA/DPA, export/delete, model/AI boundaries, and precise sensor list. |
| ESMira | GitHub describes ESMira as free, decentralized, open-source ESM/EMA for Android/iOS with a simple PHP webserver install and administrator independence from third-party services. Source: https://github.com/KL-Psychological-Methodology/ESMira | Strong low-cost self-hosted fallback if EC Map wants control without a commercial vendor. | Requires self-hosting security, backups, patching, HTTPS, admin access control, and deletion/export validation. |
| mobileQ | Official site says mobileQ is free/open-source, supports ESM/EMA scheduling, response formats, compliance tracking, CSV/XLSX/ODS download, timestamps, and local hosting; service stopped on 2021-12-20 and support is limited. Source: https://mobileq.org/ | Useful historical/open-source reference; not first-wave pilot because hosted service ended and Android/support limits exist. | Only consider if a developer can self-host and audit; verify license, app compatibility, and no stale dependency risk. |
| formr | Official site says formr is free, open-source, supports long survey runs, reminders by email/SMS, mobile-responsive surveys, spreadsheet/JSON sharing, R logic, and SSL connections. Source: https://formr.org/ | Good web-based longitudinal survey fallback when native push/passive sensing is not required. | Not a native EMA app; SMS/email workflows may expose contact data. Confirm hosting, DPA, deletion/export, and no-PHI design. |
| ExperienceSampler | Official site describes an open-source Cordova smartphone app for iOS/Android, local notifications, time-stamped responses, local storage then server upload, and low operational costs with iOS Enterprise membership plus server. Source: https://www.experiencesampler.com/ | Good developer-led fallback if EC Map wants a custom app scaffold. | Requires mobile build/distribution, server security, code maintenance, and IRB/security review. |
| JTrack / JTrack-EMA+ | Official/software and recent publication sources describe smartphone usage/sensor/EMA focus and GDPR-aware research positioning. Source: https://www.abcd-j.de/software/jtrack/ | Worth keeping on open-source/digital-phenotyping longlist. | Need deployment docs, maintenance review, export/delete workflow, and US privacy fit. |
| Sensus | Official project describes mobile sensing and survey capabilities with sensor-triggered surveys. Source: https://predictive-technology-laboratory.github.io/sensus/ | Strong sensing concept for developer-led research. | Verify current maintenance, mobile OS support, deployment, and security controls. |
| AWARE | Official framework is useful for custom mobile sensing apps and research data collection. Source: https://awareframework.com/ | Build foundation, not turnkey platform. | High engineering/security burden; use only with mobile developer/research partner. |
| RADAR-base | Official site positions it for remote monitoring with sensors, wearables, and mobile devices. Source: https://radar-base.org/about/ | Powerful for funded passive/wearable research at scale. | Too heavy for first EC Map pilot unless funded and staffed. |
| LifeData | Official site describes EMA/eCOA/ePRO/eDiary, random/fixed scheduling, branching/triggering, offline collection, anonymous collection, team roles, exports, dashboards, and HIPAA/GDPR-oriented claims. Source: https://www.lifedatacorp.com/ | Practical hosted EMA/eDiary candidate if pricing is reasonable. | Pricing not public; confirm quote, BAA/DPA, export/delete, audit logs, AI/alert boundaries, and no-PHI sandbox. |
| NeuroUX | Official EMA page describes secure storage, HIPAA/GDPR/21 CFR Part 11/NIST-aligned claims, mobile/browser participation, REDCap upload, audio/video diaries, JITAIs, Fitbit integration, and risk-alert logic. Source: https://www.getneuroux.com/ecological-momentary-assessments | Strong if EC Map needs cognitive testing plus EMA and possible Fitbit support. | Risk alerts and audio/video need clear safety/AI boundaries; pricing not public. Require questionnaire before any real data. |
| Curious | Official site describes a no-code research platform for assessments, interventions, cognitive tasks, EMA, web/iOS/Android, and enterprise-grade data privacy. Source: https://www.gettingcurious.com/ | Add as a cognition/research-platform option, especially if no-code tasks matter. | Pricing and compliance details need questionnaire; verify export/delete/BAA/DPA. |
| ilumivu / mEMA | Official page positions mEMA for EMA/ESM with survey/intervention flexibility and mentions wearable integration/GPS in testimonial context. Source: https://ilumivu.com/solutions/ecological-momentary-assessment-app/ | Good secondary hosted EMA/JITAI/sensor candidate. | Need updated pricing, BAA/DPA, export/delete, AI/voice boundaries, and sensor data minimization. |
| movisensXS | Official page describes web study design, Android app, offline questionnaires, sampling schemes, mobile sensing, interventions, and sensor-triggered questionnaires. Source: https://www.movisens.com/en/products/movisensxs/ | Strong ambulatory-assessment ecosystem if Android/sensor-triggering matters. | Verify iOS support status, US privacy fit, pricing, deletion/export, and sensor vendor dependency. |
| uMotif | Official eCOA page describes configurable eCOA/ePRO, BYOD/provisioned devices, wearables/RWD integration, adaptive scheduling, RBAC, and audio upload. Source: https://umotif.com/ecoa/ | Good regulated-trial comparison, likely overbuilt for early EC Map. | Pricing likely enterprise; audio upload and trial workflows require strict safety/privacy boundaries. |
| TrialKit | Official eCOA/ePRO page describes mobile/web eCOA/ePRO, open API, wearables/Apple Health/Google Fit/Samsung Health, reminders, audit trails, encryption, MFA, RBAC, and 21 CFR Part 11 claims. Source: https://www.crucialdatasolutions.com/epro-ecoa/ | Enterprise clinical-trial option if EC Map later becomes regulated study infrastructure. | Likely not "very reasonable" for early solo pilot; keep for comparison only unless sponsor-funded. |

## Updated First-Wave Research Plan

1. Run no-PHI sandbox tests first in m-Path Free, ExpiWell Free Basic, SEMA3, and PIEL Survey.
2. In parallel, request written quotes/security answers from m-Path, ExpiWell, Avicenna, LifeData, NeuroUX, mindLAMP, EARS, Curious, and mEMA.
3. Ask any academic/nonprofit partner whether MyCap + REDCap is available and who owns the REDCap security/BAA posture.
4. Keep ESMira, ExperienceSampler, formr, and mobileQ as self-host/open-source fallbacks, but do not treat open-source as lower risk; it moves the security burden onto EC Map.
5. Defer uMotif, TrialKit, RADAR-base, and full passive sensing unless the pilot has funding, a research partner, and explicit data-governance support.
