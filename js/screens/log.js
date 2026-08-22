import { t, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { today, daysBetween, getPhase, estimateOvulationActive, predictNextPeriod } from '../cycle-math.js';

const SYMPTOMS = [
  { id: 'head-distension', key: 'symptomHeadDistension' },
  { id: 'headache', key: 'symptomHeadache' },
  { id: 'facial-heat', key: 'symptomFacialHeat' },
  { id: 'dizziness', key: 'symptomDizziness' },
  { id: 'tinnitus', key: 'symptomTinnitus' },
  { id: 'dry-eyes', key: 'symptomDryEyes' },
  { id: 'breast-tenderness', key: 'symptomBreastTenderness' },
  { id: 'low-back-ache', key: 'symptomLowBackAche' },
  { id: 'cold-extremities', key: 'symptomColdExtremities' },
  { id: 'one-sided-abdominal-pain', key: 'symptomAbdominalPain' },
  { id: 'bloating', key: 'symptomBloating' },
  { id: 'appetite-shift', key: 'symptomAppetiteShift' },
  { id: 'loose-stool', key: 'symptomLooseStool' },
  { id: 'constipation', key: 'symptomConstipation' },
];

const MOODS = [
  { id: 'irritability', key: 'moodIrritability' },
  { id: 'low-mood', key: 'moodLow' },
  { id: 'anxiety', key: 'moodAnxiety' },
  { id: 'flatness', key: 'moodFlatness' },
  { id: 'tearfulness', key: 'moodTearfulness' },
  { id: 'libido-high', key: 'moodLibidoHigh' },
  { id: 'libido-low', key: 'moodLibidoLow' },
  { id: 'calm', key: 'moodCalm' },
  { id: 'happy', key: 'moodHappy' },
  { id: 'energetic', key: 'moodEnergetic' },
];

let log = {};

export async function render(container) {
  const todayStr = today();
  const cycles = await db.getAllCycles();
  const settings = await db.getSettings();
  const breastfeeding = settings.breastfeeding || false;
  const activeCycle = cycles.find(c => !c.endDate);

  const existing = await db.getDayLog(todayStr);

  const cycleDay = activeCycle ? daysBetween(activeCycle.startDate, todayStr) + 1 : null;
  const prediction = activeCycle ? predictNextPeriod(cycles, breastfeeding) : null;
  const predictedLength = prediction ? prediction.predictedLength : 28;
  const ovDayNum = activeCycle ? predictedLength - 13 : 14;
  const phase = cycleDay ? getPhase(cycleDay, ovDayNum, predictedLength) : 'follicular';

  log = existing || {
    date: todayStr,
    cycleId: activeCycle?.id || null,
    cycleDay,
    phase,
    bleeding: { flow: null, colour: null, clots: null, pain: null },
    symptoms: [],
    mood: [],
    discharge: null,
    context: { sleepHours: null, nightWakings: null, caffeine: null, stress: null, exercise: null, nursingSessions: null },
    remediesTaken: existing?.remediesTaken || []
  };
  if (!log.bleeding) log.bleeding = { flow: null, colour: null, clots: null, pain: null };
  if (!log.symptoms) log.symptoms = [];
  if (!log.mood) log.mood = [];
  if (!log.context) log.context = {};

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('quickLog')} · ${todayStr}</span>
        <span class="save-indicator" id="save-ind">${t('saved')}</span>
      </div>

      <!-- Bleeding -->
      <div class="log-section">
        <div class="log-section-title">${t('bleeding')}</div>

        <div class="log-section-title" style="font-size:0.75rem;margin-top:8px">${t('flow')}</div>
        <div class="pill-group" data-field="flow">
          ${pillOptions([
            ['none', t('flowNone')], ['spotting', t('flowSpotting')], ['light', t('flowLight')],
            ['medium', t('flowMedium')], ['heavy', t('flowHeavy')]
          ], log.bleeding.flow)}
        </div>

        <div class="log-section-title" style="font-size:0.75rem;margin-top:8px">${t('colour')}</div>
        <div class="pill-group" data-field="colour">
          ${pillOptions([
            ['bright', t('colourBright')], ['dark', t('colourDark')],
            ['brown', t('colourBrown')], ['pink', t('colourPink')]
          ], log.bleeding.colour)}
        </div>

        <div class="log-section-title" style="font-size:0.75rem;margin-top:8px">${t('clots')}</div>
        <div class="pill-group" data-field="clots">
          ${pillOptions([
            ['none', t('clotsNone')], ['small', t('clotsSmall')], ['large', t('clotsLarge')]
          ], log.bleeding.clots)}
        </div>

        <div class="log-section-title" style="font-size:0.75rem;margin-top:8px">${t('pain')}</div>
        <div class="pill-group" data-field="pain">
          ${pillOptions([
            ['none', t('painNone')], ['mild', t('painMild')],
            ['moderate', t('painModerate')], ['severe', t('painSevere')]
          ], log.bleeding.pain)}
        </div>
      </div>

      <!-- Symptoms -->
      <div class="log-section">
        <div class="log-section-title">${t('symptoms')}</div>
        <div class="pill-group" data-field="symptoms">
          ${SYMPTOMS.map(s => `<button class="pill ${log.symptoms.includes(s.id) ? 'selected' : ''}" data-id="${s.id}">${t(s.key)}</button>`).join('')}
        </div>
      </div>

      <!-- Mood -->
      <div class="log-section">
        <div class="log-section-title">${t('mood')}</div>
        <div class="pill-group" data-field="mood">
          ${MOODS.map(m => `<button class="pill ${log.mood.includes(m.id) ? 'selected' : ''}" data-id="${m.id}">${t(m.key)}</button>`).join('')}
        </div>
      </div>

      <!-- Discharge -->
      <div class="log-section">
        <div class="log-section-title">${t('discharge')}</div>
        <div class="pill-group" data-field="discharge">
          ${pillOptions([
            ['dry', t('dischargeDry')], ['sticky', t('dischargeSticky')],
            ['creamy', t('dischargeCreamy')], ['egg-white', t('dischargeEggWhite')]
          ], log.discharge)}
        </div>
      </div>

      <!-- Context -->
      <div class="log-section">
        <div class="log-section-title">${t('context')}</div>
        <div class="input-row">
          <label>${t('sleepHours')}</label>
          <input type="number" id="ctx-sleep" min="0" max="24" step="0.5" value="${log.context.sleepHours ?? ''}">
        </div>
        <div class="input-row">
          <label>${t('nightWakings')}</label>
          <input type="number" id="ctx-wakings" min="0" max="20" value="${log.context.nightWakings ?? ''}">
        </div>
        <div class="input-row">
          <label>${t('stress')}</label>
          <select id="ctx-stress">
            <option value="">--</option>
            <option value="low" ${log.context.stress === 'low' ? 'selected' : ''}>${t('stressLow')}</option>
            <option value="medium" ${log.context.stress === 'medium' ? 'selected' : ''}>${t('stressMedium')}</option>
            <option value="high" ${log.context.stress === 'high' ? 'selected' : ''}>${t('stressHigh')}</option>
          </select>
        </div>
        ${breastfeeding ? `
          <div class="input-row">
            <label>${t('nursingSessions')}</label>
            <input type="number" id="ctx-nursing" min="0" max="20" value="${log.context.nursingSessions ?? ''}">
          </div>
        ` : ''}
      </div>

      <button class="btn btn-primary btn-block" id="save-log">${t('save')}</button>
    </div>
  `;

  // Bleeding pills
  ['flow', 'colour', 'clots', 'pain'].forEach(field => {
    container.querySelectorAll(`[data-field="${field}"] .pill`).forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        log.bleeding[field] = log.bleeding[field] === val ? null : val;
        btn.closest('.pill-group').querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
        if (log.bleeding[field]) btn.classList.add('selected');
      });
    });
  });

  // Multi-select: symptoms
  container.querySelectorAll('[data-field="symptoms"] .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (log.symptoms.includes(id)) {
        log.symptoms = log.symptoms.filter(s => s !== id);
        btn.classList.remove('selected');
      } else {
        log.symptoms.push(id);
        btn.classList.add('selected');
      }
    });
  });

  // Multi-select: mood
  container.querySelectorAll('[data-field="mood"] .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (log.mood.includes(id)) {
        log.mood = log.mood.filter(m => m !== id);
        btn.classList.remove('selected');
      } else {
        log.mood.push(id);
        btn.classList.add('selected');
      }
    });
  });

  // Single-select: discharge
  container.querySelectorAll('[data-field="discharge"] .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      log.discharge = log.discharge === val ? null : val;
      btn.closest('.pill-group').querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
      if (log.discharge) btn.classList.add('selected');
    });
  });

  // Save
  container.querySelector('#save-log').addEventListener('click', async () => {
    log.context.sleepHours = parseNum(document.getElementById('ctx-sleep')?.value);
    log.context.nightWakings = parseNum(document.getElementById('ctx-wakings')?.value);
    log.context.stress = document.getElementById('ctx-stress')?.value || null;
    log.context.nursingSessions = parseNum(document.getElementById('ctx-nursing')?.value);
    await db.saveDayLog(log);
    const ind = document.getElementById('save-ind');
    if (ind) { ind.classList.add('visible'); setTimeout(() => ind.classList.remove('visible'), 2000); }
    showToast(t('saved'));
  });
}

function pillOptions(options, selected) {
  return options.map(([val, label]) =>
    `<button class="pill ${selected === val ? 'selected' : ''}" data-val="${val}">${label}</button>`
  ).join('');
}

function parseNum(val) {
  if (!val && val !== 0) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
