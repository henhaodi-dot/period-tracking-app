import { t, setLanguage, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { daysBetween, predictCycleLength, uncertaintyBand, getClosedIntervals, addDays, fmt, today } from '../cycle-math.js';

let dates = [];
let step = 1; // 1=dates, 2=profile, 3=results
let warnings = [];
let breastfeeding = false;
let constitution = { thermal: 'neutral' };

export function render(container, onComplete) {
  if (step === 1) renderDates(container, onComplete);
  else if (step === 2) renderProfile(container, onComplete);
  else renderResults(container, onComplete);
}

function renderDates(container, onComplete) {
  const todayStr = today();
  container.innerHTML = `
    <div class="onboarding">
      <h1>${t('onboardingWelcome')}</h1>
      <p>${t('onboardingIntro')}</p>
      <div id="date-entries"></div>
      <button class="add-date-btn" id="add-date">+ ${t('onboardingAddEarlier')}</button>
      <div id="warnings"></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="dates-next">${t('next')}</button>
      </div>
    </div>
  `;

  if (dates.length === 0) {
    dates.push({ date: '', approximate: false });
  }

  renderDateEntries();

  container.querySelector('#add-date').addEventListener('click', () => {
    dates.push({ date: '', approximate: false });
    renderDateEntries();
  });

  container.querySelector('#dates-next').addEventListener('click', () => {
    const filled = dates.filter(d => d.date);
    if (filled.length === 0) return;
    filled.sort((a, b) => b.date.localeCompare(a.date));
    dates = filled;
    warnings = validateIntervals(dates);
    if (warnings.length > 0) {
      renderWarnings();
      return;
    }
    step = 2;
    render(container, onComplete);
  });
}

function renderDateEntries() {
  const el = document.getElementById('date-entries');
  if (!el) return;
  el.innerHTML = dates.map((d, i) => `
    <div class="date-entry">
      <input type="date" value="${d.date}" data-idx="${i}" class="date-input" max="${today()}">
      <label>
        <input type="checkbox" ${d.approximate ? 'checked' : ''} data-idx="${i}" class="approx-check">
        ${t('onboardingApproximate')}
      </label>
      ${i > 0 ? `<button class="remove-btn" data-idx="${i}">&times;</button>` : ''}
    </div>
  `).join('');

  el.querySelectorAll('.date-input').forEach(inp => {
    inp.addEventListener('change', e => {
      dates[+e.target.dataset.idx].date = e.target.value;
    });
  });
  el.querySelectorAll('.approx-check').forEach(cb => {
    cb.addEventListener('change', e => {
      dates[+e.target.dataset.idx].approximate = e.target.checked;
    });
  });
  el.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      dates.splice(+e.target.dataset.idx, 1);
      renderDateEntries();
    });
  });
}

function validateIntervals(sorted) {
  const w = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = daysBetween(sorted[i + 1].date, sorted[i].date);
    if (gap < 21 || gap > 45) {
      w.push({ from: sorted[i + 1].date, to: sorted[i].date, gap, idx: i });
    }
  }
  return w;
}

