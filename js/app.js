import { setLanguage, getLanguage, t } from './i18n.js';
import * as db from './db.js';
import { render as renderOnboarding } from './screens/onboarding.js';
import { render as renderToday } from './screens/today.js';
import { render as renderLog } from './screens/log.js';
import { render as renderHistory } from './screens/history.js';
import { render as renderJournal } from './screens/journal.js';
import { render as renderExplore } from './screens/explore.js';
import { render as renderLearn } from './screens/learn.js';
import { render as renderSettings } from './screens/settings.js';

const NAV_ITEMS = [
  { id: 'today', icon: 'sun', labelKey: 'navToday' },
  { id: 'log', icon: 'edit', labelKey: 'navLog' },
  { id: 'history', icon: 'calendar', labelKey: 'navHistory' },
  { id: 'explore', icon: 'compass', labelKey: 'navExplore' },
  { id: 'learn', icon: 'info', labelKey: 'navLearn' },
  { id: 'settings', icon: 'gear', labelKey: 'navSettings' },
];

const icons = {
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

let currentScreen = 'today';

async function init() {
  const savedLang = await db.getSetting('language');
  if (savedLang) setLanguage(savedLang);

  const onboarded = await db.getSetting('onboarded');
  if (!onboarded) {
    showOnboarding();
    return;
  }

  buildNav();
  route();
  window.addEventListener('hashchange', route);
}

function showOnboarding() {
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  if (nav) nav.style.display = 'none';

  window.__onboardingComplete = () => {
    if (nav) nav.style.display = '';
    buildNav();
    location.hash = '#today';
    route();
  };

  renderOnboarding(app, window.__onboardingComplete);
}

function buildNav() {
  let nav = document.getElementById('nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'nav';
    document.body.appendChild(nav);
  }

  nav.innerHTML = `<div class="nav-inner">
    ${NAV_ITEMS.map(item => `
      <button data-screen="${item.id}" class="${item.id === currentScreen ? 'active' : ''}">
        <svg viewBox="0 0 24 24">${icons[item.icon]}</svg>
        <span>${t(item.labelKey)}</span>
      </button>
    `).join('')}
  </div>`;

  nav.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = '#' + btn.dataset.screen;
    });
  });
}

async function route() {
  const hash = location.hash.slice(1) || 'today';
  currentScreen = hash;

  const app = document.getElementById('app');

  const renderers = {
    today: renderToday,
    log: renderLog,
    history: renderHistory,
    journal: renderJournal,
    explore: renderExplore,
    learn: renderLearn,
    settings: renderSettings,
  };

  const renderer = renderers[hash];
  if (renderer) {
    await renderer(app);
  } else {
    await renderToday(app);
    currentScreen = 'today';
  }

  buildNav();
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
