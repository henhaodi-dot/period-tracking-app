import { t, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { generateCycleCurve, ovulationSpreadDays } from '../hormone-model.js';
import { daysBetween, addDays, today, defaultOvulationDay, predictNextPeriod, validatePeriod, rebuildCycleChain, periodLengthDays } from '../cycle-math.js';
import { showConfirmModal } from '../modal.js';

let selectedCycleId = null;

export async function render(container) {
  const cycles = await db.getAllCycles();
  const sorted = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const lang = getLanguage();

  if (selectedCycleId) {
    const cycle = sorted.find(c => c.id === selectedCycleId);
    if (cycle) {
      await renderDetail(container, cycle, cycles);
      return;
    }
    selectedCycleId = null;
  }

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('historyTitle')}</span>
      </div>
      <button class="add-date-btn" id="add-past-period">+ ${t('addPastPeriod')}</button>
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
                ${c.periodEnd ? `<span>${t('periodDays', { n: periodLengthDays(c) })}</span>` : ''}
                ${tags.map(tg => `<span class="tag">${tg}</span>`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelector('#add-past-period').addEventListener('click', () => {
    showPeriodForm(cycles, null, id => {
      selectedCycleId = id;
      render(container);
    });
  });

  container.querySelectorAll('.cycle-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedCycleId = el.dataset.id;
      render(container);
    });
  });
}

async function renderDetail(container, cycle, cycles) {
  const lang = getLanguage();
  const dayLogs = await db.getDayLogsForCycle(cycle.id);
  const journalEntries = await db.getJournalEntriesForCycle(cycle.id);

  const lengthDays = cycle.lengthDays || (cycle.endDate ? daysBetween(cycle.startDate, cycle.endDate) : daysBetween(cycle.startDate, today()));

  let chartSvg = '';
  if (cycle.endDate) {
    const ovDay = cycle.estimatedOvulation ? daysBetween(cycle.startDate, cycle.estimatedOvulation) + 1 : defaultOvulationDay(lengthDays);
    chartSvg = renderHormoneChart(lengthDays, ovDay, ovulationSpreadDays(cycle.ovulationConfidence || 'low'));
  } else {
    // Active cycle: elapsed days aren't the cycle length. Chart the predicted
    // cycle with the same ovulation anchor and spread as Today, and mark today.
    const breastfeeding = !!(await db.getSetting('breastfeeding'));
    const prediction = predictNextPeriod(cycles, breastfeeding);
    const predictedLength = prediction ? prediction.predictedLength : 28;
    const cycleDay = lengthDays + 1;
    chartSvg = renderHormoneChart(Math.max(predictedLength, cycleDay), defaultOvulationDay(predictedLength),
      ovulationSpreadDays('low', breastfeeding), cycleDay);
  }

  container.innerHTML = `
    <div class="screen">
      <button class="btn btn-ghost mb-md" id="back-to-list">${t('back')}</button>
      <div class="card-header">
        <span class="card-title">${cycle.startDate}${cycle.endDate ? ' → ' + cycle.endDate : ''}</span>
        <span class="card-subtitle">${lengthDays} ${t('days')}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">${t('periodLabel')}: ${cycle.startDate}${cycle.periodEnd ? ` → ${cycle.periodEnd} (${periodLengthDays(cycle)} ${t('days')})` : ''}</p>
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
      <div class="btn-row mb-md">
        <button class="btn" id="edit-period">${t('edit')}</button>
        <button class="btn" id="delete-period">${t('remove')}</button>
      </div>
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

  container.querySelector('#edit-period').addEventListener('click', () => {
    showPeriodForm(cycles, cycle, id => {
      selectedCycleId = id;
      render(container);
    });
  });

  container.querySelector('#delete-period').addEventListener('click', () => {
    showConfirmModal(t('deletePeriod'), t('deletePeriodConfirm'), async () => {
      await commitCycles(cycles.filter(c => c.id !== cycle.id), [cycle.id]);
      selectedCycleId = null;
      render(container);
    });
  });
}

// Add (cycle = null) or edit a period's start/end, then rebuild the chain.
function showPeriodForm(cycles, cycle, onSaved) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t(cycle ? 'editPeriod' : 'addPastPeriod')}</h2>
      <label class="form-field">${t('periodStartDate')}
        <input type="date" id="pf-start" value="${cycle?.startDate || ''}" max="${today()}">
      </label>
      <label class="form-field">${t('periodEndDate')}
        <input type="date" id="pf-end" value="${cycle?.periodEnd || ''}" max="${today()}">
      </label>
      <label class="form-check">
        <input type="checkbox" id="pf-approx" ${cycle?.dateApproximate ? 'checked' : ''}>
        ${t('onboardingApproximate')}
      </label>
      <p class="form-error" id="pf-error"></p>
      <div class="btn-row">
        <button class="btn" id="pf-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="pf-save">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#pf-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#pf-save').addEventListener('click', async () => {
    const startDate = overlay.querySelector('#pf-start').value;
    const periodEnd = overlay.querySelector('#pf-end').value || null;
    const err = validatePeriod(cycles, cycle?.id ?? null, startDate, periodEnd);
    if (err) {
      overlay.querySelector('#pf-error').textContent = t(err.key, err.vars);
      return;
    }
    const edited = {
      ...(cycle || {
        id: crypto.randomUUID(),
        ovulationConfidence: 'low',
        anovulatorySuspected: false,
        backfilled: true,
        excludeFromStats: false
      }),
      startDate,
      periodEnd,
      dateApproximate: overlay.querySelector('#pf-approx').checked
    };
    await commitCycles(cycles.filter(c => c.id !== edited.id).concat(edited), []);
    close();
    onSaved(edited.id);
  });
}

async function commitCycles(nextCycles, deletedIds) {
  const [dayLogs, journal] = await Promise.all([db.getAllDayLogs(), db.getAllJournalEntries()]);
  const rebuilt = rebuildCycleChain(nextCycles, dayLogs, journal);
  await db.saveCycleChain({ ...rebuilt, deletedIds });
}

function renderHormoneChart(lengthDays, ovDay, spreadDays, todayDay = null) {
  const W = Math.max(320, lengthDays * 14);
  const H = 160;
  const pad = { top: 20, right: 10, bottom: 30, left: 10 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const curve = generateCycleCurve(lengthDays, ovDay, null, spreadDays);
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
  let ovLine = `<line x1="${ovX}" y1="${pad.top}" x2="${ovX}" y2="${pad.top + plotH}" stroke="var(--text-muted)" stroke-width="0.5" stroke-dasharray="3,3"/>`;
  if (todayDay) {
    const tx = xScale(todayDay);
    ovLine += `<line x1="${tx}" y1="${pad.top}" x2="${tx}" y2="${pad.top + plotH}" stroke="var(--text-secondary)" stroke-width="1"/>`;
    ovLine += `<text x="${tx + 3}" y="${pad.top + 8}" fill="var(--text-secondary)" font-size="8">${getLanguage() === 'zh' ? '今天' : 'Today'}</text>`;
  }

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
