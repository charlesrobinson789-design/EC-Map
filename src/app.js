import {
  CONTEXT_PROMPTS,
  NARRATIVE_PROMPTS,
  RESPONSE_SCALE,
  SAFETY_ITEMS,
  SPINE_ITEMS
} from "./spine.js";
import { getSourcesByIds, getSourcesForThemes, getThemes } from "./evidence.js";
import { activeClarifiers, validitySummary, VALIDITY_ITEMS } from "./followups.js";
import {
  buildCoachReview,
  buildCapacitySignature,
  buildConversationPrompts,
  buildDifferentialLens,
  buildExperiments,
  buildSectionSummaries
} from "./report-model.js";
import { reportCardsFor, scoreAssessment } from "./scoring.js";
import { CONCIERGE_METHOD_STEPS, SOURCE_BLUEPRINTS, methodSourceIds, sourceBlueprintIds } from "./source-blueprints.js";
import {
  ASSESSMENT_SECTIONS,
  firstUnansweredIndexForSection,
  itemsForSection,
  nextIncompleteSectionId,
  sectionForItem,
  sectionIndex,
  sectionStats
} from "./sections.js";
import { draftPlainLanguageSummary } from "./summary.js";

const STORAGE_KEY = "ec-map-guided-capacity-session-v1";
const root = document.querySelector("#app");

const defaultState = {
  view: "intro",
  itemIndex: 0,
  activeSectionId: null,
  lastCompletedSectionId: null,
  contextResponses: {},
  scoredResponses: {},
  adaptiveResponses: {},
  narrativeResponses: {},
  validityResponses: {},
  safetyResponses: {},
  completedAt: null
};

let state = loadState();

const routeParams = new URLSearchParams(window.location.search);
if (routeParams.has("fresh")) {
  localStorage.removeItem(STORAGE_KEY);
  state = { ...defaultState };
  window.history.replaceState({}, "", window.location.pathname);
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultState, ...JSON.parse(stored) } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  state = { ...defaultState, view: "intro" };
  saveState();
  render();
}

