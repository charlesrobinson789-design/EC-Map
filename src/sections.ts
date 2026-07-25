import { CONTEXT_PROMPTS, SPINE_ITEMS } from "./spine.js";
import { AssessmentSection, ContextPrompt, ScoredResponses, SpineItem } from "./types.js";

const SOURCE_ASSESSMENT_SECTIONS: AssessmentSection[] = [
  {
    id: "activation-attention",
    title: "Activation and Attention",
    shortTitle: "Launch",
    subtitle: "Getting started and staying with the thread.",
    kernelIds: ["C1", "C2"],
    voiceGoal: "Start with the visible cognition friction: launch, focus, drift, and restart cost."
  },
  {
    id: "memory-priority",
    title: "Memory and Priority",
    shortTitle: "Memory",
    subtitle: "Working memory, sequencing, and deciding what matters first.",
    kernelIds: ["C3", "C4"],
    voiceGoal: "Separate holding-information problems from priority overload and capture the real-world cost."
  },
  {
    id: "time-switching",
    title: "Time and Switching",
    shortTitle: "Time",
    subtitle: "Time estimation, transitions, interruptions, and context switching.",
    kernelIds: ["C5", "C6"],
    voiceGoal: "Listen for time-estimation errors, restart cost, and whether external structure changes the pattern."
  },
  {
    id: "load-recovery",
    title: "Load and Cognitive Recovery",
    shortTitle: "Load",
    subtitle: "Emotion under demand and recovery after overload.",
    kernelIds: ["C7", "C8"],
    voiceGoal: "Check whether emotion is the main problem or a signal that mental demand has exceeded available bandwidth."
  },
  {
    id: "sleep-hormones",
    title: "Sleep and Hormonal Variability",
    shortTitle: "Sleep",
    subtitle: "Restoration, body-state patterns, and midlife variability.",
    kernelIds: ["H1", "H2"],
    voiceGoal: "Bring menopause-transition context into the same status as cognition, not as an afterthought."
  },
  {
    id: "energy-stress",
    title: "Energy and Stress Physiology",
    shortTitle: "Energy",
    subtitle: "Daily energy stability and stress-system rebound.",
    kernelIds: ["H3", "H4"],
    voiceGoal: "Identify whether body-state instability is amplifying cognition demands."
  },
  {
    id: "fuel-body-load",
    title: "Fuel Rhythm and Body Load",
    shortTitle: "Body",
    subtitle: "Caffeine, appetite, glucose rhythm, pain, tension, and somatic burden.",
    kernelIds: ["H5", "H6"],
    voiceGoal: "Check ordinary body inputs before over-interpreting the cognition signal."
  },
  {
    id: "medication-rebound",
    title: "Medication, Substances, and Rebound",
    shortTitle: "Rebound",
    subtitle: "Medication or supplement effects and return-to-baseline recovery.",
    kernelIds: ["H7", "H8"],
    voiceGoal: "Close with scope-sensitive patterns that may need clinician review rather than coaching interpretation."
  }
];

const sleepHormonesSection = SOURCE_ASSESSMENT_SECTIONS.find((section) => section.id === "sleep-hormones") || SOURCE_ASSESSMENT_SECTIONS[4];

export const PAUSED_HORMONAL_ASSESSMENT: AssessmentSection = {
  ...sleepHormonesSection,
  status: "paused",
  audience: "future sex-specific modules",
  pauseReason: "Held outside the shared core while male and female pathways are designed."
};

export const ASSESSMENT_SECTIONS: AssessmentSection[] = SOURCE_ASSESSMENT_SECTIONS.filter(
  (section) => section.id !== PAUSED_HORMONAL_ASSESSMENT.id
);

export const ACTIVE_KERNEL_IDS = new Set(ASSESSMENT_SECTIONS.flatMap((section) => section.kernelIds || []));
const PAUSED_EVIDENCE_THEMES = new Set(["menopause-specificity", "menopause-cognition", "adhd-differential"]);
export const ACTIVE_SPINE_ITEMS: SpineItem[] = SPINE_ITEMS
  .filter((item) => ACTIVE_KERNEL_IDS.has(item.kernelId))
  .map((item) => ({
    ...item,
    evidenceThemes: [...new Set([
      ...item.evidenceThemes.filter((theme) => !PAUSED_EVIDENCE_THEMES.has(theme)),
      "dimensional-framing"
    ])]
  }));
export const PAUSED_HORMONAL_ITEMS: SpineItem[] = SPINE_ITEMS.filter((item) =>
  (PAUSED_HORMONAL_ASSESSMENT.kernelIds || []).includes(item.kernelId)
);
export const ACTIVE_CONTEXT_PROMPTS: ContextPrompt[] = CONTEXT_PROMPTS
  .filter((prompt) => prompt.id !== "transition_context")
  .map((prompt) => {
    if (prompt.id === "lifelong_attention_pattern") {
      return {
        ...prompt,
        label: "Attention and organization earlier in life",
        options: [
          "Longstanding since childhood or teen years",
          "Present for many adult years",
          "Mainly changed in recent years",
          "Mainly appears under high stress",
          "Unsure"
        ]
      };
    }
    if (prompt.id === "setting_spread") {
      return {
        ...prompt,
        options: [
          "Across work, home, and relationships",
          "Mostly at work",
          "Mostly at home",
          "Mostly during poor sleep or high load",
          "Only in unusual stress",
          "Unsure"
        ]
      };
    }
    return prompt;
  });

export function itemsForSection(sectionId: string): SpineItem[] {
  const section = ASSESSMENT_SECTIONS.find((candidate) => candidate.id === sectionId);
  if (!section || !section.kernelIds) return [];
  return ACTIVE_SPINE_ITEMS.filter((item) => section.kernelIds!.includes(item.kernelId));
}

export function sectionForItem(item: SpineItem): AssessmentSection | undefined {
  return ASSESSMENT_SECTIONS.find((section) => (section.kernelIds || []).includes(item.kernelId));
}

export function sectionIndex(sectionId: string): number {
  return ASSESSMENT_SECTIONS.findIndex((section) => section.id === sectionId);
}

export function firstItemIndexForSection(sectionId: string): number {
  const sectionItems = itemsForSection(sectionId);
  if (!sectionItems.length) return 0;
  return ACTIVE_SPINE_ITEMS.findIndex((item) => item.id === sectionItems[0].id);
}

export function sectionStats(sectionId: string, scoredResponses: ScoredResponses = {}): { answered: number; total: number; complete: boolean } {
  const items = itemsForSection(sectionId);
  const answered = items.filter((item) => scoredResponses[item.id] !== undefined).length;
  return {
    answered,
    total: items.length,
    complete: answered === items.length
  };
}

export function firstUnansweredIndexForSection(sectionId: string, scoredResponses: ScoredResponses = {}): number {
  const items = itemsForSection(sectionId);
  const firstUnanswered = items.find((item) => scoredResponses[item.id] === undefined);
  if (firstUnanswered) {
    return ACTIVE_SPINE_ITEMS.findIndex((item) => item.id === firstUnanswered.id);
  }
  return firstItemIndexForSection(sectionId);
}

export function nextIncompleteSectionId(currentSectionId: string, scoredResponses: ScoredResponses = {}): string | null {
  const startIndex = Math.max(0, sectionIndex(currentSectionId));
  const ordered = [
    ...ASSESSMENT_SECTIONS.slice(startIndex + 1),
    ...ASSESSMENT_SECTIONS.slice(0, startIndex + 1)
  ];
  return ordered.find((section) => !sectionStats(section.id, scoredResponses).complete)?.id ?? null;
}
