import { t, getLanguage, formatShortDate } from '../i18n.js';
import * as db from '../db.js';
import { cycleStats, CYCLE_REFERENCE, periodLengthDays } from '../cycle-math.js';

const VARIABLES = [
  { id: 'cycleLength', unit: 'days', label: { zh: '周期长度', en: 'Cycle length' } },
  { id: 'bleedingDays', unit: 'days', label: { zh: '出血天数', en: 'Bleeding days' } },
  { id: 'pain', unit: 'unitLevel', label: { zh: '疼痛', en: 'Pain' } },
  { id: 'nursingSessions', unit: 'unitPerDay', label: { zh: '哺乳次数', en: 'Nursing sessions' } },
  { id: 'sleep', unit: 'unitHours', label: { zh: '睡眠', en: 'Sleep' } },
  { id: 'stress', unit: 'unitLevel', label: { zh: '压力', en: 'Stress' } },
  { id: 'headache', unit: 'unitDays', label: { zh: '头痛', en: 'Headache' } },
  { id: 'breastTenderness', unit: 'unitDays', label: { zh: '乳房胀痛', en: 'Breast tenderness' } },
  { id: 'bloating', unit: 'unitDays', label: { zh: '腹胀', en: 'Bloating' } },
  { id: 'irritability', unit: 'unitDays', label: { zh: '烦躁', en: 'Irritability' } },
  { id: 'lowMood', unit: 'unitDays', label: { zh: '低落', en: 'Low mood' } },
];

let varA = 'cycleLength';
let varB = 'nursingSessions';