function renderWarnings() {
  const el = document.getElementById('warnings');
  if (!el || warnings.length === 0) return;
  el.innerHTML = warnings.map((w, i) => `
    <div class="interval-warning" data-widx="${i}">
      ${t('intervalWarning', { from: w.from, to: w.to, n: w.gap })}
      <div class="warning-actions">
        <button class="btn" data-action="genuine" data-widx="${i}">${t('genuineLong')}</button>
        <button class="btn" data-action="missed" data-widx="${i}">${t('missedPeriod')}</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = +e.target.dataset.widx;
      if (e.target.dataset.action === 'missed') {
        warnings[idx].exclude = true;
      }
      warnings[idx].resolved = true;
      if (warnings.every(w => w.resolved)) {
        step = 2;
        const container = document.getElementById('app');
        render(container, window.__onboardingComplete);
      } else {
        e.target.closest('.interval-warning').style.opacity = '0.4';
      }
    });
  });
}

function renderProfile(container, onComplete) {
  container.innerHTML = `
    <div class="onboarding">
      <h1>${t('onboardingConstitution')}</h1>
      <div class="constitution-group">
        <label>${t('onboardingBreastfeeding')}</label>
        <div class="pill-group mb-lg">
          <button class="pill ${breastfeeding ? 'selected' : ''}" data-bf="true">${t('yes')}</button>
          <button class="pill ${!breastfeeding ? 'selected' : ''}" data-bf="false">${t('no')}</button>
        </div>
      </div>
      <div class="constitution-group">
        <label>${t('onboardingThermal')}</label>
        <div class="pill-group">
          <button class="pill ${constitution.thermal === 'warm' ? 'selected' : ''}" data-thermal="warm">${t('thermalWarm')}</button>
          <button class="pill ${constitution.thermal === 'neutral' ? 'selected' : ''}" data-thermal="neutral">${t('thermalNeutral')}</button>
          <button class="pill ${constitution.thermal === 'cool' ? 'selected' : ''}" data-thermal="cool">${t('thermalCool')}</button>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="profile-back">${t('back')}</button>
        <button class="btn btn-primary" id="profile-next">${t('next')}</button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-bf]').forEach(btn => {
    btn.addEventListener('click', e => {
      breastfeeding = e.target.dataset.bf === 'true';
      render(container, onComplete);
    });
  });

  container.querySelectorAll('[data-thermal]').forEach(btn => {
    btn.addEventListener('click', e => {
      constitution.thermal = e.target.dataset.thermal;
      render(container, onComplete);
    });
  });

  container.querySelector('#profile-back').addEventListener('click', () => {
    step = 1;
    render(container, onComplete);
  });

  container.querySelector('#profile-next').addEventListener('click', () => {
    step = 3;
    render(container, onComplete);
  });
}

async function renderResults(container, onComplete) {
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
  const cycles = [];

  for (let i = 0; i < sorted.length; i++) {
    const startDate = sorted[i].date;
    const endDate = i < sorted.length - 1 ? sorted[i + 1].date : null;
    const lengthDays = endDate ? daysBetween(startDate, endDate) : null;
    const shouldExclude = warnings.find(w => w.from === startDate && w.exclude);

    cycles.push({
      id: crypto.randomUUID(),
      startDate,
      endDate,
      lengthDays,
      estimatedOvulation: endDate ? addDays(endDate, -13) : null,
      ovulationConfidence: 'low',
      anovulatorySuspected: false,
      backfilled: true,
      dateApproximate: sorted[i].approximate,
      excludeFromStats: !!shouldExclude
    });
  }

  const intervals = getClosedIntervals(cycles);
  const { predicted } = predictCycleLength(intervals);
  const band = uncertaintyBand(intervals, breastfeeding);
  const lengths = intervals.map(i => i.length);
  const minLen = lengths.length ? Math.min(...lengths) : null;
  const maxLen = lengths.length ? Math.max(...lengths) : null;

  const activeCycle = cycles.find(c => !c.endDate);
  let nextPeriod = '';
  if (activeCycle && intervals.length > 0) {
    const exp = addDays(activeCycle.startDate, predicted);
    const early = addDays(exp, -band);
    const late = addDays(exp, band);
    nextPeriod = `${early} ~ ${late}`;
  }

  container.innerHTML = `
    <div class="onboarding">
      <h1>${t('onboardingResult')}</h1>
      <div class="onboarding-results">
        ${intervals.length > 0 ? `
          <div class="stat">
            <span class="stat-label">${t('avgLength')}</span>
            <span class="stat-value">${predicted} ${t('days')}</span>
          </div>
          <div class="stat">
            <span class="stat-label">${t('rangeLabel')}</span>
            <span class="stat-value">${minLen}–${maxLen} ${t('days')}</span>
          </div>
        ` : ''}
        ${nextPeriod ? `
          <div class="stat">
            <span class="stat-label">${t('nextPrediction')}</span>
            <span class="stat-value">${nextPeriod}</span>
          </div>
        ` : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="results-back">${t('back')}</button>
        <button class="btn btn-primary" id="results-finish">${t('finish')}</button>
      </div>
    </div>
  `;

  container.querySelector('#results-back').addEventListener('click', () => {
    step = 2;
    render(container, onComplete);
  });

  container.querySelector('#results-finish').addEventListener('click', async () => {
    for (const c of cycles) await db.saveCycle(c);
    await db.setSetting('breastfeeding', breastfeeding);
    await db.setSetting('constitution', constitution);
    await db.setSetting('language', getLanguage());
    await db.setSetting('onboarded', true);
    step = 1;
    dates = [];
    if (onComplete) onComplete();
  });
}
