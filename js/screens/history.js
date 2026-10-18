import { t, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { generateCycleCurve, ovulationSpreadDays } from '../hormone-model.js';
import { daysBetween, addDays, today, defaultOvulationDay } from '../cycle-math.js';

let selectedCycleId = null;

export async function render(container) {
  const cycles = await db.getAllCycles();
  const sorted = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const lang = getLanguage();

  if (selectedCycleId) {
    const cycle = sorted.find(c => c.id === selectedCycleId);
    if (cycle) {
      await renderDetail(container, cycle);
      return;
    }
    selectedCycleId = null;
  }

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('historyTitle')}</span>
      </div>
      <div class="cycle-list">
        ${sorted.length === 0 ? `<div class="empty-state"><p>${lang === 'zh' ? '暂无记录' : 'No cycles recorded yet'}</p></div>` : ''}
        ${sorted.map(c => {
          const tags = [];
          if (c.backfilled) tags.push(t('backfilled'));
          if (c.anovulatorySuspected) tags.push(t('anovulatory'));
          return `
            <div class="cycle-item ${c.backfilled ? 'backfilled' : ''}" data-id="${c.id}">
              <div class="cycle-dates">${c.startDate}${c.endDate ? ' → ' + c.endDate : ` (${lang === 'zh' ? '进行中' : 'active'})`}</div>
              <div class="cycle-meta">
                ${c.lengthDays ? `<span>${c.lengthDays} ${t('days')}</span>` : ''}
                ${tags.map(tg => `<span class="tag">${tg}</span>`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.cycle-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedCycleId = el.dataset.id;
      render(container);
    });
  });
}

async function renderDetail(container, cycle) {
  const lang = getLanguage();
  const dayLogs = await db.getDayLogsForCycle(cycle.id);
  const journalEntries = await db.getJournalEntriesForCycle(cycle.id);

  const lengthDays = cycle.lengthDays || (cycle.endDate ? daysBetween(cycle.startDate, cycle.endDate) : daysBetween(cycle.startDate, today()));
  const ovDay = cycle.estimatedOvulation ? daysBetween(cycle.startDate, cycle.estimatedOvulation) + 1 : defaultOvulationDay(lengthDays);

  let chartSvg = '';
  if (cycle.endDate || lengthDays > 5) {
    chartSvg = renderHormoneChart(lengthDays, ovDay, cycle.ovulationConfidence || 'low');
  }

  container.innerHTML = `
    <div class="screen">
      <button class="btn btn-ghost mb-md" id="back-to-list">${t('back')}</button>
      <div class="card-header">
        <span class="card-title">${cycle.startDate}${cycle.endDate ? ' → ' + cycle.endDate : ''}</span>
        <span class="card-subtitle">${lengthDays} ${t('days')}</span>
      </div>
      ${cycle.estimatedOvulation ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">${lang === 'zh' ? '预计排卵' : 'Est. ovulation'}: ${cycle.estimatedOvulation}</p>` : ''}
      ${chartSvg ? `<div class="card"><div class="hormone-chart-wrap">${chartSvg}</div><div class="model-note">${t('modelNotMeasurement')}</div></div>` : ''}
      ${dayLogs.length > 0 ? `
        <div class="card">
          <div class="card-title mb-md">${lang === 'zh' ? '日志记录' : 'Day Logs'}</div>
          ${dayLogs.map(dl => `
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);font-size:0.85rem">
              <strong>${dl.date}</strong> (${lang === 'zh' ? '第' : 'Day '}${dl.cycleDay}${lang === 'zh' ? '天' : ''})
              ${dl.bleeding?.flow ? ` · ${dl.bleeding.flow}` : ''}
              ${dl.symptoms?.length ? ` · ${dl.symptoms.join(', ')}` : ''}
              ${dl.mood?.length ? ` · ${dl.mood.join(', ')}` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${journalEntries.length > 0 ? `
        <div class="card">
          <div class="card-title mb-md">${t('journalTitle')}</div>
          ${journalEntries.map(je => `
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);">
              <div style="font-size:0.75rem;color:var(--text-muted)">${je.date}</div>
              <div style="font-size:0.85rem;margin-top:4px">${je.text}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  container.querySelector('#back-to-list').addEventListener('click', () => {
    selectedCycleId = null;
    render(container);
  });
}

function renderHormoneChart(lengthDays, ovDay, confidence) {
  const W = Math.max(320, lengthDays * 14);
  const H = 160;
  const pad = { top: 20, right: 10, bottom: 30, left: 10 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const curve = generateCycleCurve(lengthDays, ovDay, null, ovulationSpreadDays(confidence));
  const xScale = d => pad.left + ((d - 1) / (lengthDays - 1)) * plotW;
  const yScale = v => pad.top + (1 - v) * plotH;

  const hormones = [
    { key: 'estrogen', color: '#8fb5a3', label: 'E' },
    { key: 'progesterone', color: '#c4956a', label: 'P' },
    { key: 'lh', color: '#9b8ec4', label: 'LH' },
    { key: 'fsh', color: '#7fa8c9', label: 'FSH' },
  ];

  let paths = '';
  for (const h of hormones) {
    const pts = curve.map(p => `${xScale(p.day)},${yScale(p[h.key])}`).join(' ');
    paths += `<polyline points="${pts}" fill="none" stroke="${h.color}" stroke-width="1.5" opacity="0.85"/>`;
  }

  // Ovulation marker
  const ovX = xScale(ovDay);
  const ovLine = `<line x1="${ovX}" y1="${pad.top}" x2="${ovX}" y2="${pad.top + plotH}" stroke="var(--text-muted)" stroke-width="0.5" stroke-dasharray="3,3"/>`;

  // X axis labels
  let xLabels = '';
  const step = lengthDays <= 28 ? 7 : Math.ceil(lengthDays / 5);
  for (let d = 1; d <= lengthDays; d += step) {
    xLabels += `<text x="${xScale(d)}" y="${H - 4}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${d}</text>`;
  }

  // Legend
  let legend = '';
  hormones.forEach((h, i) => {
    const lx = pad.left + i * 50;
    legend += `<rect x="${lx}" y="4" width="10" height="3" fill="${h.color}" rx="1"/>`;
    legend += `<text x="${lx + 13}" y="9" fill="var(--text-secondary)" font-size="8">${h.label}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%">${legend}${ovLine}${paths}${xLabels}</svg>`;
}
