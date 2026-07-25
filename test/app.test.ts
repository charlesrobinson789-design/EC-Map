import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function readSrcFile(basename: string) {
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    try {
      return await readFile(new URL(`../src/${basename}${ext}`, import.meta.url), "utf8");
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }
  if (basename === "app") {
    let combined = "";
    const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
    async function scan(dir: string) {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scan(full);
          } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
            combined += "\n" + (await readFile(full, "utf8"));
          }
        }
      } catch {}
    }
    await scan(path.join(srcDir, "components"));
    await scan(path.join(srcDir, "app"));
    if (combined.trim()) return combined;
  }
  throw new Error(`Could not find src/${basename}`);
}

import { normalizeAssessmentPayload, ValidationError } from "../server/assessment-contract.js";
import { MOCK_PATIENTS } from "../server/mock-patients.js";
import { findCopyRuleViolations } from "../src/copy-rules.js";
import { allEvidenceSources, getSourcesForThemes, getThemes } from "../src/evidence.js";
import { activeClarifiers, ADAPTIVE_CLARIFIERS, PAUSED_HORMONAL_CLARIFIERS, validitySummary } from "../src/followups.js";
import {
  buildCoachReview,
  CLAIM_TYPES,
  buildCapacitySignature,
  buildConversationPrompts,
  buildDifferentialLens,
  buildExperiments,
  buildSectionSummaries
} from "../src/report-model.js";
import { scoreAssessment } from "../src/scoring.js";
import { CORE_PROFILE_VERSION, normalizeCoreSession } from "../src/session-profile.js";
import {
  ACTIVE_CONTEXT_PROMPTS,
  ACTIVE_SPINE_ITEMS,
  ASSESSMENT_SECTIONS,
  firstUnansweredIndexForSection,
  itemsForSection,
  nextIncompleteSectionId,
  PAUSED_HORMONAL_ASSESSMENT,
  PAUSED_HORMONAL_ITEMS,
  sectionStats
} from "../src/sections.js";
import { buildSummaryInput } from "../src/summary.js";
import { SAFETY_ITEMS, SPINE_ITEMS } from "../src/spine.js";
import { CONCIERGE_METHOD_STEPS, SOURCE_BLUEPRINTS, methodSourceIds, sourceBlueprintIds } from "../src/source-blueprints.js";
import { UX_PRACTICE_PRINCIPLES, uxPrincipleSourceIds } from "../src/ux-principles.js";

function sessionWithResponses(scoredResponses: Record<string, any>, overrides: Record<string, any> = {}) {
  return {
    contextResponses: {
      role_type: "Heavy-output knowledge work",
      meeting_load: "5 to 15 hours",
      sleep_stability: "Variable",
      lifelong_attention_pattern: "Longstanding since childhood or teen years",
      setting_spread: "Across work, home, and relationships",
      timeline: "Has fluctuated"
    },
    scoredResponses,
    adaptiveResponses: overrides.adaptiveResponses ?? {},
    narrativeResponses: {
      compensating_for: "Holding a complex life together while capacity varies.",
      public_private_cost: "Can perform publicly and lose recovery time privately."
    },
    validityResponses: overrides.validityResponses ?? { V1: 4, V2: 4, V3: 0, V4: 0 },
    safetyResponses: overrides.safetyResponses ?? { S1: 0, S2: 0, S3: 0, S4: 0 }
  };
}

function allCoachPhrases(coachReview: any) {
  return [
    ...coachReview.sessionReadiness.caveats,
    coachReview.clientContext.compensationBurden,
    ...coachReview.coachPriorities,
    ...coachReview.verificationQuestions,
    ...coachReview.referralConsiderations,
    ...coachReview.claimCaveats
  ];
}

test("loads the curated 64-item spine", () => {
  assert.equal(SPINE_ITEMS.length, 64);
  assert.equal(SPINE_ITEMS.filter((item) => item.domain === "Cognition").length, 32);
  assert.equal(SPINE_ITEMS.filter((item) => item.domain === "Chemistry").length, 32);
  assert.ok(SPINE_ITEMS.every((item) => item.prompt && item.kernel && item.function));
});

