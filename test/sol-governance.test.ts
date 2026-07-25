import assert from "node:assert/strict";
import test from "node:test";

import { validitySummary } from "../src/followups.js";
import { buildCoachReview, REPORT_VERSIONS } from "../src/report-model.js";
import { scoreAssessment } from "../src/scoring.js";
import {
  buildSolGovernancePacket,
  CANONICAL_INDEX_SLOTS,
  EIGHT_F_DOMAINS,
  SOL_GOVERNANCE_VERSION,
  SOL_LIFECYCLE
} from "../src/sol-governance.js";
import { ACTIVE_CONTEXT_PROMPTS, ACTIVE_SPINE_ITEMS, PAUSED_HORMONAL_ITEMS } from "../src/sections.js";
import { SAFETY_ITEMS } from "../src/spine.js";
import { draftPlainLanguageSummary } from "../src/summary.js";

function completeSession(overrides: Record<string, any> = {}) {
  return {
    contextResponses: Object.fromEntries(
      ACTIVE_CONTEXT_PROMPTS.map((prompt) => [prompt.id, prompt.options?.[0] ?? "Mock response"])
    ),
    scoredResponses: Object.fromEntries(
      ACTIVE_SPINE_ITEMS.map((item, index) => [item.id, (index % 4) + 1])
    ),
    validityResponses: { V1: 4, V2: 4, V3: 0, V4: 0 },
    safetyResponses: Object.fromEntries(SAFETY_ITEMS.map((item) => [item.id, 0])),
    adaptiveResponses: {},
    narrativeResponses: {
      compensating_for: "Mock compensation context.",
      public_private_cost: "Mock private cost context."
    },
    ...overrides
  };
}

function packetFor(session: any) {
  const results = scoreAssessment(session.scoredResponses, session.safetyResponses);
  const validity = validitySummary(session.validityResponses);
  return buildSolGovernancePacket(session, results, validity, REPORT_VERSIONS);
}

test("Sol MVP creates a deterministic fail-closed governance packet", () => {
  const session = completeSession();
  const first = packetFor(session);
  const second = packetFor(session);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, SOL_GOVERNANCE_VERSION);
  assert.equal(first.runtime.invoked, false);
  assert.equal(first.mode, "mock_data_shadow");
  assert.equal(first.overallStatus, "shadow_ready_for_human_review");
  assert.equal(first.gates.length, 6);
  assert.equal(first.lifecycle.length, SOL_LIFECYCLE.length);
  assert.equal(first.eightFCoverage.length, EIGHT_F_DOMAINS.length);
  assert.equal(first.canonicalIndices.length, CANONICAL_INDEX_SLOTS.length);
  assert.ok(first.canonicalIndices.every((index: any) => index.status === "not_computed"));
  assert.equal(first.gates.find((gate: any) => gate.id === "G1")?.status, "pass");
  assert.equal(first.gates.find((gate: any) => gate.id === "G2")?.status, "pass");
  assert.equal(first.gates.find((gate: any) => gate.id === "G3")?.status, "pass");
  assert.equal(first.gates.find((gate: any) => gate.id === "G5")?.status, "human_review");
  assert.equal(first.gates.find((gate: any) => gate.id === "G6")?.status, "block");
  assert.equal(first.eightFCoverage.find((item: any) => item.domain === "Finances")?.coverage, "unmapped");
  assert.ok(first.returnTo8.domainsNeedingMapping.includes("Family"));
  assert.ok(first.returnTo8.domainsNeedingMapping.includes("Firm"));
  assert.ok(first.returnTo8.domainsNeedingMapping.includes("Finances"));
  assert.equal(first.lifecycle.find((stage: any) => stage.name === "Compute")?.status, "kernel_scores_only");
  assert.equal(first.lifecycle.find((stage: any) => stage.name === "Challenge")?.status, "human_review_required");
  assert.equal(first.release.eligible, false);
});

