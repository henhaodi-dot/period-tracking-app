// Hormone curves: normalized 0–1 relative values, anchored to ovulation.
// These are models, not measurements.

import { defaultOvulationDay } from './cycle-math.js';

// SD (days) of the ovulation-day estimate. A calendar-only estimate is off by
// ±2–3 days; body-sign markers narrow it. LH's surge lasts ~2 days, so with a
// point estimate the snapshot would swing between baseline and peak on a
// one-day error — we average over plausible ovulation days instead.
const OVULATION_SD = { high: 1, medium: 1.5, low: 2.5 };

export function ovulationSpreadDays(ovulationConfidence, breastfeeding) {
  const sd = OVULATION_SD[ovulationConfidence] ?? OVULATION_SD.low;
  return breastfeeding ? sd * 1.5 : sd;
}

// Expected levels over the ovulation-day uncertainty, plus a 10th–90th
// percentile range per hormone. spreadDays = 0 gives the point estimate.
export function getHormoneLevels(cycleDay, ovulationDay, cycleLengthDays, spreadDays = 0) {
  if (!cycleLengthDays) cycleLengthDays = 28;
  if (!ovulationDay) ovulationDay = defaultOvulationDay(cycleLengthDays);

  const scenarios = ovulationScenarios(ovulationDay, cycleLengthDays, spreadDays)
    .map(s => ({ w: s.w, h: pointLevels(cycleDay, s.ovDay, cycleLengthDays) }));

  const levels = { prolactin: null, range: {} };
  for (const key of ['estrogen', 'progesterone', 'lh', 'fsh']) {
    levels[key] = scenarios.reduce((sum, s) => sum + s.w * s.h[key], 0);
    levels.range[key] = [weightedQuantile(scenarios, key, 0.1), weightedQuantile(scenarios, key, 0.9)];
  }
  return levels;
}

// Discretized normal over ovulation day. Kept 7 days from the start and 6
// from the end so the phase curves below keep a valid shape.
function ovulationScenarios(ovulationDay, cycleLengthDays, spreadDays) {
  const lo = 7, hi = cycleLengthDays - 6;
  if (!spreadDays || lo > hi) return [{ ovDay: ovulationDay, w: 1 }];

  const reach = Math.ceil(spreadDays * 2.5);
  const byDay = new Map();
  for (let k = -reach; k <= reach; k++) {
    const ovDay = Math.min(hi, Math.max(lo, ovulationDay + k));
    const w = Math.exp(-(k * k) / (2 * spreadDays * spreadDays));
    byDay.set(ovDay, (byDay.get(ovDay) || 0) + w);
  }
  const total = [...byDay.values()].reduce((a, b) => a + b, 0);
  return [...byDay].map(([ovDay, w]) => ({ ovDay, w: w / total }));
}

function weightedQuantile(scenarios, key, q) {
  const sorted = scenarios.map(s => ({ v: s.h[key], w: s.w })).sort((a, b) => a.v - b.v);
  let cum = 0;
  for (const s of sorted) {
    cum += s.w;
    if (cum >= q - 1e-9) return s.v;
  }
  return sorted[sorted.length - 1].v;
}

function pointLevels(cycleDay, ovulationDay, cycleLengthDays) {
  const daysFromOv = cycleDay - ovulationDay;
  const follicularLength = ovulationDay;
  const lutealLength = cycleLengthDays - ovulationDay;

  return {
    estrogen: estrogen(cycleDay, ovulationDay, follicularLength, lutealLength, cycleLengthDays),
    progesterone: progesterone(daysFromOv, lutealLength),
    lh: lh(daysFromOv),
    fsh: fsh(cycleDay, ovulationDay, follicularLength)
  };
}

function estrogen(day, ovDay, follLen, lutLen, totalLen) {
  if (day <= 0) day = 1;
  const t = day / totalLen;
  const dFromOv = day - ovDay;

  if (day <= 5) {
    return 0.15 + (day / 5) * 0.1;
  }
  if (day < ovDay - 1) {
    const progress = (day - 5) / (ovDay - 6);
    return 0.25 + progress * 0.75;
  }
  if (day <= ovDay) {
    return 1.0;
  }
  if (dFromOv <= 2) {
    return 1.0 - (dFromOv / 2) * 0.6;
  }
  if (dFromOv <= Math.floor(lutLen * 0.5)) {
    const prog = (dFromOv - 2) / (Math.floor(lutLen * 0.5) - 2);
    return 0.4 + prog * 0.2;
  }
  if (dFromOv <= Math.floor(lutLen * 0.7)) {
    return 0.6;
  }
  const remaining = totalLen - day;
  if (remaining <= 0) return 0.15;
  const drop = (totalLen - day) / (totalLen - ovDay - Math.floor(lutLen * 0.7));
  return 0.15 + drop * 0.45;
}

function progesterone(dFromOv, lutLen) {
  if (dFromOv < 0) return 0.05;
  if (dFromOv <= 1) return 0.05 + (dFromOv / 1) * 0.15;
  if (dFromOv <= 7) {
    const progress = (dFromOv - 1) / 6;
    return 0.2 + progress * 0.8;
  }
  if (dFromOv <= 9) return 1.0;
  const daysLeft = lutLen - dFromOv;
  if (daysLeft <= 0) return 0.05;
  if (daysLeft <= 3) return 0.05 + (daysLeft / 3) * 0.4;
  return 0.45 + ((daysLeft - 3) / (lutLen - 12)) * 0.55;
}

// The surge starts ~24–36h before ovulation and peaks ~10–12h before it, so
// the peak day is the day before ovulation, not ovulation day itself.
const LH_SURGE = { '-2': 0.25, '-1': 1.0, '0': 0.75, '1': 0.25, '2': 0.12 };

function lh(dFromOv) {
  const at = d => LH_SURGE[d] ?? 0.1;
  const d0 = Math.floor(dFromOv);
  return at(d0) + (at(d0 + 1) - at(d0)) * (dFromOv - d0);
}

function fsh(day, ovDay, follLen) {
  if (day <= 3) return 0.5 + (day / 3) * 0.1;
  if (day <= follLen * 0.5) {
    const prog = (day - 3) / (follLen * 0.5 - 3);
    return 0.6 - prog * 0.35;
  }
  if (day < ovDay - 1) return 0.25;
  if (day <= ovDay + 1) return 0.35;
  return 0.15;
}

// Prolactin is modeled from nursing sessions, not cycle phase
export function prolactinFromNursing(sessionsPerDay) {
  if (sessionsPerDay === null || sessionsPerDay === undefined) return null;
  if (sessionsPerDay >= 8) return 0.9;
  if (sessionsPerDay >= 6) return 0.75;
  if (sessionsPerDay >= 4) return 0.55;
  if (sessionsPerDay >= 2) return 0.35;
  if (sessionsPerDay >= 1) return 0.2;
  return 0.08;
}

// Generate full curve data for a cycle (for charting)
export function generateCycleCurve(cycleLengthDays, ovulationDay, nursingSessions, spreadDays = 0) {
  if (!ovulationDay) ovulationDay = defaultOvulationDay(cycleLengthDays);
  const points = [];
  for (let d = 1; d <= cycleLengthDays; d++) {
    const h = getHormoneLevels(d, ovulationDay, cycleLengthDays, spreadDays);
    h.prolactin = prolactinFromNursing(nursingSessions);
    h.day = d;
    points.push(h);
  }
  return points;
}
