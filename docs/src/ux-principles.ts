export interface UxPracticePrinciple {
  id: string;
  label: string;
  sourceIds: string[];
  rule: string;
  appMove: string;
}

export const UX_PRACTICE_PRINCIPLES: UxPracticePrinciple[] = [
  {
    id: "clear-path",
    label: "Clear path",
    sourceIds: ["nhsServiceManual"],
    rule: "Show what happens next, how long it is, and where the user can pause.",
    appMove: "One visible path: context, eight short conversations, narrative, safety check, report."
  },
  {
    id: "progressive-disclosure",
    label: "Progressive disclosure",
    sourceIds: ["niceEvidenceStandards"],
    rule: "Keep the primary task simple and reveal evidence, source notes, and payload details only on request.",
    appMove: "Report cards show the main finding first, with collapsible evidence drawers."
  },
  {
    id: "privacy-first",
    label: "Privacy first",
    sourceIds: ["apaEvaluationModel", "nhsPrivacy"],
    rule: "Explain data handling before sensitive input and separate safety content from generated summaries.",
    appMove: "Local beta answers stay in this browser; private safety flags never enter the AI summary payload."
  },
  {
    id: "accessible-controls",
    label: "Accessible controls",
    sourceIds: ["nhsAccessibility"],
    rule: "Use large targets, readable labels, visible states, and plain language.",
    appMove: "Frequency buttons are large, labeled, keyboard-friendly controls with stable dimensions."
  },
  {
    id: "evidence-without-overload",
    label: "Evidence without overload",
    sourceIds: ["apaEvaluationModel", "niceEvidenceStandards"],
    rule: "Make the evidence basis visible without turning the assessment into a literature review.",
    appMove: "A compact best-practice note and report-level source drawers carry the evidence layer."
  }
];

export function uxPrincipleSourceIds(): string[] {
  return [...new Set(UX_PRACTICE_PRINCIPLES.flatMap((principle) => principle.sourceIds))];
}