test("activates seven shared assessments and preserves the paused hormonal source module", () => {
  assert.equal(ASSESSMENT_SECTIONS.length, 7);
  const coveredIds = new Set<string>();
  ASSESSMENT_SECTIONS.forEach((section) => {
    const items = itemsForSection(section.id);
    assert.equal(items.length, 8);
    items.forEach((item) => coveredIds.add(item.id));
  });
  assert.equal(coveredIds.size, ACTIVE_SPINE_ITEMS.length);
  assert.equal(ACTIVE_SPINE_ITEMS.length, 56);
  assert.equal(PAUSED_HORMONAL_ASSESSMENT.status, "paused");
  assert.equal(PAUSED_HORMONAL_ITEMS.length, 8);
  assert.equal(PAUSED_HORMONAL_CLARIFIERS.length, 2);
  assert.equal(ACTIVE_CONTEXT_PROMPTS.some((prompt) => prompt.id === "transition_context"), false);
  assert.equal(/menopause|perimenopause|hormonal|midlife/i.test(JSON.stringify(ACTIVE_CONTEXT_PROMPTS)), false);
  assert.equal(/menopause-specificity|menopause-cognition|adhd-differential/.test(JSON.stringify(ACTIVE_SPINE_ITEMS)), false);
  assert.equal(new Set([...coveredIds, ...PAUSED_HORMONAL_ITEMS.map((item) => item.id)]).size, SPINE_ITEMS.length);

  const responses = Object.fromEntries(itemsForSection(ASSESSMENT_SECTIONS[0].id).map((item) => [item.id, 2]));
  assert.deepEqual(sectionStats(ASSESSMENT_SECTIONS[0].id, responses), { answered: 8, total: 8, complete: true });
  assert.equal(nextIncompleteSectionId(ASSESSMENT_SECTIONS[0].id, responses), ASSESSMENT_SECTIONS[1].id);
  assert.equal(firstUnansweredIndexForSection(ASSESSMENT_SECTIONS[1].id, responses), 8);
});

test("assessment copy avoids vague carryover wording and generic everyone-prompts", () => {
  const copy = JSON.stringify({
    spine: SPINE_ITEMS,
    followups: ADAPTIVE_CLARIFIERS,
    sections: ASSESSMENT_SECTIONS,
    safety: SAFETY_ITEMS
  });
  [
    "low-hormone window",
    "hormonally vulnerable window",
    "these slips",
    "these reactions",
    "These shifts",
    "these body symptoms",
    "protected uninterrupted blocks",
    "capacity drops",
    "After several better nights",
    "using alcohol, cannabis, sedatives, stimulants",
    "time blindness",
    "hormone-window",
    "crossed capacity"
  ].forEach((phrase) => {
    assert.equal(copy.includes(phrase), false, `${phrase} should not appear in assessment copy`);
  });
});

test("adaptive clarifiers support multiple selected contributors", () => {
  assert.ok(ADAPTIVE_CLARIFIERS.length > 0);
  assert.ok(ADAPTIVE_CLARIFIERS.every((clarifier) => clarifier.multi === true));
  assert.ok(ADAPTIVE_CLARIFIERS.every((clarifier) => /Select all that apply\./.test(clarifier.prompt)));
});

test("evidence registry maps user-facing themes to sources", () => {
  const themes = getThemes(["menopause-specificity", "adhd-differential", "voice-ready-intake", "safety-referral"]);
  assert.equal(themes.length, 4);
  const sources = getSourcesForThemes(["menopause-specificity", "adhd-differential", "voice-ready-intake", "safety-referral"]);
  assert.ok(sources.some((source) => source.url.includes("menopause.org")));
  assert.ok(sources.some((source) => source.url.includes("nice.org.uk/guidance/ng87")));
  assert.ok(sources.some((source) => source.url.includes("github.com/OpenWhispr")));
  assert.ok(sources.some((source) => source.url.includes("988lifeline.org")));
  assert.ok(allEvidenceSources().length >= 16);
});

test("concierge source blueprints map external code patterns to app moves", () => {
  assert.equal(SOURCE_BLUEPRINTS.length, 8);
  assert.ok(SOURCE_BLUEPRINTS.every((source) => source.pattern && source.appMove && source.sourceId));
  assert.equal(CONCIERGE_METHOD_STEPS.length, 6);
  const knownSources = new Set(allEvidenceSources().map((source) => source.id));
  assert.ok(sourceBlueprintIds().every((sourceId) => knownSources.has(sourceId)));
  assert.ok(methodSourceIds().every((sourceId) => knownSources.has(sourceId)));
});

