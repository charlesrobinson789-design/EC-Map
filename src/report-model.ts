import { ACTIVE_CONTEXT_PROMPTS, ASSESSMENT_SECTIONS } from "./sections.js";
import { buildSolGovernancePacket, SOL_GOVERNANCE_VERSION } from "./sol-governance.js";
import { AdaptiveClarifier, AssessmentSession, CoachPacket, CoachPhrase, DifferentialLens, ScoringResults } from "./types.js";

export const REPORT_VERSIONS: Record<string, string> = {
  assessment: "ec-map-core-56-v1",
  scoring: "deterministic-kernel-score-v1",
  evidence: "evidence-registry-v1",
  report: "client-coach-report-v1",
  governance: SOL_GOVERNANCE_VERSION
};

export const CLAIM_TYPES: Record<string, string> = {
  functional: "functional",
  educational: "educational",
  evidenceInformed: "evidence-informed",
  referralOriented: "referral-oriented"
};

const EXPERIMENTS_BY_KERNEL: Record<string, { title: string; prompt: string }> = {
  Activation: {
    title: "First-step launch",
    prompt: "Choose one stuck task. Write the first physical action, set a 12-minute timer, and start before reorganizing the whole plan."
  },
  "Sustained attention": {
    title: "Attention container",
    prompt: "Run one focused work block with a single input source, one visible task, and a planned stop point."
  },
  "Working memory": {
    title: "Offload before switching",
    prompt: "Before any interruption or task switch, capture the next step in one sentence outside your head."
  },
  Prioritization: {
    title: "Two-choice triage",
    prompt: "When everything feels equal, narrow the next move to two choices and pick the one with the highest repair cost if ignored."
  },
  "Time estimation": {
    title: "Time reality check",
    prompt: "Before starting a familiar task, estimate the time, run it, then record the actual time without judging the difference."
  },
  "Task switching": {
    title: "Switching buffer",
    prompt: "Place a five-minute buffer between two demanding tasks and use it only to close one thread before opening the next."
  },
  "Emotion under cognitive load": {
    title: "Load naming",
    prompt: "When emotion spikes during demand, name the load before solving the content: too many inputs, too little recovery, or unclear priority."
  },
  "Recovery after cognitive overload": {
    title: "Next-day protection",
    prompt: "After a high-demand day, pre-block one lower-stimulation recovery window before adding optional commitments."
  },
  "Sleep restoration": {
    title: "Two-night sleep signal",
    prompt: "Protect two consecutive nights and note the next-day change in focus, mood, and word-finding."
  },
  "Hormonal variability": {
    title: "Pattern window tracker",
    prompt: "Track energy, mood, sleep, and focus for two weeks to see whether lower-functioning windows have a pattern."
  },
  "Energy stability": {
    title: "Pacing checkpoint",
    prompt: "Add one planned rest or protein-forward pause before the usual crash window and compare the afternoon."
  },
  "Stress physiology": {
    title: "Evening downshift",
    prompt: "Use one short downshift cue after stress ends, then note whether sleep onset or evening irritability changes."
  },
  "Glucose, appetite, and caffeine rhythm": {
    title: "Fuel rhythm test",
    prompt: "Keep caffeine timing and first meal timing steady for three days and watch for focus or irritability shifts."
  },
  "Somatic burden": {
    title: "Body-load audit",
    prompt: "When thinking gets harder, log pain, tension, headaches, heat, and GI load before assuming it is motivation."
  },
  "Medication, substance, and supplement effects": {
    title: "Timing note",
    prompt: "Record timing and focus, mood, sleep, or energy changes to discuss with a qualified clinician if patterns concern you."
  },
  "Recovery physiology": {
    title: "Recovery baseline",
    prompt: "After ordinary effort, track how long your body takes to return to baseline and what shortens that rebound."
  }
};

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function phrase(text: string, claimType = CLAIM_TYPES.functional): CoachPhrase {
  return { text, claimType };
}

function formatSelectedValues(value: any): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
}

