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

// Cycle-day number (1-based) of ovulation when only the length is known.
// Same anchor as the dates above: 13 days before the next period starts.
export function defaultOvulationDay(cycleLengthDays) {
  return cycleLengthDays - 12;
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

// --- Editing past periods ---
// A cycle runs from one period start to the next, so adding, moving or
// deleting a start changes its neighbours too: end dates, lengths, ovulation
// estimates, and which cycle each day log / journal entry belongs to.

// Returns { key, vars } for the first problem, or null. `cycles` excludes
// nothing; selfId is the cycle being edited (null when adding).
export function validatePeriod(cycles, selfId, startDate, periodEnd) {
  const todayStr = today();
  if (!startDate) return { key: 'errStartRequired' };
  if (startDate > todayStr || (periodEnd && periodEnd > todayStr)) return { key: 'errFutureDate' };
  const others = cycles.filter(c => c.id !== selfId);
  if (others.some(c => c.startDate === startDate)) return { key: 'errDuplicateStart' };
  const prev = others.filter(c => c.startDate < startDate).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  if (prev?.periodEnd && prev.periodEnd >= startDate) {
    return { key: 'errInsidePrevPeriod', vars: { start: prev.startDate, end: prev.periodEnd } };
  }
  if (periodEnd) {
    if (periodEnd < startDate) return { key: 'errEndBeforeStart' };
    const next = others.filter(c => c.startDate > startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    if (next && periodEnd >= next.startDate) return { key: 'errEndAfterNext', vars: { date: next.startDate } };
  }
  return null;
}

// Recomputes the whole chain. Returns the rebuilt cycles plus only the day
// logs and journal entries whose cycle link changed.
export function rebuildCycleChain(cycles, dayLogs, journal) {
  const sorted = [...cycles]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((c, i, arr) => {
      const endDate = arr[i + 1]?.startDate ?? null;
      return { ...c, endDate, lengthDays: endDate ? daysBetween(c.startDate, endDate) : null, estimatedOvulation: null };
    });
  const cycleFor = date => [...sorted].reverse().find(c => c.startDate <= date) || null;

  const changedLogs = [];
  const logsByCycle = new Map();
  for (const log of dayLogs) {
    const c = cycleFor(log.date);
    const cycleId = c ? c.id : null;
    const cycleDay = c ? daysBetween(c.startDate, log.date) + 1 : null;
    if (log.cycleId !== cycleId || log.cycleDay !== cycleDay) changedLogs.push({ ...log, cycleId, cycleDay });
    if (cycleId) logsByCycle.set(cycleId, [...(logsByCycle.get(cycleId) || []), log]);
  }

  const changedJournal = [];
  for (const entry of journal) {
    const cycleId = cycleFor(entry.date)?.id ?? null;
    if (entry.cycleId !== cycleId) changedJournal.push({ ...entry, cycleId });
  }

  const rebuilt = sorted.map(c => c.endDate
    ? reanchorCycle(c, logsByCycle.get(c.id) || [])
    : { ...c, anovulatorySuspected: false, ovulationConfidence: 'low' });

  return { cycles: rebuilt, dayLogs: changedLogs, journal: changedJournal };
}

// Days of bleeding (inclusive) when the period's end has been recorded.
export function periodLengthDays(cycle) {
  return cycle?.periodEnd ? daysBetween(cycle.startDate, cycle.periodEnd) + 1 : null;
}

// Typical bleeding length from cycles with a recorded end; 5 if none.
export function typicalPeriodLength(cycles) {
  const lengths = cycles.map(periodLengthDays).filter(Boolean);
  if (lengths.length === 0) return 5;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

// --- Calendar marks ---
// date -> { period: 'recorded' | 'estimated' | 'predicted', cycleId, ovulation }
// A period without a recorded end shows its start as recorded and the
// following days, up to the typical length, as estimated.
export function calendarMarks(cycles, prediction, todayStr = today()) {
  const marks = new Map();
  const mark = (date, patch) => marks.set(date, { ...marks.get(date), ...patch });
  const typical = typicalPeriodLength(cycles);
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));

  sorted.forEach((c, i) => {
    const next = sorted[i + 1]?.startDate;
    const len = c.periodEnd ? periodLengthDays(c) : typical;
    for (let d = 0; d < len; d++) {
      const date = addDays(c.startDate, d);
      if (next && date >= next) break;
      mark(date, { period: c.periodEnd || d === 0 ? 'recorded' : 'estimated', cycleId: c.id });
    }
    const ov = c.endDate
      ? c.estimatedOvulation
      : prediction && estimateOvulationActive(c, prediction.predictedLength);
    if (ov) mark(ov, { ovulation: true });
  });

  if (prediction && prediction.expectedDate > todayStr) {
    for (let d = 0; d < typical; d++) {
      const date = addDays(prediction.expectedDate, d);
      if (!marks.get(date)?.period) mark(date, { period: 'predicted' });
    }
  }
  return marks;
}

// --- Phase calculation ---

// periodDays: recorded period length, if known; otherwise assume 5.
export function getPhase(cycleDay, ovulationDay, cycleLengthDays, periodDays = null) {
  if (cycleDay <= (periodDays || 5)) return 'menstrual';
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
