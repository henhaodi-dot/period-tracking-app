import { t, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { today, daysBetween, getPhase, predictNextPeriod, estimateOvulationActive, defaultOvulationDay, periodLengthDays } from '../cycle-math.js';
import { phaseInfo } from '../tcm.js';

let viewMode = 'write'; // 'write' | 'list' | 'phase-filter'
let filterPhase = null;

export async function render(container) {
  const todayStr = today();
  const cycles = await db.getAllCycles();
  const settings = await db.getSettings();
  const breastfeeding = settings.breastfeeding || false;
  const lang = getLanguage();

  const activeCycle = cycles.find(c => !c.endDate);
  let phase = 'follicular';
  if (activeCycle) {
    const cycleDay = daysBetween(activeCycle.startDate, todayStr) + 1;
    const prediction = predictNextPeriod(cycles, breastfeeding);
    const predictedLength = prediction ? prediction.predictedLength : 28;
    const ovDayNum = defaultOvulationDay(predictedLength);
    phase = getPhase(cycleDay, ovDayNum, predictedLength, periodLengthDays(activeCycle));
  }

  const info = phaseInfo[phase];
  const prompt = info.journalPrompt[lang] || info.journalPrompt.en;

  const existing = (await db.getJournalEntriesForDate(todayStr))[0];
  const allEntries = await db.getAllJournalEntries();

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('journalTitle')}</span>
        <div>
          <button class="btn btn-ghost ${viewMode === 'write' ? '' : ''}" id="view-write" style="font-size:0.8rem">${lang === 'zh' ? '写' : 'Write'}</button>
          <button class="btn btn-ghost" id="view-list" style="font-size:0.8rem">${lang === 'zh' ? '回顾' : 'Review'}</button>
        </div>
      </div>

      ${viewMode === 'write' ? `
        <div class="journal-prompt">${prompt}</div>
        <textarea class="journal-textarea" id="journal-text" placeholder="${lang === 'zh' ? '自由书写...' : 'Write freely...'}">${existing?.text || ''}</textarea>
        <button class="btn btn-primary btn-block mt-md" id="save-journal">${t('save')}</button>
      ` : `
        <div class="filter-bar">
          <select id="phase-filter">
            <option value="">${lang === 'zh' ? '全部阶段' : 'All phases'}</option>
            <option value="menstrual" ${filterPhase === 'menstrual' ? 'selected' : ''}>${lang === 'zh' ? '行经期' : 'Menstrual'}</option>
            <option value="follicular" ${filterPhase === 'follicular' ? 'selected' : ''}>${lang === 'zh' ? '经后期' : 'Follicular'}</option>
            <option value="ovulatory" ${filterPhase === 'ovulatory' ? 'selected' : ''}>${lang === 'zh' ? '经间期' : 'Ovulatory'}</option>
            <option value="luteal" ${filterPhase === 'luteal' ? 'selected' : ''}>${lang === 'zh' ? '经前期' : 'Luteal'}</option>
          </select>
        </div>
        <div class="journal-list">
          ${allEntries
            .filter(e => !filterPhase || e.phase === filterPhase)
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(e => `
              <div class="journal-item" data-id="${e.id}">
                <div class="journal-date">${e.date}${e.phase ? ` · ${phaseLabel(e.phase, lang)}` : ''}</div>
                <div class="journal-preview">${e.text}</div>
              </div>
            `).join('')}
          ${allEntries.length === 0 ? `<div class="empty-state"><p>${lang === 'zh' ? '还没有日记' : 'No journal entries yet'}</p></div>` : ''}
        </div>
      `}
    </div>
  `;

  container.querySelector('#view-write')?.addEventListener('click', () => {
    viewMode = 'write';
    render(container);
  });

  container.querySelector('#view-list')?.addEventListener('click', () => {
    viewMode = 'list';
    render(container);
  });

  container.querySelector('#phase-filter')?.addEventListener('change', e => {
    filterPhase = e.target.value || null;
    render(container);
  });

  container.querySelector('#save-journal')?.addEventListener('click', async () => {
    const text = document.getElementById('journal-text')?.value?.trim();
    if (!text) return;
    const entry = existing || {
      id: crypto.randomUUID(),
      date: todayStr,
      cycleId: activeCycle?.id || null,
      phase,
      text: '',
      promptShown: prompt
    };
    entry.text = text;
    await db.saveJournalEntry(entry);
    showToast(t('saved'));
  });
}

function phaseLabel(phase, lang) {
  const labels = {
    menstrual: { zh: '行经期', en: 'Menstrual' },
    follicular: { zh: '经后期', en: 'Follicular' },
    ovulatory: { zh: '经间期', en: 'Ovulatory' },
    luteal: { zh: '经前期', en: 'Luteal' }
  };
  const l = labels[phase];
  return l ? l[lang] || l.en : phase;
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