test("lean UX principles are source-backed and implementation-oriented", () => {
  assert.equal(UX_PRACTICE_PRINCIPLES.length, 5);
  assert.ok(UX_PRACTICE_PRINCIPLES.every((principle) => principle.rule && principle.appMove));
  const sourceIds = uxPrincipleSourceIds();
  assert.ok(sourceIds.includes("apaEvaluationModel"));
  assert.ok(sourceIds.includes("niceEvidenceStandards"));
  assert.ok(sourceIds.includes("nhsServiceManual"));
  const knownSources = new Set(allEvidenceSources().map((source) => source.id));
  assert.ok(sourceIds.every((sourceId) => knownSources.has(sourceId)));
});

test("mock patients cover female and male shared-core persistence testing", () => {
  assert.ok(MOCK_PATIENTS.length >= 6);
  assert.ok(MOCK_PATIENTS.some((patient) => /Longstanding|ADHD/i.test(patient.adhdContext)));
  assert.ok(MOCK_PATIENTS.some((patient) => patient.sexProfile === "female"));
  assert.ok(MOCK_PATIENTS.some((patient) => patient.sexProfile === "male"));
  assert.ok(MOCK_PATIENTS.every((patient) => patient.id && patient.displayName && patient.profileNotes));
});

test("assessment save contract requires patient and session payload", () => {
  const normalized = normalizeAssessmentPayload({
    patientId: "amelia-layered",
    status: "completed",
    dataUseAcknowledgement: {
      mockDataOnly: true,
      scope: "prototype-preview",
      acknowledgedAt: "2026-05-26T09:59:00.000Z"
    },
    session: {
      scoredResponses: { "C1-Sig": 4 },
      safetyResponses: { S1: 4, S2: 0 },
      completedAt: "2026-05-26T10:00:00.000Z"
    },
    report: {
      summary: "Functional pattern summary",
      results: {
        driverConfidence: { interpretation: "Layered" },
        safetyFlags: [{ id: "S1", value: 4, flag: "Private safety flag" }]
      }
    },
    versions: { report: "client-coach-report-v1" }
  });

  assert.equal(normalized.patientId, "amelia-layered");
  assert.equal(normalized.status, "completed");
  assert.equal(normalized.completedAt, "2026-05-26T10:00:00.000Z");
  assert.deepEqual(normalized.versions, { report: "client-coach-report-v1" });
  assert.deepEqual(normalized.dataUseAcknowledgement, {
    mockDataOnly: true,
    scope: "prototype-preview",
    acknowledgedAt: "2026-05-26T09:59:00.000Z"
  });
  assert.equal("safetyResponses" in normalized.session, false);
  assert.deepEqual(normalized.session.privateSafety, { redacted: true, answeredCount: 2 });
  assert.equal("safetyFlags" in normalized.report.results, false);
  assert.deepEqual(normalized.report.results.privateSafety, { redacted: true, flagCount: 1 });

  assert.throws(() => normalizeAssessmentPayload({ patientId: "", session: {} }), ValidationError);
  assert.throws(() => normalizeAssessmentPayload({ patientId: "amelia-layered", session: {} }), ValidationError);
  assert.throws(
    () =>
      normalizeAssessmentPayload({
        patientId: "not-a-seeded-mock",
        session: {},
        dataUseAcknowledgement: {
          mockDataOnly: true,
          scope: "prototype-preview"
        }
      }),
    ValidationError
  );
  assert.throws(
    () =>
      normalizeAssessmentPayload({
        patientId: "amelia-layered",
        session: {},
        dataUseAcknowledgement: { mockDataOnly: false, scope: "prototype-preview" }
      }),
    ValidationError
  );
});

test("scores deterministically and separates safety flags", () => {
  const scoredResponses = Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 0]));
  ["C1-Sig", "C1-Cost", "C1-Disc", "C1-Mod", "H3-Sig", "H3-Cost"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const safetyResponses = Object.fromEntries(SAFETY_ITEMS.map((item) => [item.id, 0]));
  safetyResponses.S1 = 2;

  const results = scoreAssessment(scoredResponses, safetyResponses);
  assert.equal(results.topCognitionBottlenecks[0].kernel, "Activation");
  assert.equal(results.safetyFlags.length, 1);
  assert.equal(results.safetyFlags[0].id, "S1");
});

test("paused hormonal responses cannot change shared-core scoring", () => {
  const activeResponses = Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 2]));
  const withPausedResponses = {
    ...activeResponses,
    ...Object.fromEntries(PAUSED_HORMONAL_ITEMS.map((item) => [item.id, 4]))
  };

  assert.deepEqual(scoreAssessment(withPausedResponses, {}), scoreAssessment(activeResponses, {}));
});

