// All dates are YYYY-MM-DD local strings — no timestamps, no timezone issues.

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return fmt(d);
}

export function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  return fmt(new Date());
}

// --- Cycle length prediction ---

export function getClosedIntervals(cycles) {
  return cycles
    .filter(c => c.startDate && c.endDate && !c.excludeFromStats)
    .map(c => ({
      length: c.lengthDays || daysBetween(c.startDate, c.endDate),
      approximate: !!c.dateApproximate,
      startDate: c.startDate
    }))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function predictCycleLength(intervals) {
  if (intervals.length === 0) return { predicted: 28, confidence: 'none' };
  if (intervals.length === 1) return { predicted: intervals[0].length, confidence: 'low' };

  const decay = 0.7;
  let wSum = 0, wTotal = 0;
  for (let i = 0; i < intervals.length; i++) {
    let w = Math.pow(decay, i);
    if (intervals[i].approximate) w *= 0.5;
    wSum += intervals[i].length * w;
    wTotal += w;
  }
  const predicted = Math.round(wSum / wTotal);
  const confidence = intervals.length < 3 ? 'low' : intervals.length < 6 ? 'medium' : 'high';
  return { predicted, confidence };
}

// --- Uncertainty band ---

export function uncertaintyBand(intervals, breastfeeding) {
  const n = intervals.length;
  if (n < 3) {
    const band = 5;
    return breastfeeding ? Math.round(band * 1.5) : band;
  }
  const lengths = intervals.map(i => i.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / n;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const floor = n < 6 ? 3 : 2;
  const band = Math.max(Math.round(sd), floor);
  return breastfeeding ? Math.round(band * 1.5) : band;
}

// --- Ovulation estimation ---
// Luteal phase is ~12-14 days, use 13. Anchor to cycle end.

export function estimateOvulation(cycle) {
  if (!cycle.endDate) {
    return estimateOvulationForActiveCycle(cycle);
  }
  const ovDay = addDays(cycle.endDate, -13);
  if (ovDay <= cycle.startDate) return null;
  return ovDay;
}

function estimateOvulationForActiveCycle(cycle, predictedLength) {
  if (!predictedLength) return null;
  const predictedEnd = addDays(cycle.startDate, predictedLength);
  return addDays(predictedEnd, -13);
}

export function estimateOvulationActive(cycle, predictedLength) {
  if (!predictedLength) return null;
  const predictedEnd = addDays(cycle.startDate, predictedLength);
  return addDays(predictedEnd, -13);
}

// --- Ovulation confidence ---

export function ovulationConfidence(cycle, dayLogs) {
  if (!dayLogs || dayLogs.length === 0) {
    return cycle.backfilled ? 'low' : 'low';
  }
  const markers = [];
  for (const log of dayLogs) {
    if (log.discharge === 'egg-white') markers.push(log.date);
    if (log.symptoms && log.symptoms.includes('one-sided-abdominal-pain')) markers.push(log.date);
    if (log.mood && log.mood.includes('libido-high')) markers.push(log.date);
  }
  if (markers.length === 0) return 'low';
  if (markers.length === 1) return 'medium';
  return 'high';
}

// --- Symptom-informed ovulation nudge ---

export function nudgeOvulation(baseEstimate, dayLogs, cycle) {
  if (!baseEstimate || !dayLogs || dayLogs.length === 0) return baseEstimate;

  const markerDates = [];
  for (const log of dayLogs) {
    let score = 0;
    if (log.discharge === 'egg-white') score++;
    if (log.symptoms && log.symptoms.includes('one-sided-abdominal-pain')) score++;
    if (log.mood && log.mood.includes('libido-high')) score++;
    if (score > 0) markerDates.push({ date: log.date, score });
  }
  if (markerDates.length === 0) return baseEstimate;

  const baseDay = daysBetween(cycle.startDate, baseEstimate);
  let wSum = 0, wTotal = 0;
  for (const m of markerDates) {
    const d = daysBetween(cycle.startDate, m.date);
    if (d < 8 || d > (cycle.lengthDays || 40) - 5) continue;
    wSum += d * m.score;
    wTotal += m.score;
  }
  if (wTotal === 0) return baseEstimate;

  const markerDay = wSum / wTotal;
  const nudged = Math.round(baseDay * 0.6 + markerDay * 0.4);
  return addDays(cycle.startDate, nudged);
}

// --- Retrospective re-anchoring ---

export function reanchorCycle(cycle, dayLogs) {
  if (!cycle.endDate) return cycle;
  const baseOv = estimateOvulation(cycle);
  if (!baseOv) return cycle;

  const nudged = nudgeOvulation(baseOv, dayLogs, cycle);
  const conf = ovulationConfidence(cycle, dayLogs);
  const lengthDays = daysBetween(cycle.startDate, cycle.endDate);

  const lutealLength = daysBetween(nudged, cycle.endDate);
  const anovulatory = lutealLength < 8 || lutealLength > 18;

  return {
    ...cycle,
    lengthDays,
    estimatedOvulation: nudged,
    ovulationConfidence: conf,
    anovulatorySuspected: anovulatory
  };
}

// --- Phase calculation ---

export function getPhase(cycleDay, ovulationDay, cycleLengthDays) {
  if (cycleDay <= 5) return 'menstrual';
  if (!ovulationDay) {
    if (cycleDay <= 14) return 'follicular';
    if (cycleDay <= 16) return 'ovulatory';
    return 'luteal';
  }
  const ovDay = typeof ovulationDay === 'number' ? ovulationDay : null;
  if (ovDay) {
    if (cycleDay < ovDay - 1) return 'follicular';
    if (cycleDay <= ovDay + 1) return 'ovulatory';
    return 'luteal';
  }
  if (cycleDay <= 14) return 'follicular';
  if (cycleDay <= 16) return 'ovulatory';
  return 'luteal';
}

export function getPhaseName(phase) {
  const names = {
    menstrual:  { zh: '行经期', en: 'Menstrual' },
    follicular: { zh: '经后期', en: 'Post-menstrual' },
    ovulatory:  { zh: '经间期', en: 'Ovulatory' },
    luteal:     { zh: '经前期', en: 'Pre-menstrual' }
  };
  return names[phase] || names.follicular;
}

// --- Next period prediction ---

export function predictNextPeriod(cycles, breastfeeding) {
  const intervals = getClosedIntervals(cycles);
  const { predicted, confidence } = predictCycleLength(intervals);
  const band = uncertaintyBand(intervals, breastfeeding);

  const activeCycle = cycles.find(c => !c.endDate);
  if (!activeCycle) return null;

  const expectedDate = addDays(activeCycle.startDate, predicted);
  const earliest = addDays(expectedDate, -band);
  const latest = addDays(expectedDate, band);

  return {
    expectedDate,
    earliest,
    latest,
    band,
    predictedLength: predicted,
    confidence,
    intervalCount: intervals.length
  };
}
