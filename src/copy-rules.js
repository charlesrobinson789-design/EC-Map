export const COPY_RULES = [
  {
    id: "no-clinical-validation-claim",
    pattern: /\b(clinically validated|validated assessment|validated diagnostic|diagnostic tool)\b/i,
    message: "Do not claim clinical validation or diagnostic status."
  },
  {
    id: "no-diagnosis-promise",
    pattern: /\b(diagnoses adhd|diagnoses menopause|diagnoses anxiety|diagnoses depression|your diagnosis is)\b/i,
    message: "Do not produce diagnosis promises."
  },
  {
    id: "no-treatment-directive",
    pattern: /\b(you should start hormone|you should stop hormone|we recommend hormone therapy|treatment recommendation)\b/i,
    message: "Do not give medical treatment directives."
  },
  {
    id: "no-medical-certainty",
    pattern: /\b(medical certainty|clinically proven|guaranteed result|confirms menopause|rules out menopause|rule out adhd|rules out adhd)\b/i,
    message: "Do not imply medical certainty."
  },
  {
    id: "no-dismissive-differential-language",
    pattern: /\b(not adhd|it's just menopause|it is just menopause|just menopause)\b/i,
    message: "Do not dismiss ADHD or menopause as a single-cause explanation."
  },
  {
    id: "no-psychnow-copy",
    pattern: /\b(bringing patient stories to light|two months of clinical understanding|chapter illuminates|fillm)\b/i,
    message: "Do not reuse PsychNow product names or copy."
  }
];

export function findCopyRuleViolations(text) {
  return COPY_RULES
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => ({ id: rule.id, message: rule.message }));
}
