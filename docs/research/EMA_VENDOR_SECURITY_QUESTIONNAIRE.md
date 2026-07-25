# EMA Vendor Security And Pilot Questionnaire

Use this for mindLAMP, m-Path, ExpiWell, Avicenna/Ethica, NeuroUX, LifeData, EARS, Curious, mEMA/ilumivu, movisensXS, MetricWire/Catalyst, Fitrockr, uMotif, TrialKit, and any comparable EMA, wearable, voice, eCOA/ePRO, or digital phenotyping platform.

## Short Project Description

We are evaluating platforms for an early EC Map research/pilot workflow. EC Map is a non-diagnostic, human-reviewed functional capacity mapping tool for midlife women experiencing attention, memory, sleep, energy, body-state, recovery, and workload changes. We are interested in short repeated EMA prompts and, if feasible, optional wearable/passive signals such as sleep, steps/activity, HR/HRV, screen/app use, and location.

The first phase is research and platform selection. We are not ready to send real participant data to any platform until security, privacy, consent, export/delete, and data ownership terms are clear in writing.

## Required Written Answers

### 1. Fit And Study Configuration

- Can your platform support a 4-8 week study with 25, 50, and 100 participants?
- Can prompts be scheduled at fixed times, random windows, rolling windows, and participant-triggered/event-contingent moments?
- Can we configure 5-8 short EC Map pilot prompts first, then expand later?
- Can participants pause, miss, or resume prompts without corrupting the study record?
- Can participants use iOS and Android?
- Is web-only participation available, or is app installation required?
- Can participants be enrolled without collecting unnecessary direct identifiers?

### 2. Data Types

- Which survey question types are supported: Likert, checkbox/multi-select, free text, slider, time/date, matrix/grid, media upload?
- Which passive phone signals are supported: GPS/location, accelerometer, steps/activity, screen/app use, device state, call/text metadata, sleep inference?
- Which wearable platforms are supported: Fitbit, Apple Health/Watch, Garmin, Oura, Google Fit/Health Connect, other?
- Can wearable/passive data collection be disabled for a lower-risk EMA-only pilot?
- Are raw data, processed features, and timestamps separately exportable?
- Are cognitive tasks available? If yes, which tasks and what validation/publication support exists?

### 3. Data Ownership, Export, And Deletion

- Who owns the participant data?
- Can the research sponsor export the full project dataset at any time?
- Can exports include raw responses, timestamps, schedule metadata, completion metadata, and wearable/passive data?
- What export formats are available: CSV, JSON, API, REDCap, SFTP, database dump, other?
- Is participant-level deletion supported?
- Is project-level deletion supported after the study ends?
- How long do you retain backups after deletion?
- Can we get written retention and deletion terms before signing?

### 4. Privacy, Security, And Compliance

- Can you provide a Business Associate Agreement if PHI or HIPAA-regulated data is collected?
- If no BAA is available, can the platform be configured to avoid PHI/direct identifiers?
- Do you provide a Data Processing Agreement?
- Where is data hosted, and can we choose the region?
- Is data encrypted in transit and at rest?
- Which cloud provider and subprocessors are used?
- Do you maintain SOC 2, ISO 27001, HIPAA, GDPR, 21 CFR Part 11, or other security/compliance documentation?
- Is role-based access control available for admins/researchers?
- Are admin access, export, deletion, and configuration changes audit logged?
- Can we restrict access by study/team?
- Is MFA available for researcher/admin accounts?
- Have you had independent penetration testing or security review in the last 12 months?
- What is your incident notification policy?

### 5. Consent And IRB Support

- Does your platform support e-consent?
- Can we use our own external consent workflow and then enroll participants?
- Can consent version, timestamp, and participant acknowledgment be exported?
- Do you provide standard IRB/security language?
- Can safety/referral responses be separated from normal report/summary payloads?

### 6. AI, Voice, And Automation Boundaries

- Does your platform use AI by default for survey responses, transcripts, scoring, summaries, or alerts?
- If AI is available, can it be fully disabled?
- Are raw audio, transcript, or free-text responses used for model training?
- Can we prohibit AI processing of safety/referral responses?
- Can we ensure the platform does not provide clinical, crisis, medication, hormone, or treatment decisions?

### 7. Pricing

- Quote 25 participants for 4-8 weeks.
- Quote 50 participants for 4-8 weeks.
- Quote 100 participants for 4-8 weeks.
- Quote EMA-only.
- Quote EMA plus wearable integration.
- Quote EMA plus passive phone sensing.
- Quote cognitive testing if available.
- List all setup, support, API, export, white-label, storage, transcription, or custom-development fees.
- Confirm whether the total pilot can stay under $5,000/year or under $5,000 for a single early study.

### 8. Pilot Support

- Can we run a no-PHI test using fake/mock participants?
- Can we get sandbox access before purchase?
- How long does setup usually take?
- What support is included?
- Can you help configure a small pilot without custom development?
- Can we export data from the sandbox before purchase?

## Hard Disqualifiers

Do not use the platform for real EC Map participant data if any of these are true:

- Vendor cannot provide written data ownership, export, and deletion terms.
- Vendor cannot explain hosting region, encryption, subprocessors, and admin access controls.
- Vendor cannot support deletion/export at participant and project level.
- Vendor requires AI processing of sensitive responses or uses responses for model training.
- Vendor cannot provide a BAA when PHI is collected, unless the study is explicitly designed to avoid PHI.
- Vendor cannot disable raw audio/transcript storage if voice is involved.
- Vendor pushes diagnosis, medication, hormone, treatment, or crisis decision logic into the platform.
- Vendor pricing exceeds the pilot budget and cannot support a low-risk EMA-only first phase.

## Outreach Email

Subject: EC Map EMA pilot platform evaluation

Hello,

I am evaluating EMA/digital phenotyping platforms for an early EC Map research/pilot workflow. EC Map is a non-diagnostic, human-reviewed functional capacity mapping tool for midlife women with attention, memory, sleep, energy, body-state, recovery, and workload changes.

For the first phase, I am comparing platforms for a 4-8 week pilot with 25, 50, or 100 participants. The minimum need is short repeated EMA prompts. Optional interests include wearable/passive data, especially sleep, activity/steps, HR/HRV, screen/app use, and location. We are not ready to send real participant data until privacy, security, data ownership, export/delete, consent, and pricing terms are clear in writing.

Can you please answer the attached questionnaire or send equivalent documentation covering platform fit, data types, pricing, export/API, deletion, consent/IRB support, BAA/DPA availability, encryption, hosting region, subprocessors, access control, audit logs, and whether AI/voice processing can be disabled?

The immediate goal is to identify whether your platform can support a low-risk no-PHI test first, then a small formal pilot if the security and budget fit are acceptable.

Thank you.
