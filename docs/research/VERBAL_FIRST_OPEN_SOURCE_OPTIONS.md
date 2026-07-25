# Verbal-First Open-Source Options For EC Map

Snapshot: 2026-06-13 PT / 2026-06-14 UTC.

Status: research note for a verbal-first product shape. This is not a recommendation to collect real participant data yet.

## Bottom Line

If the first product tier is "verbal assessment" and EMA comes later as a higher tier, the best open-source paths are not one-size-fits-all. There are two different problems:

- capture spoken or voice-like responses safely
- later add scheduled EMA without turning the first tier into a full digital-phenotyping stack

The strongest open-source options depend on whether you want a fast prototype, a custom mobile app, or a modular research platform.

## Best Fit By Build Style

| Build Style | Best Open-Source Fit | Why It Fits |
| --- | --- | --- |
| Fastest no/low-code verbal prototype | ODK Collect + ODK Central | Built-in audio widget, offline collection, manual or server-backed form workflows, and straightforward export paths. |
| Custom mobile app with later expansion | ResearchKit (iOS) + ResearchStack (Android) | SDKs for building a custom study app where you control the verbal flow now and add EMA modules later. |
| Modular assessment platform | MindLogger | App + admin panel + applet model is a better fit if you want reusable assessments rather than a blank SDK. |
| Diary-style verbal journaling | Moodle Diary | Open-source diary module that can collect text, audio, and video with date-based prompts. |
| Full research platform with custom activities | mindLAMP / LAMP | Best if you eventually want a platform plus custom activities, but it carries the highest ops burden. |

## Candidate Notes

### ODK Collect + ODK Central

ODK Collect is an Android app for offline form collection. The official docs say the built-in audio widget can record audio with the device microphone, can continue recording while the user does other things, and is available in Collect v1.29 or later. ODK Central manages forms and exports.

Use this when:

- the first tier is a structured verbal response, voice diary, or recorded answer
- you want a low-cost prototype that is not yet a full mobile research platform
- you are willing to accept Android-first constraints and a form-based UX

Security read:

- audio is more sensitive than text
- treat raw recordings as high-sensitivity data
- do not add transcription by default unless you have a clear retention and consent policy

### ResearchKit + ResearchStack

ResearchKit is an open-source framework for building research apps on iOS. The official site describes informed consent, questionnaires, active evaluations, and connected patient/research apps. The release notes also describe a speech-recognition task that records what the participant said and produces transcription. ResearchStack is the Android SDK/UX framework counterpart for study apps.

Use this when:

- you want to build a real voice-first app, not just a form
- you want control over the long-term architecture
- you expect EMA later and want to own the app shell from the start

Security read:

- this is a build path, not a turnkey pilot
- open source does not remove mobile security, consent, storage, or platform-review work
- voice tasks can trigger microphone/privacy requirements very early

### MindLogger

MindLogger is a React Native data collection app with a browser admin panel for Editors and Managers. The project is built for app-based assessments and study applets. In the broader project ecosystem, there is also evidence of audio-recording behavior in demo applets.

Use this when:

- you want a reusable assessment platform
- you want a browser admin flow rather than a pure SDK
- you may later want to build custom verbal applets

Security read:

- verify current maintenance, deployment model, and export/delete before relying on it
- do not assume the presence of an app or applet means the audio flow is production-ready

### Moodle Diary

Moodle's Diary plugin is open source and can collect online text, audio, and video entries with date-based prompts. That makes it useful as a verbal-journaling prototype if you are already comfortable with a Moodle-style workflow.

Use this when:

- the first tier is more like a diary or journal than a clinical app
- you want a quick open-source way to collect verbal entries
- you do not need a mobile-native research stack on day one

Security read:

- good for prototyping, not ideal as a long-term health-data platform
- audio/video entries increase storage and consent complexity fast

### mindLAMP / LAMP

mindLAMP is the strongest research-platform option if you want custom activities plus a later EMA layer. It is more capable than a simple form tool, but it is also more operationally expensive.

Use this when:

- you want a platform + activities model
- you expect a research partner or developer support
- you are comfortable with a higher security/ops burden

Security read:

- self-hosting means you own the server, app, data, keys, notifications, backups, and audit trail
- do not treat open source as equivalent to production security

## Suggested Tiering Model

If you want "verbal now, EMA later," the cleanest product split is:

### Tier 1: Verbal Assessment

- voice diary
- recorded structured prompts
- interview-style check-ins
- reviewed by a human before any recommendation

Best fit:

- ODK Collect + Central
- ResearchKit / ResearchStack
- MindLogger
- Moodle Diary

### Tier 2: EMA Add-On

- scheduled prompts
- random windows
- event-contingent prompts
- optional sleep/energy/recovery tracking

Best fit:

- m-Path
- ExpiWell
- SEMA3
- PIEL Survey
- MyCap + REDCap if you have an institutional partner

## Practical Recommendation

If you want the least risky path:

1. Build the verbal-first version with ODK or a custom ResearchKit/ResearchStack app.
2. Keep EMA out of the first release unless the verbal flow proves the product.
3. Add EMA later as a separate tier or module using a dedicated EMA platform.
4. Do not start with self-hosted mindLAMP unless you already have the engineering and security operations support.

## Codex Security Gate

Before any real participant data:

- decide whether the verbal tier stores raw audio, transcription, or both
- require explicit consent for voice capture
- define export and deletion
- define who can hear the recordings
- define retention and access control
- keep safety/referral logic deterministic and human reviewed

## Sources

- ODK Collect and audio widget docs: https://docs.getodk.org/collect-intro/ and https://docs.getodk.org/form-question-types/
- ODK Central/form management docs: https://docs.getodk.org/central-forms/ and https://docs.getodk.org/central-api-form-management/
- ResearchKit overview: https://researchkit.org/
- ResearchKit release notes: https://github.com/ResearchKit/ResearchKit/blob/main/RELEASE-NOTES.md
- ResearchStack overview: https://researchstack.org/
- MindLogger app repository: https://github.com/ChildMindInstitute/mindlogger-app
- MindLogger platform discussion/demo docs: https://matter.childmind.org/winter-school/2018/MindLogger.html
- Moodle Diary docs: https://docs.moodle.org/502/en/Diary