test("Sol governance ignores the paused hormonal module", () => {
  const coreSession = completeSession();
  const legacySession = completeSession({
    scoredResponses: {
      ...coreSession.scoredResponses,
      ...Object.fromEntries(PAUSED_HORMONAL_ITEMS.map((item) => [item.id, 4]))
    }
  });

  assert.deepEqual(packetFor(legacySession), packetFor(coreSession));
});

test("Sol MVP redacts private safety content and requires human review when a threshold crosses", () => {
  const session = completeSession({
    safetyResponses: { S1: 4, S2: 0, S3: 0, S4: 0 }
  });
  const packet = packetFor(session);
  const serialized = JSON.stringify(packet);

  assert.equal(packet.overallStatus, "human_review_required");
  assert.equal(packet.gates.find((gate: any) => gate.id === "G4")?.status, "human_review");
  assert.deepEqual(packet.privateSafety, { redacted: true, reviewRequired: true, flagCount: 1 });
  assert.equal(serialized.includes(SAFETY_ITEMS[0].prompt), false);
  assert.equal(serialized.includes(SAFETY_ITEMS[0].flag), false);
  assert.equal(serialized.includes("safetyResponses"), false);
});

test("Sol MVP blocks incomplete sessions instead of filling missing inputs", () => {
  const session = completeSession({
    contextResponses: {},
    scoredResponses: Object.fromEntries(ACTIVE_SPINE_ITEMS.slice(0, 8).map((item) => [item.id, 2])),
    validityResponses: {},
    safetyResponses: {}
  });
  const packet = packetFor(session);

  assert.equal(packet.overallStatus, "incomplete");
  assert.equal(packet.gates.find((gate: any) => gate.id === "G2")?.status, "block");
  assert.equal(packet.gates.find((gate: any) => gate.id === "G4")?.status, "block");
  assert.equal(packet.gates.find((gate: any) => gate.id === "G3")?.status, "block");
  assert.equal(packet.reasoningReceipts.length, 0);
  assert.equal(packet.eightFCoverage.find((item: any) => item.domain === "Focus")?.coverage, "unmapped");
  assert.equal(packet.lifecycle.find((stage: any) => stage.name === "Compute")?.status, "blocked");
  assert.equal(packet.release.eligible, false);
});

test("Sol MVP rejects arbitrary keys and malformed values as incomplete", () => {
  const arbitraryKeys = Object.fromEntries(Array.from({ length: 56 }, (_, index) => [`wrong-${index}`, 2]));
  const wrongKeySession = completeSession({
    contextResponses: Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`context-${index}`, "mock"])),
    scoredResponses: arbitraryKeys,
    validityResponses: { A: 4, B: 4, C: 0, D: 0 },
    safetyResponses: { A: 0, B: 0, C: 0, D: 0 }
  });
  const malformedSession = completeSession();
  malformedSession.scoredResponses[ACTIVE_SPINE_ITEMS[0].id] = "not-a-score" as any;
  const invalidContextSession = completeSession();
  invalidContextSession.contextResponses[ACTIVE_CONTEXT_PROMPTS[0].id] = "invented option";

  [packetFor(wrongKeySession), packetFor(malformedSession)].forEach((packet) => {
    assert.equal(packet.overallStatus, "incomplete");
    assert.equal(packet.gates.find((gate: any) => gate.id === "G2")?.status, "block");
    assert.equal(packet.gates.find((gate: any) => gate.id === "G3")?.status, "block");
    assert.equal(packet.reasoningReceipts.length, 0);
  });

  const invalidContextPacket = packetFor(invalidContextSession);
  assert.equal(invalidContextPacket.overallStatus, "incomplete");
  assert.equal(invalidContextPacket.gates.find((gate: any) => gate.id === "G2")?.status, "block");
  assert.equal(invalidContextPacket.gates.find((gate: any) => gate.id === "G3")?.status, "pass");
  assert.equal(invalidContextPacket.reasoningReceipts.length, 0);
});

