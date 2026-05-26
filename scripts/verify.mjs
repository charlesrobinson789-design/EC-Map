import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findCopyRuleViolations } from "../src/copy-rules.js";
import { allEvidenceSources, EVIDENCE_THEMES } from "../src/evidence.js";
import { ASSESSMENT_SECTIONS, itemsForSection } from "../src/sections.js";
import { CONTEXT_PROMPTS, NARRATIVE_PROMPTS, RESPONSE_SCALE, SAFETY_ITEMS, SPINE_ITEMS } from "../src/spine.js";
import { CONCIERGE_METHOD_STEPS, SOURCE_BLUEPRINTS } from "../src/source-blueprints.js";
import { UX_PRACTICE_PRINCIPLES } from "../src/ux-principles.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedFunctions = new Set(["Signal", "Cost", "Discriminator", "Modifiability"]);
const allowedDomains = new Set(["Cognition", "Chemistry"]);

async function listFiles(dir, predicate, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if ([".git", "node_modules", "coverage", "dist", ".cache"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listFiles(fullPath, predicate, files);
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function verifySyntax(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
  assert.equal(result.status, 0, `Syntax check failed for ${path.relative(rootDir, filePath)}\n${result.stderr}`);
}

function uniqueValues(values, label) {
  const unique = new Set(values);
  assert.equal(unique.size, values.length, `${label} must be unique`);
  return unique;
}

function verifySpine() {
  assert.equal(SPINE_ITEMS.length, 64, "The v1 spine must stay at 64 scored items");
  uniqueValues(SPINE_ITEMS.map((item) => item.id), "Spine item ids");

  const themeIds = new Set(Object.keys(EVIDENCE_THEMES));
  const groupedByKernel = new Map();
  for (const item of SPINE_ITEMS) {
    assert.ok(item.prompt, `Missing prompt for ${item.id}`);
    assert.ok(item.kernelId, `Missing kernelId for ${item.id}`);
    assert.ok(allowedDomains.has(item.domain), `Unexpected domain for ${item.id}: ${item.domain}`);
    assert.ok(allowedFunctions.has(item.function), `Unexpected function for ${item.id}: ${item.function}`);
    assert.ok(item.evidenceThemes.every((themeId) => themeIds.has(themeId)), `Unknown evidence theme on ${item.id}`);
    const key = `${item.domain}:${item.kernelId}:${item.kernel}`;
    groupedByKernel.set(key, [...(groupedByKernel.get(key) ?? []), item.function]);
  }

  assert.equal(groupedByKernel.size, 16, "The spine should have 16 kernels");
  for (const [kernel, functions] of groupedByKernel) {
    assert.deepEqual(new Set(functions), allowedFunctions, `${kernel} must include all four item functions`);
  }
}

function verifySections() {
  assert.equal(ASSESSMENT_SECTIONS.length, 8, "The intake should stay split into 8 voice-sized conversations");
  uniqueValues(ASSESSMENT_SECTIONS.map((section) => section.id), "Section ids");
  const covered = [];

  for (const section of ASSESSMENT_SECTIONS) {
    assert.ok(section.title && section.shortTitle && section.subtitle && section.voiceGoal, `Section ${section.id} needs user-facing metadata`);
    const items = itemsForSection(section.id);
    assert.equal(items.length, 8, `${section.id} should contain 8 scored prompts`);
    covered.push(...items.map((item) => item.id));
  }

  assert.deepEqual(new Set(covered), new Set(SPINE_ITEMS.map((item) => item.id)), "Sections must cover every spine item exactly once");
  assert.equal(covered.length, SPINE_ITEMS.length, "Sections must not duplicate spine items");
}

function verifyQuestionSets() {
  uniqueValues(CONTEXT_PROMPTS.map((prompt) => prompt.id), "Context prompt ids");
  uniqueValues(NARRATIVE_PROMPTS.map((prompt) => prompt.id), "Narrative prompt ids");
  uniqueValues(SAFETY_ITEMS.map((item) => item.id), "Safety item ids");
  assert.deepEqual(RESPONSE_SCALE.map((option) => option.value), [0, 1, 2, 3, 4], "Response scale must stay 0-4");
  assert.ok(SAFETY_ITEMS.every((item) => item.prompt && item.flag), "Safety items need prompt and flag text");
}

function verifyEvidenceReferences() {
  const sourceIds = new Set(allEvidenceSources().map((source) => source.id));

  for (const [themeId, theme] of Object.entries(EVIDENCE_THEMES)) {
    assert.ok(theme.label && theme.implementationRule && theme.userFacing, `${themeId} needs complete evidence-theme copy`);
    assert.ok(theme.sourceIds.every((sourceId) => sourceIds.has(sourceId)), `${themeId} references an unknown source`);
  }

  assert.ok(SOURCE_BLUEPRINTS.every((source) => sourceIds.has(source.sourceId)), "Source blueprints must reference known evidence sources");
  assert.ok(CONCIERGE_METHOD_STEPS.every((step) => step.sourceIds.every((sourceId) => sourceIds.has(sourceId))), "Method steps must reference known evidence sources");
  assert.ok(UX_PRACTICE_PRINCIPLES.every((principle) => principle.sourceIds.every((sourceId) => sourceIds.has(sourceId))), "UX principles must reference known evidence sources");
}

async function verifyCopyRules() {
  const files = [
    "README.md",
    "DEVELOPER_HANDOFF.md",
    "src/app.js",
    "src/evidence.js",
    "src/report-model.js",
    "src/source-blueprints.js",
    "src/summary.js"
  ];

  const violations = [];
  for (const file of files) {
    const text = await readFile(path.join(rootDir, file), "utf8");
    for (const violation of findCopyRuleViolations(text)) {
      violations.push(`${file}: ${violation.id} - ${violation.message}`);
    }
  }

  assert.deepEqual(violations, [], `Copy-rule violations found:\n${violations.join("\n")}`);
}

const jsFiles = await listFiles(rootDir, (file) => file.endsWith(".js") || file.endsWith(".mjs"));
jsFiles.forEach(verifySyntax);
verifySpine();
verifySections();
verifyQuestionSets();
verifyEvidenceReferences();
await verifyCopyRules();

console.log(`verify: checked ${jsFiles.length} JS/MJS files, spine integrity, evidence references, and claim guardrails`);
