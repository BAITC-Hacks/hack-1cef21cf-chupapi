import { db, TEAM_ID, categories, publishedTasks, myProposals, getTask, teamProfile, teamPoints, save, uid, statusLabel } from './store.js';
import { esc, icon, avatar, badge, showDialog, toast, formData, safeUrl, empty } from './ui.js';
import { fields } from './scoring.js';

export const filters = { query: '', category: 'Все темы', level: 'all', tab: 'all' };
let navigate;
export function setStudentNavigate(fn) { navigate = fn; }
export function searchBar() {
  return `<label class="search-box">${icon('search')}<input id="search" type="search" placeholder="Найти задачу или компанию" aria-label="Поиск задач" value="${esc(filters.query)}"/><kbd>/</kbd></label>`;
}
export function feedHeader() {
  return `<div class="feed-tools">${searchBar()}</div><div class="feed-tabs"><button data-tab="all" class="${filters.tab === 'all' ? 'selected' : ''}">Все задачи <span>${publishedTasks().length}</span></button><button data-tab="ready" class="${filters.tab === 'ready' ? 'selected' : ''}">Готовы к работе</button></div><div class="filters"><label><span class="sr-only">Тема</span><select id="category">${categories.map(c => `<option ${filters.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label><span class="sr-only">Уровень готовности</span><select id="level">${[['all','Любая готовность'],['priority','90–100 · Приоритетная'],['ready','70–89 · Готовая'],['working','40–69 · Рабочая'],['draft','0–39 · Уточнить']].map(([v,n]) => `<option value="${v}" ${filters.level === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="sort-label text-button" data-action="rating">По рейтингу ↓</button></div>`;
}
export function studentAside() {
  const team = teamProfile();
  return `<section class="side-profile"><span class="avatar team-avatar">${esc(team.name.slice(0,2).toUpperCase())}</span><h2>${esc(team.name)}</h2><p>${esc(team.skills)}</p><button class="secondary" data-page="team">Моя команда ${icon('arrow')}</button></section><section class="side-section"><h2>Направления</h2><div class="topics">${categories.slice(1).map(c => `<button data-category="${c}"><strong>${c}</strong><span>${publishedTasks().filter(t => t.category === c).length}</span>${icon('chevron')}</button>`).join('')}</div></section><button class="side-help" data-action="rating">${icon('help')} Что означает рейтинг? ${icon('chevron')}</button><footer>Alem · Демо</footer>`;
}
export function studentContent(page) {
  if (page === 'team') return teamPage();
  if (page === 'proposals') return proposalPage();
  const list = publishedTasks().filter(t => {
    const level = t.score >= 90 ? 'priority' : t.score >= 70 ? 'ready' : t.score >= 40 ? 'working' : 'draft';
    return (page !== 'saved' || db.saved.includes(t.id)) && (page !== 'feed' || ((filters.tab !== 'ready' || t.score >= 70) && (filters.category === 'Все темы' || filters.category === t.category) && (filters.level === 'all' || filters.level === level))) && `${t.title} ${t.description} ${t.company} ${t.tags.join(' ')}`.toLowerCase().includes(filters.query.toLowerCase().trim());
  }).sort((a,b) => b.score - a.score);
  return list.length ? list.map(taskCard).join('') + `<div class="feed-end">${icon('check')} Все задачи показаны</div>` : empty(page === 'saved' ? 'Пока ничего не сохранено' : 'Задач не найдено', page === 'saved' ? 'Нажмите на закладку у задачи, чтобы вернуться к ней позже.' : 'Попробуйте другой запрос или сбросьте фильтры.');
}
function taskCard(t) {
  const applied = myProposals().some(p => p.taskId === t.id);
  return `<article class="task-card"><div class="post-heading">${avatar(t)}<div class="company-info"><strong>${esc(t.company)}</strong><span>${esc(t.time)}</span></div><button class="icon-button bookmark ${db.saved.includes(t.id) ? 'is-saved' : ''}" data-save="${t.id}" aria-label="${db.saved.includes(t.id) ? 'Убрать из сохранённого' : 'Сохранить задачу'}" aria-pressed="${db.saved.includes(t.id)}">${icon('bookmark')}</button></div><div class="post-body"><button class="task-title" data-open="${t.id}"><h2>${esc(t.title)}</h2></button><p class="task-excerpt">${esc(t.description)}</p><div class="tags">${t.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}<span class="duration">${icon('clock')}${esc(t.weeks || 'Срок обсуждается')}</span></div><div class="task-meta">${badge(t)}<span class="reply-count">${db.proposals.filter(p => p.taskId === t.id).length} откликов</span></div><div class="post-actions"><button class="secondary" data-open="${t.id}">Подробнее</button><button class="apply-button ${applied ? 'secondary applied' : 'primary'}" data-apply="${t.id}">${applied ? 'Мой отклик' : 'Откликнуться'} ${icon(applied ? 'check' : 'arrow')}</button></div></div></article>`;
}
function teamPage() {
  const profile = teamProfile();
  return `<div class="team-cover" aria-hidden="true"></div><section class="team-page"><div class="avatar team-large">${esc(profile.name.slice(0,2).toUpperCase())}</div><h2>${esc(profile.name)}</h2><p class="muted">Студенческая команда</p><div class="team-numbers"><span><b>${myProposals().length}</b> откликов</span><span><b>${teamPoints(TEAM_ID) / 10}</b> этапов завершено</span><span><b>${teamPoints(TEAM_ID)}</b> баллов</span></div><form id="profile-form"><label>Название команды<input name="name" required maxlength="60" value="${esc(profile.name)}"/></label><label>О команде<textarea name="description" maxlength="1000" rows="4">${esc(profile.description)}</textarea></label><label>Навыки и технологии<input name="skills" maxlength="250" value="${esc(profile.skills)}"/></label><button class="primary">Сохранить профиль ${icon('check')}</button></form></section>`;
}
function proposalPage() {
  const proposals = myProposals();
  return proposals.length ? `<div class="section-note">Ваши предложения · ${proposals.length}</div>${proposals.map(p => {
    const t = getTask(p.taskId);
    return `<article class="proposal-card"><span class="status-pill ${p.status === 'selected' ? 'selected-status' : ''}">${statusLabel(p.status)}</span><h2>${esc(t.title)}</h2><p class="muted">${esc(t.company)}</p><p>${esc(p.idea)}</p><details><summary>Ваше предложение</summary><p><strong>План:</strong> ${esc(p.plan)}</p><p><strong>Срок:</strong> ${esc(p.deadline)}</p><a href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer">Открыть прототип ↗</a></details><button class="text-button" data-open="${t.id}">Посмотреть задачу ${icon('arrow')}</button>${p.status === 'selected' ? `<div class="milestone-card">${p.milestone ? `<div class="eyebrow">${p.milestone.status === 'confirmed' ? 'ЭТАП ПОДТВЕРЖДЁН · +10 БАЛЛОВ' : 'РЕЗУЛЬТАТ НА ПРОВЕРКЕ'}</div><p>${esc(p.milestone.description)}</p><a href="${esc(safeUrl(p.milestone.link))}" target="_blank" rel="noopener noreferrer">Посмотреть результат ↗</a>` : `<h3>Команда выбрана</h3><button class="primary" data-submit-stage="${p.id}">Сдать результат ${icon('arrow')}</button>`}</div>` : ''}</article>`;
  }).join('')}` : empty('Здесь будут ваши предложения', 'Выберите интересную задачу и расскажите бизнесу, как ваша команда планирует её решить.');
}
export function openTask(id, apply = false, business = false) {
  const task = getTask(id); if (!task?.published) return;
  if (apply && business) return;
  if (apply && myProposals().some(p => p.taskId === id)) { document.querySelector('#task-dialog').close(); navigate('proposals'); return; }
  if (apply) {
    showDialog(`<h2>Отклик на задачу</h2><p class="muted">${esc(task.company)} · ${esc(task.title)}</p><form id="proposal-form" data-task="${id}"><label>Идея решения<textarea name="idea" required minlength="20" maxlength="3000" rows="3" placeholder="Что предлагаете сделать и почему это поможет бизнесу?"></textarea></label><label>План работы<textarea name="plan" required minlength="20" maxlength="3000" rows="3" placeholder="Опишите основные этапы работы"></textarea></label><label>Срок<input name="deadline" required maxlength="100" placeholder="Например, 3 недели"/></label><label>Ссылка на прототип<input name="link" type="url" required placeholder="https://figma.com/…"/></label><button class="primary">Отправить отклик ${icon('send')}</button></form>`); return;
  }
  const detail = keys => keys.map(key => { const f = fields.find(f => f.key === key); return `<section><h3>${f.label}</h3><p>${esc(task[key] || 'Уточняется')}</p></section>`; }).join('');
  showDialog(`<div class="post-heading">${avatar(task)}<div class="company-info"><strong>${esc(task.company)}</strong><span>${esc(task.category)}</span></div></div><h2 class="detail-title">${esc(task.title)}</h2>${badge(task)}<p class="detail-lead">${esc(task.description)}</p><div class="detail-sections">${detail(['result','success','data'])}</div><details class="disclosure"><summary>Условия и контакты ${icon('chevron')}</summary><div class="detail-sections">${detail(['context','users','constraints','contact','interaction'])}</div></details>${business ? '' : `<div class="dialog-actions"><button class="primary" data-apply="${id}">${myProposals().some(p => p.taskId === id) ? 'Мой отклик' : 'Откликнуться'} ${icon('arrow')}</button></div>`}`);
}
export function handleStudentClick(button, page) {
  if (button.dataset.apply) { openTask(button.dataset.apply, true); return true; }
  if (button.dataset.save) { const id = button.dataset.save; if (!getTask(id)?.published) return true; db.saved = db.saved.includes(id) ? db.saved.filter(x => x !== id) : [...db.saved,id]; save(); navigate(page, false); return true; }
  if (button.dataset.tab) { filters.tab = button.dataset.tab; navigate('feed', false); return true; }
  if (button.dataset.category) { Object.assign(filters, { category: button.dataset.category, query: '', level: 'all', tab: 'all' }); navigate('feed'); return true; }
  if (button.dataset.submitStage) {
    const p = myProposals().find(p => p.id === button.dataset.submitStage);
    if (!p || p.status !== 'selected' || p.milestone) return true;
    showDialog(`<div class="eyebrow">ПЕРВЫЙ ЭТАП</div><h2>Поделитесь результатом</h2><form id="milestone-form" data-proposal="${p.id}"><label>Что сделано<textarea name="description" required minlength="20" maxlength="3000" rows="4" placeholder="Что готово и как проверить результат?"></textarea></label><label>Ссылка на результат<input name="link" type="url" required placeholder="https://…"/></label><p class="form-note">После подтверждения бизнесом команда получит 10 баллов.</p><button class="primary">Отправить на проверку ${icon('arrow')}</button></form>`); return true;
  }
  if (['reset','explore'].includes(button.dataset.action)) { Object.assign(filters, { query: '', category: 'Все темы', level: 'all', tab: 'all' }); navigate('feed'); if (button.dataset.action === 'explore') document.querySelector('#search')?.focus(); return true; }
  return false;
}
export function handleStudentSubmit(form) {
  if (!['proposal-form','profile-form','milestone-form'].includes(form.id)) return false;
  const data = formData(form);
  if (form.id === 'profile-form') {
    if (!data.name) { toast('Введите название команды'); return true; }
    Object.assign(teamProfile(), data); save(); navigate('team'); toast('Профиль команды сохранён');
  } else if (form.id === 'proposal-form') {
    if (data.idea.length < 20 || data.plan.length < 20 || !data.deadline || safeUrl(data.link) === '#') { toast('Проверьте идею, план, срок и ссылку на прототип'); return true; }
    if (!getTask(form.dataset.task)?.published || myProposals().some(p => p.taskId === form.dataset.task)) return true;
    db.proposals.push({ ...data, id: uid(), taskId: form.dataset.task, teamId: TEAM_ID, status: 'pending', createdAt: new Date().toISOString() });
    save(); document.querySelector('#task-dialog').close(); navigate('proposals'); toast('Предложение появилось в кабинете бизнеса');
  } else {
    const p = myProposals().find(p => p.id === form.dataset.proposal);
    if (!p || p.status !== 'selected' || p.milestone) return true;
    if (data.description.length < 20 || safeUrl(data.link) === '#') { toast('Добавьте описание и HTTP(S)-ссылку на результат'); return true; }
    p.milestone = { ...data, status: 'submitted', submittedAt: new Date().toISOString() }; save();
    document.querySelector('#task-dialog').close(); navigate('proposals'); toast('Результат отправлен на подтверждение');
  }
  return true;
}
