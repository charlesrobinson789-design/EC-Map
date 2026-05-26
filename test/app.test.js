import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { findCopyRuleViolations } from "../src/copy-rules.js";
import { allEvidenceSources, getSourcesForThemes, getThemes } from "../src/evidence.js";
import { activeClarifiers, validitySummary } from "../src/followups.js";
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
import {
  ASSESSMENT_SECTIONS,
  firstUnansweredIndexForSection,
  itemsForSection,
  nextIncompleteSectionId,
  sectionStats
} from "../src/sections.js";
import { buildSummaryInput } from "../src/summary.js";
import { SAFETY_ITEMS, SPINE_ITEMS } from "../src/spine.js";
import { CONCIERGE_METHOD_STEPS, SOURCE_BLUEPRINTS, methodSourceIds, sourceBlueprintIds } from "../src/source-blueprints.js";
import { UX_PRACTICE_PRINCIPLES, uxPrincipleSourceIds } from "../src/ux-principles.js";

function sessionWithResponses(scoredResponses, overrides = {}) {
  return {
    contextResponses: {
      role_type: "Heavy-output knowledge work",
      meeting_load: "5 to 15 hours",
      sleep_stability: "Variable",
      transition_context: "Perimenopausal",
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

function allCoachPhrases(coachReview) {
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

test("breaks the scored spine into eight voice-sized conversations", () => {
  assert.equal(ASSESSMENT_SECTIONS.length, 8);
  const coveredIds = new Set();
  ASSESSMENT_SECTIONS.forEach((section) => {
    const items = itemsForSection(section.id);
    assert.equal(items.length, 8);
    items.forEach((item) => coveredIds.add(item.id));
  });
  assert.equal(coveredIds.size, SPINE_ITEMS.length);

  const responses = Object.fromEntries(itemsForSection(ASSESSMENT_SECTIONS[0].id).map((item) => [item.id, 2]));
  assert.deepEqual(sectionStats(ASSESSMENT_SECTIONS[0].id, responses), { answered: 8, total: 8, complete: true });
  assert.equal(nextIncompleteSectionId(ASSESSMENT_SECTIONS[0].id, responses), ASSESSMENT_SECTIONS[1].id);
  assert.equal(firstUnansweredIndexForSection(ASSESSMENT_SECTIONS[1].id, responses), 8);
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

test("scores deterministically and separates safety flags", () => {
  const scoredResponses = Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, 0]));
  ["C1-Sig", "C1-Cost", "C1-Disc", "C1-Mod", "H1-Sig", "H1-Cost"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const safetyResponses = Object.fromEntries(SAFETY_ITEMS.map((item) => [item.id, 0]));
  safetyResponses.S1 = 2;

  const results = scoreAssessment(scoredResponses, safetyResponses);
  assert.equal(results.topCognitionBottlenecks[0].kernel, "Activation");
  assert.equal(results.safetyFlags.length, 1);
  assert.equal(results.safetyFlags[0].id, "S1");
});

test("adaptive clarifiers trigger only from elevated or mixed patterns", () => {
  const scoredResponses = Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, 0]));
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
  const scoredResponses = Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, 1]));
  ["C1-Sig", "C1-Cost", "C1-Disc", "C1-Mod", "H1-Sig", "H1-Cost", "H1-Mod"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const results = scoreAssessment(scoredResponses, {});
  const validity = validitySummary({ V1: 4, V2: 4, V3: 0, V4: 0 });

  assert.ok(buildCapacitySignature(results).headline.includes("Activation"));
  assert.equal(buildSectionSummaries(results).length, 8);
  assert.ok(buildExperiments(results).length > 0);
  assert.equal(buildConversationPrompts(results, validity).length, 4);
});

test("differential lens keeps ADHD and menopause pathways co-equal without exclusion language", () => {
  const scoredResponses = Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, item.domain === "Cognition" ? 3 : 2]));
  ["H1-Sig", "H1-Cost", "H2-Sig", "H2-Cost"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const session = sessionWithResponses(scoredResponses);
  const results = scoreAssessment(scoredResponses, session.safetyResponses);
  const lens = buildDifferentialLens(session, results);
  const serialized = JSON.stringify(lens);

  assert.ok(/ADHD-consistent|Layered/.test(lens.status));
  assert.equal(/rule out|not ADHD|just menopause/i.test(serialized), false);
  assert.deepEqual(findCopyRuleViolations(serialized), []);
});

test("coach review creates packet data for low, mixed, and high-signal profiles", () => {
  const allowedClaimTypes = new Set(Object.values(CLAIM_TYPES));
  const profiles = [
    Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, 0])),
    Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, 2])),
    Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, item.id.startsWith("C1") || item.id.startsWith("H1") ? 4 : 1]))
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
    assert.ok(coachReview.evidenceThemes.includes("adhd-differential"));
    assert.ok(coachReview.evidenceThemes.includes("voice-ready-intake"));
    assert.ok(coachReview.evidenceThemes.includes("digital-health-governance"));
    assert.ok(coachReview.differentialLens.status);
    assert.ok(allCoachPhrases(coachReview).every((item) => allowedClaimTypes.has(item.claimType)));
  });
});

test("coach packet carries caveats, referral routing, evidence links, and bounded claims", async () => {
  const scoredResponses = Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, 1]));
  ["C3-Sig", "C3-Cost", "C3-Disc", "C3-Mod", "H2-Sig", "H2-Cost"].forEach((id) => {
    scoredResponses[id] = 4;
  });
  const session = sessionWithResponses(scoredResponses, {
    validityResponses: { V1: 1, V2: 1, V3: 4, V4: 4 },
    safetyResponses: { S1: 3, S2: 0, S3: 0, S4: 0 },
    adaptiveResponses: { A1: "Interruptions", A6: "Irregular" }
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

  const appCopy = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.ok(appCopy.includes("Coach packet"));
  assert.deepEqual(findCopyRuleViolations(appCopy), []);
});

test("summary payload excludes private safety detail", () => {
  const scoredResponses = Object.fromEntries(SPINE_ITEMS.map((item) => [item.id, 2]));
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
  assert.ok(findCopyRuleViolations("Bringing patient stories to light").length >= 1);
  assert.ok(findCopyRuleViolations("This can rule out ADHD because it is just menopause.").length >= 2);
  assert.equal(findCopyRuleViolations("This functional map is construct-informed and experimental.").length, 0);

  const appCopy = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const evidenceCopy = await readFile(new URL("../src/evidence.js", import.meta.url), "utf8");
  const reportCopy = await readFile(new URL("../src/report-model.js", import.meta.url), "utf8");
  const blueprintCopy = await readFile(new URL("../src/source-blueprints.js", import.meta.url), "utf8");
  assert.deepEqual(findCopyRuleViolations(`${appCopy}\n${evidenceCopy}\n${reportCopy}\n${blueprintCopy}`), []);
});