export async function render(container) {
  const lang = getLanguage();
  const cycles = await db.getAllCycles();
  const allLogs = await db.getAllDayLogs();
  const breastfeeding = !!(await db.getSetting('breastfeeding'));
  // Backfilled cycles count: their dates are as reliable as live-logged ones.
  const closedCycles = cycles.filter(c => c.endDate && !c.excludeFromStats);
  const stats = cycleStats(cycles);

  // Variables nobody has logged yet are shown disabled, with the reason.
  const available = Object.fromEntries(VARIABLES.map(v => [v.id, closedCycles.some(c => extractVariable(v.id, c, allLogs) !== null)]));
  if (!available[varA]) varA = VARIABLES.find(v => available[v.id])?.id || varA;
  if (!available[varB] || varB === varA) varB = VARIABLES.find(v => available[v.id] && v.id !== varA)?.id || varB;
  const options = selected => VARIABLES.map(v => `<option value="${v.id}" ${v.id === selected ? 'selected' : ''} ${available[v.id] ? '' : 'disabled'}>${v.label[lang] || v.label.en}${available[v.id] ? '' : t('exploreNoData')}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('exploreTitle')}</span>
      </div>
      ${renderOverview(stats, breastfeeding)}
      ${renderTrends(stats)}
      <div class="settings-group-title" style="margin-top:24px">${t('exploreCompare')}</div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">${t('selectVariables')}</p>
      <div class="filter-bar">
        <select id="var-a">${options(varA)}</select>
        <span style="color:var(--text-muted);align-self:center">vs</span>
        <select id="var-b">${options(varB)}</select>
      </div>
      <div id="explore-chart"></div>
      <p class="model-note">${t('exploreLogHint')}</p>
    </div>
  `;

  container.querySelector('#var-a').addEventListener('change', e => { varA = e.target.value; updateChart(closedCycles, allLogs, lang); });
  container.querySelector('#var-b').addEventListener('change', e => { varB = e.target.value; updateChart(closedCycles, allLogs, lang); });
  // Tap a point to read its value
  container.addEventListener('click', e => {
    const hit = e.target.closest('[data-caption]');
    if (!hit) return;
    const out = hit.closest('.chart-block')?.querySelector('.chart-caption');
    if (out) out.textContent = hit.dataset.caption;
  });

  updateChart(closedCycles, allLogs, lang);
}

// --- Overview ---

function renderOverview(stats, breastfeeding) {
  if (!stats.series.length) {
    return `<div class="card"><div class="empty-state"><p>${t('exploreNeedOne')}</p></div></div>`;
  }
  const R = CYCLE_REFERENCE;
  const { length, spread, period } = stats;
  const n = stats.series.length;

  const lengthStatus = length.avg < R.lengthMin ? ['warn', t('statShort')]
    : length.avg > R.lengthMax ? ['warn', t('statLong')]
    : ['ok', t('statInRange', { a: R.lengthMin, b: R.lengthMax })];
  const spreadStatus = spread === null ? ['muted', t('statNeedThree')]
    : spread <= R.regularSpread ? ['ok', t('statRegular')]
    : spread <= R.regularSpreadLoose ? ['ok', t('statMostlyRegular')]
    : ['warn', t('statIrregular')];
  const periodStatus = !period ? ['muted', t('statNeedPeriodEnd')]
    : period.avg > R.periodMax ? ['warn', t('statPeriodLong', { n: R.periodMax })]
    : ['ok', t('statPeriodOk', { n: R.periodMax })];

  const tile = (label, value, sub, [kind, text]) => `
    <div class="stat-tile">
      <div class="stat-tile-label">${label}</div>
      <div class="stat-tile-value">${value}</div>
      ${sub ? `<div class="stat-tile-sub">${sub}</div>` : ''}
      <div class="stat-status ${kind}"><span aria-hidden="true">${kind === 'ok' ? '✓' : kind === 'warn' ? '!' : '·'}</span> ${text}</div>
    </div>`;

  return `
    <div class="card">
      <div class="card-subtitle" style="margin-bottom:12px">${t('statBasedOn', { n })}</div>
      <div class="stat-grid">
        ${tile(t('statAvgCycle'), `${length.avg} <small>${t('days')}</small>`, t('statRange', { a: length.min, b: length.max }), lengthStatus)}
        ${tile(t('statRegularity'), spread === null ? '—' : `${spread} <small>${t('days')}</small>`, spread === null ? '' : t('statSpreadSub'), spreadStatus)}
        ${tile(t('statAvgPeriod'), period ? `${period.avg} <small>${t('days')}</small>` : '—', period ? t('statRange', { a: period.min, b: period.max }) : '', periodStatus)}
      </div>
      <p class="model-note" style="text-align:left;margin-top:12px">${t('statReference')}${breastfeeding ? ' ' + t('statBreastfeeding') : ''}</p>
    </div>
  `;
}

// --- Trends: one chart per measure (never two y-scales on one chart) ---

function renderTrends(stats) {
  if (stats.series.length < 2 && stats.periodSeries.length < 2) return '';
  const R = CYCLE_REFERENCE;
  const cap = (s, unit) => t('chartCaption', { date: formatShortDate(s.startDate), n: s.length, unit });
  const blocks = [];
  if (stats.series.length >= 2) {
    blocks.push(chartBlock(t('statCycleTrend'), seriesChart({
      points: stats.series.map(s => ({ label: s.startDate.slice(5), value: s.length, caption: cap(s, t('days')) })),
      kind: 'line', color: 'var(--accent)', band: [R.lengthMin, R.lengthMax],
      yMax: Math.max(45, ...stats.series.map(s => s.length + 3))
    }), t('statCycleTrendNote', { a: R.lengthMin, b: R.lengthMax })));
  }
  if (stats.periodSeries.length >= 2) {
    blocks.push(chartBlock(t('statPeriodTrend'), seriesChart({
      points: stats.periodSeries.map(s => ({ label: s.startDate.slice(5), value: s.length, caption: cap(s, t('days')) })),
      kind: 'bar', color: 'var(--period)', refLine: R.periodMax,
      yMax: Math.max(10, ...stats.periodSeries.map(s => s.length + 1))
    }), t('statPeriodTrendNote', { n: R.periodMax })));
  }
  return blocks.join('');
}

function chartBlock(title, svg, note) {
  return `
    <div class="card chart-block">
      <div class="card-title" style="font-size:0.95rem">${title}</div>
      <div class="chart-container">${svg}</div>
      <div class="chart-caption">${t('chartTapHint')}</div>
      ${note ? `<p class="model-note" style="text-align:left">${note}</p>` : ''}
    </div>
  `;
}

// Single-series chart. points: [{ label, value (null = missing), caption }]
function seriesChart({ points, kind, color, yMax, band, refLine }) {
  const W = 320, H = 150;
  const pad = { top: 10, right: 12, bottom: 22, left: 26 };
  const plotW = W - pad.left - pad.right, plotH = H - pad.top - pad.bottom;
  const n = points.length;
  const step = plotW / n;
  const x = i => pad.left + step * (i + 0.5);
  const y = v => pad.top + (1 - v / yMax) * plotH;
  const base = pad.top + plotH;

  let svg = '';
  if (band) {
    svg += `<rect x="${pad.left}" y="${y(band[1])}" width="${plotW}" height="${y(band[0]) - y(band[1])}" fill="var(--border-light)"/>`;
    for (const v of band) svg += `<text x="${pad.left - 4}" y="${y(v) + 3}" fill="var(--text-muted)" font-size="8" text-anchor="end">${v}</text>`;
  }
  if (refLine) {
    svg += `<line x1="${pad.left}" x2="${pad.left + plotW}" y1="${y(refLine)}" y2="${y(refLine)}" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="3,3"/>`;
    svg += `<text x="${pad.left - 4}" y="${y(refLine) + 3}" fill="var(--text-muted)" font-size="8" text-anchor="end">${refLine}</text>`;
  }
  if (!band && !refLine) {
    // No reference marks: label the highest value so the scale is readable
    const top = Math.max(...points.map(p => p.value ?? 0));
    if (top > 0) {
      svg += `<line x1="${pad.left}" x2="${pad.left + plotW}" y1="${y(top)}" y2="${y(top)}" stroke="var(--border-light)" stroke-width="1"/>`;
      svg += `<text x="${pad.left - 4}" y="${y(top) + 3}" fill="var(--text-muted)" font-size="8" text-anchor="end">${Math.round(top * 10) / 10}</text>`;
    }
  }
  svg += `<line x1="${pad.left}" x2="${pad.left + plotW}" y1="${base}" y2="${base}" stroke="var(--border)" stroke-width="1"/>`;
  svg += `<text x="${pad.left - 4}" y="${base + 3}" fill="var(--text-muted)" font-size="8" text-anchor="end">0</text>`;

  const valid = points.map((p, i) => ({ ...p, i })).filter(p => p.value !== null);
  if (kind === 'line') {
    if (valid.length > 1) svg += `<polyline points="${valid.map(p => `${x(p.i)},${y(p.value)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
    for (const p of valid) svg += `<circle cx="${x(p.i)}" cy="${y(p.value)}" r="4" fill="${color}" stroke="var(--bg-card)" stroke-width="2"/>`;
  } else {
    const bw = Math.min(18, step * 0.6);
    for (const p of valid) {
      const top = y(p.value);
      svg += `<path d="M${x(p.i) - bw / 2},${base} V${top + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${base} Z" fill="${color}"/>`;
    }
  }
  // Labels: first, last and every k-th, to avoid collisions
  const every = Math.ceil(n / 6);
  points.forEach((p, i) => {
    if (i % every === 0 || i === n - 1) svg += `<text x="${x(i)}" y="${H - 6}" fill="var(--text-muted)" font-size="8" text-anchor="middle">${p.label}</text>`;
  });
  // Hit targets: full-height column per point, bigger than the mark
  for (const p of valid) {
    svg += `<rect x="${x(p.i) - step / 2}" y="${pad.top}" width="${step}" height="${plotH}" fill="transparent" data-caption="${p.caption}"><title>${p.caption}</title></rect>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${svg}</svg>`;
}

// --- Two-variable comparison: two aligned charts sharing the cycle axis ---

function updateChart(cycles, allLogs, lang) {
  const chartEl = document.getElementById('explore-chart');
  if (!chartEl) return;

  if (cycles.length < 3) {
    chartEl.innerHTML = `<div class="empty-state"><p>${t('insufficientData')}</p></div>`;
    return;
  }

  const recent = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(-12);
  const block = varId => {
    const v = VARIABLES.find(x => x.id === varId);
    const label = v?.label[lang] || varId;
    const values = recent.map(c => extractVariable(varId, c, allLogs));
    const fmtVal = val => Math.round(val * 10) / 10;
    const valid = values.filter(val => val !== null);
    return chartBlock(label, seriesChart({
      points: recent.map((c, i) => ({
        label: c.startDate.slice(5),
        value: values[i],
        caption: values[i] === null ? '' : t('chartCaption', { date: formatShortDate(c.startDate), n: fmtVal(values[i]), unit: v?.unit ? t(v.unit) : '' })
      })),
      kind: 'line', color: varId === varA ? 'var(--accent)' : '#b07840',
      yMax: valid.length ? Math.max(...valid) * 1.15 || 1 : 1
    }), '');
  };
  chartEl.innerHTML = block(varA) + block(varB);
}

function extractVariable(varId, cycle, allLogs) {
  const logs = allLogs.filter(l => l.cycleId === cycle.id);
  switch (varId) {
    case 'cycleLength': return cycle.lengthDays;
    // Recorded period end first; otherwise count logged bleeding days
    case 'bleedingDays': return periodLengthDays(cycle) || logs.filter(l => l.bleeding?.flow && l.bleeding.flow !== 'none').length || null;
    case 'pain': {
      const painMap = { none: 0, mild: 1, moderate: 2, severe: 3 };
      const pains = logs.map(l => painMap[l.bleeding?.pain]).filter(p => p !== undefined && p > 0);
      return pains.length ? Math.max(...pains) : null;
    }
    case 'nursingSessions': {
      const vals = logs.map(l => l.context?.nursingSessions).filter(v => v !== null && v !== undefined);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    case 'sleep': {
      const vals = logs.map(l => l.context?.sleepHours).filter(v => v !== null && v !== undefined);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    case 'stress': {
      const map = { low: 1, medium: 2, high: 3 };
      const vals = logs.map(l => map[l.context?.stress]).filter(v => v);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    case 'headache': return logs.filter(l => l.symptoms?.includes('headache')).length || null;
    case 'breastTenderness': return logs.filter(l => l.symptoms?.includes('breast-tenderness')).length || null;
    case 'bloating': return logs.filter(l => l.symptoms?.includes('bloating')).length || null;
    case 'irritability': return logs.filter(l => l.mood?.includes('irritability')).length || null;
    case 'lowMood': return logs.filter(l => l.mood?.includes('low-mood')).length || null;
    default: return null;
  }
}
