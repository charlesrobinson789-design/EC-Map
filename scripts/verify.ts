import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findCopyRuleViolations } from "../src/copy-rules.js";
import { allEvidenceSources, EVIDENCE_THEMES } from "../src/evidence.js";
import {
  ACTIVE_CONTEXT_PROMPTS,
  ACTIVE_SPINE_ITEMS,
  ASSESSMENT_SECTIONS,
  itemsForSection,
  PAUSED_HORMONAL_ASSESSMENT,
  PAUSED_HORMONAL_ITEMS
} from "../src/sections.js";
import { CONTEXT_PROMPTS, NARRATIVE_PROMPTS, RESPONSE_SCALE, SAFETY_ITEMS, SPINE_ITEMS } from "../src/spine.js";
import { CONCIERGE_METHOD_STEPS, SOURCE_BLUEPRINTS } from "../src/source-blueprints.js";
import { UX_PRACTICE_PRINCIPLES } from "../src/ux-principles.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedFunctions = new Set(["Signal", "Cost", "Discriminator", "Modifiability"]);
const allowedDomains = new Set(["Cognition", "Chemistry"]);

async function listFiles(dir: string, predicate: (path: string) => boolean, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if ([".git", "node_modules", "coverage", "dist", ".cache", ".next"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listFiles(fullPath, predicate, files);
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function verifySyntax(filePath: string) {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    // Syntax for TypeScript files is checked via tsc --noEmit in CI/verify pipeline
    return;
  }
  const result = spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
  assert.equal(result.status, 0, `Syntax check failed for ${path.relative(rootDir, filePath)}\n${result.stderr}`);
}

function uniqueValues<T>(values: T[], label: string): Set<T> {
  const unique = new Set(values);
  assert.equal(unique.size, values.length, `${label} must be unique`);
  return unique;
}

function verifySpine() {
  assert.equal(SPINE_ITEMS.length, 64, "The v1 spine must stay at 64 scored items");
  uniqueValues(SPINE_ITEMS.map((item: any) => item.id), "Spine item ids");

  const themeIds = new Set(Object.keys(EVIDENCE_THEMES));
  const groupedByKernel = new Map<string, string[]>();
  for (const item of SPINE_ITEMS as any[]) {
    assert.ok(item.prompt, `Missing prompt for ${item.id}`);
    assert.ok(item.kernelId, `Missing kernelId for ${item.id}`);
    assert.ok(allowedDomains.has(item.domain), `Unexpected domain for ${item.id}: ${item.domain}`);
    assert.ok(allowedFunctions.has(item.function), `Unexpected function for ${item.id}: ${item.function}`);
    assert.ok(item.evidenceThemes.every((themeId: string) => themeIds.has(themeId)), `Unknown evidence theme on ${item.id}`);
    const key = `${item.domain}:${item.kernelId}:${item.kernel}`;
    groupedByKernel.set(key, [...(groupedByKernel.get(key) ?? []), item.function]);
  }

  assert.equal(groupedByKernel.size, 16, "The spine should have 16 kernels");
  for (const [kernel, functions] of groupedByKernel) {
    assert.deepEqual(new Set(functions), allowedFunctions, `${kernel} must include all four item functions`);
  }
}

function verifySections() {
  assert.equal(ASSESSMENT_SECTIONS.length, 7, "The shared intake must contain seven assessments");
  assert.equal(ACTIVE_SPINE_ITEMS.length, 56, "The shared intake must contain 56 active scored prompts");
  uniqueValues(ASSESSMENT_SECTIONS.map((section: any) => section.id), "Section ids");
  const covered: string[] = [];

  for (const section of ASSESSMENT_SECTIONS as any[]) {
    assert.ok(section.title && section.shortTitle && section.subtitle && section.voiceGoal, `Section ${section.id} needs user-facing metadata`);
    const items = itemsForSection(section.id);
    assert.equal(items.length, 8, `${section.id} should contain 8 scored prompts`);
    covered.push(...items.map((item: any) => item.id));
  }

  assert.deepEqual(new Set(covered), new Set(ACTIVE_SPINE_ITEMS.map((item: any) => item.id)), "Active sections must cover every shared-core item exactly once");
  assert.equal(covered.length, ACTIVE_SPINE_ITEMS.length, "Active sections must not duplicate shared-core items");
  assert.equal(PAUSED_HORMONAL_ASSESSMENT.status, "paused", "The hormonal assessment must remain explicitly paused");
  assert.equal(PAUSED_HORMONAL_ITEMS.length, 8, "The paused module must preserve all eight source prompts");
  assert.deepEqual(new Set(PAUSED_HORMONAL_ITEMS.map((item: any) => item.kernelId)), new Set(["H1", "H2"]));
  assert.equal(
    new Set([...covered, ...PAUSED_HORMONAL_ITEMS.map((item: any) => item.id)]).size,
    SPINE_ITEMS.length,
    "Active and paused profiles together must preserve the 64-item source bank"
  );
}

function verifyQuestionSets() {
  uniqueValues(CONTEXT_PROMPTS.map((prompt: any) => prompt.id), "Context prompt ids");
  uniqueValues(ACTIVE_CONTEXT_PROMPTS.map((prompt: any) => prompt.id), "Active context prompt ids");
  assert.equal(ACTIVE_CONTEXT_PROMPTS.length, 6, "The shared core must use six sex-neutral context anchors");
  assert.equal(ACTIVE_CONTEXT_PROMPTS.some((prompt: any) => prompt.id === "transition_context"), false);
  assert.equal(/menopause|perimenopause|hormonal|midlife/i.test(JSON.stringify(ACTIVE_CONTEXT_PROMPTS)), false);
  assert.equal(
    ACTIVE_SPINE_ITEMS.some((item: any) => item.evidenceThemes.some((theme: string) => ["menopause-specificity", "menopause-cognition", "adhd-differential"].includes(theme))),
    false,
    "Paused hormonal evidence themes must not leak into active scored items"
  );
  uniqueValues(NARRATIVE_PROMPTS.map((prompt: any) => prompt.id), "Narrative prompt ids");
  uniqueValues(SAFETY_ITEMS.map((item: any) => item.id), "Safety item ids");
  assert.deepEqual(RESPONSE_SCALE.map((option: any) => option.value), [0, 1, 2, 3, 4], "Response scale must stay 0-4");
  assert.ok(SAFETY_ITEMS.every((item: any) => item.prompt && item.flag), "Safety items need prompt and flag text");
}

function verifyEvidenceReferences() {
  const sourceIds = new Set(allEvidenceSources().map((source: any) => source.id));

  for (const [themeId, theme] of Object.entries(EVIDENCE_THEMES) as [string, any][]) {
    assert.ok(theme.label && theme.implementationRule && theme.userFacing, `${themeId} needs complete evidence-theme copy`);
    assert.ok(theme.sourceIds.every((sourceId: string) => sourceIds.has(sourceId)), `${themeId} references an unknown source`);
  }

  assert.ok(SOURCE_BLUEPRINTS.every((source: any) => sourceIds.has(source.sourceId)), "Source blueprints must reference known evidence sources");
  assert.ok(CONCIERGE_METHOD_STEPS.every((step: any) => step.sourceIds.every((sourceId: string) => sourceIds.has(sourceId))), "Method steps must reference known evidence sources");
  assert.ok(UX_PRACTICE_PRINCIPLES.every((principle: any) => principle.sourceIds.every((sourceId: string) => sourceIds.has(sourceId))), "UX principles must reference known evidence sources");
}

async function readFirstExistingFile(basePath: string, exts = [".ts", ".tsx", ".js", ".mjs"]): Promise<{ text: string; path: string }> {
  for (const ext of exts) {
    const fullPath = basePath.endsWith(ext) ? basePath : `${basePath}${ext}`;
    try {
      const text = await readFile(path.join(rootDir, fullPath), "utf8");
      return { text, path: fullPath };
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }
  try {
    const text = await readFile(path.join(rootDir, basePath), "utf8");
    return { text, path: basePath };
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
  throw new Error(`Could not find any file matching ${basePath} with extensions ${exts.join(", ")}`);
}

async function verifyCopyRules() {
  const files = [
    "README.md",
    "DEVELOPER_HANDOFF.md",
    "src/app",
    "src/evidence",
    "src/report-model",
    "src/sol-governance",
    "src/source-blueprints",
    "src/summary"
  ];

  const violations = [];
  for (const file of files) {
    const { text, path: actualPath } = await readFirstExistingFile(file);
    for (const violation of findCopyRuleViolations(text)) {
      violations.push(`${actualPath}: ${violation.id} - ${violation.message}`);
    }
  }

  assert.deepEqual(violations, [], `Copy-rule violations found:\n${violations.join("\n")}`);
}

async function verifySecurityResearchDocs() {
  const requiredDocs = [
    {
      file: "docs/security/CODEX_SECURITY_THREAT_MODEL.md",
      phrases: [
        "Generated using the Codex Security threat-model phase",
        "Do not collect real client/patient data",
        "authentication, authorization, encryption, export/delete, audit logging"
      ]
    },
    {
      file: "docs/research/EMA_PLATFORM_RESEARCH_DOSSIER.md",
      phrases: [
        "Goal 1 is platform research",
        "Codex Security Gate",
        "Do not proceed to Goal 2 build/integration",
        "EMA_PLATFORM_EVIDENCE_APPENDIX.md",
        "Decision Categories",
        "First-wave no-PHI pilot tools",
        "Open-source or self-hosted infrastructure",
        "MINDLAMP_OPEN_SOURCE_OPTIONS.md"
      ]
    },
    {
      file: "docs/research/EMA_PLATFORM_EVIDENCE_APPENDIX.md",
      phrases: [
        "Primary-source snapshot date: 2026-06-13",
        "Do not treat source claims as approval for PHI",
        "Not every candidate below is a practical product choice for EC Map right now",
        "\"Research-only\" means the tool may be credible for formal studies",
        "Best low-cost hosted/no-code starting points",
        "m-Path",
        "ExpiWell",
        "ESMira",
        "EARS",
        "TrialKit"
      ]
    },
    {
      file: "docs/research/MINDLAMP_OPEN_SOURCE_OPTIONS.md",
      phrases: [
        "focused Goal 1 research note",
        "mindLAMP is not one simple open-source app",
        "Self-host full LAMP stack",
        "Use pieces only",
        "Codex Security read",
        "Do not fork deprecated `LAMP-app` or `LAMP-portal`"
      ]
    },
    {
      file: "docs/research/VERBAL_FIRST_OPEN_SOURCE_OPTIONS.md",
      phrases: [
        "verbal-first product shape",
        "Fastest no/low-code verbal prototype",
        "ResearchKit / ResearchStack",
        "EMA Add-On",
        "Codex Security Gate"
      ]
    },
    {
      file: "docs/research/EMA_VENDOR_SECURITY_QUESTIONNAIRE.md",
      phrases: [
        "Data Ownership, Export, And Deletion",
        "Privacy, Security, And Compliance",
        "Hard Disqualifiers"
      ]
    },
    {
      file: "docs/research/EMA_PLATFORM_SCORECARD.md",
      phrases: [
        "Hard Disqualifiers",
        "Security, privacy, and compliance",
        "Any hard disqualifier: reject"
      ]
    }
  ];

  for (const doc of requiredDocs) {
    const text = await readFile(path.join(rootDir, doc.file), "utf8");
    for (const phrase of doc.phrases) {
      assert.ok(text.includes(phrase), `${doc.file} must include required security/research gate phrase: ${phrase}`);
    }
  }
}

async function verifyLocalPreviewSecurity() {
  const compose = await readFile(path.join(rootDir, "docker-compose.yml"), "utf8");
  assert.ok(compose.includes("127.0.0.1:3000:3000"), "Docker app port must bind to localhost only");
  assert.ok(compose.includes("127.0.0.1:5432:5432"), "Docker Postgres port must bind to localhost only");
  assert.ok(!compose.includes('"3000:3000"'), "Docker app port must not bind all interfaces");
  assert.ok(!compose.includes('"5432:5432"'), "Docker Postgres port must not bind all interfaces");

  const serverRes = await readFirstExistingFile("server/index");
  const server = serverRes.text;
  const requiredServerPhrases = [
    "Content-Security-Policy",
    "frame-ancestors 'none'",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cache-Control",
    "ENABLE_DEV_RESET === \"true\""
  ];
  for (const phrase of requiredServerPhrases) {
    assert.ok(server.includes(phrase), `server/index must preserve local preview security control: ${phrase}`);
  }

  const contractRes = await readFirstExistingFile("server/assessment-contract");
  const contract = contractRes.text;
  const requiredMockDataPhrases = [
    "patientId must be a seeded mock patient id",
    "Mock data acknowledgement is required before saving",
    "redactSessionForPersistence",
    "redactReportForPersistence",
    "privateSafety",
    "mockDataOnly",
    "prototype-preview"
  ];
  for (const phrase of requiredMockDataPhrases) {
    assert.ok(contract.includes(phrase), `server/assessment-contract must preserve mock-data save guard: ${phrase}`);
  }

  assert.ok(server.includes("deleteAssessment"), "server/index must preserve saved assessment delete route");

  let appCopy = "";
  try {
    const appRes = await readFirstExistingFile("src/app");
    appCopy += appRes.text;
  } catch {}
  const uiFiles = await listFiles(path.join(rootDir, "src"), (file) => file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".js"));
  for (const f of uiFiles) {
    appCopy += "\n" + (await readFile(f, "utf8"));
  }

  assert.ok(appCopy.includes('data-field="mock-data-ack"'), "UI codebase must render the mock-data acknowledgement checkbox");
  assert.ok(appCopy.includes("Confirm this is demo/mock data only before saving."), "UI codebase must block save without mock-data acknowledgement");
  assert.ok(appCopy.includes('data-action="export-assessment"'), "UI codebase must expose saved assessment export controls");
  assert.ok(appCopy.includes('data-action="delete-assessment"'), "UI codebase must expose saved assessment delete controls");
}

const jsFiles = await listFiles(rootDir, (file) => file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".ts") || file.endsWith(".tsx"));
jsFiles.forEach(verifySyntax);
verifySpine();
verifySections();
verifyQuestionSets();
verifyEvidenceReferences();
await verifyCopyRules();
await verifySecurityResearchDocs();
await verifyLocalPreviewSecurity();

console.log(`verify: checked ${jsFiles.length} JS/MJS/TS/TSX files, spine integrity, evidence references, claim guardrails, security research gates, and local preview security`);
