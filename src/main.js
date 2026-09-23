import { tr, getLocale, setLocale } from './i18n.js';
import './style.css';
import './business.css';
import { db, read, write, myProposals, incoming, teamProfile } from './store.js';
import { esc, icon, showDialog, toast } from './ui.js';
import { rules } from './scoring.js';
import { businessContent, businessAside, setBusinessNavigate, handleBusinessClick, handleBusinessInput, handleBusinessChange, handleBusinessSubmit, resumeEditor, cancelBusinessAI } from './business.js';
import { filters, searchBar, feedHeader, studentContent, studentAside, setStudentNavigate, handleStudentClick, handleStudentSubmit, openTask } from './student.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#task-dialog');
let role = read('alem.role', 'student') === 'business' ? 'business' : 'student';
let page = role === 'business' ? 'business' : 'feed';
const titles = { feed: 'Задачи бизнеса', saved: 'Сохранённое', proposals: 'Мои отклики', team: 'Моя команда', business: 'Мои задачи', editor: 'Создание задачи', inbox: 'Отклики команд', company: 'Моя компания' };
function navigate(next, scroll = true) {
  if (next !== 'editor') cancelBusinessAI();
  page = next; render(); if (scroll) window.scrollTo({ top: 0 });
}
setBusinessNavigate(navigate); setStudentNavigate(navigate);
function navItem(target, name, symbol, count = '') {
  return `<button class="nav-item ${page === target || (page === 'editor' && target === 'business') ? 'active' : ''}" data-page="${target}" aria-label="${name}" ${page === target ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${name}</span>${count ? `<small>${count}</small>` : ''}</button>`;
}
function roleSwitch() {
  return `<div class="role-switch" role="group" aria-label="${tr("Роль в демо")}"><button data-role="student" aria-label="${tr("Роль: команда")}" aria-pressed="${role === 'student'}" class="${role === 'student' ? 'active' : ''}">${icon('users')}<span>${tr("Команда")}</span></button><button data-role="business" aria-label="${tr("Роль: бизнес")}" aria-pressed="${role === 'business'}" class="${role === 'business' ? 'active' : ''}">${icon('briefcase')}<span>${tr("Бизнес")}</span></button></div>`;
}
function languageSwitch() {
  return `<div class="language-switch" role="group" aria-label="${tr('Язык интерфейса')}">${[['ru','RU','Русский'],['kk','ҚАЗ','Қазақша']].map(([code,label,name]) => `<button type="button" data-locale="${code}" lang="${code}" aria-label="${name}" aria-pressed="${getLocale() === code}" class="${getLocale() === code ? 'active' : ''}">${label}</button>`).join('')}</div>`;
}
function changeLanguage(locale) {
  if (locale === getLocale()) return;
  // Preserve unsaved profile fields and expanded editor groups across re-rendering.
  const inputs = [...app.querySelectorAll('form')].flatMap(form => [...form.elements].filter(el => el.name || el.id).map(el => ({form:form.id,name:el.name,id:el.id,value:el.value,checked:el.checked})));
  const opened = [...app.querySelectorAll('details')].map(el => el.open);
  cancelBusinessAI(); setLocale(locale); render();
  for (const saved of inputs) {
    const form = document.getElementById(saved.form);
    const input = saved.name ? form?.elements.namedItem(saved.name) : document.getElementById(saved.id);
    if (input) { input.value = saved.value; if (input.type === 'checkbox') input.checked = saved.checked; }
  }
  app.querySelectorAll('details').forEach((el,index) => { el.open = opened[index] || false; });
  app.querySelector(`[data-locale="${getLocale()}"]`)?.focus();
}
function render() {
  document.documentElement.lang = getLocale();
  document.title = tr('Alem — лента задач');
  document.querySelector('meta[name="description"]')?.setAttribute('content',tr('Alem — реальные задачи бизнеса для студенческих команд.'));
  const business = role === 'business'; const profile = business ? db.business : teamProfile();
  app.innerHTML = `<div class="layout ${business ? 'business-layout' : ''}"><aside class="sidebar"><button class="brand" data-page="${business ? 'business' : 'feed'}" aria-label="${tr("Alem — главная")}">alem<span class="brand-dot">.</span></button>${roleSwitch()}<nav aria-label="${tr("Основная навигация")}">${business ? navItem('business',tr("Мои задачи"),'grid') + navItem('inbox',tr("Отклики команд"),'send',incoming().filter(p => p.status === 'pending').length) + navItem('company',tr("Моя компания"),'briefcase') : navItem('feed',tr("Лента задач"),'grid') + navItem('saved',tr("Сохранённое"),'bookmark',db.saved.length) + navItem('proposals',tr("Мои отклики"),'send',myProposals().length) + navItem('team',tr("Моя команда"),'users')}</nav><div class="sidebar-bottom"><button class="help-button" data-action="help">${icon('help')} ${tr("Помощь")}</button><button class="account" data-page="${business ? 'company' : 'team'}"><span class="avatar team-avatar">${business ? 'q.' : esc(profile.name.slice(0,2).toUpperCase())}</span><span><strong>${esc(profile.name)}</strong><small>${business ? tr("Представитель бизнеса") : tr("Студенческая команда")}</small></span>${icon('chevron')}</button></div></aside><main id="main"><header class="page-header"><h1>${tr(titles[page])}</h1>${languageSwitch()}${business && page === 'business' ? `<button class="primary header-create" data-action="create-task">${icon('plus')} ${tr("Создать задачу")}</button>` : ''}<button class="mobile-role" data-role="${business ? 'student' : 'business'}">${icon(business ? 'users' : 'briefcase')}${business ? tr("Команда") : tr("Бизнес")}</button></header>${!business && page === 'feed' ? feedHeader() : !business && page === 'saved' ? `<div class="feed-tools">${searchBar()}</div>` : ''}<div id="content">${business ? businessContent(page) : studentContent(page)}</div></main><aside class="rightbar">${business ? businessAside(page) : studentAside()}</aside></div>`;
}
function switchRole(next) {
  if (!['student','business'].includes(next)) return;
  dialog.close(); role = next; write('alem.role', role); filters.query = '';
  navigate(role === 'business' ? 'business' : 'feed');
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.locale) { changeLanguage(button.dataset.locale); return; }
  if (button.dataset.role) { switchRole(button.dataset.role); return; }
  if (button.dataset.page) { dialog.close(); filters.query = ''; navigate(button.dataset.page); return; }
  if (button.dataset.open) { openTask(button.dataset.open, false, role === 'business'); return; }
  if (button.dataset.action === 'close') { dialog.close(); return; }
  if (button.dataset.action === 'resume-editor' && role === 'business') { resumeEditor(); return; }
  if (role === 'business' && handleBusinessClick(button)) return;
  if (role === 'student' && handleStudentClick(button, page)) return;
  if (button.dataset.action === 'rating') showDialog(`<div class="eyebrow">${tr("ГОТОВНОСТЬ ЗАДАЧИ")}</div><h2>${tr("Больше ясности — легче начать")}</h2><p>${tr("AI проверяет конкретность и проверяемость сведений. За каждый критерий начисляется 0, 25, 50, 75 или 100% его веса: от отсутствия ответа до готовности к работе. Полезные сведения учитываются отдельно, даже если соседнее поле не заполнено. Итог округляется до целого.")}</p><div class="score-table">${rules.map(r => `<div><span>${tr(r.label)}</span><b>${r.weight}</b></div>`).join('')}</div><p class="form-note">${tr("0–39 — требует уточнения · 40–69 — рабочая · 70–89 — готовая · 90–100 — приоритетная. Откликнуться можно при любом рейтинге. Общие фразы и демонстрационные контакты не дают полных баллов. После изменения карточки нужна повторная оценка. Без AI-проверки задача доступна без рейтинга.")}</p>`);
  if (button.dataset.action === 'help') showDialog(`<div class="eyebrow">${tr("ПРАКТИКА СО СМЫСЛОМ")}</div><h2>${role === 'business' ? tr("От идеи к готовой задаче") : tr("От задачи к первому результату")}</h2><div class="detail-sections">${(role === 'business' ? [[tr("01. Опишите проблему"),tr("Помощник задаст вопросы. Проверьте карточку и подтвердите сведения перед публикацией.")],[tr("02. Изучите предложения"),tr("Команды отправляют идеи, планы, сроки и ссылки на прототипы. Выбирайте одну, несколько или ни одной команды.")],[tr("03. Подтвердите результат"),tr("После сдачи этапа проверьте работу. Подтверждение начислит команде 10 баллов.")]] : [[tr("01. Найдите свою задачу"),tr("Все опубликованные задачи доступны любой команде. Используйте поиск и фильтры.")],[tr("02. Предложите решение"),tr("Опишите идею, план и сроки. Бизнес самостоятельно рассмотрит предложение.")],[tr("03. Покажите результат"),tr("После выбора согласуйте этап с бизнесом и отправьте выполненную работу на подтверждение.")]]).map(([h,p]) => `<section><h3>${h}</h3><p>${p}</p></section>`).join('')}</div><p class="form-note">${tr("Демонстрационный режим: обе роли работают с данными в этом браузере. Переключайте роль, чтобы пройти весь сценарий. AI задаёт вопросы и собирает карточку через сервер. Если AI недоступен, включается обозначенный локальный режим.")}</p>`);
});
document.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  if (role === 'business') handleBusinessInput(event.target);
  if (event.target.id === 'search') {
    filters.query = event.target.value;
    if (!['feed','saved'].includes(page)) { navigate('feed', false); document.querySelector('#search')?.focus(); }
    else document.querySelector('#content').innerHTML = studentContent(page);
  }
});
document.addEventListener('change', event => {
  if (role === 'business') { handleBusinessInput(event.target); handleBusinessChange(event.target); }
  if (event.target.id === 'category') filters.category = event.target.value;
  else if (event.target.id === 'level') filters.level = event.target.value;
  else return;
  document.querySelector('#content').innerHTML = studentContent(page);
});
document.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    if (role === 'business') await handleBusinessSubmit(event.target); else handleStudentSubmit(event.target);
  } catch { toast(tr("Не удалось выполнить действие. Проверьте поля и попробуйте снова.")); }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !dialog.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); document.querySelector('#search')?.focus(); }
});
document.addEventListener('invalid', event => {
  const input = event.target;
  if (input.validity.valueMissing) input.setCustomValidity(tr('Заполните это поле.'));
  else if (input.validity.typeMismatch) input.setCustomValidity(tr('Введите корректную ссылку https://…'));
  else if (input.validity.tooShort) input.setCustomValidity(tr('Введите не менее {count} символов.', {count:input.minLength}));
  let parent = event.target.parentElement;
  while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
}, true);
window.addEventListener('alem-storage-error', () => toast(tr("Браузер не смог сохранить данные. Они доступны до обновления страницы.")));
render();
