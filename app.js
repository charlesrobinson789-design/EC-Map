// app.js — orchestrates the on-device interview.
// Lifecycle: load items + Whisper model → for each item, Interviewer speaks →
// Recorder captures voice → Whisper transcribes → Mapper produces value →
// Safety scans → user confirms → Scorer/Reporter at end.

import { loadWhisper, Recorder, blobToFloat32, transcribe, speak, stopSpeaking } from './whisper.js';
import { Interviewer, Mapper, Safety, Scorer, Reporter } from './agents.js';

const $ = (sel) => document.querySelector(sel);
const STORAGE_KEY = 'ecmap.session.v1';

const state = {
  items: [],
  scaleLegends: {},
  sections: {},
  session: null,
  index: 0,
  answers: {},
  pendingAnswer: null,
  pendingTranscript: '',
  safetyEvents: [],
  recorder: new Recorder(),
};

// ---------- Init ----------
async function init() {
  await loadItems();
  bindUI();
  newSessionId();

  // Kick off Whisper model load in background
  setStatus('Loading on-device speech engine…');
  loadWhisper((info) => {
    if (info?.status === 'progress' && info.progress != null) {
      setStatus(`Loading speech model… ${Math.round(info.progress)}%`);
    } else if (info?.status === 'ready' || info?.status === 'done') {
      setStatus('Speech engine ready · runs on this device');
    }
  }).then(() => setStatus('Speech engine ready · runs on this device'))
    .catch((e) => setStatus('Speech engine failed: ' + e.message));

  // Resume?
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.session?.id && Object.keys(parsed.answers || {}).length) {
        $('#btn-resume').classList.remove('hidden');
      }
    } catch {}
  } else {
    $('#btn-resume').classList.add('hidden');
  }
}

async function loadItems() {
  const res = await fetch('items.json');
  const spec = await res.json();
  state.items = (spec.items || []).filter(it => it.fieldType !== 'control_text'); // strip section banners if any
  state.scaleLegends = spec.scaleLegends || {};
  state.sections = spec.sections || {};
}

function newSessionId() {
  const id = 'ECM-' + Date.now().toString(36).toUpperCase();
  $('#session-id').value = id;
  return id;
}

// ---------- UI bindings ----------
function bindUI() {
  $('#btn-start').addEventListener('click', startSession);
  $('#btn-resume').addEventListener('click', resumeSession);
  $('#btn-back').addEventListener('click', () => navigate(state.index - 1));
  $('#btn-skip').addEventListener('click', () => { saveAnswer(null); navigate(state.index + 1); });
  $('#btn-replay').addEventListener('click', replayQuestion);
  $('#btn-next').addEventListener('click', confirmAndNext);
  $('#btn-export-json').addEventListener('click', exportJSON);
  $('#btn-export-md').addEventListener('click', exportMarkdown);
  $('#btn-clear').addEventListener('click', clearSession);
  $('#btn-safety-continue').addEventListener('click', () => {
    $('#safety-banner').classList.add('hidden');
    navigate(state.index + 1);
  });

  const micBtn = $('#btn-mic');
  let isRecording = false;
  state.autoAdvanceEnabled = true;

  const startRec = async () => {
    if (isRecording) return;
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.querySelector('.mic-label').textContent = 'Listening…';
    $('#mic-status').textContent = 'Recording. Speak now.';
    try { 
      await state.recorder.start((timeout) => {
        // on silence detected
        if (isRecording) stopRec();
      }); 
    }
    catch (err) {
      isRecording = false;
      micBtn.classList.remove('recording');
      $('#mic-status').textContent = 'Mic blocked. Allow microphone access.';
    }
  };

  const stopRec = async () => {
    if (!isRecording) return;
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.querySelector('.mic-label').textContent = 'Tap to speak';
    $('#mic-status').textContent = 'Transcribing on device…';
    try {
      const blob = await state.recorder.stop();
      if (!blob) { $('#mic-status').textContent = 'Too short or no speech — tap to try again.'; return; }
      const audio = await blobToFloat32(blob);
      const text = await transcribe(audio);
      $('#transcript').textContent = text;
      state.pendingTranscript = text;
      // Safety scan first
      const crisis = Safety.scanTranscript(text);
      if (crisis) {
         flagSafety(crisis, text);
         return;
      }
      // Map to answer
      mapAndPreview(text);
      if (state.pendingAnswer != null) {
         $('#mic-status').textContent = 'Answer mapped. Auto-advancing...';
         if (state.autoAdvanceEnabled) {
            setTimeout(() => confirmAndNext(), 2000);
         }
      } else {
         $('#mic-status').textContent = "Couldn't understand. Tap to try again or pick an option.";
         speak("Could you say that again?", { rate: 1.1 });
      }
    } catch (err) {
      $('#mic-status').textContent = 'Transcription failed: ' + err.message;
    }
  };

  const toggleRec = (e) => {
     if (e) e.preventDefault();
     if (isRecording) stopRec();
     else startRec();
  };

  micBtn.addEventListener('click', toggleRec);
}

