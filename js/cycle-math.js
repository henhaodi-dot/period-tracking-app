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

// --- Ovulation from body signs ---
// Signs differ in how tightly they track ovulation, so they aren't averaged:
// - Egg-white discharge follows the estrogen peak. Ovulation is most often
//   the day after the last egg-white day (the "peak day"), within ~±2 days.
//   Discharge turning sticky/creamy/dry after it confirms the peak.
// - One-sided pain (mittelschmerz) falls around ovulation itself.
// - High libido spans the whole fertile window, so it only nudges.
// Signs before cycle day 8, or in the last 5 days of a closed cycle, are
// ignored. Returns { date, confidence, fromSigns }.
export function ovulationFromSigns(cycle, dayLogs, calendarDate) {
  const maxDay = cycle.endDate ? daysBetween(cycle.startDate, cycle.endDate) - 5 : Infinity;
  const dayOf = log => daysBetween(cycle.startDate, log.date);
  const logs = (dayLogs || [])
    .filter(l => dayOf(l) >= 7 && dayOf(l) <= maxDay)
    .sort((a, b) => a.date.localeCompare(b.date));
  const dateAt = d => addDays(cycle.startDate, d);
  const eggWhite = logs.filter(l => l.discharge === 'egg-white').map(dayOf);
  const pain = logs.filter(l => l.symptoms?.includes('one-sided-abdominal-pain')).map(dayOf);

  if (eggWhite.length) {
    const peak = Math.max(...eggWhite);
    const confirmed = logs.some(l => dayOf(l) > peak && dayOf(l) <= peak + 3 && l.discharge && l.discharge !== 'egg-white');
    let ov = peak + 1;
    const nearPain = pain.filter(d => d >= peak - 1 && d <= peak + 3);
    if (nearPain.length) ov = Math.round((ov + nearPain[nearPain.length - 1]) / 2);
    return { date: dateAt(ov), confidence: confirmed ? 'high' : 'medium', fromSigns: true };
  }
  if (pain.length) {
    return { date: dateAt(pain[pain.length - 1]), confidence: 'medium', fromSigns: true };
  }
  const libido = logs.filter(l => l.mood?.includes('libido-high')).map(dayOf);
  if (libido.length && calendarDate) {
    const mean = libido.reduce((a, b) => a + b, 0) / libido.length;
    const nudged = Math.round(daysBetween(cycle.startDate, calendarDate) * 0.75 + mean * 0.25);
    return { date: dateAt(nudged), confidence: 'low', fromSigns: false };
  }
  return { date: calendarDate, confidence: 'low', fromSigns: false };
}

// --- Retrospective re-anchoring ---

export function reanchorCycle(cycle, dayLogs) {
  if (!cycle.endDate) return cycle;
  const baseOv = estimateOvulation(cycle);
  if (!baseOv) return cycle;

  const { date: ov, confidence } = ovulationFromSigns(cycle, dayLogs, baseOv);
  const lengthDays = daysBetween(cycle.startDate, cycle.endDate);

  const lutealLength = daysBetween(ov, cycle.endDate);
  const anovulatory = lutealLength < 8 || lutealLength > 18;

  return {
    ...cycle,
    lengthDays,
    estimatedOvulation: ov,
    ovulationConfidence: confidence,
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

// --- Cycle statistics (Explore) ---
// Reference ranges from FIGO 2018 (normal uterine bleeding parameters):
// cycle 24–38 days; shortest-to-longest spread ≤7 days is regular (≤9 is
// within normal for under 26 / over 41); bleeding up to 8 days.
export const CYCLE_REFERENCE = { lengthMin: 24, lengthMax: 38, regularSpread: 7, regularSpreadLoose: 9, periodMax: 8 };

// Over the most recent `limit` closed cycles (excluded ones left out).
// Backfilled cycles count: their dates are as good as live-logged ones.
export function cycleStats(cycles, limit = 12) {
  const byStart = (a, b) => a.startDate.localeCompare(b.startDate);
  const series = cycles
    .filter(c => c.endDate && !c.excludeFromStats)
    .sort(byStart)
    .slice(-limit)
    .map(c => ({ id: c.id, startDate: c.startDate, length: c.lengthDays || daysBetween(c.startDate, c.endDate) }));
  // Period length is known once its end is recorded, even in the active cycle.
  const periodSeries = cycles
    .filter(c => c.periodEnd && !c.excludeFromStats)
    .sort(byStart)
    .slice(-limit)
    .map(c => ({ id: c.id, startDate: c.startDate, length: periodLengthDays(c) }));

  const summary = values => values.length ? {
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values)
  } : null;

  const length = summary(series.map(s => s.length));
  return {
    series,
    periodSeries,
    length,
    spread: series.length >= 3 ? length.max - length.min : null,
    period: summary(periodSeries.map(s => s.length))
  };
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
      : prediction?.ovulationDate;
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

// activeLogs: day logs of the active cycle, used to place ovulation from
// body signs. Once signs place it, the next period is predicted 13 days after
// ovulation (the luteal phase varies far less than the follicular phase),
// with a tighter band.
export function predictNextPeriod(cycles, breastfeeding, activeLogs = []) {
  const intervals = getClosedIntervals(cycles);
  const { predicted, confidence: lengthConfidence } = predictCycleLength(intervals);
  let band = uncertaintyBand(intervals, breastfeeding);

  const activeCycle = cycles.find(c => !c.endDate);
  if (!activeCycle) return null;

  const ov = ovulationFromSigns(activeCycle, activeLogs, estimateOvulationActive(activeCycle, predicted));
  let expectedDate = addDays(activeCycle.startDate, predicted);
  let confidence = lengthConfidence;
  if (ov.fromSigns) {
    expectedDate = addDays(ov.date, 13);
    band = Math.min(band, ov.confidence === 'high' ? 2 : 3);
    const rank = ['none', 'low', 'medium', 'high'];
    if (rank.indexOf(ov.confidence) > rank.indexOf(confidence)) confidence = ov.confidence;
  }

  return {
    expectedDate,
    earliest: addDays(expectedDate, -band),
    latest: addDays(expectedDate, band),
    band,
    predictedLength: daysBetween(activeCycle.startDate, expectedDate),
    confidence,
    intervalCount: intervals.length,
    ovulationDate: ov.date,
    ovulationDay: daysBetween(activeCycle.startDate, ov.date) + 1,
    ovulationConfidence: ov.confidence
  };
}
