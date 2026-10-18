import { t, bilingualPhase, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { today, daysBetween, getPhase, predictNextPeriod, estimateOvulationActive, addDays, reanchorCycle, defaultOvulationDay } from '../cycle-math.js';
import { getHormoneLevels, prolactinFromNursing, ovulationSpreadDays } from '../hormone-model.js';
import { phaseInfo, getRemediesForPhase } from '../tcm.js';

export async function render(container) {
  const cycles = await db.getAllCycles();
  const settings = await db.getSettings();
  const breastfeeding = settings.breastfeeding || false;
  const constitution = settings.constitution || { thermal: 'neutral' };
  const lang = getLanguage();

  const activeCycle = cycles.find(c => !c.endDate);

  if (!activeCycle) {
    container.innerHTML = `
      <div class="screen">
        <div class="empty-state">
          <p>${lang === 'zh' ? '还没有活跃的周期' : 'No active cycle'}</p>
          <button class="btn btn-primary" id="start-period">${t('logPeriodStart')}</button>
        </div>
      </div>
    `;
    container.querySelector('#start-period')?.addEventListener('click', () => startNewPeriod(cycles));
    return;
  }

  const todayStr = today();
  const cycleDay = daysBetween(activeCycle.startDate, todayStr) + 1;
  const prediction = predictNextPeriod(cycles, breastfeeding);
  const predictedLength = prediction ? prediction.predictedLength : 28;
  const ovDay = estimateOvulationActive(activeCycle, predictedLength);
  const ovDayNum = ovDay ? daysBetween(activeCycle.startDate, ovDay) + 1 : defaultOvulationDay(predictedLength);
  const phase = getPhase(cycleDay, ovDayNum, predictedLength);
  // The active-cycle estimate is calendar-only (no marker nudge), so 'low'.
  const hormones = getHormoneLevels(cycleDay, ovDayNum, predictedLength, ovulationSpreadDays('low', breastfeeding));

  const todayLog = await db.getDayLog(todayStr);
  const nursing = todayLog?.context?.nursingSessions;
  const prolactin = breastfeeding ? prolactinFromNursing(nursing ?? 6) : null;

  document.documentElement.dataset.phase = phase;

  const info = phaseInfo[phase];
  const remedyList = getRemediesForPhase(phase, constitution, breastfeeding);
  const takenIds = todayLog?.remediesTaken || [];

  const feltKeys = { menstrual: 'feltMenstrual', follicular: 'feltFollicular', ovulatory: 'feltOvulatory', luteal: 'feltLuteal' };

  container.innerHTML = `
    <div class="screen">
      <div class="today-phase">
        <div class="phase-label">${bilingualPhase(phase)}</div>
        <div class="cycle-day">${t('cycleDay', { n: cycleDay })}</div>
        <div class="felt-line">${t(feltKeys[phase])}</div>
      </div>

      ${renderPeriodActions(activeCycle, cycleDay)}

      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('hormoneSnapshot')}</span>
        </div>
        <div class="hormone-bars">
          ${hormoneBar(t('estrogen'), hormones.estrogen, 'estrogen', hormones.range.estrogen)}
          ${hormoneBar(t('progesterone'), hormones.progesterone, 'progesterone', hormones.range.progesterone)}
          ${hormoneBar(t('lhLabel'), hormones.lh, 'lh', hormones.range.lh)}
          ${hormoneBar(t('fshLabel'), hormones.fsh, 'fsh', hormones.range.fsh)}
          ${prolactin !== null ? hormoneBar(t('prolactinLabel'), prolactin, 'prolactin', null) : ''}
        </div>
        <div class="model-note">${t('modelNotMeasurement')}</div>
      </div>

      <div class="tcm-block">
        <div class="tcm-pathology">${info.pathology[lang] || info.pathology.en}</div>
        <div class="tcm-principle">${info.principle[lang] || info.principle.en}</div>
        <div class="remedy-grid">
          ${remedyList.slice(0, 4).map(r => `
            <button class="remedy-chip ${takenIds.includes(r.id) ? 'taken' : ''} ${r.demoted ? 'demoted' : ''}"
                    data-rid="${r.id}" title="${r.description[lang] || r.description.en}">
              <span class="thermal-dot ${r.thermal}"></span>
              ${r.name[lang] || r.name.en}
            </button>
          `).join('')}
        </div>
      </div>

      ${prediction ? `
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('nextPrediction')}</span>
            <span class="card-subtitle">${t(prediction.confidence === 'low' ? 'confidenceLow' : prediction.confidence === 'medium' ? 'confidenceMedium' : 'confidenceHigh')}</span>
          </div>
          <p style="font-size:0.9rem;color:var(--text-secondary)">
            ${prediction.earliest} ~ ${prediction.latest}
          </p>
        </div>
      ` : ''}

      <div class="btn-row">
        <button class="quick-log-btn" id="go-log" style="flex:1">${t('quickLog')}</button>
        <button class="btn" id="go-journal" style="flex:0 0 auto">${t('journalTitle')}</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.remedy-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rid = btn.dataset.rid;
      let log = await db.getDayLog(todayStr) || {
        date: todayStr, cycleId: activeCycle.id, cycleDay, phase, remediesTaken: []
      };
      if (!log.remediesTaken) log.remediesTaken = [];
      if (log.remediesTaken.includes(rid)) {
        log.remediesTaken = log.remediesTaken.filter(id => id !== rid);
        btn.classList.remove('taken');
      } else {
        log.remediesTaken.push(rid);
        btn.classList.add('taken');
      }
      await db.saveDayLog(log);
    });
  });

  container.querySelector('#go-log')?.addEventListener('click', () => {
    location.hash = '#log';
  });

  container.querySelector('#go-journal')?.addEventListener('click', () => {
    location.hash = '#journal';
  });

  container.querySelector('#start-period-btn')?.addEventListener('click', () => {
    showConfirmModal(t('periodStarted'), t('periodStartConfirm'), () => startNewPeriod(cycles));
  });
  container.querySelector('#end-period-btn')?.addEventListener('click', () => endCurrentPeriod(activeCycle));
}

// range: [lo, hi] spread of plausible levels given ovulation-day uncertainty
function hormoneBar(label, value, cls, range) {
  const pct = Math.round(value * 100);
  const confStart = range ? Math.round(range[0] * 100) : 0;
  const confEnd = range ? Math.round(range[1] * 100) : 0;
  return `
    <div class="hormone-row">
      <span class="hormone-label">${label}</span>
      <div class="hormone-bar-track">
        <div class="hormone-bar-fill ${cls}" style="width:${pct}%"></div>
        ${confEnd > confStart ? `<div class="hormone-confidence" style="left:${confStart}%;width:${confEnd - confStart}%"></div>` : ''}
      </div>
    </div>
  `;
}

function renderPeriodActions(activeCycle, cycleDay) {
  if (cycleDay <= 8) {
    return `
      <div class="period-actions">
        <button class="period-btn" id="end-period-btn">${t('logPeriodEnd')}</button>
      </div>
    `;
  }
  return `
    <div class="period-actions">
      <button class="period-btn" id="start-period-btn">${t('logPeriodStart')}</button>
    </div>
  `;
}

async function startNewPeriod(cycles) {
  const todayStr = today();
  const active = cycles.find(c => !c.endDate);
  if (active) {
    active.endDate = todayStr;
    active.lengthDays = daysBetween(active.startDate, todayStr);
    const dayLogs = await db.getDayLogsForCycle(active.id);
    if (dayLogs.length > 0) active.backfilled = false;
    active.dateApproximate = false;
    const reanchored = reanchorCycle(active, dayLogs);
    Object.assign(active, reanchored);
    await db.saveCycle(active);
  }
  const newCycle = {
    id: crypto.randomUUID(),
    startDate: todayStr,
    endDate: null,
    lengthDays: null,
    estimatedOvulation: null,
    ovulationConfidence: 'low',
    anovulatorySuspected: false,
    backfilled: false,
    dateApproximate: false,
    excludeFromStats: false
  };
  await db.saveCycle(newCycle);
  location.hash = '#today';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

async function endCurrentPeriod(activeCycle) {
  location.hash = '#log';
}

function showConfirmModal(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${title}</h2>
      <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px">${message}</p>
      <div class="btn-row">
        <button class="btn" id="modal-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="modal-confirm">${t('confirm')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modal-confirm').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
