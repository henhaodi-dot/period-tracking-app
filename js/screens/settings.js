import { t, setLanguage, getLanguage } from '../i18n.js';
import * as db from '../db.js';
import { today, addDays } from '../cycle-math.js';

export async function render(container) {
  const settings = await db.getSettings();
  const lang = getLanguage();
  const breastfeeding = settings.breastfeeding || false;
  const constitution = settings.constitution || { thermal: 'neutral' };
  const lastBackup = settings.lastBackup || null;

  const needsBackup = !lastBackup || daysSince(lastBackup) >= 30;

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('settingsTitle')}</span>
      </div>

      ${needsBackup ? `
        <div class="card" style="background:#fef6ee;border-color:#f0d8b8">
          <div class="card-title" style="color:#6b4a20;font-size:0.9rem">${t('backupTitle')}</div>
          <p style="font-size:0.85rem;color:#6b4a20;margin:8px 0">${t('backupMessage')}</p>
          <div class="btn-row">
            <button class="btn btn-ghost" id="backup-dismiss">${t('backupDismiss')}</button>
            <button class="btn btn-primary" id="backup-now" style="background:#b07840;border-color:#b07840">${t('backupNow')}</button>
          </div>
        </div>
      ` : ''}

      <div class="settings-group">
        <div class="settings-group-title">${t('language')}</div>
        <div class="settings-row">
          <span class="settings-label">${lang === 'zh' ? '中文' : 'English'}</span>
          <div class="pill-group">
            <button class="pill ${lang === 'zh' ? 'selected' : ''}" data-lang="zh">中文</button>
            <button class="pill ${lang === 'en' ? 'selected' : ''}" data-lang="en">EN</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">${t('breastfeedingLabel')}</div>
        <div class="settings-row">
          <span class="settings-label">${t('onboardingBreastfeeding')}</span>
          <button class="toggle ${breastfeeding ? 'on' : ''}" id="bf-toggle"></button>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">${t('constitution')}</div>
        <div class="settings-row">
          <span class="settings-label">${t('onboardingThermal')}</span>
          <div class="pill-group">
            <button class="pill ${constitution.thermal === 'warm' ? 'selected' : ''}" data-thermal="warm">${t('thermalWarm')}</button>
            <button class="pill ${constitution.thermal === 'neutral' ? 'selected' : ''}" data-thermal="neutral">${t('thermalNeutral')}</button>
            <button class="pill ${constitution.thermal === 'cool' ? 'selected' : ''}" data-thermal="cool">${t('thermalCool')}</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">${t('exportData')}</div>
        <div class="settings-row">
          <button class="btn" id="export-json">${t('exportJSON')}</button>
          <button class="btn" id="export-md">${t('exportMD')}</button>
        </div>
        <div class="settings-row">
          <button class="btn" id="import-json">${t('importData')}</button>
          <input type="file" id="import-file" accept=".json" style="display:none">
        </div>
      </div>

      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:16px;text-align:center">${t('backupReminder')}</p>
    </div>
  `;

  // Language
  container.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newLang = btn.dataset.lang;
      setLanguage(newLang);
      await db.setSetting('language', newLang);
      render(container);
      updateNav();
    });
  });

  // Breastfeeding toggle
  container.querySelector('#bf-toggle')?.addEventListener('click', async () => {
    const newVal = !breastfeeding;
    await db.setSetting('breastfeeding', newVal);
    render(container);
  });

  // Constitution
  container.querySelectorAll('[data-thermal]').forEach(btn => {
    btn.addEventListener('click', async () => {
      constitution.thermal = btn.dataset.thermal;
      await db.setSetting('constitution', constitution);
      render(container);
    });
  });

  // Export JSON
  container.querySelector('#export-json')?.addEventListener('click', async () => {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `cycle-export-${today()}.json`);
    await db.setSetting('lastBackup', today());
    showToast(lang === 'zh' ? '已导出' : 'Exported');
  });

  // Export Markdown
  container.querySelector('#export-md')?.addEventListener('click', async () => {
    const md = await db.exportMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    downloadBlob(blob, `cycle-export-${today()}.md`);
  });

  // Import
  container.querySelector('#import-json')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });

  container.querySelector('#import-file')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.importAll(data);
      showToast(lang === 'zh' ? '导入成功' : 'Import successful');
      render(container);
    } catch (err) {
      showToast(lang === 'zh' ? '导入失败' : 'Import failed');
    }
  });

  // Backup dismiss
  container.querySelector('#backup-dismiss')?.addEventListener('click', async () => {
    await db.setSetting('lastBackup', today());
    render(container);
  });

  container.querySelector('#backup-now')?.addEventListener('click', () => {
    container.querySelector('#export-json')?.click();
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function daysSince(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return Math.floor((now - d) / 86400000);
}

function updateNav() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
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
