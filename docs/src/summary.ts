import { AssessmentSession, ScoringResults, KernelScore } from "./types.js";

export function buildSummaryInput(session: AssessmentSession, results: ScoringResults): Record<string, any> {
  return {
    context: session.contextResponses,
    adaptiveFollowups: session.adaptiveResponses,
    narrative: session.narrativeResponses,
    answerConfidence: session.validityResponses,
    driverConfidence: results.driverConfidence,
    topCognitionBottlenecks: results.topCognitionBottlenecks.map(publicKernel),
    topChemistryAmplifiers: results.topChemistryAmplifiers.map(publicKernel),
    topModifiabilityLevers: results.topModifiabilityLevers.map(publicKernel),
    constraints: [
      "No diagnoses",
      "No treatment recommendations",
      "No crisis handling by AI",
      "Do not mention private safety flags",
      "Use construct-informed and experimental language"
    ]
  };
}

function publicKernel(kernelScore: KernelScore): Record<string, any> {
  return {
    kernelId: kernelScore.kernelId,
    kernel: kernelScore.kernel,
    domain: kernelScore.domain,
    status: kernelScore.status,
    total: kernelScore.total,
    signal: kernelScore.signal,
    cost: kernelScore.cost,
    modifiability: kernelScore.modifiability
  };
}

export function draftPlainLanguageSummary(session: AssessmentSession, results: ScoringResults): string {
  const topCognition = results.topCognitionBottlenecks[0]?.kernel ?? "cognition load";
  const topChemistry = results.topChemistryAmplifiers[0]?.kernel ?? "body-state load";
  const lever = results.topModifiabilityLevers[0]?.kernel ?? "a small external support";
  const timeline = session.contextResponses?.timeline ? ` Your timeline note was "${session.contextResponses.timeline}."` : "";

  return [
    "Your EC Map points to a layered capacity pattern rather than a single label.",
    `The strongest cognition signal in this pass is ${topCognition}, while the strongest chemistry signal is ${topChemistry}.`,
    "The interpretation keeps longstanding cognition patterns and current body-state or context amplifiers visible at the same time.",
    `A practical first experiment may be built around ${lever}, because you endorsed at least one modifiable support there.`,
    results.driverConfidence.interpretation,
    timeline
  ].join(" ");
}