test("legacy sessions migrate by item id and remove paused-module data", () => {
  const legacyPausedIndex = SPINE_ITEMS.findIndex((item) => item.id === PAUSED_HORMONAL_ITEMS[0].id);
  const normalizedPaused = normalizeCoreSession({
    view: "assessment",
    itemIndex: legacyPausedIndex,
    activeSectionId: PAUSED_HORMONAL_ASSESSMENT.id,
    contextResponses: {
      transition_context: "Perimenopausal",
      setting_spread: "Mostly during hormonal or sleep disruption"
    },
    scoredResponses: { "C1-Sig": 2, [PAUSED_HORMONAL_ITEMS[0].id]: 4, unknown: 4 },
    adaptiveResponses: { A1: ["Interruptions"], A5: ["Focus improves"], A6: ["Poor sleep"], unknown: ["test"] }
  });

  assert.equal(normalizedPaused.assessmentProfileVersion, CORE_PROFILE_VERSION);
  assert.equal(normalizedPaused.view, "sections");
  assert.equal(normalizedPaused.itemIndex, 0);
  assert.equal(normalizedPaused.activeSectionId, null);
  assert.deepEqual(normalizedPaused.contextResponses, {});
  assert.deepEqual(normalizedPaused.scoredResponses, { "C1-Sig": 2 });
  assert.deepEqual(normalizedPaused.adaptiveResponses, { A1: ["Interruptions"] });

  const legacyActiveItem = SPINE_ITEMS.find((item) => item.id === "H3-Sig")!;
  const normalizedActive = normalizeCoreSession({
    view: "assessment",
    itemIndex: SPINE_ITEMS.findIndex((item) => item.id === legacyActiveItem.id)
  });
  assert.equal(ACTIVE_SPINE_ITEMS[normalizedActive.itemIndex!].id, legacyActiveItem.id);
});

test("adaptive clarifiers trigger only from elevated or mixed patterns", () => {
  const scoredResponses = Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 0]));
  ["C3-Sig", "C3-Cost", "C3-Disc", "C3-Mod"].forEach((id) => {
    scoredResponses[id] = 3;
  });
  const clarifiers = activeClarifiers(scoredResponses);
  assert.ok(clarifiers.some((clarifier) => clarifier.id === "A1"));
  assert.ok(clarifiers.some((clarifier) => clarifier.id === "A10"));
});

test("validity summary records confidence caveats", () => {
  const clean = validitySummary({ V1: 4, V2: 4, V3: 0, V4: 0 });
  assert.equal(clean.confidence, "Clear enough to interpret");
  assert.equal(clean.caveats.length, 0);

  const caveated = validitySummary({ V1: 1, V2: 1, V3: 4, V4: 4 });
  assert.equal(caveated.confidence, "Interpret with added caution");
  assert.equal(caveated.caveats.length, 4);
});

test("report model creates signature, section summaries, experiments, and prompts", () => {
  const scoredResponses = Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 1]));
  ["C1-Sig", "C1-Cost", "C1-Disc", "C1-Mod", "H3-Sig", "H3-Cost", "H3-Mod"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const results = scoreAssessment(scoredResponses, {});
  const validity = validitySummary({ V1: 4, V2: 4, V3: 0, V4: 0 });

  assert.ok(buildCapacitySignature(results).headline.includes("Activation"));
  assert.equal(buildSectionSummaries(results).length, 7);
  assert.ok(buildExperiments(results).length > 0);
  assert.equal(buildConversationPrompts(results, validity).length, 4);
});

test("differential lens separates lifelong and current-state patterns without causal claims", () => {
  const scoredResponses = Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, item.domain === "Cognition" ? 3 : 2]));
  ["H3-Sig", "H3-Cost", "H4-Sig", "H4-Cost"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const session = sessionWithResponses(scoredResponses);
  const results = scoreAssessment(scoredResponses, session.safetyResponses);
  const lens = buildDifferentialLens(session, results);
  const serialized = JSON.stringify(lens);

  assert.ok(/ADHD-consistent|Layered|Current-state/.test(lens.status || ""));
  assert.equal(/menopause|hormonal|rule out|not ADHD/i.test(serialized), false);
  assert.deepEqual(findCopyRuleViolations(serialized), []);
});

