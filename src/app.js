import {
  NARRATIVE_PROMPTS,
  RESPONSE_SCALE,
  SAFETY_ITEMS
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
  ACTIVE_CONTEXT_PROMPTS,
  ACTIVE_SPINE_ITEMS,
  ASSESSMENT_SECTIONS,
  firstUnansweredIndexForSection,
  itemsForSection,
  nextIncompleteSectionId,
  PAUSED_HORMONAL_ASSESSMENT,
  PAUSED_HORMONAL_ITEMS,
  sectionForItem,
  sectionIndex,
  sectionStats
} from "./sections.js";
import { draftPlainLanguageSummary } from "./summary.js";
import { CORE_PROFILE_VERSION, normalizeCoreSession } from "./session-profile.js";

const STORAGE_KEY = "ec-map-guided-capacity-session-v1";
const API_BASE = "/api";
const IS_STATIC_LOCAL_PREVIEW = window.location.port === "5173";
const root = document.querySelector("#app");

const defaultState = {
  assessmentProfileVersion: CORE_PROFILE_VERSION,
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
  patientId: "",
  mockDataAcknowledged: false,
  mockDataAcknowledgedAt: "",
  savedAssessmentId: "",
  completedAt: null
};

let state = loadState();
const serverState = {
  loading: true,
  available: false,
  message: "Checking database connection...",
  patients: [],
  assessments: [],
  saveStatus: ""
};