// ---------- Session lifecycle ----------
function startSession() {
  const initials = ($('#patient-initials').value || '').toUpperCase().slice(0, 4);
  state.session = {
    id: $('#session-id').value,
    initials,
    startedAt: Date.now(),
  };
  state.index = 0;
  state.answers = {};
  state.safetyEvents = [];
  persist();
  showScreen('screen-interview');
  renderCurrent();
}

function resumeSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state.session = parsed.session;
    state.answers = parsed.answers || {};
    state.safetyEvents = parsed.safetyEvents || [];
    state.index = parsed.index || 0;
    showScreen('screen-interview');
    renderCurrent();
  } catch (e) {
    alert('Could not resume: ' + e.message);
  }
}

function clearSession() {
  if (!confirm('Clear this session from device? Cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state.session = null;
  state.answers = {};
  state.safetyEvents = [];
  state.index = 0;
  showScreen('screen-start');
  $('#patient-initials').value = '';
  newSessionId();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    session: state.session,
    index: state.index,
    answers: state.answers,
    safetyEvents: state.safetyEvents,
  }));
}

// ---------- Rendering ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

function setStatus(msg) { $('#model-status').textContent = msg; }

function renderCurrent() {
  const item = state.items[state.index];
  if (!item) return showReport();

  // Gating: if item requires prior answer, evaluate
  if (item.gating && !gatePasses(item.gating)) {
    saveAnswer('SKIPPED_GATING');
    return navigate(state.index + 1);
  }

  $('#section-label').textContent = `§${item.section} · ${item.subsection || ''}`;
  $('#stem-text').textContent = item.stem;
  $('#scale-legend').textContent = state.scaleLegends[guessScaleKey(item)] || '';
  $('#transcript').textContent = '';
  state.pendingAnswer = null;
  state.pendingTranscript = '';
  $('#btn-next').disabled = true;
  $('#safety-banner').classList.add('hidden');

  renderOptions(item);
  updateProgress();

  // Auto-speak the question
  stopSpeaking();
  speak(Interviewer.script(item)).then(() => {
    // Only auto-start if we are still on the same index and not recording yet
    if (state.index === item.indexToAvoidRace) return;
    
    // add small delay so user can process
    setTimeout(() => {
      // simulate click to start if it exists
      if (!document.querySelector('#btn-mic').classList.contains('recording')) {
         document.querySelector('#btn-mic').click();
      }
    }, 500);
  });
}

function guessScaleKey(item) {
  if (!item.options || !item.options.length) return null;
  const first = item.options[0];
  if (/^0\s/.test(first)) {
    if (/Not at all bothered/i.test(first)) return 'bother4';
    if (/None/i.test(first) && /Five or more/i.test(item.options[item.options.length-1] || '')) return 'utiCount';
    if (/None/i.test(first)) return 'sev5';
    return 'freq5';
  }
  return null;
}

function renderOptions(item) {
  const box = $('#answer-options');
  box.innerHTML = '';
  if (item.fieldType === 'control_number') {
    const input = document.createElement('input');
    input.type = 'number'; input.inputMode = 'numeric';
    input.placeholder = 'Enter a number';
    input.className = 'opt';
    input.style.padding = '14px';
    input.addEventListener('input', () => {
      const n = Number(input.value);
      if (!Number.isNaN(n)) setPending(n);
    });
    box.appendChild(input);
    return;
  }
  if (item.fieldType === 'control_textbox') {
    const ta = document.createElement('textarea');
    ta.placeholder = 'Type or dictate an answer';
    ta.className = 'opt';
    ta.rows = 3;
    ta.style.width = '100%';
    ta.addEventListener('input', () => setPending(ta.value));
    box.appendChild(ta);
    return;
  }
  if (item.fieldType === 'control_checkbox') {
    (item.options || []).forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'opt'; btn.type = 'button';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        const sel = Array.from(box.querySelectorAll('.opt.selected')).map(b => b.textContent);
        setPending(sel);
      });
      box.appendChild(btn);
    });
    return;
  }
  // Default: radio
  (item.options || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt'; btn.type = 'button';
    btn.dataset.value = /^[0-4]\s/.test(opt) ? String(i) : opt;
    btn.innerHTML = /^[0-4]\s/.test(opt)
      ? `<span class="num">${i}</span>${opt.replace(/^[0-4]\s*[—-]?\s*/, '')}`
      : opt;
    btn.addEventListener('click', () => {
      box.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const v = /^[0-4]\s/.test(opt) ? i : opt;
      setPending(v);
    });
    box.appendChild(btn);
  });
}