test("Sol MVP blocks incomplete safety input even when a recorded threshold crosses", () => {
  const session = completeSession({ safetyResponses: { S1: 4 } });
  const packet = packetFor(session);
  const safetyGate = packet.gates.find((gate: any) => gate.id === "G4");

  assert.equal(packet.overallStatus, "incomplete");
  assert.equal(safetyGate?.status, "block");
  assert.match(safetyGate?.detail ?? "", /incomplete and a threshold crossed/i);
  assert.deepEqual(packet.privateSafety, { redacted: true, reviewRequired: true, flagCount: 1 });
  assert.equal(packet.reasoningReceipts.length, 0);
});

test("Sol MVP blocks altered scores and incompatible version metadata", () => {
  const session = completeSession();
  const results = scoreAssessment(session.scoredResponses, session.safetyResponses);
  const validity = validitySummary(session.validityResponses);
  const alteredResults = structuredClone(results);
  alteredResults.kernelScores[0].total = 999;
  const alteredPacket = buildSolGovernancePacket(session, alteredResults, validity, REPORT_VERSIONS);
  const incompatiblePacket = buildSolGovernancePacket(
    session,
    results,
    validity,
    { ...REPORT_VERSIONS, assessment: "unapproved-assessment" }
  );

  assert.equal(alteredPacket.overallStatus, "incomplete");
  assert.equal(alteredPacket.gates.find((gate: any) => gate.id === "G3")?.status, "block");
  assert.equal(alteredPacket.reasoningReceipts.length, 0);
  assert.equal(incompatiblePacket.overallStatus, "incomplete");
  assert.equal(incompatiblePacket.gates.find((gate: any) => gate.id === "G1")?.status, "block");
});

test("Sol MVP exposes support and challenge receipts without calibrated or diagnostic claims", () => {
  const packet = packetFor(completeSession());
  const serialized = JSON.stringify(packet).toLowerCase();

  assert.equal(packet.reasoningReceipts.length, 2);
  packet.reasoningReceipts.forEach((receipt: any) => {
    assert.ok(receipt.support.evidence.length > 0);
    assert.ok(receipt.challenge.competingExplanations.length > 0);
    assert.ok(receipt.challenge.disconfirmingQuestion);
    assert.equal(receipt.confidence.status, "not_calibrated");
    assert.equal(receipt.requiredDisposition, "qualified_human_review");
    assert.ok(receipt.domains8f.length > 0);
    assert.ok(receipt.support.evidence.every((item: any) => item.responseRecorded === true));
    assert.ok(receipt.support.evidence.every((item: any) => !("itemId" in item) && !("value" in item)));
  });
  assert.equal(serialized.includes("diagnosis confirmed"), false);
  assert.equal(serialized.includes("validated probability"), true);
});

test("coach review includes the governed shadow packet and its version", () => {
  const session = completeSession();
  const results = scoreAssessment(session.scoredResponses, session.safetyResponses);
  const validity = validitySummary(session.validityResponses);
  const coachReview = buildCoachReview(session, results, validity, []);

  assert.equal(coachReview.versions.governance, SOL_GOVERNANCE_VERSION);
  assert.equal(coachReview.solGovernance.schemaVersion, SOL_GOVERNANCE_VERSION);
  assert.equal(coachReview.solGovernance.runtime.invoked, false);
  assert.equal(coachReview.solGovernance.release.eligible, false);
});

test("plain-language summary is invariant to private safety responses", () => {
  const sessionWithoutFlag = completeSession();
  const sessionWithFlag = completeSession({ safetyResponses: { S1: 4, S2: 0, S3: 0, S4: 0 } });
  const resultsWithoutFlag = scoreAssessment(sessionWithoutFlag.scoredResponses, sessionWithoutFlag.safetyResponses);
  const resultsWithFlag = scoreAssessment(sessionWithFlag.scoredResponses, sessionWithFlag.safetyResponses);

  assert.equal(
    draftPlainLanguageSummary(sessionWithoutFlag, resultsWithoutFlag),
    draftPlainLanguageSummary(sessionWithFlag, resultsWithFlag)
  );
});
