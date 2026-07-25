import { CORE_ADAPTIVE_CLARIFIERS } from "./followups.js";
import { ACTIVE_CONTEXT_PROMPTS, ACTIVE_SPINE_ITEMS, PAUSED_HORMONAL_ASSESSMENT } from "./sections.js";
import { SPINE_ITEMS } from "./spine.js";
import { AssessmentSession } from "./types.js";

export const CORE_PROFILE_VERSION = "core-seven-v1";

export function normalizeCoreSession(candidate: Partial<AssessmentSession> = {}, defaults: Partial<AssessmentSession> = {}): AssessmentSession {
  const next: AssessmentSession = { ...defaults, ...candidate };
  const activeItemIds = new Set(ACTIVE_SPINE_ITEMS.map((item) => item.id));
  const activeClarifierIds = new Set(CORE_ADAPTIVE_CLARIFIERS.map((item) => item.id));

  if (candidate.assessmentProfileVersion !== CORE_PROFILE_VERSION) {
    const legacyItem = SPINE_ITEMS[Number(candidate.itemIndex) || 0];
    const migratedIndex = ACTIVE_SPINE_ITEMS.findIndex((item) => item.id === legacyItem?.id);
    next.itemIndex = migratedIndex >= 0 ? migratedIndex : 0;
    if (migratedIndex < 0 && next.view === "assessment") next.view = "sections";
  }

  next.assessmentProfileVersion = CORE_PROFILE_VERSION;
  next.activeSectionId = next.activeSectionId === PAUSED_HORMONAL_ASSESSMENT.id ? null : next.activeSectionId;
  next.lastCompletedSectionId = next.lastCompletedSectionId === PAUSED_HORMONAL_ASSESSMENT.id ? null : next.lastCompletedSectionId;
  next.contextResponses = Object.fromEntries(
    Object.entries(next.contextResponses ?? {}).filter(([id, value]) => {
      const prompt = ACTIVE_CONTEXT_PROMPTS.find((candidatePrompt) => candidatePrompt.id === id);
      return prompt?.options?.includes(value as string);
    })
  );
  next.scoredResponses = Object.fromEntries(
    Object.entries(next.scoredResponses ?? {}).filter(([id]) => activeItemIds.has(id))
  ) as Record<string, number>;
  next.adaptiveResponses = Object.fromEntries(
    Object.entries(next.adaptiveResponses ?? {}).filter(([id]) => activeClarifierIds.has(id))
  ) as Record<string, string | string[]>;
  return next;
}
