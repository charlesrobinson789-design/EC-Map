import { VALIDITY_ITEMS } from "./followups.js";
import { scoreAssessment } from "./scoring.js";
import { ACTIVE_CONTEXT_PROMPTS, ACTIVE_SPINE_ITEMS } from "./sections.js";
import { SAFETY_ITEMS } from "./spine.js";
import { AssessmentSession, KernelScore, ScoringResults } from "./types.js";

export const SOL_GOVERNANCE_VERSION = "sol-shadow-governance-v0.2";

export const EIGHT_F_DOMAINS = [
  "Focus",
  "Function",
  "Feelings",
  "Fuel",
  "Fitness",
  "Family",
  "Firm",
  "Finances"
];

export const CANONICAL_INDEX_SLOTS = [
  { id: "bottleneck", label: "Bottleneck" },
  { id: "burden", label: "Burden" },
  { id: "drift", label: "Drift" },
  { id: "resilience", label: "Resilience" }
];

export const SOL_LIFECYCLE = [
  "Anchor",
  "Gather",
  "Validate",
  "Compute",
  "Construct",
  "Challenge",
  "Release and learn"
];

const KERNEL_8F_MAP: Record<string, string[]> = {
  C1: ["Function"],
  C2: ["Focus"],
  C3: ["Focus", "Function"],
  C4: ["Function"],
  C5: ["Function"],
  C6: ["Focus", "Function"],
  C7: ["Feelings"],
  C8: ["Feelings", "Fuel"],
  H1: ["Fuel"],
  H2: ["Fuel"],
  H3: ["Fuel"],
  H4: ["Feelings", "Fuel"],
  H5: ["Fuel"],
  H6: ["Fuel", "Fitness"],
  H7: ["Fuel"],
  H8: ["Fuel", "Fitness"]
};

const REQUIRED_VERSIONS: Record<string, string> = {
  assessment: "ec-map-core-56-v1",
  scoring: "deterministic-kernel-score-v1",
  evidence: "evidence-registry-v1",
  report: "client-coach-report-v1",
  governance: SOL_GOVERNANCE_VERSION
};

function hasOwn(source: any, key: string): boolean {
  return Boolean(source && typeof source === "object" && Object.prototype.hasOwnProperty.call(source, key));
}

function hasTextAnswer(value: any): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isScaleAnswer(value: any): boolean {
  if (value === null || value === undefined || value === "") return false;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 4;
}

function hasExactAnswers(source: any, ids: string[], validator: (val: any) => boolean): boolean {
  return ids.every((id) => hasOwn(source, id) && validator(source[id]));
}

function hasExpectedContextAnswers(source: any): boolean {
  return ACTIVE_CONTEXT_PROMPTS.every((prompt) =>
    hasOwn(source, prompt.id)
    && hasTextAnswer(source[prompt.id])
    && (!prompt.options || prompt.options.includes(source[prompt.id]))
  );
}

function gate(id: string, label: string, status: string, detail: string) {
  return { id, label, status, detail };
}

function itemsForKernel(kernelId: string) {
  return ACTIVE_SPINE_ITEMS.filter((item) => item.kernelId === kernelId);
}

function evidenceForKernel(session: AssessmentSession, score: KernelScore) {
  return itemsForKernel(score.kernelId).map((item) => ({
    evidenceClass: "participant-reported",
    function: item.function,
    responseRecorded: isScaleAnswer(session.scoredResponses?.[item.id])
  }));
}

function challengeFor(score: KernelScore) {
  const alternatives = score.domain === "Cognition"
    ? ["sleep or body-state variability", "current role or interruption load", "longstanding cognition pattern"]
    : ["sleep or recovery load", "current context or demand", "medication, substance, or medical contributor"];
  const discriminatorNote = score.discriminator >= 3
    ? "The discriminator response supports persistence beyond one obvious condition, but does not establish cause."
    : "The discriminator response is not strong enough to favor one driver; keep the pattern unresolved.";

  return {
    competingExplanations: alternatives,
    disconfirmingQuestion: "What changes on a better-rested, lower-load, or more externally supported day?",
    missingInformation: ["independent history or collateral", "longitudinal pattern", "qualified human assessment"],
    note: discriminatorNote
  };
}

