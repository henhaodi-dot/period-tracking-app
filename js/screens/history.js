import { t, getLanguage, formatShortDate } from '../i18n.js';
import * as db from '../db.js';
import { generateCycleCurve, ovulationSpreadDays } from '../hormone-model.js';
import { daysBetween, addDays, today, defaultOvulationDay, predictNextPeriod, validatePeriod, rebuildCycleChain, periodLengthDays, calendarMarks, fmt } from '../cycle-math.js';
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

  const view = (await db.getSetting('historyView')) || 'calendar';
  let body;
  if (view === 'calendar') {
    const breastfeeding = !!(await db.getSetting('breastfeeding'));
    const active = cycles.find(c => !c.endDate);
    const activeLogs = active ? await db.getDayLogsForCycle(active.id) : [];
    body = renderCalendar(cycles, predictNextPeriod(cycles, breastfeeding, activeLogs));
  } else {
    body = renderList(sorted);
  }

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('historyTitle')}</span>
        <div class="pill-group">
          <button class="pill ${view === 'calendar' ? 'selected' : ''}" data-view="calendar">${t('historyCalendar')}</button>
          <button class="pill ${view === 'list' ? 'selected' : ''}" data-view="list">${t('historyList')}</button>
        </div>
      </div>
      <button class="add-date-btn" id="add-past-period">+ ${t('addPastPeriod')}</button>
      ${body}
    </div>
  `;

  container.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await db.setSetting('historyView', btn.dataset.view);
      render(container);
    });
  });

  container.querySelector('#add-past-period').addEventListener('click', () => {
    showPeriodForm(cycles, null, () => render(container));
  });

  container.querySelectorAll('.cycle-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedCycleId = el.dataset.id;
      render(container);
    });
  });

  // Period day -> that cycle's detail; any other past day -> add a period starting there.
  container.querySelector('.calendar')?.addEventListener('click', e => {
    const cell = e.target.closest('.cal-day');
    if (!cell || cell.disabled) return;
    if (cell.dataset.cycle) {
      selectedCycleId = cell.dataset.cycle;
      render(container);
    } else {
      showPeriodForm(cycles, null, () => render(container), cell.dataset.date);
    }
  });
}

function renderList(sorted) {
  const lang = getLanguage();
  return `
      <div class="cycle-list">
        ${sorted.length === 0 ? `<div class="empty-state"><p>${lang === 'zh' ? '暂无记录' : 'No cycles recorded yet'}</p></div>` : ''}
        ${sorted.map(c => {
          const tags = [];
          if (c.backfilled) tags.push(t('backfilled'));
          if (c.anovulatorySuspected) tags.push(t('anovulatory'));
          return `
            <div class="cycle-item ${c.backfilled ? 'backfilled' : ''}" data-id="${c.id}">
              <div class="cycle-dates">${c.startDate}${c.endDate ? ' → ' + c.endDate : ` · ${t('currentCycle')}`}</div>
              <div class="cycle-meta">
                ${c.lengthDays ? `<span>${c.lengthDays} ${t('days')}</span>` : ''}
                ${c.periodEnd ? `<span>${periodRangeText(c)}</span>` : ''}
                ${tags.map(tg => `<span class="tag">${tg}</span>`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
  `;
}

// Months newest first: from the month of the predicted period (or this month)
// back to the earliest recorded cycle, at least two months back.
function renderCalendar(cycles, prediction) {
  const lang = getLanguage();
  const todayStr = today();
  const marks = calendarMarks(cycles, prediction, todayStr);

  const lastMarked = [...marks.keys()].reduce((a, b) => (b > a ? b : a), todayStr);
  const earliest = cycles.reduce((a, c) => (c.startDate < a ? c.startDate : a), addDays(todayStr.slice(0, 8) + '01', -40));
  const months = [];
  for (let d = new Date(lastMarked.slice(0, 8) + '01T00:00:00'); fmt(d).slice(0, 7) >= earliest.slice(0, 7); d.setMonth(d.getMonth() - 1)) {
    months.push(new Date(d));
  }

  const weekdays = lang === 'zh' ? ['一', '二', '三', '四', '五', '六', '日'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const legend = [
    ['is-recorded', t('calPeriod')],
    ['is-estimated', t('calEstimated')],
    ['is-predicted', t('calPredicted')],
    ['is-ovulation', t('calOvulation')]
  ];

  return `
    <div class="cal-legend">
      ${legend.map(([cls, label]) => `<span class="cal-legend-item"><span class="cal-swatch ${cls}"></span>${label}</span>`).join('')}
    </div>
    <div class="calendar">
      ${months.map(first => {
        const y = first.getFullYear();
        const m = first.getMonth();
        const title = lang === 'zh' ? `${y}年${m + 1}月` : first.toLocaleString('en', { month: 'long', year: 'numeric' });
        const lead = (first.getDay() + 6) % 7; // Monday-first
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < lead; i++) cells.push('<span></span>');
        for (let day = 1; day <= daysInMonth; day++) {
          const date = fmt(new Date(y, m, day));
          const mk = marks.get(date) || {};
          const cls = ['cal-day'];
          if (mk.period) cls.push(`is-${mk.period}`);
          if (mk.ovulation) cls.push('is-ovulation');
          if (date === todayStr) cls.push('is-today');
          const cycleId = mk.period && mk.period !== 'predicted' ? mk.cycleId : '';
          const disabled = !cycleId && date > todayStr;
          cells.push(`<button class="${cls.join(' ')}" data-date="${date}"${cycleId ? ` data-cycle="${cycleId}"` : ''}${disabled ? ' disabled' : ''}>${day}</button>`);
        }
        return `
          <section class="cal-month">
            <h3 class="cal-month-title">${title}</h3>
            <div class="cal-grid">
              ${weekdays.map(w => `<span class="cal-weekday">${w}</span>`).join('')}
              ${cells.join('')}
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
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
    const prediction = predictNextPeriod(cycles, breastfeeding, dayLogs);
    const cycleDay = lengthDays + 1;
    chartSvg = renderHormoneChart(Math.max(prediction.predictedLength, cycleDay), prediction.ovulationDay,
      ovulationSpreadDays(prediction.ovulationConfidence, breastfeeding), cycleDay);
  }

  container.innerHTML = `
    <div class="screen">
      <button class="btn btn-ghost mb-md" id="back-to-list">${t('back')}</button>
      <div class="card-header">
        <span class="card-title">${cycle.startDate}${cycle.endDate ? ' → ' + cycle.endDate : ''}</span>
        <span class="card-subtitle">${lengthDays} ${t('days')}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">${cycle.periodEnd ? periodRangeText(cycle) : `${t('periodLabel')}: ${formatShortDate(cycle.startDate)} –`}</p>
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
function showPeriodForm(cycles, cycle, onSaved, prefillStart = '') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t(cycle ? 'editPeriod' : 'addPastPeriod')}</h2>
      <label class="form-field">${t('periodStartDate')}
        <input type="date" id="pf-start" value="${cycle?.startDate || prefillStart}" max="${today()}">
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
      const box = overlay.querySelector('#pf-error');
      box.textContent = t(err.key, err.vars);
      box.scrollIntoView({ block: 'nearest' });
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

export function periodRangeText(cycle) {
  return t('periodRange', { start: formatShortDate(cycle.startDate), end: formatShortDate(cycle.periodEnd), n: periodLengthDays(cycle) });
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
