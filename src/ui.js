import { tr } from './i18n.js';
import { icon } from './icons.js';
import { readiness } from './data.js';
import { currentAssessment } from './scoring.js';
export { icon };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function safeUrl(value) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : '#'; } catch { return '#'; } }
export const avatar = task => `<div class="avatar">${esc(task.logo || task.name?.slice(0, 2) || 'q.')}</div>`;
export function badge(task) {
  const review = currentAssessment(task);
  return review ? `<span class="readiness ${task.score >= 90 ? 'priority' : ''}">${icon(task.score >= 90 ? 'spark' : 'check')} ${task.score}<span>/100</span><span class="badge-label">· ${tr(readiness(task.score))}</span>${review.source === 'demo' ? `<span class="demo-score-label">· ${tr('Демо-оценка')}</span>` : ''}</span>` : `<span class="readiness">${tr("Готовность не оценена")}</span>`;
}
export const formData = form => Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
let timer;
export function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = tr(message); el.classList.add('visible');
  clearTimeout(timer); timer = setTimeout(() => el.classList.remove('visible'), 4000);
}
export function showDialog(html) {
  const dialog = document.querySelector('#task-dialog');
  dialog.innerHTML = `<button class="icon-button dialog-close" aria-label="${tr("Закрыть")}" data-action="close">${icon('close')}</button>${html}`;
  if (!dialog.open) dialog.showModal();
}
export function empty(title, text, action = 'reset', button = tr("Ко всем задачам")) {
  return `<div class="empty-state">${icon('grid')}<h2>${esc(title)}</h2><p>${esc(text)}</p><button class="primary" data-action="${action}">${esc(button)} ${icon('arrow')}</button></div>`;
}