function reasoningReceipt(session: AssessmentSession, score: KernelScore, rank: number) {
  return {
    claimId: `shadow-${score.kernelId.toLowerCase()}-${rank}`,
    status: "review_candidate",
    kernelId: score.kernelId,
    kernel: score.kernel,
    scoredLane: score.domain,
    domains8f: KERNEL_8F_MAP[score.kernelId] ?? [],
    observedPattern: `${score.kernel} is a ${score.status.toLowerCase()} in this deterministic pass.`,
    support: {
      evidence: evidenceForKernel(session, score),
      deterministicFacetSummary: {
        signal: score.signal,
        cost: score.cost,
        discriminator: score.discriminator,
        modifiability: score.modifiability,
        total: score.total
      }
    },
    challenge: challengeFor(score),
    confidence: {
      status: "not_calibrated",
      note: "This shadow receipt records evidence strength, not a validated probability or diagnosis."
    },
    requiredDisposition: "qualified_human_review"
  };
}

function contextCoverage(session: AssessmentSession): Record<string, string> {
  const context = session.contextResponses ?? {};
  return {
    Family: context.setting_spread ? "context_only" : "unmapped",
    Firm: context.role_type || context.meeting_load ? "context_only" : "unmapped",
    Finances: "unmapped"
  };
}

function buildEightFCoverage(session: AssessmentSession, results: ScoringResults, scoringTrusted: boolean) {
  const context = contextCoverage(session);
  const kernelEvidence = new Map<string, string[]>(EIGHT_F_DOMAINS.map((domain) => [domain, []]));

  if (scoringTrusted) {
    results.kernelScores.forEach((score) => {
      (KERNEL_8F_MAP[score.kernelId] ?? []).forEach((domain) => {
        kernelEvidence.get(domain)?.push(score.kernelId);
      });
    });
  }

  return EIGHT_F_DOMAINS.map((domain) => {
    const kernelIds = [...new Set(kernelEvidence.get(domain) ?? [])];
    if (kernelIds.length) {
      return { domain, coverage: "provisional_crosswalk", kernelIds };
    }
    return { domain, coverage: context[domain] ?? "unmapped", kernelIds: [] };
  });
}

function scoreSignature(results: any): string {
  return JSON.stringify(results);
}

function lifecycleStages({ complete, validityHasCaveats, deterministicIntegrity }: { complete: boolean; validityHasCaveats: boolean; deterministicIntegrity: boolean }) {
  return SOL_LIFECYCLE.map((name, index) => {
    if (index === 0) return { number: 1, name, status: "prototype_only" };
    if (index === 1) return { number: 2, name, status: complete ? "complete" : "incomplete" };
    if (index === 2) return { number: 3, name, status: complete ? validityHasCaveats ? "human_review" : "automated_checks_complete" : "pending" };
    if (index === 3) return { number: 4, name, status: deterministicIntegrity ? "kernel_scores_only" : "blocked" };
    if (index === 4) return { number: 5, name, status: complete && deterministicIntegrity ? "shadow_packet_built" : "blocked" };
    if (index === 5) return { number: 6, name, status: complete && deterministicIntegrity ? "human_review_required" : "blocked" };
    return { number: 7, name, status: "blocked_mock_only" };
  });
}

