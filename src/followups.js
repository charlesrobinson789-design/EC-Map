import { scoreAssessment } from "./scoring.js";

export const ADAPTIVE_CLARIFIERS = [
  {
    id: "A1",
    kernelId: "C3",
    title: "Working Memory",
    prompt: "What most often makes memory slips worse?",
    options: ["Interruptions", "Poor sleep", "Skipped meals", "Stress", "Cycle or hormone shift", "Unclear priorities", "Medication change", "Several equally"]
  },
  {
    id: "A2",
    kernelId: "C1",
    title: "Activation",
    prompt: "What most reliably helps you begin?",
    options: ["Urgency", "Accountability", "Another person present", "Medication timing", "Movement", "Caffeine", "Written first step", "Nothing reliable"]
  },
  {
    id: "A3",
    kernelId: "C2",
    title: "Attention",
    prompt: "Does focus improve in environments you control?",
    options: ["Much better alone", "Somewhat better alone", "No difference", "Better with others"]
  },
  {
    id: "A4",
    kernelId: "C5",
    title: "Time Estimation",
    prompt: "Where are time slips most obvious?",
    options: ["Novel tasks", "Familiar tasks", "Both equally", "Depends on energy"]
  },
  {
    id: "A5",
    kernelId: "H1",
    title: "Sleep Restoration",
    prompt: "After several better nights, does daytime functioning change?",
    options: ["Clearly improves", "Some improvement", "No noticeable change", "Cannot remember a good stretch"]
  },
  {
    id: "A6",
    kernelId: "H2",
    title: "Hormonal Variability",
    prompt: "How predictable are lower-capacity windows?",
    options: ["Predictable cycle-linked", "Predictable other pattern", "Irregular", "Unclear"]
  },
  {
    id: "A7",
    kernelId: "H4",
    title: "Stress Physiology",
    prompt: "Does body activation carry into evening or sleep?",
    options: ["Most days", "Some days", "Rarely", "Only after high-stress days"]
  },
  {
    id: "A8",
    kernelId: "C7",
    title: "Emotion Under Load",
    prompt: "Are reactions worse during specific hormonal windows?",
    options: ["Yes, clearly", "Sometimes", "No clear pattern", "Not applicable"]
  },
  {
    id: "A9",
    kernelId: ["C8", "H8"],
    title: "Recovery",
    prompt: "Is the slower recovery recent or long-standing?",
    options: ["Recent, within 1-3 years", "Long-standing", "Has worsened recently", "Unclear"]
  },
  {
    id: "A10",
    trigger: "mixed",
    title: "Pattern Split",
    prompt: "Which constraint feels most true right now?",
    options: ["Wiring", "Body", "Context", "All three roughly equally", "Different by domain"]
  }
];

export const VALIDITY_ITEMS = [
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

export function activeClarifiers(scoredResponses = {}) {
  const results = scoreAssessment(scoredResponses, {});
  const byKernel = new Map(results.kernelScores.map((score) => [score.kernelId, score]));
  return ADAPTIVE_CLARIFIERS.filter((clarifier) => {
    if (clarifier.trigger === "mixed") return results.driverConfidence.mixedPattern;
    const kernelIds = Array.isArray(clarifier.kernelId) ? clarifier.kernelId : [clarifier.kernelId];
    return kernelIds.some((kernelId) => (byKernel.get(kernelId)?.average ?? 0) >= 3);
  });
}

export function validitySummary(validityResponses = {}) {
  const value = (id) => Number(validityResponses[id] ?? 0);
  const caveats = [];
  if (value("V1") <= 1) caveats.push("Answers may reflect a short-term state more than a full-month pattern.");
  if (value("V2") <= 1) caveats.push("Answer confidence may be lower because focus or energy was limited during completion.");
  if (value("V3") >= 3) caveats.push("Recent strain may be pulling scores upward.");
  if (value("V4") >= 3) caveats.push("Long-practiced compensation may be hiding some difficulty.");
  return {
    confidence: caveats.length === 0 ? "Clear enough to interpret" : caveats.length === 1 ? "Interpret with one caveat" : "Interpret with added caution",
    caveats
  };
}
