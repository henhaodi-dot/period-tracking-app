const DB_NAME = 'cycle-app';
const DB_VERSION = 1;

let dbInstance = null;

function open() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('cycles')) {
        const cs = db.createObjectStore('cycles', { keyPath: 'id' });
        cs.createIndex('startDate', 'startDate');
      }
      if (!db.objectStoreNames.contains('dayLogs')) {
        const dl = db.createObjectStore('dayLogs', { keyPath: 'date' });
        dl.createIndex('cycleId', 'cycleId');
      }
      if (!db.objectStoreNames.contains('journal')) {
        const j = db.createObjectStore('journal', { keyPath: 'id' });
        j.createIndex('date', 'date');
        j.createIndex('cycleId', 'cycleId');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = e => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = e => reject(e.target.error);
  });
}

function tx(store, mode = 'readonly') {
  return open().then(db => {
    const t = db.transaction(store, mode);
    const s = Array.isArray(store) ? store.map(n => t.objectStore(n)) : t.objectStore(store);
    return { tx: t, store: s };
  });
}

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function txComplete(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// --- Cycles ---

export async function getAllCycles() {
  const { store } = await tx('cycles');
  const all = await req(store.index('startDate').getAll());
  return all.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function getCycle(id) {
  const { store } = await tx('cycles');
  return req(store.get(id));
}

export async function getActiveCycle() {
  const all = await getAllCycles();
  return all.find(c => !c.endDate) || null;
}

export async function saveCycle(cycle) {
  if (!cycle.id) cycle.id = crypto.randomUUID();
  const { tx: t, store } = await tx('cycles', 'readwrite');
  store.put(cycle);
  await txComplete(t);
  return cycle;
}

export async function deleteCycle(id) {
  const { tx: t, store } = await tx('cycles', 'readwrite');
  store.delete(id);
  await txComplete(t);
}

// --- Day Logs ---

export async function getDayLog(date) {
  const { store } = await tx('dayLogs');
  return req(store.get(date));
}

export async function getDayLogsForCycle(cycleId) {
  const { store } = await tx('dayLogs');
  const all = await req(store.index('cycleId').getAll(cycleId));
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveDayLog(log) {
  const { tx: t, store } = await tx('dayLogs', 'readwrite');
  store.put(log);
  await txComplete(t);
  return log;
}

export async function getAllDayLogs() {
  const { store } = await tx('dayLogs');
  return req(store.getAll());
}

// --- Journal ---

export async function getJournalEntry(id) {
  const { store } = await tx('journal');
  return req(store.get(id));
}

export async function getJournalEntriesForDate(date) {
  const { store } = await tx('journal');
  const all = await req(store.index('date').getAll(date));
  return all;
}

export async function getJournalEntriesForCycle(cycleId) {
  const { store } = await tx('journal');
  return req(store.index('cycleId').getAll(cycleId));
}

export async function getAllJournalEntries() {
  const { store } = await tx('journal');
  const all = await req(store.getAll());
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveJournalEntry(entry) {
  if (!entry.id) entry.id = crypto.randomUUID();
  const { tx: t, store } = await tx('journal', 'readwrite');
  store.put(entry);
  await txComplete(t);
  return entry;
}

export async function deleteJournalEntry(id) {
  const { tx: t, store } = await tx('journal', 'readwrite');
  store.delete(id);
  await txComplete(t);
}

// --- Settings ---

export async function getSetting(key) {
  const { store } = await tx('settings');
  const row = await req(store.get(key));
  return row ? row.value : undefined;
}

export async function setSetting(key, value) {
  const { tx: t, store } = await tx('settings', 'readwrite');
  store.put({ key, value });
  await txComplete(t);
}

export async function getSettings() {
  const { store } = await tx('settings');
  const all = await req(store.getAll());
  const out = {};
  for (const row of all) out[row.key] = row.value;
  return out;
}

// --- Export / Import ---

export async function exportAll() {
  const [cycles, dayLogs, journal, settings] = await Promise.all([
    getAllCycles(), getAllDayLogs(), getAllJournalEntries(), getSettings()
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), cycles, dayLogs, journal, settings };
}

export async function importAll(data) {
  if (!data || data.version !== 1) throw new Error('Invalid export format');
  const db = await open();
  const t = db.transaction(['cycles', 'dayLogs', 'journal', 'settings'], 'readwrite');
  const cs = t.objectStore('cycles');
  const dl = t.objectStore('dayLogs');
  const j = t.objectStore('journal');
  const s = t.objectStore('settings');

  await Promise.all([req(cs.clear()), req(dl.clear()), req(j.clear()), req(s.clear())]);

  for (const c of data.cycles) cs.put(c);
  for (const d of data.dayLogs) dl.put(d);
  for (const je of data.journal) j.put(je);
  if (data.settings) {
    for (const [k, v] of Object.entries(data.settings)) s.put({ key: k, value: v });
  }
  await txComplete(t);
}

export async function exportMarkdown() {
  const cycles = await getAllCycles();
  const dayLogs = await getAllDayLogs();
  const journal = await getAllJournalEntries();
  let md = '# Cycle History\n\n';
  for (const c of cycles) {
    md += `## Cycle: ${c.startDate}`;
    if (c.endDate) md += ` to ${c.endDate} (${c.lengthDays} days)`;
    md += '\n';
    if (c.backfilled) md += '*Backfilled from memory*\n';
    if (c.estimatedOvulation) md += `Estimated ovulation: ${c.estimatedOvulation}\n`;
    md += '\n';
    const logs = dayLogs.filter(d => d.cycleId === c.id).sort((a, b) => a.date.localeCompare(b.date));
    for (const log of logs) {
      md += `### ${log.date} (Day ${log.cycleDay})\n`;
      if (log.bleeding && log.bleeding.flow) md += `Bleeding: ${log.bleeding.flow}\n`;
      if (log.symptoms && log.symptoms.length) md += `Symptoms: ${log.symptoms.join(', ')}\n`;
      if (log.mood && log.mood.length) md += `Mood: ${log.mood.join(', ')}\n`;
      if (log.discharge) md += `Discharge: ${log.discharge}\n`;
      md += '\n';
    }
    const entries = journal.filter(je => je.cycleId === c.id);
    for (const je of entries) {
      md += `#### Journal ${je.date}\n${je.text}\n\n`;
    }
  }
  return md;
}
