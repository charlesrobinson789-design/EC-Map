// agents.js — small, focused on-device agents. No network calls.
// Each agent does one job. They run sequentially per item.

// ---------- 1. Interviewer ----------
// Builds the spoken script for an item: stem + brief scale orientation.
export const Interviewer = {
  script(item) {
    const stem = item.stem || '';
    const scale = item.fieldKind === 'numeric'
      ? 'Please say a number.'
      : scaleHint(item);
    return scale ? `${stem} ${scale}` : stem;
  },
};

function scaleHint(item) {
  if (!item.options || !item.options.length) return '';
  const k = item.options[0];
  if (/^[0-4]\s/.test(k)) {
    return 'Answer zero through four.';
  }
  if (item.options.length <= 4 && /Yes|No/i.test(item.options[0])) {
    return 'Please answer yes or no, or say which option fits best.';
  }
  return 'Pick the option that fits best.';
}

// ---------- 2. Mapper ----------
// Turns a spoken transcript into a structured value for the item.
// Strategy: number-words first, then exact-option keyword match, then fuzzy.

const NUM_WORDS = {
  zero: 0, none: 0, never: 0, 'not at all': 0,
  one: 1, once: 1, rarely: 1, slight: 1, mild: 1, 'a little': 1,
  two: 2, twice: 2, sometimes: 2, moderate: 2, moderately: 2, occasionally: 2,
  three: 3, often: 3, severe: 3, significant: 3, frequently: 3,
  four: 4, 'very often': 4, 'nearly daily': 4, 'almost always': 4, 'very severe': 4, daily: 4, always: 4, extreme: 4,
};

export const Mapper = {
  map(item, transcript) {
    const t = (transcript || '').toLowerCase().trim();
    if (!t) return { value: null, confidence: 0, note: 'empty' };

    if (item.fieldKind === 'numeric') {
      const m = t.match(/-?\d{1,3}/);
      if (m) return { value: Number(m[0]), confidence: 0.95 };
      for (const [w, n] of Object.entries(NUM_WORDS)) {
        if (t.includes(w)) return { value: n, confidence: 0.6, note: 'word→num' };
      }
      return { value: null, confidence: 0.2, note: 'no number heard' };
    }

    // Free-text (textbox)
    if (item.fieldType === 'control_textbox') {
      return { value: transcript.trim(), confidence: 1 };
    }

    // Yes/No singles
    if (item.fieldType === 'control_radio' && item.options && item.options.length <= 2 && /yes|no/i.test(item.options.join(' '))) {
      if (/\b(yes|yeah|yep|correct|true|affirm|of course)\b/.test(t))
        return { value: 'Yes', confidence: 0.9 };
      if (/\b(no|nope|nah|never|false|not really)\b/.test(t))
        return { value: 'No', confidence: 0.9 };
    }

    // 0–4 numeric scale options
    if (item.options && item.options.length && /^[0-4]\s/.test(item.options[0])) {
      // 1. explicit digit
      const m = t.match(/\b([0-4])\b/);
      if (m) return { value: Number(m[1]), confidence: 0.92 };
      // 2. number words / anchors
      for (const [w, n] of Object.entries(NUM_WORDS)) {
        if (t.includes(w)) return { value: n, confidence: 0.7, note: 'anchor word' };
      }
      // 3. exact option label fragment
      const idx = bestOptionIndex(item.options, t);
      if (idx >= 0) return { value: idx, confidence: 0.6, note: 'option match' };
      return { value: null, confidence: 0.25, note: 'unclear' };
    }

    // Categorical single-radio with text options (e.g. "Yes — regular")
    if (item.fieldType === 'control_radio') {
      const idx = bestOptionIndex(item.options || [], t);
      if (idx >= 0) return { value: item.options[idx], confidence: 0.7 };
      return { value: null, confidence: 0.2, note: 'no option matched' };
    }

    // Multi-check is handled in the UI (tap), not by voice.
    return { value: null, confidence: 0, note: 'manual entry needed' };
  },
};

function bestOptionIndex(options, transcript) {
  let bestIdx = -1, bestScore = 0;
  options.forEach((opt, i) => {
    const clean = opt.toLowerCase().replace(/[0-9]+\s*[—\-]\s*/, '').trim();
    if (!clean) return;
    const tokens = clean.split(/\s+/).filter(w => w.length >= 3);
    let hits = 0;
    for (const w of tokens) if (transcript.includes(w)) hits++;
    const score = hits / Math.max(tokens.length, 1);
    if (score > bestScore && score >= 0.5) {
      bestScore = score; bestIdx = i;
    }
  });
  return bestIdx;
}

// ---------- 3. Safety Monitor ----------
// Two jobs: (a) handle the safety-flagged items by triggering the resource block;
// (b) scan ALL transcripts for crisis language and raise an alert.

const CRISIS_PATTERNS = [
  /\bkill myself\b/i, /\bend my life\b/i, /\bsuicid/i, /\bharm myself\b/i,
  /\bcan't go on\b/i, /\bdon't want to be (here|alive)\b/i,
  /\bhurt myself\b/i, /\bself[- ]?harm\b/i,
  /\bhe (hits|hit|beats|threatens|strangles)\b/i,
  /\bshe (hits|hit|beats|threatens)\b/i,
  /\bafraid (of|for) my (life|safety)\b/i,
  /\boverdose\b/i,
];