function seedDemoReport() {
  const highCognition = new Set(["C1-Sig", "C1-Cost", "C1-Disc", "C1-Mod", "C3-Sig", "C3-Cost", "C3-Disc", "C3-Mod"]);
  const highChemistry = new Set(["H1-Sig", "H1-Cost", "H1-Disc", "H1-Mod", "H2-Sig", "H2-Cost", "H2-Disc", "H2-Mod", "H8-Sig", "H8-Cost"]);
  state = {
    ...defaultState,
    view: "report",
    contextResponses: {
      role_type: "Heavy-output knowledge work",
      meeting_load: "5 to 15 hours",
      sleep_stability: "Variable",
      transition_context: "Perimenopausal",
      lifelong_attention_pattern: "Longstanding since childhood or teen years",
      setting_spread: "Across work, home, and relationships",
      timeline: "Has fluctuated"
    },
    scoredResponses: Object.fromEntries(
      SPINE_ITEMS.map((item) => [item.id, highCognition.has(item.id) ? 4 : highChemistry.has(item.id) ? 3 : 1])
    ),
    narrativeResponses: {
      compensating_for: "Keeping complex work moving while memory and recovery vary.",
      public_private_cost: "I can perform in meetings, then lose the evening.",
      capacity_shift: "I would write and plan again without burning out.",
      what_helped: "Quiet blocks, sleep protection, and writing the first step."
    },
    adaptiveResponses: {
      A1: "Interruptions",
      A2: "Written first step",
      A5: "Some improvement",
      A6: "Irregular",
      A10: "All three roughly equally"
    },
    validityResponses: { V1: 4, V2: 3, V3: 1, V4: 3 },
    safetyResponses: { S1: 0, S2: 0, S3: 0, S4: 0 },
    completedAt: new Date().toISOString()
  };
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setView(view) {
  state.view = view;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function countAnswered(responses = {}, ids = []) {
  return ids.filter((id) => responses[id] !== undefined && responses[id] !== "").length;
}

function contextAnsweredCount() {
  return countAnswered(state.contextResponses, CONTEXT_PROMPTS.map((prompt) => prompt.id));
}

function validityAnsweredCount() {
  return countAnswered(state.validityResponses, VALIDITY_ITEMS.map((item) => item.id));
}

function safetyAnsweredCount() {
  return countAnswered(state.safetyResponses, SAFETY_ITEMS.map((item) => item.id));
}

function isContextComplete() {
  return contextAnsweredCount() === CONTEXT_PROMPTS.length;
}

function isValidityComplete() {
  return validityAnsweredCount() === VALIDITY_ITEMS.length;
}

function isSafetyComplete() {
  return safetyAnsweredCount() === SAFETY_ITEMS.length;
}

function answeredCount() {
  return Object.keys(state.scoredResponses).filter((id) => SPINE_ITEMS.some((item) => item.id === id)).length;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function progressMarkup() {
  const answered = answeredCount();
  const pct = Math.round((answered / SPINE_ITEMS.length) * 100);
  return `
    <div class="progress-block" aria-label="Assessment progress">
      <div class="progress-meta">
        <span>${answered}/${SPINE_ITEMS.length} scored prompts answered</span>
        <span>${pct}%</span>
      </div>
      <div class="progress-track"><span style="width: ${pct}%"></span></div>
    </div>
  `;
}

function sectionProgressMarkup(section) {
  const stats = sectionStats(section.id, state.scoredResponses);
  const pct = Math.round((stats.answered / stats.total) * 100);
  return `
    <div class="progress-block section-progress" aria-label="${escapeHtml(section.title)} progress">
      <div class="progress-meta">
        <span>${stats.answered}/${stats.total} prompts in this section</span>
        <span>${pct}%</span>
      </div>
      <div class="progress-track"><span style="width: ${pct}%"></span></div>
    </div>
  `;
}

function renderIntro() {
  const hasProgress = answeredCount() > 0 || Object.keys(state.contextResponses).length > 0;
  root.innerHTML = `
    <section class="hero">
      <div class="brand-row">
        <div class="brand-mark" aria-hidden="true">EC</div>
        <div>
          <p class="eyebrow">Evidence-informed capacity mapping</p>
          <h1>EC Map for midlife capacity</h1>
        </div>
      </div>
      <div class="hero-meta" aria-label="Assessment format">
        <span>8 conversations</span>
        <span>8 prompts each</span>
        <span>Pause anytime</span>
      </div>
      <p class="hero-copy">
        A guided intake for midlife cognition: ADHD-consistent patterns, menopause-amplified patterns, and the layered cases where both may be active.
      </p>
      ${prototypeNoticeMarkup()}
      <p class="privacy-line">Saved in this browser.</p>
      <div class="hero-actions">
        <button class="primary" data-action="start">${hasProgress ? "Resume assessment" : "Begin assessment"}</button>
        <button class="secondary" data-action="demo-report">Preview report</button>
        <button class="secondary" data-action="method">Method</button>
        ${hasProgress ? '<button class="secondary" data-action="reset">Start over</button>' : ""}
      </div>
      ${renderConciergeMethodSummary()}
    </section>
  `;
}

function prototypeNoticeMarkup() {
  return `
    <div class="prototype-notice">
      <strong>Prototype preview.</strong>
      <span>Use demo data only. This is construct-informed and pre-validation; it is not diagnostic, medical advice, or treatment guidance.</span>
    </div>
  `;
}

function renderConciergeMethodSummary() {
  const highlights = [
    "Short voice-sized conversations",
    "ADHD-equal and menopause-equal interpretation",
    "Client report plus coach packet"
  ];
  return `
    <div class="method-summary" aria-label="Product method">
      ${highlights.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function principleCard(title, body) {
  return `
    <article class="principle-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function renderContext() {
  const answered = contextAnsweredCount();
  root.innerHTML = `
    <section class="panel">
      <div class="step-header">
        <p class="eyebrow">Context</p>
        <h1>Set the functional context</h1>
        <p>Quick anchors before the scored conversations.</p>
      </div>
      <form class="stack" data-form="context">
        ${CONTEXT_PROMPTS.map(renderContextPrompt).join("")}
      </form>
      <div class="readiness-line" aria-live="polite">${answered}/${CONTEXT_PROMPTS.length} anchors complete</div>
      <div class="nav-row">
        <button class="secondary" data-action="intro">Back</button>
        <button class="primary" data-action="sections" ${isContextComplete() ? "" : "disabled"}>Continue to conversations</button>
      </div>
    </section>
  `;
}

function renderContextPrompt(prompt) {
  const current = state.contextResponses[prompt.id] ?? "";
  return `
    <fieldset class="choice-group">
      <legend>${escapeHtml(prompt.label)}</legend>
      <div class="choice-grid">
        ${prompt.options.map((option) => `
          <label class="choice ${current === option ? "selected" : ""}">
            <input type="radio" name="${escapeHtml(prompt.id)}" value="${escapeHtml(option)}" ${current === option ? "checked" : ""}>
            <span>${escapeHtml(option)}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

function renderSections() {
  const completeCount = ASSESSMENT_SECTIONS.filter((section) => sectionStats(section.id, state.scoredResponses).complete).length;
  const nextSectionId = nextIncompleteSectionId(state.activeSectionId ?? ASSESSMENT_SECTIONS[0].id, state.scoredResponses) ?? ASSESSMENT_SECTIONS[0].id;
  root.innerHTML = `
    <section class="panel">
      <div class="step-header">
        <p class="eyebrow">Guided intake</p>
        <h1>Eight short conversations</h1>
        <p>Each conversation is sized for a future voice-to-voice flow: ask, answer, confirm, continue.</p>
      </div>
      ${progressMarkup()}
      <section class="section-grid" aria-label="Assessment sections">
        ${ASSESSMENT_SECTIONS.map(renderSectionCard).join("")}
      </section>
      <div class="nav-row">
        <button class="secondary" data-action="context">Back to context</button>
        <button class="primary" data-action="start-section" data-section-id="${escapeHtml(nextSectionId)}">
          ${completeCount === ASSESSMENT_SECTIONS.length ? "Review first conversation" : "Continue next conversation"}
        </button>
        <button class="ghost" data-action="after-sections" ${completeCount === ASSESSMENT_SECTIONS.length ? "" : "disabled"}>Continue</button>
      </div>
    </section>
  `;
}

function renderSectionCard(section) {
  const stats = sectionStats(section.id, state.scoredResponses);
  const sectionNumber = sectionIndex(section.id) + 1;
  return `
    <article class="section-card ${stats.complete ? "complete" : ""}">
      <div class="section-card-top">
        <span>Section ${sectionNumber}</span>
        <strong>${stats.answered}/${stats.total}</strong>
      </div>
      <h2>${escapeHtml(section.title)}</h2>
      <p>${escapeHtml(section.subtitle)}</p>
      <p class="voice-note">${escapeHtml(section.voiceGoal)}</p>
      ${sectionProgressMarkup(section)}
      <button class="${stats.complete ? "secondary" : "primary"}" data-action="start-section" data-section-id="${escapeHtml(section.id)}">
        ${stats.answered === 0 ? "Start" : stats.complete ? "Review" : "Resume"}
      </button>
    </article>
  `;
}

function renderAssessment() {
  const item = SPINE_ITEMS[state.itemIndex];
  const section = sectionForItem(item) ?? ASSESSMENT_SECTIONS[0];
  const sectionItems = itemsForSection(section.id);
  const sectionPromptIndex = sectionItems.findIndex((sectionItem) => sectionItem.id === item.id);
  const isFirstInSection = sectionPromptIndex === 0;
  const isLastInSection = sectionPromptIndex === sectionItems.length - 1;
  const current = state.scoredResponses[item.id];
  root.innerHTML = `
    <section class="panel interview-panel">
      <div class="step-header compact">
        <p class="eyebrow">Conversation ${sectionIndex(section.id) + 1} of ${ASSESSMENT_SECTIONS.length} - scored spine</p>
        <h1>${escapeHtml(section.title)}</h1>
        <p>${escapeHtml(item.kernel)} / ${escapeHtml(item.domain)} / ${escapeHtml(item.function)} / ${escapeHtml(item.heuristic)}</p>
      </div>
      ${renderSectionPills(section.id)}
      ${sectionProgressMarkup(section)}
      ${progressMarkup()}
      <article class="prompt-card">
        <div class="question-count">Prompt ${sectionPromptIndex + 1} of ${sectionItems.length} in this conversation / overall ${state.itemIndex + 1} of ${SPINE_ITEMS.length}</div>
        <h2>${escapeHtml(item.prompt)}</h2>
        <p class="scale-note">Past month. Choose the closest frequency.</p>
        <div class="scale-grid" role="radiogroup" aria-label="Frequency response">
          ${RESPONSE_SCALE.map((option) => `
            <button
              class="scale-button ${Number(current) === option.value ? "selected" : ""}"
              data-action="score"
              data-item-id="${escapeHtml(item.id)}"
              data-value="${option.value}"
              aria-pressed="${Number(current) === option.value}"
            >
              <strong>${option.value}</strong>
              <span>${escapeHtml(option.label)}</span>
            </button>
          `).join("")}
        </div>
      </article>
      <div class="nav-row">
        <button class="secondary" data-action="${isFirstInSection ? "sections" : "previous-item"}">${isFirstInSection ? "Conversations" : "Back"}</button>
        <button class="ghost" data-action="sections">Conversation overview</button>
        <button class="primary" data-action="next-item" ${current === undefined ? "disabled" : ""}>
          ${isLastInSection ? "Finish conversation" : "Next"}
        </button>
      </div>
    </section>
  `;
}

function renderSectionPills(activeSectionId) {
  return `
    <div class="section-pills" aria-label="Interview section tracker">
      ${ASSESSMENT_SECTIONS.map((section) => {
        const stats = sectionStats(section.id, state.scoredResponses);
        return `
          <button class="section-pill ${section.id === activeSectionId ? "active" : ""} ${stats.complete ? "complete" : ""}" data-action="start-section" data-section-id="${escapeHtml(section.id)}">
            <span>${sectionIndex(section.id) + 1}</span>
            ${escapeHtml(section.shortTitle)}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderSectionComplete() {
  const section = ASSESSMENT_SECTIONS.find((candidate) => candidate.id === state.lastCompletedSectionId) ?? ASSESSMENT_SECTIONS[0];
  const nextSectionId = nextIncompleteSectionId(section.id, state.scoredResponses);
  const allComplete = ASSESSMENT_SECTIONS.every((candidate) => sectionStats(candidate.id, state.scoredResponses).complete);
  root.innerHTML = `
    <section class="panel section-complete-panel">
      <div class="step-header">
        <p class="eyebrow">Pause point</p>
        <h1>${escapeHtml(section.title)} complete</h1>
        <p>Your answers are saved.</p>
      </div>
      ${progressMarkup()}
      <div class="pause-card">
        <h2>Good stopping place</h2>
        <p>Your answers are saved locally in this browser. You can continue now, review sections, or come back later.</p>
      </div>
      <div class="nav-row">
        <button class="secondary" data-action="sections">Review conversations</button>
        ${
          allComplete
            ? '<button class="primary" data-action="after-sections">Continue</button>'
            : `<button class="primary" data-action="start-section" data-section-id="${escapeHtml(nextSectionId)}">Continue next conversation</button>`
        }
      </div>
    </section>
  `;
}

function renderClarifiers() {
  const clarifiers = activeClarifiers(state.scoredResponses);
  if (!clarifiers.length) {
    setView("narrative");
    return;
  }
  root.innerHTML = `
    <section class="panel">
      <div class="step-header">
        <p class="eyebrow">Step 3 of 6</p>
        <h1>A few follow-ups</h1>
        <p>Only the patterns that need a little more signal.</p>
      </div>
      <form class="stack" data-form="adaptive">
        ${clarifiers.map(renderClarifier).join("")}
      </form>
      <div class="nav-row">
        <button class="secondary" data-action="sections">Back to conversations</button>
        <button class="primary" data-action="narrative">Continue</button>
      </div>
    </section>
  `;
}

function renderClarifier(clarifier) {
  const current = state.adaptiveResponses[clarifier.id] ?? "";
  return `
    <fieldset class="choice-group">
      <legend>${escapeHtml(clarifier.prompt)}</legend>
      <div class="choice-grid">
        ${clarifier.options.map((option) => `
          <label class="choice ${current === option ? "selected" : ""}">
            <input type="radio" name="${escapeHtml(clarifier.id)}" value="${escapeHtml(option)}" ${current === option ? "checked" : ""}>
            <span>${escapeHtml(option)}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

function renderNarrative() {
  root.innerHTML = `
    <section class="panel">
      <div class="step-header">
        <p class="eyebrow">Narrative capture</p>
        <h1>Narrative capture</h1>
        <p>Optional notes for the final map.</p>
      </div>
      <form class="stack" data-form="narrative">
        ${NARRATIVE_PROMPTS.map((prompt) => `
          <label class="textarea-field">
            <span>${escapeHtml(prompt.label)}</span>
            <textarea name="${escapeHtml(prompt.id)}" rows="4">${escapeHtml(state.narrativeResponses[prompt.id] ?? "")}</textarea>
          </label>
        `).join("")}
      </form>
      <div class="nav-row">
        <button class="secondary" data-action="${activeClarifiers(state.scoredResponses).length ? "clarifiers" : "sections"}">Back</button>
        <button class="primary" data-action="validity">Continue</button>
      </div>
    </section>
  `;
}

function renderValidity() {
  const answered = validityAnsweredCount();
  root.innerHTML = `
    <section class="panel">
      <div class="step-header">
        <p class="eyebrow">Answer check</p>
        <h1>Answer check</h1>
        <p>These tune confidence in the final interpretation.</p>
      </div>
      <div class="stack">
        ${VALIDITY_ITEMS.map(renderValidityItem).join("")}
      </div>
      <div class="readiness-line" aria-live="polite">${answered}/${VALIDITY_ITEMS.length} checks complete</div>
      <div class="nav-row">
        <button class="secondary" data-action="narrative">Back</button>
        <button class="primary" data-action="safety" ${isValidityComplete() ? "" : "disabled"}>Continue</button>
      </div>
    </section>
  `;
}

function renderValidityItem(item) {
  const current = state.validityResponses[item.id];
  return `
    <article class="safety-card">
      <h2>${escapeHtml(item.prompt)}</h2>
      <div class="scale-grid compact-scale" role="radiogroup" aria-label="Answer confidence response">
        ${RESPONSE_SCALE.map((option) => `
          <button
            class="scale-button ${Number(current) === option.value ? "selected" : ""}"
            data-action="validity-score"
            data-item-id="${escapeHtml(item.id)}"
            data-value="${option.value}"
            aria-pressed="${Number(current) === option.value}"
          >
            <strong>${option.value}</strong>
            <span>${option.value === 0 ? "Not true" : option.value === 4 ? "Very true" : option.label}</span>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function renderSafety() {
  const answered = safetyAnsweredCount();
  root.innerHTML = `
    <section class="panel">
      <div class="step-header">
        <p class="eyebrow">Private check</p>
        <h1>Safety and referral protection</h1>
        <p>Separate from your capacity score.</p>
      </div>
      <div class="stack">
        ${SAFETY_ITEMS.map(renderSafetyItem).join("")}
      </div>
      <div class="readiness-line" aria-live="polite">${answered}/${SAFETY_ITEMS.length} private checks complete</div>
      <div class="nav-row">
        <button class="secondary" data-action="validity">Back</button>
        <button class="primary" data-action="report" ${isSafetyComplete() ? "" : "disabled"}>Generate report</button>
      </div>
    </section>
  `;
}

function renderSafetyItem(item) {
  const current = state.safetyResponses[item.id];
  return `
    <article class="safety-card">
      <h2>${escapeHtml(item.prompt)}</h2>
      <div class="scale-grid compact-scale" role="radiogroup" aria-label="Safety confidence response">
        ${RESPONSE_SCALE.map((option) => `
          <button
            class="scale-button ${Number(current) === option.value ? "selected" : ""}"
            data-action="safety-score"
            data-item-id="${escapeHtml(item.id)}"
            data-value="${option.value}"
            aria-pressed="${Number(current) === option.value}"
          >
            <strong>${option.value}</strong>
            <span>${option.value === 0 ? "Not true" : option.value === 4 ? "Very true" : option.label}</span>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function renderReport() {
  state.completedAt = state.completedAt ?? new Date().toISOString();
  saveState();

  const results = scoreAssessment(state.scoredResponses, state.safetyResponses);
  const activeFollowups = activeClarifiers(state.scoredResponses);
  const validity = validitySummary(state.validityResponses);
  const summary = draftPlainLanguageSummary(state, results);
  const signature = buildCapacitySignature(results);
  const differentialLens = buildDifferentialLens(state, results);
  const sectionSummaries = buildSectionSummaries(results);
  const experiments = buildExperiments(results);
  const conversationPrompts = buildConversationPrompts(results, validity);
  const cards = reportCardsFor(results);
  const readiness = [
    `${contextAnsweredCount()}/${CONTEXT_PROMPTS.length} context anchors`,
    `${answeredCount()}/${SPINE_ITEMS.length} scored prompts`,
    `${validityAnsweredCount()}/${VALIDITY_ITEMS.length} confidence checks`,
    `${safetyAnsweredCount()}/${SAFETY_ITEMS.length} private checks`
  ];
  root.innerHTML = `
    <section class="report-shell">
      <div class="report-hero">
        <p class="eyebrow">Personal capacity map</p>
        <h1>Your EC Map report</h1>
        <p>${escapeHtml(summary)}</p>
        ${prototypeNoticeMarkup()}
        <div class="readiness-strip" aria-label="Report readiness">
          ${readiness.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="report-actions">
          <button class="secondary" data-action="sections">Review conversations</button>
          <button class="primary" data-action="coach">Coach packet</button>
          <button class="secondary" data-action="method">Method</button>
          <button class="secondary" data-action="print">Print</button>
          <button class="ghost" data-action="reset">Start over</button>
        </div>
      </div>

      <section class="score-strip" aria-label="Driver confidence">
        ${metricTile("Cognition-led signal", `${results.driverConfidence.cognitionLed}%`)}
        ${metricTile("Chemistry-led signal", `${results.driverConfidence.chemistryLed}%`)}
        ${metricTile("Answered", `${results.completion.answered}/${results.completion.total}`)}
      </section>

      ${results.safetyFlags.length ? renderSafetyNotice(results.safetyFlags) : ""}

      ${renderSignature(signature)}

      ${renderDifferentialLens(differentialLens)}

      ${renderSectionSummary(sectionSummaries)}

      ${renderInterpretationPanel(activeFollowups, validity)}

      ${renderExperimentPlan(experiments)}

      ${renderConversationPrompts(conversationPrompts)}

      ${renderConciergeMethodPanel()}

      <section class="report-grid">
        ${cards.map(renderReportCard).join("")}
      </section>
    </section>
  `;
}

function renderCoachPacket() {
  state.completedAt = state.completedAt ?? new Date().toISOString();
  saveState();

  const results = scoreAssessment(state.scoredResponses, state.safetyResponses);
  const activeFollowups = activeClarifiers(state.scoredResponses);
  const validity = validitySummary(state.validityResponses);
  const coachReview = buildCoachReview(state, results, validity, activeFollowups);
  const sources = getSourcesForThemes(coachReview.evidenceThemes);
  const themes = getThemes(coachReview.evidenceThemes);
  root.innerHTML = `
    <section class="report-shell coach-shell">
      <div class="report-hero coach-hero">
        <p class="eyebrow">Pre-session coach packet</p>
        <h1>Coach Review</h1>
        <p>
          Structured intake notes for a midlife cognition coach or reviewer before the first session.
          Functional patterns only; medical and mental health decisions stay outside coaching scope.
        </p>
        ${prototypeNoticeMarkup()}
        <div class="readiness-strip" aria-label="Coach packet versions">
          <span>${escapeHtml(coachReview.versions.assessment)}</span>
          <span>${escapeHtml(coachReview.versions.scoring)}</span>
          <span>${escapeHtml(coachReview.versions.report)}</span>
        </div>
        <div class="report-actions">
          <button class="secondary" data-action="report">Client report</button>
          <button class="secondary" data-action="method">Method</button>
          <button class="secondary" data-action="print">Print packet</button>
          <button class="ghost" data-action="reset">Start over</button>
        </div>
      </div>

      <section class="coach-grid">
        <article class="coach-panel">
          <p class="eyebrow">Readiness</p>
          <h2>${escapeHtml(coachReview.sessionReadiness.status)}</h2>
          <div class="coach-checklist">
            ${coachReview.sessionReadiness.items.map((item) => `
              <div>
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)}/${escapeHtml(item.total)}</strong>
              </div>
            `).join("")}
          </div>
          <p class="coach-confidence">${escapeHtml(coachReview.sessionReadiness.confidence)}</p>
          ${renderPhraseList(coachReview.sessionReadiness.caveats, "No answer-confidence caveats surfaced.")}
        </article>

        <article class="coach-panel">
          <p class="eyebrow">Client context</p>
          <h2>Functional anchors</h2>
          <dl class="context-list">
            <div><dt>Role/load</dt><dd>${escapeHtml(coachReview.clientContext.roleType)}</dd></div>
            <div><dt>Meeting load</dt><dd>${escapeHtml(coachReview.clientContext.meetingLoad)}</dd></div>
            <div><dt>Sleep stability</dt><dd>${escapeHtml(coachReview.clientContext.sleepStability)}</dd></div>
            <div><dt>Transition context</dt><dd>${escapeHtml(coachReview.clientContext.transitionContext)}</dd></div>
            <div><dt>Before midlife</dt><dd>${escapeHtml(coachReview.clientContext.lifelongAttentionPattern)}</dd></div>
            <div><dt>Setting spread</dt><dd>${escapeHtml(coachReview.clientContext.settingSpread)}</dd></div>
            <div><dt>Timeline</dt><dd>${escapeHtml(coachReview.clientContext.timeline)}</dd></div>
          </dl>
          ${renderTaggedPhrase(coachReview.clientContext.compensationBurden)}
        </article>
      </section>

      ${renderSignature(coachReview.capacitySignature)}

      ${renderDifferentialLens(coachReview.differentialLens)}

      <section class="coach-grid">
        ${renderCoachListPanel("First-session priorities", coachReview.coachPriorities)}
        ${renderCoachListPanel("Verify verbally", coachReview.verificationQuestions)}
        ${renderCoachListPanel("Referral and scope", coachReview.referralConsiderations, "referral")}
        ${renderCoachListPanel("Do not over-interpret", coachReview.claimCaveats)}
      </section>

      ${renderConciergeMethodPanel()}

      <section class="coach-panel evidence-panel">
        <p class="eyebrow">Evidence and claim control</p>
        <h2>Source-backed boundaries</h2>
        <div class="theme-grid">
          ${themes.map((theme) => `
            <article>
              <h3>${escapeHtml(theme.label)}</h3>
              <p>${escapeHtml(theme.implementationRule)}</p>
            </article>
          `).join("")}
        </div>
        <div class="source-list">
          ${sources.map((source) => `
            <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderCoachListPanel(title, phrases, tone = "") {
  return `
    <article class="coach-panel ${escapeHtml(tone)}">
      <h2>${escapeHtml(title)}</h2>
      ${renderPhraseList(phrases)}
    </article>
  `;
}

function renderPhraseList(phrases, emptyText = "No items for this section.") {
  if (!phrases.length) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return `
    <ul class="tagged-list">
      ${phrases.map((item) => `<li>${renderTaggedPhrase(item)}</li>`).join("")}
    </ul>
  `;
}

function renderTaggedPhrase(item) {
  return `
    <span class="tagged-phrase">
      <span>${escapeHtml(item.text)}</span>
      <small>${escapeHtml(item.claimType)}</small>
    </span>
  `;
}

function renderMethod() {
  const methodSources = getSourcesByIds(methodSourceIds());
  const blueprintSources = getSourcesByIds(sourceBlueprintIds());
  root.innerHTML = `
    <section class="report-shell">
      <div class="report-hero">
        <p class="eyebrow">Concierge method</p>
        <h1>Built from patterns that already work</h1>
        <p>
          EC Map is a focused product layer on top of established digital-health patterns:
          short tasks, saved progress, narrative capture, source metadata, voice readiness, and human review.
        </p>
        ${prototypeNoticeMarkup()}
        <div class="report-actions">
          <button class="primary" data-action="start">${answeredCount() ? "Resume intake" : "Begin intake"}</button>
          <button class="secondary" data-action="report">Client report</button>
          <button class="secondary" data-action="coach">Coach packet</button>
          <button class="ghost" data-action="intro">Home</button>
        </div>
      </div>

      ${renderConciergeMethodPanel()}

      <section class="coach-panel evidence-panel">
        <p class="eyebrow">Reusable source patterns</p>
        <h2>Where the architecture comes from</h2>
        <div class="blueprint-grid">
          ${SOURCE_BLUEPRINTS.map(renderBlueprintCard).join("")}
        </div>
        <details class="evidence-drawer">
          <summary>Source links</summary>
          <div class="source-list">
            ${[...methodSources, ...blueprintSources].map((source) => `
              <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>
            `).join("")}
          </div>
        </details>
      </section>
    </section>
  `;
}

function renderBlueprintCard(blueprint) {
  return `
    <article>
      <span>${escapeHtml(blueprint.focus)}</span>
      <h3>${escapeHtml(blueprint.title)}</h3>
      <p>${escapeHtml(blueprint.pattern)}</p>
      <strong>${escapeHtml(blueprint.appMove)}</strong>
    </article>
  `;
}

function renderDifferentialLens(lens) {
  return `
    <section class="differential-card">
      <p class="eyebrow">ADHD-equal / menopause-equal lens</p>
      <h2>${escapeHtml(lens.status)}</h2>
      <p>${escapeHtml(lens.body)}</p>
      <div class="differential-grid">
        <article>
          <h3>Verify next</h3>
          <p>${escapeHtml(lens.verify)}</p>
        </article>
        <article>
          <h3>Boundary</h3>
          <p>${escapeHtml(lens.caveat)}</p>
        </article>
      </div>
    </section>
  `;
}

function renderSignature(signature) {
  return `
    <section class="signature-card">
      <p class="eyebrow">Capacity signature</p>
      <h2>${escapeHtml(signature.title)}</h2>
      <strong>${escapeHtml(signature.headline)}</strong>
      <p>${escapeHtml(signature.body)}</p>
      <p>${escapeHtml(signature.lever)}</p>
    </section>
  `;
}

function renderConciergeMethodPanel() {
  return `
    <section class="method-panel">
      <div class="section-title-row">
        <p class="eyebrow">Concierge product logic</p>
        <h2>Simple experience, high-signal interpretation</h2>
      </div>
      <div class="method-step-grid">
        ${CONCIERGE_METHOD_STEPS.map((step) => `
          <article>
            <span>${escapeHtml(step.title)}</span>
            <p>${escapeHtml(step.body)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSectionSummary(sectionSummaries) {
  return `
    <section class="section-summary-grid" aria-label="Section summary">
      ${sectionSummaries.map((section) => `
        <article class="section-summary-card">
          <span>${escapeHtml(section.status)}</span>
          <h2>${escapeHtml(section.title)}</h2>
          <p>Top signal: ${escapeHtml(section.topKernel)}</p>
          <div class="mini-meter" aria-label="${escapeHtml(section.title)} total ${section.total} of ${section.max}">
            <i style="width: ${Math.round((section.total / section.max) * 100)}%"></i>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderInterpretationPanel(activeFollowups, validity) {
  const answeredFollowups = activeFollowups.filter((clarifier) => state.adaptiveResponses[clarifier.id]);
  return `
    <section class="insight-panel">
      <div>
        <h2>Interpretation confidence</h2>
        <p>${escapeHtml(validity.confidence)}</p>
        ${validity.caveats.length ? `<ul>${validity.caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("")}</ul>` : ""}
      </div>
      <div>
        <h2>Follow-up signals</h2>
        ${
          answeredFollowups.length
            ? `<ul>${answeredFollowups.map((clarifier) => `<li><strong>${escapeHtml(clarifier.title)}:</strong> ${escapeHtml(state.adaptiveResponses[clarifier.id])}</li>`).join("")}</ul>`
            : "<p>No extra follow-up signals were needed.</p>"
        }
      </div>
    </section>
  `;
}

function renderExperimentPlan(experiments) {
  return `
    <section class="experiment-panel">
      <div class="section-title-row">
        <p class="eyebrow">Next 7 days</p>
        <h2>Small experiments</h2>
      </div>
      <div class="experiment-grid">
        ${experiments.map((experiment) => `
          <article class="experiment-card">
            <span>${escapeHtml(experiment.kernel)}</span>
            <h3>${escapeHtml(experiment.title)}</h3>
            <p>${escapeHtml(experiment.prompt)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderConversationPrompts(prompts) {
  return `
    <section class="conversation-card">
      <div>
        <p class="eyebrow">Care conversation</p>
        <h2>Useful language to bring forward</h2>
      </div>
      <ol>
        ${prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}
      </ol>
    </section>
  `;
}

function renderSafetyNotice(flags) {
  return `
    <section class="safety-notice">
      <h2>Private review recommended</h2>
      <p>
        ${flags.length} safety item${flags.length === 1 ? "" : "s"} crossed the review threshold. This is separate from your capacity score.
        If you may be in immediate danger, contact local emergency services. In the U.S., you can call, text, or chat with
        <a href="https://988lifeline.org/get-help/" target="_blank" rel="noreferrer">988 Lifeline</a>.
      </p>
    </section>
  `;
}

function guardedView() {
  const needsContext = ["sections", "assessment", "section-complete", "clarifiers", "narrative", "validity", "safety", "report", "coach"];
  const needsScoredAssessment = ["clarifiers", "narrative", "validity", "safety", "report", "coach"];
  if (needsContext.includes(state.view) && !isContextComplete()) return "context";
  if (needsScoredAssessment.includes(state.view) && answeredCount() < SPINE_ITEMS.length) return "sections";
  if (["safety", "report", "coach"].includes(state.view) && !isValidityComplete()) return "validity";
  if (["report", "coach"].includes(state.view) && !isSafetyComplete()) return "safety";
  return state.view;
}

function metricTile(label, value) {
  return `
    <article class="metric-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderReportCard(card) {
  const sources = getSourcesForThemes(card.evidenceThemes);
  const themes = getThemes(card.evidenceThemes);
  return `
    <article class="report-card ${escapeHtml(card.tone)}">
      <div class="card-heading">
        <h2>${escapeHtml(card.title)}</h2>
      </div>
      <div class="ranked-list">
        ${card.items.length ? card.items.map((item) => `
          <div class="ranked-item">
            <div>
              <h3>${escapeHtml(item.kernel)}</h3>
              <p>${escapeHtml(item.narrative ?? item.status)}</p>
            </div>
            <strong>${escapeHtml(item.total)}</strong>
          </div>
        `).join("") : '<p class="muted">No high-scoring items in this category yet.</p>'}
      </div>
      <details class="evidence-drawer">
        <summary>Why this matters</summary>
        ${themes.map((theme) => `
          <div class="theme-note">
            <h3>${escapeHtml(theme.label)}</h3>
            <p>${escapeHtml(theme.userFacing)}</p>
          </div>
        `).join("")}
        <div class="source-list">
          ${sources.map((source) => `
            <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>
          `).join("")}
        </div>
      </details>
    </article>
  `;
}

function handleClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "start") setView("context");
  if (action === "intro") setView("intro");
  if (action === "context") setView("context");
  if (action === "sections") setView("sections");
  if (action === "clarifiers") setView("clarifiers");
  if (action === "narrative") setView("narrative");
  if (action === "validity") setView("validity");
  if (action === "safety") setView("safety");
  if (action === "report") setView("report");
  if (action === "coach") setView("coach");
  if (action === "method") setView("method");
  if (action === "after-sections") setView(activeClarifiers(state.scoredResponses).length ? "clarifiers" : "narrative");
  if (action === "print") window.print();
  if (action === "reset" && confirm("Start over and clear local answers?")) resetState();
  if (action === "demo-report") seedDemoReport();

  if (action === "start-section") {
    const sectionId = button.dataset.sectionId;
    state.activeSectionId = sectionId;
    state.itemIndex = firstUnansweredIndexForSection(sectionId, state.scoredResponses);
    setView("assessment");
  }

  if (action === "score") {
    state.scoredResponses[button.dataset.itemId] = Number(button.dataset.value);
    saveState();
    render();
  }

  if (action === "safety-score") {
    state.safetyResponses[button.dataset.itemId] = Number(button.dataset.value);
    saveState();
    render();
  }

  if (action === "validity-score") {
    state.validityResponses[button.dataset.itemId] = Number(button.dataset.value);
    saveState();
    render();
  }

  if (action === "previous-item") {
    state.itemIndex = Math.max(0, state.itemIndex - 1);
    saveState();
    renderAssessment();
  }

  if (action === "next-item") {
    const section = sectionForItem(SPINE_ITEMS[state.itemIndex]);
    const sectionItems = section ? itemsForSection(section.id) : [];
    const sectionPromptIndex = sectionItems.findIndex((sectionItem) => sectionItem.id === SPINE_ITEMS[state.itemIndex].id);
    if (section && sectionPromptIndex === sectionItems.length - 1) {
      state.lastCompletedSectionId = section.id;
      state.activeSectionId = section.id;
      setView("section-complete");
    } else {
      state.itemIndex += 1;
      saveState();
      renderAssessment();
    }
  }
}

function handleChange(event) {
  const input = event.target;
  if (input.matches('[data-form="context"] input[type="radio"]')) {
    state.contextResponses[input.name] = input.value;
    saveState();
    renderContext();
  }
  if (input.matches('[data-form="adaptive"] input[type="radio"]')) {
    state.adaptiveResponses[input.name] = input.value;
    saveState();
    renderClarifiers();
  }
}

function handleInput(event) {
  const input = event.target;
  if (input.matches('[data-form="narrative"] textarea')) {
    state.narrativeResponses[input.name] = input.value;
    saveState();
  }
}

function render() {
  const view = guardedView();
  if (view !== state.view) {
    state.view = view;
    saveState();
  }
  if (view === "context") renderContext();
  else if (view === "sections") renderSections();
  else if (view === "assessment") renderAssessment();
  else if (view === "section-complete") renderSectionComplete();
  else if (view === "clarifiers") renderClarifiers();
  else if (view === "narrative") renderNarrative();
  else if (view === "validity") renderValidity();
  else if (view === "safety") renderSafety();
  else if (view === "report") renderReport();
  else if (view === "coach") renderCoachPacket();
  else if (view === "method") renderMethod();
  else renderIntro();
}

root.addEventListener("click", handleClick);
root.addEventListener("change", handleChange);
root.addEventListener("input", handleInput);
render();
