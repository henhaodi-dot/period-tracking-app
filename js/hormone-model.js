// Hormone curves: normalized 0–1 relative values, anchored to ovulation.
// These are models, not measurements.

import { daysBetween } from './cycle-math.js';

export function getHormoneLevels(cycleDay, ovulationDay, cycleLengthDays) {
  if (!cycleLengthDays) cycleLengthDays = 28;
  if (!ovulationDay) ovulationDay = cycleLengthDays - 13;

  const daysFromOv = cycleDay - ovulationDay;
  const follicularLength = ovulationDay;
  const lutealLength = cycleLengthDays - ovulationDay;

  return {
    estrogen: estrogen(cycleDay, ovulationDay, follicularLength, lutealLength, cycleLengthDays),
    progesterone: progesterone(daysFromOv, lutealLength),
    lh: lh(daysFromOv),
    fsh: fsh(cycleDay, ovulationDay, follicularLength),
    prolactin: null
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

function lh(dFromOv) {
  if (dFromOv < -2) return 0.1;
  if (dFromOv < -1) return 0.1 + (dFromOv + 2) * 0.4;
  if (dFromOv <= 0) return 0.5 + (dFromOv + 1) * 0.5;
  if (dFromOv <= 1) return 1.0 - dFromOv * 0.7;
  if (dFromOv <= 2) return 0.3 - (dFromOv - 1) * 0.2;
  return 0.1;
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
export function generateCycleCurve(cycleLengthDays, ovulationDay, nursingSessions) {
  if (!ovulationDay) ovulationDay = cycleLengthDays - 13;
  const points = [];
  for (let d = 1; d <= cycleLengthDays; d++) {
    const h = getHormoneLevels(d, ovulationDay, cycleLengthDays);
    h.prolactin = prolactinFromNursing(nursingSessions);
    h.day = d;
    points.push(h);
  }
  return points;
}

// Confidence band: returns multiplier for visual width
export function confidenceBandWidth(ovulationConfidence, breastfeeding) {
  let base;
  switch (ovulationConfidence) {
    case 'high': base = 0.08; break;
    case 'medium': base = 0.15; break;
    default: base = 0.25;
  }
  return breastfeeding ? base * 1.5 : base;
}
