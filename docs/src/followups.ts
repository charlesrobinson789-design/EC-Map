import { scoreAssessment } from "./scoring.js";
import { AdaptiveClarifier, ScoredResponses } from "./types.js";

export interface ValidityItem {
  id: string;
  prompt: string;
}

export const ADAPTIVE_CLARIFIERS: AdaptiveClarifier[] = [
  {
    id: "A1",
    kernelId: "C3",
    title: "Working Memory",
    prompt: "Which factors most often make memory gaps worse? Select all that apply.",
    multi: true,
    options: ["Interruptions", "Poor sleep", "Skipped meals", "Stress load", "Body-state timing", "Unclear priorities", "Medication or substance timing", "No clear pattern"]
  },
  {
    id: "A2",
    kernelId: "C1",
    title: "Activation",
    prompt: "Which supports help you begin? Select all that apply.",
    multi: true,
    options: ["Urgency", "Accountability", "Another person present", "Clear first step", "Movement", "Medication timing", "Caffeine timing", "Nothing reliable"]
  },
  {
    id: "A3",
    kernelId: "C2",
    title: "Attention",
    prompt: "Where does focus improve? Select all that apply.",
    multi: true,
    options: ["Alone", "With another person nearby", "Low-noise setting", "Written task list", "Short timed block", "No reliable setting"]
  },
  {
    id: "A4",
    kernelId: "C5",
    title: "Time Estimation",
    prompt: "Where do time-estimation problems show up? Select all that apply.",
    multi: true,
    options: ["New tasks", "Familiar tasks", "Leaving the house", "Meetings or appointments", "Multi-step projects", "Mostly when energy is low"]
  },
  {
    id: "A5",
    kernelId: "H1",
    title: "Sleep Restoration",
    prompt: "When sleep is more consolidated for two or more nights, what changes the next day? Select all that apply.",
    multi: true,
    options: ["Focus improves", "Mood steadies", "Word-finding improves", "Energy lasts longer", "No noticeable change", "Cannot remember a good stretch"]
  },
  {
    id: "A6",
    kernelId: "H2",
    title: "Hormonal Variability",
    prompt: "What pattern do lower-functioning days seem to follow? Select all that apply.",
    multi: true,
    options: ["Cycle-linked", "Perimenopause or menopause transition", "Hot flashes or night sweats", "Poor sleep", "Stress load", "Irregular or unclear"]
  },
  {
    id: "A7",
    kernelId: "H4",
    title: "Stress Physiology",
    prompt: "When does body activation carry into evening or sleep? Select all that apply.",
    multi: true,
    options: ["After conflict", "After deadline pressure", "After caregiving load", "After too much stimulation", "Most evenings", "Rarely"]
  },
  {
    id: "A8",
    kernelId: "C7",
    title: "Emotion Under Load",
    prompt: "When are emotion-under-load reactions most likely? Select all that apply.",
    multi: true,
    options: ["During high cognitive demand", "After poor sleep", "When interrupted", "During body-state shifts", "When hungry or depleted", "No clear pattern"]
  },
  {
    id: "A9",
    kernelId: ["C8", "H8"],
    title: "Recovery",
    prompt: "What best describes the recovery change? Select all that apply.",
    multi: true,
    options: ["Recent, within 1-3 years", "Long-standing", "Worse than before", "Mostly physical", "Mostly mental", "Unclear"]
  },
  {
    id: "A10",
    trigger: "mixed",
    title: "Pattern Split",
    prompt: "Which constraints feel active right now? Select all that apply.",
    multi: true,
    options: ["Longstanding wiring", "Body-state change", "Current context or role load", "Sleep and recovery", "Medication or substance timing", "Different by domain"]
  }
];

const PAUSED_KERNEL_IDS = new Set(["H1", "H2"]);
export const PAUSED_HORMONAL_CLARIFIERS: AdaptiveClarifier[] = ADAPTIVE_CLARIFIERS.filter((clarifier) => {
  const kernelIds = clarifier.kernelId ? (Array.isArray(clarifier.kernelId) ? clarifier.kernelId : [clarifier.kernelId]) : [];
  return kernelIds.some((kernelId) => PAUSED_KERNEL_IDS.has(kernelId));
});
export const CORE_ADAPTIVE_CLARIFIERS: AdaptiveClarifier[] = ADAPTIVE_CLARIFIERS.filter(
  (clarifier) => !PAUSED_HORMONAL_CLARIFIERS.some((paused) => paused.id === clarifier.id)
);

export const VALIDITY_ITEMS: ValidityItem[] = [
  {
    id: "V1",
    prompt: "My answers reflect my typical functioning over the past month, not a single recent day."
  },
  {
    id: "V2",
    prompt: "I had enough focus and energy today to answer accurately."
  },
  {
    id: "V3",
    prompt: "I may have answered based on a recent bad stretch rather than my usual pattern."
  },
  {
    id: "V4",
    prompt: "My answers may understate the difficulty because I am used to compensating without noticing."
  }
];

export function activeClarifiers(scoredResponses: ScoredResponses = {}): AdaptiveClarifier[] {
  const results = scoreAssessment(scoredResponses, {});
  const byKernel = new Map(results.kernelScores.map((score) => [score.kernelId, score]));
  return CORE_ADAPTIVE_CLARIFIERS.filter((clarifier) => {
    if (clarifier.trigger === "mixed") return results.driverConfidence.mixedPattern;
    const kernelIds = clarifier.kernelId ? (Array.isArray(clarifier.kernelId) ? clarifier.kernelId : [clarifier.kernelId]) : [];
    return kernelIds.some((kernelId) => (byKernel.get(kernelId)?.average ?? 0) >= 3);
  });
}

export function validitySummary(validityResponses: Record<string, number> = {}): { confidence: string; caveats: string[] } {
  const value = (id: string) => Number(validityResponses[id] ?? 0);
  const caveats: string[] = [];
  if (value("V1") <= 1) caveats.push("Answers may reflect a short-term state more than a full-month pattern.");
  if (value("V2") <= 1) caveats.push("Answer confidence may be lower because focus or energy was limited during completion.");
  if (value("V3") >= 3) caveats.push("Recent strain may be pulling scores upward.");
  if (value("V4") >= 3) caveats.push("Long-practiced compensation may be hiding some difficulty.");
  return {
    confidence: caveats.length === 0 ? "Clear enough to interpret" : caveats.length === 1 ? "Interpret with one caveat" : "Interpret with added caution",
    caveats
  };
}
