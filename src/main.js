import './style.css';
import './business.css';
import { db, read, write, myProposals, incoming, teamProfile } from './store.js';
import { esc, icon, showDialog, toast } from './ui.js';
import { rules } from './scoring.js';
import { businessContent, businessAside, setBusinessNavigate, handleBusinessClick, handleBusinessInput, handleBusinessChange, handleBusinessSubmit, resumeEditor } from './business.js';
import { filters, searchBar, feedHeader, studentContent, studentAside, setStudentNavigate, handleStudentClick, handleStudentSubmit, openTask } from './student.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#task-dialog');
let role = read('alem.role', 'student') === 'business' ? 'business' : 'student';
let page = role === 'business' ? 'business' : 'feed';
const titles = { feed: 'Задачи бизнеса', saved: 'Сохранённое', proposals: 'Мои отклики', team: 'Моя команда', business: 'Мои задачи', editor: 'Создание задачи', inbox: 'Отклики команд', company: 'Моя компания' };
function navigate(next, scroll = true) {
  page = next; render(); if (scroll) window.scrollTo({ top: 0 });
}
setBusinessNavigate(navigate); setStudentNavigate(navigate);
function navItem(target, name, symbol, count = '') {
  return `<button class="nav-item ${page === target || (page === 'editor' && target === 'business') ? 'active' : ''}" data-page="${target}" aria-label="${name}" ${page === target ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${name}</span>${count ? `<small>${count}</small>` : ''}</button>`;
}
function roleSwitch() {
  return `<div class="role-switch" role="group" aria-label="Роль в демо"><button data-role="student" aria-label="Роль: команда" aria-pressed="${role === 'student'}" class="${role === 'student' ? 'active' : ''}">${icon('users')}<span>Команда</span></button><button data-role="business" aria-label="Роль: бизнес" aria-pressed="${role === 'business'}" class="${role === 'business' ? 'active' : ''}">${icon('briefcase')}<span>Бизнес</span></button></div>`;
}
function render() {
  const business = role === 'business'; const profile = business ? db.business : teamProfile();
  app.innerHTML = `<div class="layout ${business ? 'business-layout' : ''}"><aside class="sidebar"><button class="brand" data-page="${business ? 'business' : 'feed'}" aria-label="Alem — главная">alem<span class="brand-dot">.</span></button>${roleSwitch()}<nav aria-label="Основная навигация">${business ? navItem('business','Мои задачи','grid') + navItem('inbox','Отклики команд','send',incoming().filter(p => p.status === 'pending').length) + navItem('company','Моя компания','briefcase') : navItem('feed','Лента задач','grid') + navItem('saved','Сохранённое','bookmark',db.saved.length) + navItem('proposals','Мои отклики','send',myProposals().length) + navItem('team','Моя команда','users')}</nav><div class="sidebar-bottom"><button class="help-button" data-action="help">${icon('help')} Помощь</button><button class="account" data-page="${business ? 'company' : 'team'}"><span class="avatar team-avatar">${business ? 'q.' : esc(profile.name.slice(0,2).toUpperCase())}</span><span><strong>${esc(profile.name)}</strong><small>${business ? 'Представитель бизнеса' : 'Студенческая команда'}</small></span>${icon('chevron')}</button></div></aside><main id="main"><header class="page-header"><h1>${titles[page]}</h1>${business && page === 'business' ? `<button class="primary header-create" data-action="create-task">${icon('plus')} Создать задачу</button>` : ''}<button class="mobile-role" data-role="${business ? 'student' : 'business'}">${icon(business ? 'users' : 'briefcase')}${business ? 'Команда' : 'Бизнес'}</button></header>${!business && page === 'feed' ? feedHeader() : !business && page === 'saved' ? `<div class="feed-tools">${searchBar()}</div>` : ''}<div id="content">${business ? businessContent(page) : studentContent(page)}</div></main><aside class="rightbar">${business ? businessAside(page) : studentAside()}</aside></div>`;
}
function switchRole(next) {
  if (!['student','business'].includes(next)) return;
  dialog.close(); role = next; write('alem.role', role); filters.query = '';
  navigate(role === 'business' ? 'business' : 'feed');
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.role) { switchRole(button.dataset.role); return; }
  if (button.dataset.page) { dialog.close(); filters.query = ''; navigate(button.dataset.page); return; }
  if (button.dataset.open) { openTask(button.dataset.open, false, role === 'business'); return; }
  if (button.dataset.action === 'close') { dialog.close(); return; }
  if (button.dataset.action === 'resume-editor' && role === 'business') { resumeEditor(); return; }
  if (role === 'business' && handleBusinessClick(button)) return;
  if (role === 'student' && handleStudentClick(button, page)) return;
  if (button.dataset.action === 'rating') showDialog(`<div class="eyebrow">ГОТОВНОСТЬ ЗАДАЧИ</div><h2>Больше ясности — легче начать</h2><p>Баллы начисляются за заполненные и подтверждённые бизнесом сведения. Все поля группы должны быть заполнены.</p><div class="score-table">${rules.map(r => `<div><span>${r.label}</span><b>${r.weight}</b></div>`).join('')}</div><p class="form-note">0–39 — требует уточнения · 40–69 — рабочая · 70–89 — готовая · 90–100 — приоритетная. Откликнуться можно при любом рейтинге. «Уточняется» и аналогичные ответы не приносят баллов.</p>`);
  if (button.dataset.action === 'help') showDialog(`<div class="eyebrow">ПРАКТИКА СО СМЫСЛОМ</div><h2>${role === 'business' ? 'От идеи к готовой задаче' : 'От задачи к первому результату'}</h2><div class="detail-sections">${(role === 'business' ? [['01. Опишите проблему','Помощник задаст вопросы. Проверьте карточку и подтвердите сведения перед публикацией.'],['02. Изучите предложения','Команды отправляют идеи, планы, сроки и ссылки на прототипы. Выбирайте одну, несколько или ни одной команды.'],['03. Подтвердите результат','После сдачи этапа проверьте работу. Подтверждение начислит команде 10 баллов.']] : [['01. Найдите свою задачу','Все опубликованные задачи доступны любой команде. Используйте поиск и фильтры.'],['02. Предложите решение','Опишите идею, план и сроки. Бизнес самостоятельно рассмотрит предложение.'],['03. Покажите результат','После выбора согласуйте этап с бизнесом и отправьте выполненную работу на подтверждение.']]).map(([h,p]) => `<section><h3>${h}</h3><p>${p}</p></section>`).join('')}</div><p class="form-note">Демонстрационный режим: обе роли работают с данными в этом браузере. Переключайте роль, чтобы пройти весь сценарий. Помощник использует локальные правила, внешний AI и сервер пока не подключены.</p>`);
});
document.addEventListener('input', event => {
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
document.addEventListener('submit', event => {
  event.preventDefault();
  if (role === 'business') handleBusinessSubmit(event.target); else handleStudentSubmit(event.target);
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
  let parent = event.target.parentElement;
  while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
}, true);
window.addEventListener('alem-storage-error', () => toast('Браузер не смог сохранить данные. Они доступны до обновления страницы.'));
render();