function mapAndPreview(text) {
  const item = state.items[state.index];
  const result = Mapper.map(item, text);
  if (result.value == null) return;
  // Reflect in UI
  $('#answer-options').querySelectorAll('.opt').forEach((b) => {
    const v = b.dataset.value;
    if (v != null && String(v) === String(result.value)) b.classList.add('selected');
    else b.classList.remove('selected');
  });
  setPending(result.value);
}

function setPending(v) {
  state.pendingAnswer = v;
  $('#btn-next').disabled = (v === null || v === undefined || v === '');
}

function gatePasses(gating) {
  // gating may be { id, anyOf:[...] } or { itemId, equals } or { itemId, in:[...] }
  if (!gating) return true;
  const refId = gating.id || gating.itemId;
  const prior = state.answers[refId];
  if (gating.anyOf) return gating.anyOf.includes(prior);
  if (gating.equals != null) return prior === gating.equals;
  if (gating.in) return gating.in.includes(prior);
  return true;
}

function flagSafety(crisis, transcript) {
  const item = state.items[state.index];
  $('#safety-msg').textContent = crisis.message;
  $('#safety-banner').classList.remove('hidden');
  state.safetyEvents.push({
    at: new Date().toISOString(),
    itemId: item.id,
    transcript: transcript.slice(0, 240),
  });
  persist();
}

// ---------- Nav ----------
function confirmAndNext() {
  const item = state.items[state.index];
  const v = state.pendingAnswer;
  const yesish = v === 'Yes' || (typeof v === 'string' && /^yes/i.test(v)) || v === true;
  if (Safety.isSafetyItem(item) && yesish) {
    const s = Safety.triggerFor(item);
    if (s) {
      flagSafety(s, 'Safety item triggered: ' + item.id);
      // For halt-level items, stop progression until user dismisses banner
      if (item.safety === 'halt') {
        saveAnswer(v);
        return; // do not advance
      }
    }
  }
  saveAnswer(v);
  navigate(state.index + 1);
}

function saveAnswer(v) {
  const item = state.items[state.index];
  if (!item) return;
  state.answers[item.id] = v;
  persist();
}

function navigate(idx) {
  if (idx < 0) idx = 0;
  if (idx >= state.items.length) return showReport();
  state.index = idx;
  persist();
  renderCurrent();
}

function updateProgress() {
  const pct = Math.round(((state.index) / state.items.length) * 100);
  $('#progress-bar').style.width = pct + '%';
}

function replayQuestion() {
  stopSpeaking();
  speak(Interviewer.script(state.items[state.index]));
}

// ---------- Report ----------
function showReport() {
  stopSpeaking();
  const scores = Scorer.score(state.items, state.answers);
  const md = Reporter.build({
    session: state.session,
    items: state.items,
    answers: state.answers,
    scores,
    safetyEvents: state.safetyEvents,
  });
  renderReport(scores, md);
  showScreen('screen-report');
}

function renderReport(scores, md) {
  const body = $('#report-body');
  const rows = [];
  rows.push(`<h3>Indices</h3>`);
  rows.push(indexRow('Drift from baseline', scores.drift));
  rows.push(indexRow('Resilience (higher = better)', scores.resilience));
  rows.push(`<h3>Top bottlenecks</h3>`);
  scores.bottleneck.length
    ? scores.bottleneck.forEach(b => rows.push(indexRow(b.subsection, b.mean)))
    : rows.push(`<div class="index-row">Insufficient data.</div>`);
  rows.push(`<h3>Burden by section</h3>`);
  Object.entries(scores.burdenByDomain).forEach(([sec, x]) => {
    rows.push(indexRow(`Section ${sec} (${state.sections[sec] || ''})`, x.mean, 4));
  });
  if (state.safetyEvents.length) {
    rows.push(`<h3>Safety events</h3>`);
    state.safetyEvents.forEach(s => {
      rows.push(`<div class="index-row"><span>${s.itemId}</span><strong>${new Date(s.at).toLocaleString()}</strong></div>`);
    });
  }
  body.innerHTML = rows.join('');
  // stash the markdown for export
  body.dataset.md = md;
}

function indexRow(label, value, max = 4) {
  if (value == null) return `<div class="index-row"><span>${label}</span><strong>—</strong></div>`;
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return `<div>
    <div class="index-row"><span>${label}</span><strong>${value}</strong></div>
    <div class="bar2"><div style="width:${pct}%"></div></div>
  </div>`;
}

function exportJSON() {
  const payload = {
    session: state.session,
    answers: state.answers,
    safetyEvents: state.safetyEvents,
    scores: Scorer.score(state.items, state.answers),
    generatedAt: new Date().toISOString(),
  };
  download(`ecmap-${state.session.id}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function exportMarkdown() {
  const md = $('#report-body').dataset.md || '';
  download(`ecmap-${state.session.id}.md`, md, 'text/markdown');
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

// ---------- Boot ----------
init().catch((e) => {
  setStatus('Init error: ' + e.message);
  console.error(e);
});
