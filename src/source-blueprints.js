export const SOURCE_BLUEPRINTS = [
  {
    id: "mindlamp",
    sourceId: "mindLamp",
    title: "mindLAMP",
    focus: "Remote mental health programs",
    pattern: "Participant activities, surveys, cognitive tasks, coordinator dashboards, and longitudinal review live in one platform.",
    appMove: "EC Map keeps the client report and coach packet separate, with versioned scoring ready for future longitudinal review."
  },
  {
    id: "beiwe",
    sourceId: "beiwe",
    title: "Beiwe",
    focus: "EMA, audio diary, and configurable studies",
    pattern: "Active surveys, optional audio capture, skip logic, passive context, and encrypted collection support research workflows.",
    appMove: "EC Map uses short saved sessions now, and keeps the voice path ready for transcript review before scoring."
  },
  {
    id: "radar-base",
    sourceId: "radarBase",
    title: "RADAR-base",
    focus: "Remote assessment and dashboards",
    pattern: "Patient-reported outcomes, sensor streams, and management portals are treated as one monitoring workflow.",
    appMove: "EC Map treats intake answers as structured signals that can later support a coach dashboard without changing the client flow."
  },
  {
    id: "researchkit",
    sourceId: "researchKit",
    title: "ResearchKit",
    focus: "Ordered health research tasks",
    pattern: "Consent, instructions, surveys, and active tasks are organized into steps with explicit boundaries.",
    appMove: "EC Map keeps prototype scope, consent-worthy warnings, and non-diagnostic language visible before sensitive input."
  },
  {
    id: "surveyjs",
    sourceId: "surveyJs",
    title: "SurveyJS",
    focus: "Dynamic survey logic",
    pattern: "JSON-driven multi-page forms support autosave, branching, validation, accessible inputs, and self-hosted data.",
    appMove: "EC Map keeps the 64-item spine deterministic while allowing targeted follow-ups and future branch logic."
  },
  {
    id: "openscales",
    sourceId: "openScales",
    title: "OpenScales",
    focus: "Portable measurement metadata",
    pattern: "Scales can carry item text, scoring rules, translations, source metadata, and license fields in one format.",
    appMove: "EC Map versions assessment, scoring, evidence, and report logic so the product can mature without losing traceability."
  },
  {
    id: "opencha",
    sourceId: "openCha",
    title: "openCHA",
    focus: "Conversational health agents",
    pattern: "LLM conversation is paired with external sources, multimodal inputs, transparent procedures, and modular tools.",
    appMove: "EC Map lets AI draft reflections later, while scoring, safety routing, and differential boundaries stay app-owned."
  },
  {
    id: "openwhispr",
    sourceId: "openWhispr",
    title: "OpenWhispr",
    focus: "Privacy-first voice capture",
    pattern: "Voice-to-text can run locally or through user-chosen providers, with notes, transcripts, and structured workflows.",
    appMove: "EC Map sizes each conversation for speak-listen-confirm voice intake, without storing raw audio by default."
  }
];

export const CONCIERGE_METHOD_STEPS = [
  {
    id: "frame",
    title: "Frame the work",
    body: "Start with scope, privacy, and the promise: a functional map, not a label or care plan.",
    sourceIds: ["researchKit", "apaEvaluationModel", "niceEvidenceStandards"]
  },
  {
    id: "short-sessions",
    title: "Use short conversations",
    body: "Break the intake into eight voice-sized sessions so the client can pause, resume, or complete it before a meeting.",
    sourceIds: ["surveyJs", "beiwe", "researchKit"]
  },
  {
    id: "dual-pathway",
    title: "Keep ADHD and menopause equal",
    body: "Interpret cognition through both lifespan-pattern and midlife-amplifier lenses, without using either one to dismiss the other.",
    sourceIds: ["niceNg87", "cdcAdhdDiagnosis", "niceNg23", "menopauseSociety"]
  },
  {
    id: "structure",
    title: "Turn story into signal",
    body: "Convert lived examples into functional patterns, confidence caveats, and questions to verify in the first session.",
    sourceIds: ["mindLamp", "openCha", "hitop"]
  },
  {
    id: "human-review",
    title: "Prepare for review",
    body: "Separate the client-facing report from the coach packet so professional review starts with signal instead of raw answers.",
    sourceIds: ["mindLamp", "radarBase", "humanLoop"]
  },
  {
    id: "voice",
    title: "Make voice safe to add",
    body: "Voice should ask, listen, transcribe, confirm, and then score. It should not free-chat around risk or medical decisions.",
    sourceIds: ["openWhispr", "openCha", "beiwe", "parksEvaluation"]
  }
];

export function sourceBlueprintIds() {
  return [...new Set(SOURCE_BLUEPRINTS.map((source) => source.sourceId))];
}

export function methodSourceIds() {
  return [...new Set(CONCIERGE_METHOD_STEPS.flatMap((step) => step.sourceIds))];
}