const routeParams = new URLSearchParams(window.location.search);
if (routeParams.has("fresh")) {
  localStorage.removeItem(STORAGE_KEY);
  state = { ...defaultState };
  window.history.replaceState({}, "", window.location.pathname);
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeCoreSession(JSON.parse(stored), defaultState) : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  state = normalizeCoreSession(state, defaultState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  state = { ...defaultState, view: "intro" };
  saveState();
  render();
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return response.json();
}

async function refreshServerState({ rerender = true } = {}) {
  if (IS_STATIC_LOCAL_PREVIEW) {
    serverState.loading = false;
    serverState.available = false;
    serverState.message = "Static local mode keeps progress in this browser and does not connect to Postgres.";
    if (rerender) render();
    return;
  }
  serverState.loading = true;
  serverState.message = "Checking database connection...";
  if (rerender) render();
  try {
    const [patientResponse, assessmentResponse] = await Promise.all([
      apiJson("/mock-patients"),
      apiJson("/assessments?limit=8")
    ]);
    serverState.available = true;
    serverState.patients = patientResponse.patients ?? [];
    serverState.assessments = assessmentResponse.assessments ?? [];
    serverState.message = "Postgres is connected.";
    if (!state.patientId && serverState.patients.length) {
      state.patientId = serverState.patients[0].id;
      saveState();
    }
  } catch (error) {
    serverState.available = false;
    serverState.patients = [];
    serverState.assessments = [];
    serverState.message = "Database API unavailable. Run Docker Compose to test saved assessments.";
  } finally {
    serverState.loading = false;
    if (rerender) render();
  }
}

function selectedPatient() {
  return serverState.patients.find((patient) => patient.id === state.patientId) ?? serverState.patients[0] ?? null;
}

function redactedResultsForSave(results) {
  const { safetyFlags, ...safeResults } = results;
  return {
    ...safeResults,
    privateSafety: {
      redacted: true,
      flagCount: safetyFlags.length
    }
  };
}

function buildSavePayload() {
  const results = scoreAssessment(state.scoredResponses, state.safetyResponses);
  const activeFollowups = activeClarifiers(state.scoredResponses);
  const validity = validitySummary(state.validityResponses);
  const coachReview = buildCoachReview(state, results, validity, activeFollowups);
  const acknowledgedAt = state.mockDataAcknowledgedAt || new Date().toISOString();
  const { safetyResponses, ...safeSession } = state;
  return {
    patientId: selectedPatient()?.id || state.patientId,
    status: state.completedAt ? "completed" : "in_progress",
    dataUseAcknowledgement: {
      mockDataOnly: state.mockDataAcknowledged === true,
      scope: "prototype-preview",
      acknowledgedAt
    },
    session: {
      ...safeSession,
      privateSafety: {
        redacted: true,
        answeredCount: Object.keys(safetyResponses ?? {}).length
      },
      mockDataAcknowledgedAt: acknowledgedAt,
      savedAssessmentId: undefined
    },
    report: {
      generatedAt: new Date().toISOString(),
      summary: draftPlainLanguageSummary(state, results),
      results: redactedResultsForSave(results),
      coachReview
    },
    versions: coachReview.versions,
    completedAt: state.completedAt
  };
}

async function saveAssessmentToServer() {
  if (!state.mockDataAcknowledged) {
    serverState.saveStatus = "Confirm this is demo/mock data only before saving.";
    render();
    return;
  }
  serverState.saveStatus = "Saving assessment...";
  render();
  try {
    if (!serverState.available) {
      await refreshServerState({ rerender: false });
    }
    if (!serverState.available) {
      throw new Error("Postgres is not connected");
    }
    const saved = await apiJson("/assessments", {
      method: "POST",
      body: JSON.stringify(buildSavePayload())
    });
    state.savedAssessmentId = saved.id;
    saveState();
    serverState.saveStatus = `Saved assessment ${saved.id.slice(0, 8)} for ${saved.patientName ?? saved.patientId}.`;
    await refreshServerState({ rerender: false });
  } catch (error) {
    serverState.saveStatus = error.message;
  }
  render();
}

async function exportAssessmentFromServer(id) {
  serverState.saveStatus = "Preparing redacted export...";
  render();
  try {
    const assessment = await apiJson(`/assessments/${encodeURIComponent(id)}`);
    const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ec-map-preview-${id.slice(0, 8)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    serverState.saveStatus = `Exported redacted assessment ${id.slice(0, 8)}.`;
  } catch (error) {
    serverState.saveStatus = error.message;
  }
  render();
}

async function deleteAssessmentFromServer(id) {
  if (!confirm("Delete this saved mock assessment from the local preview database?")) return;
  serverState.saveStatus = "Deleting saved assessment...";
  render();
  try {
    await apiJson(`/assessments/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (state.savedAssessmentId === id) {
      state.savedAssessmentId = "";
      saveState();
    }
    serverState.saveStatus = `Deleted saved assessment ${id.slice(0, 8)}.`;
    await refreshServerState({ rerender: false });
  } catch (error) {
    serverState.saveStatus = error.message;
  }
  render();
}

function seedDemoReport() {
  const highCognition = new Set(["C1-Sig", "C1-Cost", "C1-Disc", "C1-Mod", "C3-Sig", "C3-Cost", "C3-Disc", "C3-Mod"]);
  const highChemistry = new Set(["H3-Sig", "H3-Cost", "H3-Disc", "H3-Mod", "H4-Sig", "H4-Cost", "H4-Disc", "H4-Mod", "H8-Sig", "H8-Cost"]);
  state = {
    ...defaultState,
    view: "report",
    contextResponses: {
      role_type: "Heavy-output knowledge work",
      meeting_load: "5 to 15 hours",
      sleep_stability: "Variable",
      lifelong_attention_pattern: "Longstanding since childhood or teen years",
      setting_spread: "Across work, home, and relationships",
      timeline: "Has fluctuated"
    },
    scoredResponses: Object.fromEntries(
      ACTIVE_SPINE_ITEMS.map((item) => [item.id, highCognition.has(item.id) ? 4 : highChemistry.has(item.id) ? 3 : 1])
    ),
    narrativeResponses: {
      compensating_for: "Keeping complex work moving while memory and recovery vary.",
      public_private_cost: "I can perform in meetings, then lose the evening.",
      capacity_shift: "I would write and plan again without burning out.",
      what_helped: "Quiet blocks, sleep protection, and writing the first step."
    },
    adaptiveResponses: {
      A1: ["Interruptions", "Poor sleep"],
      A2: ["Clear first step", "Accountability"],
      A10: ["Longstanding wiring", "Body-state change", "Current context or role load"]
    },
    validityResponses: { V1: 4, V2: 3, V3: 1, V4: 3 },
    safetyResponses: { S1: 0, S2: 0, S3: 0, S4: 0 },
    patientId: state.patientId || selectedPatient()?.id || "",
    mockDataAcknowledged: false,
    mockDataAcknowledgedAt: "",
    savedAssessmentId: "",
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
  return countAnswered(state.contextResponses, ACTIVE_CONTEXT_PROMPTS.map((prompt) => prompt.id));
}

function validityAnsweredCount() {
  return countAnswered(state.validityResponses, VALIDITY_ITEMS.map((item) => item.id));
}

function safetyAnsweredCount() {
  return countAnswered(state.safetyResponses, SAFETY_ITEMS.map((item) => item.id));
}

function isContextComplete() {
  return contextAnsweredCount() === ACTIVE_CONTEXT_PROMPTS.length;
}

function isValidityComplete() {
  return validityAnsweredCount() === VALIDITY_ITEMS.length;
}

function isSafetyComplete() {
  return safetyAnsweredCount() === SAFETY_ITEMS.length;
}

function answeredCount() {
  return Object.keys(state.scoredResponses).filter((id) => ACTIVE_SPINE_ITEMS.some((item) => item.id === id)).length;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function valuesForAdaptiveResponse(response) {
  if (Array.isArray(response)) return response;
  if (response === undefined || response === null || response === "") return [];
  return [response];
}

function formatAdaptiveResponse(response) {
  return valuesForAdaptiveResponse(response).join(", ");
}

function progressMarkup() {
  const answered = answeredCount();
  const pct = Math.round((answered / ACTIVE_SPINE_ITEMS.length) * 100);
  return `
    <div class="progress-block" aria-label="Assessment progress">
      <div class="progress-meta">
        <span>${answered}/${ACTIVE_SPINE_ITEMS.length} scored prompts answered</span>
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
          <h1>Map the capacity behind the work</h1>
        </div>
      </div>
      <div class="hero-meta" aria-label="Assessment format">
        <span>7 shared assessments</span>
        <span>8 prompts each</span>
        <span>Pause anytime</span>
      </div>
      <p class="hero-copy">
        A guided executive-capacity intake for adults of any sex: cognition, energy, stress, body load, medication effects, and recovery.
      </p>
      ${prototypeNoticeMarkup()}
      ${renderPausedModuleNotice()}
      <p class="privacy-line">Saved in this browser.</p>
      ${renderPersistencePanel({ allowSave: false })}
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

function renderPausedModuleNotice() {
  return `
    <aside class="module-pause-notice" aria-label="Hormonal module status">
      <div>
        <p class="eyebrow">Separate future module</p>
        <h2>Hormonal assessment paused</h2>
        <p>${escapeHtml(PAUSED_HORMONAL_ASSESSMENT.pauseReason)} It is not included in this shared seven-assessment score or report.</p>
      </div>
      <div class="module-pause-facts" aria-label="Paused module facts">
        <span>${PAUSED_HORMONAL_ITEMS.length} source prompts preserved</span>
        <span>Not scored</span>
        <span>Not saved in active sessions</span>
      </div>
    </aside>
  `;
}

function renderConciergeMethodSummary() {
  const highlights = [
    "Short voice-sized conversations",
    "Lifespan and current-state interpretation",
    "Client report plus coach packet"
  ];
  return `
    <div class="method-summary" aria-label="Product method">
      ${highlights.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function renderPersistencePanel({ allowSave = false } = {}) {
  if (serverState.loading) {
    return `
      <section class="persistence-panel">
        <p class="eyebrow">Database preview</p>
        <h2>Checking Postgres</h2>
        <p>${escapeHtml(serverState.message)}</p>
      </section>
    `;
  }

  if (!serverState.available) {
    return `
      <section class="persistence-panel">
        <p class="eyebrow">Database preview</p>
        <h2>Local-only mode</h2>
        <p>${escapeHtml(serverState.message)}</p>
      </section>
    `;
  }

  const patient = selectedPatient();
  const saveDisabled = allowSave && !state.mockDataAcknowledged;
  return `
    <section class="persistence-panel">
      <div>
        <p class="eyebrow">Database preview</p>
        <h2>Mock patient save testing</h2>
        <p>${patient ? escapeHtml(patient.profileNotes) : "Choose a mock patient before saving."}</p>
      </div>
      <label class="select-field">
        <span>Mock patient</span>
        <select data-field="patient-id">
          ${serverState.patients.map((candidate) => `
            <option value="${escapeHtml(candidate.id)}" ${candidate.id === state.patientId ? "selected" : ""}>
              ${escapeHtml(candidate.displayName)} - mock profile
            </option>
          `).join("")}
        </select>
      </label>
      <div class="saved-session-strip">
        <span>${serverState.assessments.length} recent saved session${serverState.assessments.length === 1 ? "" : "s"}</span>
        ${state.savedAssessmentId ? `<span>Current save: ${escapeHtml(state.savedAssessmentId.slice(0, 8))}</span>` : ""}
      </div>
      ${serverState.assessments.length ? `
        <div class="recent-sessions">
          ${serverState.assessments.slice(0, 3).map((assessment) => `
            <div class="recent-session-row">
              <span>${escapeHtml(assessment.patientName ?? assessment.patientId)} / ${escapeHtml(assessment.status)} / ${escapeHtml(new Date(assessment.createdAt).toLocaleString())}</span>
              <div>
                <button class="ghost compact-action" data-action="export-assessment" data-assessment-id="${escapeHtml(assessment.id)}">Export redacted JSON</button>
                <button class="ghost danger compact-action" data-action="delete-assessment" data-assessment-id="${escapeHtml(assessment.id)}">Delete</button>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}
      ${allowSave ? `
        <label class="ack-field ${state.mockDataAcknowledged ? "selected" : ""}">
          <input type="checkbox" data-field="mock-data-ack" ${state.mockDataAcknowledged ? "checked" : ""}>
          <span>I confirm this save uses demo/mock data only, not real participant or patient information.</span>
        </label>
      ` : ""}
      <div class="persistence-actions">
        ${allowSave ? `<button class="primary" data-action="save-assessment" ${saveDisabled ? "disabled" : ""}>Save assessment</button>` : ""}
        <button class="secondary" data-action="refresh-db">Refresh saved sessions</button>
      </div>
      ${serverState.saveStatus ? `<p class="save-status">${escapeHtml(serverState.saveStatus)}</p>` : ""}
    </section>
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
        ${ACTIVE_CONTEXT_PROMPTS.map(renderContextPrompt).join("")}
      </form>
      <div class="readiness-line" aria-live="polite">${answered}/${ACTIVE_CONTEXT_PROMPTS.length} anchors complete</div>
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
        <h1>Seven shared assessments</h1>
        <p>Each conversation is sized for a future voice-to-voice flow: ask, answer, confirm, continue.</p>
      </div>
      ${progressMarkup()}
      <section class="section-grid" aria-label="Assessment sections">
        ${ASSESSMENT_SECTIONS.map(renderSectionCard).join("")}
      </section>
      ${renderPausedModuleNotice()}
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
  const item = ACTIVE_SPINE_ITEMS[state.itemIndex];
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
        <div class="question-count">Prompt ${sectionPromptIndex + 1} of ${sectionItems.length} in this assessment / overall ${state.itemIndex + 1} of ${ACTIVE_SPINE_ITEMS.length}</div>
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
  const currentValues = valuesForAdaptiveResponse(state.adaptiveResponses[clarifier.id]);
  const inputType = clarifier.multi ? "checkbox" : "radio";
  return `
    <fieldset class="choice-group">
      <legend>${escapeHtml(clarifier.prompt)}</legend>
      <div class="choice-grid">
        ${clarifier.options.map((option) => {
          const selected = currentValues.includes(option);
          return `
          <label class="choice ${selected ? "selected" : ""}">
            <input type="${inputType}" name="${escapeHtml(clarifier.id)}" value="${escapeHtml(option)}" ${selected ? "checked" : ""}>
            <span>${escapeHtml(option)}</span>
          </label>
        `;
        }).join("")}
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
    `${contextAnsweredCount()}/${ACTIVE_CONTEXT_PROMPTS.length} context anchors`,
    `${answeredCount()}/${ACTIVE_SPINE_ITEMS.length} scored prompts`,
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
        ${renderPersistencePanel({ allowSave: true })}
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
          Structured intake notes for an executive-capacity coach or reviewer before the first session.
          Functional patterns only; medical and mental health decisions stay outside coaching scope.
        </p>
        ${prototypeNoticeMarkup()}
        ${renderPersistencePanel({ allowSave: true })}
        <div class="readiness-strip" aria-label="Coach packet versions">
          <span>${escapeHtml(coachReview.versions.assessment)}</span>
          <span>${escapeHtml(coachReview.versions.scoring)}</span>
          <span>${escapeHtml(coachReview.versions.report)}</span>
          <span>${escapeHtml(coachReview.versions.governance)}</span>
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
            <div><dt>Earlier-life pattern</dt><dd>${escapeHtml(coachReview.clientContext.lifelongAttentionPattern)}</dd></div>
            <div><dt>Setting spread</dt><dd>${escapeHtml(coachReview.clientContext.settingSpread)}</dd></div>
            <div><dt>Timeline</dt><dd>${escapeHtml(coachReview.clientContext.timeline)}</dd></div>
          </dl>
          ${renderTaggedPhrase(coachReview.clientContext.compensationBurden)}
        </article>
      </section>

      ${renderSolGovernancePanel(coachReview.solGovernance)}

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

function governanceStatusLabel(status) {
  return String(status ?? "unknown")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function governanceStatusClass(status) {
  if (["pass", "complete", "shadow_complete", "shadow_ready", "mapped"].includes(status)) return "pass";
  if (["human_review", "human_review_required", "shadow_ready_for_human_review", "human_mapping_needed", "context_only", "provisional_crosswalk"].includes(status)) return "review";
  if (["block", "blocked", "blocked_mock_only", "incomplete", "unmapped"].includes(status)) return "block";
  return "neutral";
}

function renderSolGovernancePanel(packet) {
  if (!packet) return "";
  return `
    <section class="coach-panel sol-governance" aria-labelledby="sol-governance-title">
      <div class="governance-header">
        <div>
          <p class="eyebrow">MVP checks and balances</p>
          <h2 id="sol-governance-title">Sol shadow governance</h2>
          <p>${escapeHtml(packet.runtime.note)}</p>
        </div>
        <span class="governance-status ${governanceStatusClass(packet.overallStatus)}">
          ${escapeHtml(governanceStatusLabel(packet.overallStatus))}
        </span>
      </div>

      <div class="governance-section">
        <div class="governance-section-heading">
          <div>
            <p class="eyebrow">6 gates</p>
            <h3>Fail-closed review</h3>
          </div>
          <p>Anything unresolved stays in human review.</p>
        </div>
        <div class="gate-grid">
          ${packet.gates.map((item) => `
            <article class="gate-card ${governanceStatusClass(item.status)}">
              <div><strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(governanceStatusLabel(item.status))}</span></div>
              <h4>${escapeHtml(item.label)}</h4>
              <p>${escapeHtml(item.detail)}</p>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="governance-split">
        <div class="governance-section">
          <div class="governance-section-heading">
            <div>
              <p class="eyebrow">4 index slots</p>
              <h3>Reserved, not inferred</h3>
            </div>
          </div>
          <div class="index-slot-grid">
            ${packet.canonicalIndices.map((index) => `
              <article class="index-slot">
                <strong>${escapeHtml(index.label)}</strong>
                <span>${escapeHtml(governanceStatusLabel(index.status))}</span>
                <p>${escapeHtml(index.reason)}</p>
              </article>
            `).join("")}
          </div>
        </div>

        <div class="governance-section">
          <div class="governance-section-heading">
            <div>
              <p class="eyebrow">7 stages</p>
              <h3>Visible lifecycle</h3>
            </div>
          </div>
          <ol class="lifecycle-grid">
            ${packet.lifecycle.map((stage) => `
              <li class="${governanceStatusClass(stage.status)}">
                <span>${escapeHtml(stage.number)}</span>
                <div><strong>${escapeHtml(stage.name)}</strong><small>${escapeHtml(governanceStatusLabel(stage.status))}</small></div>
              </li>
            `).join("")}
          </ol>
        </div>
      </div>

      <div class="governance-section">
        <div class="governance-section-heading">
          <div>
            <p class="eyebrow">Return to 8</p>
            <h3>Functional-domain crosswalk</h3>
          </div>
          <p>${escapeHtml(packet.returnTo8.rule)}</p>
        </div>
        <div class="domain-coverage-grid">
          ${packet.eightFCoverage.map((item) => `
            <article class="${governanceStatusClass(item.coverage)}">
              <strong>${escapeHtml(item.domain)}</strong>
              <span>${escapeHtml(governanceStatusLabel(item.coverage))}</span>
              <small>${item.kernelIds.length ? escapeHtml(item.kernelIds.join(", ")) : "Human mapping needed"}</small>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="governance-section">
        <div class="governance-section-heading">
          <div>
            <p class="eyebrow">2-sided reasoning</p>
            <h3>Support and challenge receipts</h3>
          </div>
          <p>These receipts expose why a pattern surfaced and what could change its interpretation.</p>
        </div>
        <div class="receipt-grid">
          ${packet.reasoningReceipts.map((receipt) => `
            <details class="reasoning-receipt">
              <summary>
                <span>${escapeHtml(receipt.kernel)}</span>
                <small>${escapeHtml(receipt.domains8f.join(" + ") || "8F mapping pending")}</small>
              </summary>
              <p>${escapeHtml(receipt.observedPattern)}</p>
              <div class="support-challenge-grid">
                <article>
                  <h4>Support</h4>
                  <p>${escapeHtml(receipt.support.evidence.length)} participant-reported items; deterministic total ${escapeHtml(receipt.support.deterministicFacetSummary.total)}.</p>
                </article>
                <article>
                  <h4>Challenge</h4>
                  <p>${escapeHtml(receipt.challenge.note)}</p>
                  <p><strong>Ask:</strong> ${escapeHtml(receipt.challenge.disconfirmingQuestion)}</p>
                </article>
              </div>
              <p class="receipt-boundary">${escapeHtml(receipt.confidence.note)}</p>
            </details>
          `).join("")}
        </div>
      </div>

      <div class="governance-boundary">
        <strong>Release remains blocked.</strong>
        <span>${escapeHtml(packet.release.reason)}</span>
      </div>
    </section>
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
      <p class="eyebrow">Lifespan / current-state lens</p>
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
            ? `<ul>${answeredFollowups.map((clarifier) => `<li><strong>${escapeHtml(clarifier.title)}:</strong> ${escapeHtml(formatAdaptiveResponse(state.adaptiveResponses[clarifier.id]))}</li>`).join("")}</ul>`
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
  if (needsScoredAssessment.includes(state.view) && answeredCount() < ACTIVE_SPINE_ITEMS.length) return "sections";
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
  if (action === "refresh-db") refreshServerState();
  if (action === "save-assessment") saveAssessmentToServer();
  if (action === "export-assessment") exportAssessmentFromServer(button.dataset.assessmentId);
  if (action === "delete-assessment") deleteAssessmentFromServer(button.dataset.assessmentId);

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
    const section = sectionForItem(ACTIVE_SPINE_ITEMS[state.itemIndex]);
    const sectionItems = section ? itemsForSection(section.id) : [];
    const sectionPromptIndex = sectionItems.findIndex((sectionItem) => sectionItem.id === ACTIVE_SPINE_ITEMS[state.itemIndex].id);
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
  if (input.matches('[data-field="patient-id"]')) {
    state.patientId = input.value;
    state.savedAssessmentId = "";
    saveState();
    render();
  }
  if (input.matches('[data-field="mock-data-ack"]')) {
    state.mockDataAcknowledged = input.checked;
    state.mockDataAcknowledgedAt = input.checked ? new Date().toISOString() : "";
    state.savedAssessmentId = "";
    saveState();
    render();
  }
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
  if (input.matches('[data-form="adaptive"] input[type="checkbox"]')) {
    const currentValues = valuesForAdaptiveResponse(state.adaptiveResponses[input.name]);
    state.adaptiveResponses[input.name] = input.checked
      ? [...new Set([...currentValues, input.value])]
      : currentValues.filter((value) => value !== input.value);
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
refreshServerState();
