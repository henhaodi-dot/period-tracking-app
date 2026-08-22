import { t, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { daysBetween, getPhase } from '../cycle-math.js';

const VARIABLES = [
  { id: 'cycleLength', label: { zh: '周期长度', en: 'Cycle length' } },
  { id: 'bleedingDays', label: { zh: '出血天数', en: 'Bleeding days' } },
  { id: 'pain', label: { zh: '疼痛', en: 'Pain' } },
  { id: 'nursingSessions', label: { zh: '哺乳次数', en: 'Nursing sessions' } },
  { id: 'sleep', label: { zh: '睡眠', en: 'Sleep' } },
  { id: 'stress', label: { zh: '压力', en: 'Stress' } },
  { id: 'headache', label: { zh: '头痛', en: 'Headache' } },
  { id: 'breastTenderness', label: { zh: '乳房胀痛', en: 'Breast tenderness' } },
  { id: 'bloating', label: { zh: '腹胀', en: 'Bloating' } },
  { id: 'irritability', label: { zh: '烦躁', en: 'Irritability' } },
  { id: 'lowMood', label: { zh: '低落', en: 'Low mood' } },
];

let varA = 'cycleLength';
let varB = 'nursingSessions';

export async function render(container) {
  const lang = getLanguage();
  const cycles = await db.getAllCycles();
  const closedCycles = cycles.filter(c => c.endDate && !c.backfilled);
  const allLogs = await db.getAllDayLogs();

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('exploreTitle')}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">${t('selectVariables')}</p>
      <div class="filter-bar">
        <select id="var-a">
          ${VARIABLES.map(v => `<option value="${v.id}" ${v.id === varA ? 'selected' : ''}>${v.label[lang] || v.label.en}</option>`).join('')}
        </select>
        <span style="color:var(--text-muted);align-self:center">vs</span>
        <select id="var-b">
          ${VARIABLES.map(v => `<option value="${v.id}" ${v.id === varB ? 'selected' : ''}>${v.label[lang] || v.label.en}</option>`).join('')}
        </select>
      </div>
      <div id="explore-chart"></div>
      <div id="explore-stats" style="margin-top:16px"></div>
    </div>
  `;

  container.querySelector('#var-a').addEventListener('change', e => { varA = e.target.value; updateChart(closedCycles, allLogs, lang); });
  container.querySelector('#var-b').addEventListener('change', e => { varB = e.target.value; updateChart(closedCycles, allLogs, lang); });

  updateChart(closedCycles, allLogs, lang);
}

function updateChart(cycles, allLogs, lang) {
  const chartEl = document.getElementById('explore-chart');
  const statsEl = document.getElementById('explore-stats');
  if (!chartEl) return;

  if (cycles.length < 3) {
    chartEl.innerHTML = `<div class="empty-state"><p>${t('insufficientData')}</p></div>`;
    statsEl.innerHTML = '';
    return;
  }

  const dataA = cycles.map(c => extractVariable(varA, c, allLogs));
  const dataB = cycles.map(c => extractVariable(varB, c, allLogs));
  const labels = cycles.map(c => c.startDate.slice(5));

  const labelA = VARIABLES.find(v => v.id === varA)?.label[lang] || varA;
  const labelB = VARIABLES.find(v => v.id === varB)?.label[lang] || varB;

  chartEl.innerHTML = renderDualChart(dataA, dataB, labels, labelA, labelB);

  const validPairs = dataA.map((a, i) => [a, dataB[i]]).filter(([a, b]) => a !== null && b !== null);
  if (validPairs.length >= 3) {
    const count = validPairs.length;
    statsEl.innerHTML = `<p style="font-size:0.85rem;color:var(--text-secondary)">${count} ${lang === 'zh' ? '个周期的数据' : 'cycles of data'}</p>`;
  } else {
    statsEl.innerHTML = '';
  }
}

function extractVariable(varId, cycle, allLogs) {
  const logs = allLogs.filter(l => l.cycleId === cycle.id);
  switch (varId) {
    case 'cycleLength': return cycle.lengthDays;
    case 'bleedingDays': return logs.filter(l => l.bleeding?.flow && l.bleeding.flow !== 'none').length || null;
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

function renderDualChart(dataA, dataB, labels, labelA, labelB) {
  const W = 320;
  const H = 180;
  const pad = { top: 25, right: 10, bottom: 30, left: 30 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const validA = dataA.filter(v => v !== null);
  const validB = dataB.filter(v => v !== null);
  const maxA = validA.length ? Math.max(...validA) : 1;
  const maxB = validB.length ? Math.max(...validB) : 1;

  const xScale = i => pad.left + (i / (dataA.length - 1)) * plotW;
  const yScaleA = v => v === null ? null : pad.top + (1 - v / maxA) * plotH;
  const yScaleB = v => v === null ? null : pad.top + (1 - v / maxB) * plotH;

  let pathA = '';
  let pathB = '';
  let dotsA = '';
  let dotsB = '';

  const ptsA = dataA.map((v, i) => v !== null ? `${xScale(i)},${yScaleA(v)}` : null).filter(Boolean);
  const ptsB = dataB.map((v, i) => v !== null ? `${xScale(i)},${yScaleB(v)}` : null).filter(Boolean);

  if (ptsA.length > 1) pathA = `<polyline points="${ptsA.join(' ')}" fill="none" stroke="#8fb5a3" stroke-width="2"/>`;
  if (ptsB.length > 1) pathB = `<polyline points="${ptsB.join(' ')}" fill="none" stroke="#c4956a" stroke-width="2"/>`;

  dataA.forEach((v, i) => { if (v !== null) dotsA += `<circle cx="${xScale(i)}" cy="${yScaleA(v)}" r="3" fill="#8fb5a3"/>`; });
  dataB.forEach((v, i) => { if (v !== null) dotsB += `<circle cx="${xScale(i)}" cy="${yScaleB(v)}" r="3" fill="#c4956a"/>`; });

  let xLabels = '';
  labels.forEach((l, i) => {
    if (i % Math.ceil(labels.length / 6) === 0 || i === labels.length - 1) {
      xLabels += `<text x="${xScale(i)}" y="${H - 4}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${l}</text>`;
    }
  });

  const legend = `
    <rect x="${pad.left}" y="4" width="10" height="3" fill="#8fb5a3" rx="1"/>
    <text x="${pad.left + 13}" y="9" fill="var(--text-secondary)" font-size="8">${labelA}</text>
    <rect x="${pad.left + 100}" y="4" width="10" height="3" fill="#c4956a" rx="1"/>
    <text x="${pad.left + 113}" y="9" fill="var(--text-secondary)" font-size="8">${labelB}</text>
  `;

  return `<div class="chart-container"><svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${legend}${pathA}${pathB}${dotsA}${dotsB}${xLabels}</svg></div>`;
}