function cleanValue(value: any, fallback = "Not provided"): string {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function scoreDomain(results: ScoringResults, domain: string) {
  const scores = results.kernelScores.filter((score) => score.domain === domain);
  return {
    total: scores.reduce((sum, score) => sum + score.total, 0),
    discriminator: average(scores.map((score) => score.discriminator)),
    cost: average(scores.map((score) => score.cost))
  };
}

export function buildCapacitySignature(results: ScoringResults): Record<string, any> {
  const topCognition = results.topCognitionBottlenecks[0];
  const topChemistry = results.topChemistryAmplifiers[0];
  const lever = results.topModifiabilityLevers[0];
  const balance = results.driverConfidence.mixedPattern
    ? "Layered cognition and body-state pattern"
    : results.driverConfidence.cognitionLed > results.driverConfidence.chemistryLed
      ? "Cognition-led capacity pattern"
      : "Body-state-led capacity pattern";

  return {
    title: balance,
    headline: `${topCognition?.kernel ?? "Cognition load"} + ${topChemistry?.kernel ?? "body-state load"}`,
    body: `The map suggests ${topCognition?.kernel ?? "cognition load"} is carrying the most cognitive friction, while ${topChemistry?.kernel ?? "body-state load"} is the strongest body-state amplifier.`,
    lever: lever ? `The most useful first lever appears to be ${lever.kernel}.` : "No clear lever emerged yet; start with tracking before changing routines."
  };
}

export function buildSectionSummaries(results: ScoringResults): Record<string, any>[] {
  return ASSESSMENT_SECTIONS.map((section) => {
    const scores = results.kernelScores.filter((score) => (section.kernelIds || []).includes(score.kernelId));
    const top = [...scores].sort((a, b) => b.total - a.total)[0];
    return {
      id: section.id,
      title: section.title,
      average: rounded(average(scores.map((score) => score.average))),
      status: top?.total >= 12 ? "High friction" : top?.total >= 7 ? "Moderate friction" : "Low friction",
      topKernel: top?.kernel ?? "No clear signal",
      total: scores.reduce((sum, score) => sum + score.total, 0),
      max: scores.length * 16
    };
  });
}

export function buildExperiments(results: ScoringResults): Record<string, any>[] {
  const selected = results.topModifiabilityLevers.length
    ? results.topModifiabilityLevers
    : [...results.topCognitionBottlenecks, ...results.topChemistryAmplifiers];
  const seen = new Set<string>();
  return selected
    .filter((score) => {
      if (seen.has(score.kernel)) return false;
      seen.add(score.kernel);
      return true;
    })
    .slice(0, 3)
    .map((score) => ({
      kernel: score.kernel,
      severity: score.status,
      ...(EXPERIMENTS_BY_KERNEL[score.kernel] ?? {
        title: "Pattern note",
        prompt: "Track when this pattern shows up, what preceded it, and what made it lighter."
      })
    }));
}

export function buildConversationPrompts(results: ScoringResults, validity: { caveats?: string[] } = {}): string[] {
  const topCognition = results.topCognitionBottlenecks[0]?.kernel ?? "cognitive load";
  const topChemistry = results.topChemistryAmplifiers[0]?.kernel ?? "body-state load";
  const caveat = validity.caveats?.[0];
  return [
    `The main pattern I want help thinking through is ${topCognition} interacting with ${topChemistry}.`,
    "I am not looking for a label from this report; I want to understand what could be driving the functional change.",
    caveat ? `One caveat: ${caveat}` : "The answers felt representative enough to discuss.",
    "What would be reasonable to track, rule out, or bring into care planning next?"
  ];
}

export function buildDifferentialLens(session: AssessmentSession, results: ScoringResults): DifferentialLens {
  const context = session.contextResponses ?? {};
  const cognition = scoreDomain(results, "Cognition");
  const chemistry = scoreDomain(results, "Chemistry");
  const lifelong = context.lifelong_attention_pattern ?? "";
  const spread = context.setting_spread ?? "";
  const timeline = context.timeline ?? "";

  const longstanding = /Longstanding|many adult years/i.test(lifelong);
  const crossSetting = /Across work, home, and relationships/i.test(spread);
  const worsenedOrFluctuated = /worse|fluctuated/i.test(timeline);
  const cognitionProminent = cognition.total >= chemistry.total * 0.9 && cognition.discriminator >= 2;
  const chemistryProminent = chemistry.total >= cognition.total * 0.9 && chemistry.discriminator >= 2;

  if (longstanding && crossSetting && cognitionProminent && chemistryProminent) {
    return {
      status: "Layered lifelong and current-state pattern",
      body: "The intake suggests a longstanding cross-setting cognition pattern that may now be amplified by body state, recovery, or current demands.",
      verify: "Ask for childhood or early-adult examples, current cross-setting cost, energy and recovery changes, medication or substance timing, and what improves with external structure.",
      caveat: "This does not confirm a diagnosis or establish a cause. It identifies a layered pattern for careful human review."
    };
  }

  if (longstanding && crossSetting && cognitionProminent) {
    return {
      status: "ADHD-consistent functional pattern",
      body: "The intake points toward a cognition pattern that appears longstanding and cross-setting rather than only recent or body-state dependent.",
      verify: "Ask for early-life examples, school or work history, current impairment across settings, masking cost, and collateral history if appropriate.",
      caveat: "This is not an ADHD determination. Formal evaluation belongs with a qualified professional."
    };
  }

  if (worsenedOrFluctuated && chemistryProminent) {
    return {
      status: "Current-state amplifier pattern",
      body: "The intake points toward cognition strain that may be amplified by energy, stress, pain, fuel rhythm, medication effects, or recovery load.",
      verify: "Ask how attention, memory, mood, energy, and recovery vary across better and worse body-state or demand windows.",
      caveat: "This does not establish a cause. Lifelong cognition, mood, medical, medication, sleep, and context factors may still need review."
    };
  }

  if (cognitionProminent && chemistryProminent) {
    return {
      status: "Layered pattern to verify",
      body: "Cognition and body-state signals are both active, but the intake does not cleanly separate lifespan pattern from current-state amplifier.",
      verify: "Ask what was true earlier in life, what changed recently, and what improves when structure, energy, and recovery are protected.",
      caveat: "Do not over-interpret a single pass. The next step is better history and pattern tracking."
    };
  }

  return {
    status: "Indeterminate pattern",
    body: "The intake shows functional strain, but the signal is not yet strong enough to favor a longstanding cognition, current-state amplifier, or layered interpretation.",
    verify: "Ask for concrete examples, timeline, setting spread, recovery stability, medication or substance context, and what has already helped.",
    caveat: "Indeterminate does not mean absent. It means the pattern needs more context before it is interpreted."
  };
}

export function buildCoachReview(session: AssessmentSession, results: ScoringResults, validity: { confidence?: string; caveats?: string[] } = {}, activeFollowups: AdaptiveClarifier[] = []): CoachPacket {
  const topCognition = results.topCognitionBottlenecks[0];
  const topChemistry = results.topChemistryAmplifiers[0];
  const topLever = results.topModifiabilityLevers[0];
  const answeredFollowups = activeFollowups.filter((clarifier) => session.adaptiveResponses?.[clarifier.id]);
  const validContextCount = ACTIVE_CONTEXT_PROMPTS.filter((prompt) =>
    prompt.options?.includes(session.contextResponses?.[prompt.id] as string)
  ).length;
  const readinessItems = [
    { label: "Context anchors", value: validContextCount, total: ACTIVE_CONTEXT_PROMPTS.length },
    { label: "Scored spine", value: results.completion.answered, total: results.completion.total },
    { label: "Confidence checks", value: Object.keys(session.validityResponses ?? {}).length, total: 4 },
    { label: "Private safety checks", value: Object.keys(session.safetyResponses ?? {}).length, total: 4 }
  ];
  const readinessComplete = readinessItems.every((item) => item.value >= item.total);
  const compensationNote = cleanValue(
    session.narrativeResponses?.public_private_cost || session.narrativeResponses?.compensating_for,
    "Ask what the client is masking, compensating for, or paying for after visible functioning."
  );

  const referralConsiderations = results.safetyFlags.length
    ? [
        phrase(
          `${results.safetyFlags.length} private safety item${results.safetyFlags.length === 1 ? "" : "s"} crossed the review threshold; handle outside coaching content and route to appropriate support if needed.`,
          CLAIM_TYPES.referralOriented
        ),
        phrase("Do not use the capacity score to minimize safety or referral concerns.", CLAIM_TYPES.referralOriented)
      ]
    : [
        phrase("No private safety item crossed the review threshold in this pass.", CLAIM_TYPES.referralOriented),
        phrase("Continue ordinary scope-of-practice screening if the client describes acute risk, medical red flags, or severe impairment.", CLAIM_TYPES.referralOriented)
      ];

  const solGovernance = buildSolGovernancePacket(session, results, validity, REPORT_VERSIONS);

  return {
    versions: REPORT_VERSIONS,
    solGovernance,
    sessionReadiness: {
      status: readinessComplete ? "Ready for coach review" : "Incomplete intake",
      items: readinessItems,
      confidence: validity.confidence || "",
      caveats: (validity.caveats || []).map((caveat) => phrase(caveat, CLAIM_TYPES.functional))
    },
    clientContext: {
      roleType: cleanValue(session.contextResponses?.role_type),
      meetingLoad: cleanValue(session.contextResponses?.meeting_load),
      sleepStability: cleanValue(session.contextResponses?.sleep_stability),
      lifelongAttentionPattern: cleanValue(session.contextResponses?.lifelong_attention_pattern),
      settingSpread: cleanValue(session.contextResponses?.setting_spread),
      timeline: cleanValue(session.contextResponses?.timeline),
      compensationBurden: phrase(compensationNote, CLAIM_TYPES.functional)
    },
    capacitySignature: buildCapacitySignature(results),
    differentialLens: buildDifferentialLens(session, results),
    coachPriorities: [
      phrase(`Open with ${topCognition?.kernel ?? "the leading cognition pattern"} and how it shows up in daily responsibilities.`, CLAIM_TYPES.functional),
      phrase(`Verify whether ${topChemistry?.kernel ?? "body-state load"} is amplifying the pattern through energy, stress, pain, fuel rhythm, medication effects, recovery, or current role load.`, CLAIM_TYPES.evidenceInformed),
      phrase("Check whether the pattern is longstanding, current-state amplified, layered, or still indeterminate.", CLAIM_TYPES.evidenceInformed),
      phrase(topLever ? `Use ${topLever.kernel} as the first low-risk coaching lever to test.` : "Begin with observation before choosing a coaching lever.", CLAIM_TYPES.functional)
    ].slice(0, 4),
    verificationQuestions: [
      phrase(`When ${topCognition?.kernel ?? "the cognition pattern"} shows up, what has usually happened in the prior 24 hours?`, CLAIM_TYPES.functional),
      phrase("Was this pattern present earlier in life, and did it show up across more than one setting?", CLAIM_TYPES.evidenceInformed),
      phrase("What changes on better-rested or more stable-body days?", CLAIM_TYPES.evidenceInformed),
      phrase(`What does the client hide publicly that becomes costly privately?`, CLAIM_TYPES.functional),
      ...answeredFollowups.slice(0, 3).map((clarifier) =>
        phrase(`${clarifier.title}: client selected "${formatSelectedValues((session.adaptiveResponses || {})[clarifier.id])}". Verify with one concrete example.`, CLAIM_TYPES.functional)
      )
    ],
    referralConsiderations,
    evidenceThemes: [
      "coach-review",
      "digital-health-governance",
      "conversation-platforms",
      "voice-ready-intake",
      "dimensional-framing",
      "narrative-intake",
      "safety-referral"
    ],
    claimCaveats: [
      phrase("Use this as a functional coaching intake, not a medical or mental health diagnosis.", CLAIM_TYPES.educational),
      phrase("Scores are construct-informed and should be interpreted with the client's narrative and current context.", CLAIM_TYPES.evidenceInformed),
      phrase("Medication changes, severe mood symptoms, acute medical concerns, and safety concerns belong outside coaching-only guidance.", CLAIM_TYPES.referralOriented)
    ]
  };
}