export function buildSolGovernancePacket(session: AssessmentSession, results: ScoringResults, validity: { confidence?: string; caveats?: string[] } = {}, versions: Record<string, string> = {}): Record<string, any> {
  const contextComplete = hasExpectedContextAnswers(session.contextResponses);
  const scoredComplete = hasExactAnswers(
    session.scoredResponses,
    ACTIVE_SPINE_ITEMS.map((item) => item.id),
    isScaleAnswer
  );
  const validityComplete = hasExactAnswers(
    session.validityResponses,
    VALIDITY_ITEMS.map((item) => item.id),
    isScaleAnswer
  );
  const safetyComplete = hasExactAnswers(
    session.safetyResponses,
    SAFETY_ITEMS.map((item) => item.id),
    isScaleAnswer
  );
  const complete = contextComplete && scoredComplete && validityComplete && safetyComplete;
  const safetyReviewRequired = results.safetyFlags.length > 0;
  const validityHasCaveats = Boolean(validity.caveats?.length);
  const provenanceComplete = Object.entries(REQUIRED_VERSIONS)
    .every(([key, expected]) => versions[key] === expected);
  const recomputedResults = scoreAssessment(session.scoredResponses, session.safetyResponses);
  const deterministicIntegrity = scoredComplete
    && versions.scoring === REQUIRED_VERSIONS.scoring
    && results.kernelScores.length === new Set(ACTIVE_SPINE_ITEMS.map((item) => item.kernelId)).size
    && scoreSignature(results) === scoreSignature(recomputedResults);
  const eightFCoverage = buildEightFCoverage(session, results, complete && deterministicIntegrity);
  const domainsNeedingMapping = eightFCoverage
    .filter((item) => item.coverage !== "provisional_crosswalk")
    .map((item) => item.domain);
  const leadingScores = complete && deterministicIntegrity
    ? [results.topCognitionBottlenecks[0], results.topChemistryAmplifiers[0]].filter(Boolean)
    : [];

  const gates = [
    gate("G1", "Provenance", provenanceComplete ? "pass" : "block", provenanceComplete ? "All required versions match the approved MVP contract." : "A required version is missing or does not match the approved MVP contract."),
    gate(
      "G2",
      "Completeness and validity",
      complete ? validityHasCaveats ? "human_review" : "pass" : "block",
      !complete
        ? "One or more required prototype inputs are incomplete."
        : validityHasCaveats
          ? "Required inputs are complete, but answer-confidence caveats need human review."
          : "Required prototype inputs are complete without an answer-confidence caveat."
    ),
    gate("G3", "Deterministic integrity", deterministicIntegrity ? "pass" : "block", deterministicIntegrity ? "Kernel scores match a fresh run of the approved deterministic engine." : "Scores are incomplete, altered, or incompatible with the approved deterministic engine."),
    gate(
      "G4",
      "Safety and privacy",
      !safetyComplete ? "block" : safetyReviewRequired ? "human_review" : "pass",
      !safetyComplete
        ? safetyReviewRequired
          ? "Private checks are incomplete and a threshold crossed; stop interpretation and route for human review."
          : "Private safety checks are incomplete; interpretation remains blocked."
        : safetyReviewRequired
          ? "A private threshold crossed; handle outside generated interpretation."
          : "No private threshold crossed in this pass."
    ),
    gate(
      "G5",
      "Differential and claims",
      complete ? "human_review" : "block",
      complete
        ? "Support and challenge receipts are available; causal interpretation remains human-reviewed."
        : "Required inputs are incomplete, so differential claims remain blocked."
    ),
    gate("G6", "Human release", "block", "Clinical auto-send is disabled. This mock-data packet cannot be released as clinical output.")
  ];

  const overallStatus = gates.some((item) => item.status === "block" && item.id !== "G6")
    ? "incomplete"
    : safetyReviewRequired
      ? "human_review_required"
      : gates.some((item) => item.status === "human_review")
        ? "shadow_ready_for_human_review"
        : "shadow_ready";

  return {
    schemaVersion: SOL_GOVERNANCE_VERSION,
    mode: "mock_data_shadow",
    overallStatus,
    runtime: {
      name: "Sol",
      boundary: "Structured, Observable, Limited",
      invoked: false,
      note: "The MVP demonstrates Sol governance deterministically; no external model call occurs in this prototype."
    },
    formula: {
      one: "one accountability chain and case packet",
      two: "constructor and challenger views",
      four: "four canonical index slots",
      six: "six fail-closed gates",
      eight: "eight functional domains",
      dividedByTwo: "support and challenge",
      structures: ["3C plus Cap/Cost/Context", "seven-stage lifecycle"]
    },
    canonicalIndices: CANONICAL_INDEX_SLOTS.map((index) => ({
      ...index,
      status: "not_computed",
      reason: "The live MVP has not implemented or validated this canonical index formula."
    })),
    gates,
    lifecycle: lifecycleStages({ complete, validityHasCaveats, deterministicIntegrity }),
    eightFCoverage,
    returnTo8: {
      status: domainsNeedingMapping.length ? "human_mapping_needed" : "mapped",
      domainsNeedingMapping,
      rule: "If a claim cannot connect to observable 8F function, keep it out of the client-facing Map."
    },
    reasoningReceipts: leadingScores.map((score, index) => reasoningReceipt(session, score, index + 1)),
    privateSafety: {
      redacted: true,
      reviewRequired: safetyReviewRequired,
      flagCount: results.safetyFlags.length
    },
    release: {
      eligible: false,
      reason: "Mock-data shadow mode requires qualified human review and cannot auto-send clinical output."
    }
  };
}