export const Safety = {
  scanTranscript(text) {
    if (!text) return null;
    for (const p of CRISIS_PATTERNS) {
      if (p.test(text)) return {
        triggered: true,
        message: 'I want to pause and make sure you have support available right now.',
      };
    }
    return null;
  },
  isSafetyItem(item) {
    return !!item.safety;
  },
  triggerFor(item) {
    if (!item.safety) return null;
    return {
      triggered: true,
      message: item.safetyRule || 'Connecting you to immediate resources.',
    };
  },
};

// ---------- 4. Scorer ----------
// Computes Bottleneck, Burden, Drift, Resilience indices on-device.
export const Scorer = {
  score(items, answers) {
    const bySection = {};
    const bySub = {};

    items.forEach((it) => {
      const v = answers[it.id];
      if (v == null || typeof v !== 'number') return;
      const sec = it.section, sub = it.subsection || 'misc';
      (bySection[sec] ||= []).push({ id: it.id, v });
      (bySub[sub] ||= []).push({ id: it.id, v });
    });

    const subAverages = {};
    for (const [k, arr] of Object.entries(bySub)) {
      const mean = arr.reduce((a, b) => a + b.v, 0) / arr.length;
      subAverages[k] = { mean: round(mean), n: arr.length };
    }

    const ranked = Object.entries(subAverages)
      .filter(([, x]) => x.n >= 2)
      .sort((a, b) => b[1].mean - a[1].mean);

    const bottleneck = ranked.slice(0, 3).map(([sub, x]) => ({ subsection: sub, mean: x.mean }));

    const burdenByDomain = {};
    Object.entries(bySection).forEach(([sec, arr]) => {
      const mean = arr.reduce((a, b) => a + b.v, 0) / arr.length;
      burdenByDomain[sec] = { mean: round(mean), n: arr.length };
    });

    // Drift: items in Section 4 are explicitly "drift from baseline"
    const driftItems = (bySection[4] || []);
    const drift = driftItems.length
      ? round(driftItems.reduce((a, b) => a + b.v, 0) / driftItems.length)
      : null;

    // Resilience: inverse of mean across sleep, autonomic, recovery subs (Section 3 B/H/G)
    const resilienceSubs = Object.entries(bySub).filter(([k]) =>
      /sleep|autonomic|recovery|metabolic/i.test(k)
    );
    let resilience = null;
    if (resilienceSubs.length) {
      const m = resilienceSubs.reduce((a, [, x]) => a + x.mean, 0) / resilienceSubs.length;
      resilience = round(4 - m); // higher = better
    }

    return { bottleneck, burdenByDomain, drift, resilience, subAverages };
  },
};

function round(x) { return Math.round(x * 100) / 100; }

// ---------- 5. Reporter ----------
// Produces a plain-text markdown report from scores + answers.
export const Reporter = {
  build({ session, items, answers, scores, safetyEvents }) {
    const lines = [];
    lines.push(`# EC Map — Functional Profile`);
    lines.push(`Session: ${session.id}`);
    lines.push(`Patient initials: ${session.initials || '—'}`);
    lines.push(`Date: ${new Date(session.startedAt).toISOString().slice(0,10)}`);
    lines.push(`Items answered: ${Object.keys(answers).length} / ${items.length}`);
    lines.push('');

    lines.push(`## Indices`);
    lines.push(`- Drift from baseline: ${scores.drift ?? '—'}`);
    lines.push(`- Resilience (sleep + recovery, higher is better): ${scores.resilience ?? '—'}`);
    lines.push('');

    lines.push(`## Bottleneck — top loaded subdomains`);
    if (scores.bottleneck.length) {
      scores.bottleneck.forEach((b) => {
        lines.push(`- **${b.subsection}** · mean ${b.mean}`);
      });
    } else {
      lines.push(`- Insufficient data.`);
    }
    lines.push('');

    lines.push(`## Burden by section`);
    Object.entries(scores.burdenByDomain).forEach(([sec, x]) => {
      lines.push(`- Section ${sec}: mean ${x.mean} (n=${x.n})`);
    });
    lines.push('');

    if (safetyEvents && safetyEvents.length) {
      lines.push(`## Safety events flagged during interview`);
      safetyEvents.forEach((s) => {
        lines.push(`- [${s.at}] ${s.itemId}: "${s.transcript}"`);
      });
      lines.push('');
    }

    lines.push(`## Item-level responses`);
    items.forEach((it) => {
      const a = answers[it.id];
      if (a == null) return;
      lines.push(`- ${it.id} (§${it.section} · ${it.subsection || '—'}): ${a}`);
    });
    lines.push('');

    lines.push(`---`);
    lines.push(`Generated locally on device. No PHI transmitted by this app.`);
    lines.push(`Construct-informed, not validated. Functional profile only — not a diagnosis.`);

    return lines.join('\n');
  },
};
