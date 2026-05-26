import { SPINE_ITEMS } from "./spine.js";

export const ASSESSMENT_SECTIONS = [
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
    voiceGoal: "Separate memory slips from priority overload and capture the functional cost."
  },
  {
    id: "time-switching",
    title: "Time and Switching",
    shortTitle: "Time",
    subtitle: "Time estimation, transitions, interruptions, and context switching.",
    kernelIds: ["C5", "C6"],
    voiceGoal: "Listen for time blindness, transition cost, and whether external structure changes the pattern."
  },
  {
    id: "load-recovery",
    title: "Load and Cognitive Recovery",
    shortTitle: "Load",
    subtitle: "Emotion under demand and recovery after overload.",
    kernelIds: ["C7", "C8"],
    voiceGoal: "Check whether emotion is the problem, or the signal that cognitive load has crossed capacity."
  },
  {
    id: "sleep-hormones",
    title: "Sleep and Hormonal Variability",
    shortTitle: "Sleep",
    subtitle: "Restoration, hormone-window patterns, and midlife variability.",
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

export function itemsForSection(sectionId) {
  const section = ASSESSMENT_SECTIONS.find((candidate) => candidate.id === sectionId);
  if (!section) return [];
  return SPINE_ITEMS.filter((item) => section.kernelIds.includes(item.kernelId));
}

export function sectionForItem(item) {
  return ASSESSMENT_SECTIONS.find((section) => section.kernelIds.includes(item.kernelId));
}

export function sectionIndex(sectionId) {
  return ASSESSMENT_SECTIONS.findIndex((section) => section.id === sectionId);
}

export function firstItemIndexForSection(sectionId) {
  const sectionItems = itemsForSection(sectionId);
  if (!sectionItems.length) return 0;
  return SPINE_ITEMS.findIndex((item) => item.id === sectionItems[0].id);
}

export function sectionStats(sectionId, scoredResponses = {}) {
  const items = itemsForSection(sectionId);
  const answered = items.filter((item) => scoredResponses[item.id] !== undefined).length;
  return {
    answered,
    total: items.length,
    complete: answered === items.length
  };
}

export function firstUnansweredIndexForSection(sectionId, scoredResponses = {}) {
  const items = itemsForSection(sectionId);
  const firstUnanswered = items.find((item) => scoredResponses[item.id] === undefined);
  if (firstUnanswered) {
    return SPINE_ITEMS.findIndex((item) => item.id === firstUnanswered.id);
  }
  return firstItemIndexForSection(sectionId);
}

export function nextIncompleteSectionId(currentSectionId, scoredResponses = {}) {
  const startIndex = Math.max(0, sectionIndex(currentSectionId));
  const ordered = [
    ...ASSESSMENT_SECTIONS.slice(startIndex + 1),
    ...ASSESSMENT_SECTIONS.slice(0, startIndex + 1)
  ];
  return ordered.find((section) => !sectionStats(section.id, scoredResponses).complete)?.id ?? null;
}