test("coach review creates packet data for low, mixed, and high-signal profiles", () => {
  const allowedClaimTypes = new Set(Object.values(CLAIM_TYPES));
  const profiles = [
    Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 0])),
    Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 2])),
    Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, item.id.startsWith("C1") || item.id.startsWith("H3") ? 4 : 1]))
  ];

  profiles.forEach((scoredResponses) => {
    const session = sessionWithResponses(scoredResponses);
    const results = scoreAssessment(scoredResponses, session.safetyResponses);
    const validity = validitySummary(session.validityResponses);
    const coachReview = buildCoachReview(session, results, validity, activeClarifiers(scoredResponses));

    assert.equal(coachReview.sessionReadiness.status, "Ready for coach review");
    assert.equal(coachReview.coachPriorities.length, 4);
    assert.ok(coachReview.verificationQuestions.length >= 3);
    assert.ok(coachReview.evidenceThemes.includes("coach-review"));
    assert.ok(coachReview.evidenceThemes.includes("dimensional-framing"));
    assert.ok(coachReview.evidenceThemes.includes("voice-ready-intake"));
    assert.ok(coachReview.evidenceThemes.includes("digital-health-governance"));
    assert.ok(coachReview.differentialLens.status);
    assert.ok(allCoachPhrases(coachReview).every((item) => allowedClaimTypes.has(item.claimType)));
  });
});

test("coach packet carries caveats, referral routing, evidence links, and bounded claims", async () => {
  const scoredResponses = Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 1]));
  ["C3-Sig", "C3-Cost", "C3-Disc", "C3-Mod", "H4-Sig", "H4-Cost"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const session = sessionWithResponses(scoredResponses, {
    validityResponses: { V1: 1, V2: 1, V3: 4, V4: 4 },
    safetyResponses: { S1: 3, S2: 0, S3: 0, S4: 0 },
    adaptiveResponses: { A1: "Interruptions", A7: "After deadline pressure" }
  });
  const results = scoreAssessment(scoredResponses, session.safetyResponses);
  const validity = validitySummary(session.validityResponses);
  const coachReview = buildCoachReview(session, results, validity, activeClarifiers(scoredResponses));
  const coachText = JSON.stringify(coachReview);
  const coachSources = getSourcesForThemes(coachReview.evidenceThemes);

  assert.ok(coachReview.sessionReadiness.caveats.length >= 2);
  assert.ok(coachReview.referralConsiderations.some((item) => item.claimType === CLAIM_TYPES.referralOriented));
  assert.ok(coachSources.some((source) => source.url.includes("w3.org/TR/WCAG22")));
  assert.ok(coachSources.some((source) => source.url.includes("owasp.org")));
  assert.deepEqual(findCopyRuleViolations(coachText), []);

  const appCopy = await readSrcFile("app");
  assert.ok(appCopy.includes("Coach packet"));
  assert.deepEqual(findCopyRuleViolations(appCopy), []);
});

test("summary payload excludes private safety detail", () => {
  const scoredResponses = Object.fromEntries(ACTIVE_SPINE_ITEMS.map((item) => [item.id, 2]));
  const results = scoreAssessment(scoredResponses, { S1: 4, S4: 3 });
  const payload = buildSummaryInput(
    {
      contextResponses: { timeline: "Has fluctuated" },
      narrativeResponses: { compensating_for: "Remembering everything" },
      safetyResponses: { S1: 4, S4: 3 }
    },
    results
  );
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("S1"), false);
  assert.equal(serialized.includes("S4"), false);
  assert.equal(serialized.includes("safetyFlags"), false);
});

test("copy rules catch unsupported claims and protected-style phrases", async () => {
  assert.ok(findCopyRuleViolations("This clinically validated assessment diagnoses ADHD.").length >= 2);
  assert.ok(findCopyRuleViolations("You have ADHD. Start methylphenidate.").length >= 2);
  assert.ok(findCopyRuleViolations("This proves menopause is the cause. Treat this with estrogen.").length >= 2);
  assert.ok(findCopyRuleViolations("Bringing patient stories to light").length >= 1);
  assert.ok(findCopyRuleViolations("This can rule out ADHD because it is just menopause.").length >= 2);
  assert.equal(findCopyRuleViolations("This functional map is construct-informed and experimental.").length, 0);

  const appCopy = await readSrcFile("app");
  const evidenceCopy = await readSrcFile("evidence");
  const reportCopy = await readSrcFile("report-model");
  const blueprintCopy = await readSrcFile("source-blueprints");
  assert.deepEqual(findCopyRuleViolations(`${appCopy}\n${evidenceCopy}\n${reportCopy}\n${blueprintCopy}`), []);
});
