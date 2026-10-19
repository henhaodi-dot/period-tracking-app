import { t } from './i18n.js';

export function showConfirmModal(title, message, onConfirm) {
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
  return overlay;
}
