import { SAFETY_ITEMS, SPINE_ITEMS } from "./spine.js";

const FUNCTION_ORDER = ["Signal", "Cost", "Discriminator", "Modifiability"];

function valueFor(responses, id) {
  const value = Number(responses?.[id]);
  return Number.isFinite(value) ? Math.max(0, Math.min(4, value)) : 0;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function statusFor(total) {
  if (total >= 12) return "High signal";
  if (total >= 7) return "Moderate signal";
  return "Low signal";
}

function kernelNarrative(kernelScore) {
  if (kernelScore.total >= 12 && kernelScore.cost >= 3) {
    return "High signal with visible functional cost.";
  }
  if (kernelScore.total >= 12 && kernelScore.modifiability >= 3) {
    return "High signal with a useful lever to test.";
  }
  if (kernelScore.total >= 7) {
    return "Moderate signal worth tracking across the next month.";
  }
  return "Lower signal in this pass.";
}

export function scoreAssessment(scoredResponses = {}, safetyResponses = {}) {
  const grouped = new Map();

  SPINE_ITEMS.forEach((item) => {
    if (!grouped.has(item.kernelId)) {
      grouped.set(item.kernelId, {
        kernelId: item.kernelId,
        kernel: item.kernel,
        domain: item.domain,
        items: [],
        evidenceThemes: new Set()
      });
    }
    const group = grouped.get(item.kernelId);
    group.items.push(item);
    item.evidenceThemes.forEach((theme) => group.evidenceThemes.add(theme));
  });

  const kernelScores = [...grouped.values()].map((group) => {
    const byFunction = {};
    FUNCTION_ORDER.forEach((functionName) => {
      const item = group.items.find((candidate) => candidate.function === functionName);
      byFunction[functionName] = item ? valueFor(scoredResponses, item.id) : 0;
    });
    const total = Object.values(byFunction).reduce((sum, value) => sum + value, 0);
    const score = {
      kernelId: group.kernelId,
      kernel: group.kernel,
      domain: group.domain,
      signal: byFunction.Signal,
      cost: byFunction.Cost,
      discriminator: byFunction.Discriminator,
      modifiability: byFunction.Modifiability,
      total,
      average: round(total / 4),
      status: statusFor(total),
      narrative: "",
      evidenceThemes: [...group.evidenceThemes]
    };
    score.narrative = kernelNarrative(score);
    return score;
  });

  const cognition = kernelScores.filter((score) => score.domain === "Cognition");
  const chemistry = kernelScores.filter((score) => score.domain === "Chemistry");
  const highCost = (score) => score.signal + score.cost;
  const topCognitionBottlenecks = [...cognition].sort((a, b) => highCost(b) - highCost(a) || b.total - a.total).slice(0, 3);
  const topChemistryAmplifiers = [...chemistry].sort((a, b) => highCost(b) - highCost(a) || b.total - a.total).slice(0, 3);
  const topModifiabilityLevers = kernelScores
    .filter((score) => score.modifiability >= 3)
    .sort((a, b) => b.total - a.total || b.modifiability - a.modifiability)
    .slice(0, 4);

  const cognitionDisc = mean(cognition.map((score) => score.discriminator));
  const chemistryDisc = mean(chemistry.map((score) => score.discriminator));
  const mixedPattern = Math.abs(cognitionDisc - chemistryDisc) < 0.5;
  const driverConfidence = {
    cognitionLed: round((cognitionDisc / 4) * 100, 0),
    chemistryLed: round((chemistryDisc / 4) * 100, 0),
    mixedPattern,
    interpretation: mixedPattern
      ? "Cognition and body-state signals are close; interpret the pattern as layered."
      : cognitionDisc > chemistryDisc
        ? "Cognition-led signals are more prominent in this pass."
        : "Chemistry and recovery signals are more prominent in this pass."
  };

  const safetyFlags = SAFETY_ITEMS
    .map((item) => ({ ...item, value: valueFor(safetyResponses, item.id) }))
    .filter((item) => item.value >= 2);

  return {
    kernelScores,
    topCognitionBottlenecks,
    topChemistryAmplifiers,
    topModifiabilityLevers,
    driverConfidence,
    safetyFlags,
    completion: {
      answered: Object.keys(scoredResponses).filter((id) => SPINE_ITEMS.some((item) => item.id === id)).length,
      total: SPINE_ITEMS.length
    }
  };
}

export function reportCardsFor(results) {
  const cards = [
    {
      id: "cognition",
      title: "Top Cognition Bottlenecks",
      tone: "cognition",
      items: results.topCognitionBottlenecks,
      evidenceThemes: ["dimensional-framing", "menopause-cognition", "narrative-intake"]
    },
    {
      id: "chemistry",
      title: "Top Chemistry Amplifiers",
      tone: "chemistry",
      items: results.topChemistryAmplifiers,
      evidenceThemes: ["menopause-specificity", "sleep-recovery"]
    },
    {
      id: "levers",
      title: "Most Promising Levers",
      tone: "levers",
      items: results.topModifiabilityLevers,
      evidenceThemes: ["human-loop", "narrative-intake"]
    }
  ];

  if (results.safetyFlags.length) {
    cards.push({
      id: "safety",
      title: "Private Safety Guidance",
      tone: "safety",
      items: results.safetyFlags.map((flag) => ({
        kernel: flag.flag,
        narrative: "This deserves human review outside the capacity score.",
        total: flag.value,
        status: "Review recommended"
      })),
      evidenceThemes: ["safety-referral"]
    });
  }

  return cards;
}
