import { db, BUSINESS_ID, categories, ownedTasks, incoming, getTask, uid, save, read, write, decideProposal, confirmMilestone, statusLabel, teamPoints } from './store.js';
import { fields, breakdown, scoreTask } from './scoring.js';
import { analyze } from './assistant.js';
import { esc, icon, badge, toast, showDialog, formData, safeUrl, empty } from './ui.js';
import { readiness } from './data.js';

let editor = read('alem.editor.v2', null);
if (editor && (!editor.task || typeof editor.step !== 'number' || (editor.task.id && !ownedTasks().some(t => t.id === editor.task.id)))) editor = null;
let taskFilter = 'all';
let proposalFilter = 'all';
let proposalTask = 'all';
let onNavigate;
export function setBusinessNavigate(navigate) { onNavigate = navigate; }
const stash = () => write('alem.editor.v2', editor);
export function startEditor(id) {
  if (id) {
    const task = ownedTasks().find(t => t.id === id); if (!task) return;
    if (editor?.task.id !== id) editor = { task: structuredClone(task), step: task.confirmed ? 3 : 1, questions: [], checked: false };
  } else if (!editor || editor.task.id) {
    editor = { task: { title: '', description: '', category: 'Веб-разработка', weeks: '', contact: db.business.contact, interaction: db.business.interaction, confirmed: false, ownerId: BUSINESS_ID }, step: 1, questions: [], checked: false };
  }
  stash(); onNavigate('editor');
}
export function businessContent(page) {
  if (page === 'editor') return editorPage();
  if (page === 'inbox') return inboxPage();
  if (page === 'company') return companyPage();
  return dashboard();
}
function dashboard() {
  const mine = ownedTasks();
  const visible = mine.filter(t => taskFilter === 'all' || (taskFilter === 'published' ? t.published : !t.published));
  return `<div class="feed-tabs business-tabs">${[['all', 'Все'], ['published', 'В каталоге'], ['draft', 'Черновики']].map(([v,n]) => `<button data-business-filter="${v}" class="${taskFilter === v ? 'selected' : ''}">${n}<span>${mine.filter(t => v === 'all' || (v === 'published' ? t.published : !t.published)).length}</span></button>`).join('')}</div>
    ${visible.length ? visible.map(t => {
      const replies = incoming().filter(p => p.taskId === t.id);
      return `<article class="business-task"><div class="business-task-top"><span class="publication-state">${icon(t.published ? 'globe' : 'edit')}${t.published ? 'В каталоге' : 'Черновик'}</span><span class="muted-small">${esc(t.category)}</span></div><button class="task-title" data-edit-task="${t.id}"><h2>${esc(t.title || 'Без названия')}</h2></button><p class="task-excerpt">${esc(t.description)}</p>${t.published ? `<div class="business-task-score">${badge(t)}</div>` : ''}<div class="business-task-actions">${t.published ? `<button class="secondary" data-edit-task="${t.id}">${icon('edit')}Редактировать</button><button class="primary" data-task-inbox="${t.id}">Отклики <span class="button-count">${replies.length}</span>${icon('arrow')}</button>` : `<span class="muted-small">Не опубликована</span><button class="primary" data-edit-task="${t.id}">Продолжить ${icon('arrow')}</button>`}</div></article>`;
    }).join('') : empty('Задач пока нет', 'Опишите, с чем нужна помощь.', 'create-task', 'Создать задачу')}`;
}
function editorPage() {
  if (!editor) return empty('Создайте первую задачу', 'Начните с короткого описания.', 'create-task', 'Создать задачу');
  const { task, step } = editor;
  return `<div class="editor-toolbar"><button class="text-button" data-page="business">${icon('back')} Мои задачи</button><span>${task.published ? 'Правки не опубликованы' : 'Черновик'}</span></div><div class="wizard-steps">${['Описание', 'Вопросы', 'Публикация'].map((name,i) => `<div class="${step === i+1 ? 'current' : step > i+1 ? 'done' : ''}" ${step === i+1 ? 'aria-current="step"' : ''}><span>${step > i+1 ? icon('check') : i+1}</span>${name}</div>`).join('')}</div><section class="editor-body">${step === 1 ? `<h2>С чем нужна помощь?</h2><form id="description-form"><label>Название<input data-editor-field name="title" value="${esc(task.title)}" maxlength="120" required placeholder="Например, учёт заявок"/></label><label>Что нужно сделать<textarea data-editor-field name="description" required minlength="15" maxlength="5000" rows="5" placeholder="Опишите проблему и что хотите изменить">${esc(task.description)}</textarea></label><div class="field-pair"><label>Направление<select data-editor-field name="category">${categories.slice(1).map(c => `<option ${task.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label>Срок <span class="optional">необязательно</span><input data-editor-field name="weeks" value="${esc(task.weeks)}" maxlength="100" placeholder="Например, 3 недели"/></label></div><div class="form-actions"><button type="button" class="secondary" data-action="save-draft">Сохранить черновик</button><button class="primary">Далее ${icon('arrow')}</button></div></form>` : step === 2 ? questionsStep() : cardStep()}</section>`;
}
function questionsStep() {
  const questions = editor.questions;
  const index = Math.min(editor.questionIndex || 0, questions.length - 1);
  const q = questions[index];
  if (!q) return '<p>Вернитесь к описанию задачи.</p><button class="secondary" data-editor-step="1">Назад</button>';
  return `<div class="question-position"><span>Вопрос ${index + 1} из ${questions.length}</span><span class="demo-label">Помощник · демо</span></div><div class="question-progress" aria-label="Прогресс вопросов">${questions.map((_,i) => `<span class="${i <= index ? 'filled' : ''}"></span>`).join('')}</div><form id="questions-form"><label class="question-field"><span>${esc(q.question)}</span><textarea data-editor-field name="${q.key}" rows="6" maxlength="5000" placeholder="Ваш ответ">${esc(editor.task[q.key])}</textarea></label><div class="form-actions"><button type="button" class="secondary" data-action="previous-question">${icon('back')} Назад</button><button class="primary">${index === questions.length - 1 ? 'Проверить задачу' : 'Далее'} ${icon('arrow')}</button></div><button type="button" class="text-button skip-question" data-action="skip-question">Не знаю, пропустить</button></form>`;
}
function cardStep() {
  const task = editor.task;
  const groups = [
    { title: 'Описание', keys: ['description','context','users'] },
    { title: 'Результат', keys: ['result','success'] },
    { title: 'Данные и условия', keys: ['data','constraints'] },
    { title: 'Связь', keys: ['contact','interaction'] },
  ];
  return `<h2>Проверьте и опубликуйте</h2><div class="mobile-score">Готовность <strong id="mobile-score">${scoreTask(task, true)}/100</strong></div><form id="task-card-form"><label>Название<input data-editor-field name="title" value="${esc(task.title)}" required maxlength="120"/></label><div class="review-groups">${groups.map(group => `<details class="review-group"><summary><span><strong>${group.title}</strong><span class="review-preview" data-preview-keys="${group.keys.join(',')}">${esc(group.keys.map(k => task[k]).filter(Boolean).join(' · ') || 'Не заполнено')}</span></span>${icon('edit')}</summary><div class="review-fields">${group.keys.map(key => { const f = fields.find(f => f.key === key); return `<label>${f.label}<textarea data-editor-field name="${key}" rows="3" maxlength="5000" placeholder="${f.placeholder}" ${key === 'description' ? 'required minlength="15"' : ''}>${esc(task[key])}</textarea></label>`; }).join('')}</div></details>`).join('')}<details class="review-group"><summary><span><strong>Направление и срок</strong><span class="review-preview" data-preview-keys="category,weeks">${esc(task.category)} · ${esc(task.weeks || 'Срок обсуждается')}</span></span>${icon('edit')}</summary><div class="review-fields field-pair"><label>Направление<select data-editor-field name="category">${categories.slice(1).map(c => `<option ${task.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label>Срок<input data-editor-field name="weeks" value="${esc(task.weeks)}" maxlength="100" placeholder="Обсуждается"/></label></div></details></div><label class="confirm-checkbox"><input id="confirm-task" type="checkbox" required ${editor.checked ? 'checked' : ''}/><span>Подтверждаю сведения в карточке</span></label><div class="form-actions"><button class="secondary" type="button" data-action="save-draft">Сохранить черновик</button><button class="primary">${task.published ? 'Сохранить изменения' : 'Опубликовать'} ${icon('arrow')}</button></div></form>`;
}
function scorePanel() {
  const task = editor.task; const score = scoreTask(task, true); const rows = breakdown(task, true);
  const next = rows.find(r => !r.complete);
  return `<section class="score-panel"><h2>Готовность задачи</h2><div class="score-value"><strong>${score}</strong><span>/100</span></div><div class="score-progress"><span style="width:${score}%"></span></div><h3>${readiness(score)}</h3><div class="score-breakdown">${rows.map(r => `<div class="${r.complete ? 'complete' : ''}"><span>${icon(r.complete ? 'check' : 'plus')}${r.label}</span><b>${r.earned}<small>/${r.weight}</small></b></div>`).join('')}</div>${next ? `<button class="score-suggestion" data-focus-field="${next.missing[0]}"><span>Добавить: ${fields.find(f => f.key === next.missing[0]).label.toLowerCase()}</span><strong>+${next.weight} ${icon('arrow')}</strong></button>` : ''}<p class="score-caption">Оценка до подтверждения</p></section>`;
}
export function businessAside(page) {
  if (page === 'editor' && editor) {
    if (editor.step === 3) return `<div id="score-panel">${scorePanel()}</div>`;
    return `<section class="editor-outline"><h2>${esc(editor.task.title || 'Новая задача')}</h2><div class="outline-steps">${[['Описание','Что нужно сделать'],['Вопросы','Уточните детали'],['Публикация','Проверьте карточку']].map(([name,label],i) => `<div class="${editor.step === i+1 ? 'current' : ''}"><span>${i+1}</span><div><strong>${name}</strong><small>${label}</small></div></div>`).join('')}</div></section>`;
  }
  const awaiting = incoming().filter(p => p.status === 'pending');
  return `<section class="side-summary"><h2>${esc(db.business.name)}</h2><div><span>Задач в каталоге</span><strong>${ownedTasks().filter(t => t.published).length}</strong></div><div><span>Команд выбрано</span><strong>${incoming().filter(p => p.status === 'selected').length}</strong></div></section><section class="side-section"><h2>Новые отклики <span>${awaiting.length}</span></h2><div class="inbox-preview">${awaiting.slice(0,3).map(p => { const team = db.teams.find(t => t.id === p.teamId); return `<button data-task-inbox="${p.taskId}"><span class="avatar tiny-avatar">${esc(team?.name.slice(0,2))}</span><span><strong>${esc(team?.name)}</strong><small>${esc(p.deadline)}</small></span>${icon('chevron')}</button>`; }).join('') || '<p class="muted">Новых откликов нет</p>'}</div><button class="side-link" data-page="inbox">Все отклики ${icon('arrow')}</button></section><footer>Alem · Демо</footer>`;
}
function inboxPage() {
  const all = incoming().filter(p => proposalTask === 'all' || p.taskId === proposalTask);
  const visible = all.filter(p => proposalFilter === 'all' || p.status === proposalFilter);
  return `<section class="inbox-intro"><label class="inbox-task-filter"><span class="sr-only">Задача для откликов</span><select id="inbox-task"><option value="all">Все ваши задачи</option>${ownedTasks().filter(t => t.published).map(t => `<option value="${t.id}" ${proposalTask === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label></section><div class="feed-tabs business-tabs">${[['all','Все'],['pending','Новые'],['selected','Выбранные'],['rejected','Отклонённые']].map(([v,n]) => `<button data-proposal-filter="${v}" class="${proposalFilter === v ? 'selected' : ''}">${n}<span>${all.filter(p => v === 'all' || p.status === v).length}</span></button>`).join('')}</div>${visible.length ? visible.map(proposalCard).join('') : empty('Пока нет откликов', 'Предложения команд появятся здесь. Опубликованные задачи доступны всем командам.', 'business-home', 'Мои задачи')}`;
}
function proposalCard(p) {
  const team = db.teams.find(t => t.id === p.teamId); const task = getTask(p.taskId);
  return `<article class="incoming-card"><div class="post-heading"><span class="avatar team-avatar">${esc(team?.name.slice(0,2))}</span><div class="company-info"><button class="team-link" data-team-detail="${esc(p.teamId)}">${esc(team?.name || 'Команда')}</button><span>${esc(team?.skills || '')}</span></div><span class="status-pill ${p.status === 'selected' ? 'selected-status' : ''}">${statusLabel(p.status)}</span></div><button class="proposal-task-link" data-open="${task.id}">${esc(task.title)} ${icon('arrow')}</button><p class="proposal-idea">${esc(p.idea)}</p><details class="proposal-plan disclosure"><summary>План работы ${icon('chevron')}</summary><p>${esc(p.plan)}</p></details><div class="proposal-links"><span>${icon('clock')}${esc(p.deadline)}</span><a href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer">Прототип ${icon('external')}</a></div>${p.milestone ? `<div class="milestone-card"><div class="eyebrow">${p.milestone.status === 'confirmed' ? 'ЭТАП ПОДТВЕРЖДЁН · +10 БАЛЛОВ' : 'РЕЗУЛЬТАТ НА ПРОВЕРКЕ'}</div><p>${esc(p.milestone.description)}</p><a href="${esc(safeUrl(p.milestone.link))}" target="_blank" rel="noopener noreferrer">Посмотреть результат ↗</a>${p.milestone.status === 'submitted' ? `<button class="primary" data-confirm-stage="${p.id}">Подтвердить этап ${icon('check')}</button>` : ''}</div>` : ''}<div class="decision-actions">${p.status === 'pending' ? `<button class="primary" data-decision="selected" data-proposal-id="${p.id}">Выбрать команду ${icon('check')}</button><button class="secondary" data-decision="rejected" data-proposal-id="${p.id}">Отклонить</button>` : !p.milestone ? `<button class="text-button" data-decision="pending" data-proposal-id="${p.id}">Вернуть на рассмотрение</button>` : ''}</div></article>`;
}
function companyPage() {
  return `<div class="team-cover" aria-hidden="true"></div><section class="team-page"><div class="avatar team-large">q.</div><h2>${esc(db.business.name)}</h2><p class="muted">Профиль компании</p><form id="business-profile-form"><label>Название компании<input name="name" required maxlength="100" value="${esc(db.business.name)}"/></label><label>О компании<textarea name="description" rows="4" maxlength="2000">${esc(db.business.description)}</textarea></label><label>Рабочий контакт<input name="contact" maxlength="300" value="${esc(db.business.contact)}"/></label><label>Формат взаимодействия<textarea name="interaction" rows="3" maxlength="1000">${esc(db.business.interaction)}</textarea></label><p class="form-note">Эти контакты используются в новых задачах.</p><button class="primary">Сохранить профиль ${icon('check')}</button></form></section>`;
}
function saveDraft() {
  const task = editor.task;
  if (!task.title?.trim()) { toast('Добавьте короткое название задачи'); return; }
  const existing = getTask(task.id);
  if (!existing?.published) {
    const draft = { ...task, id: task.id || uid(), ownerId: BUSINESS_ID, published: false, confirmed: false, score: 0, company: db.business.name, logo: 'q.', handle: 'qadam.edu', tags: [task.category], time: 'Черновик' };
    if (existing) Object.assign(existing, draft); else db.tasks.push(draft);
    editor.task = structuredClone(draft); save();
  }
  stash(); onNavigate('business'); toast('Черновик сохранён. К нему можно вернуться позже.');
}
function advanceQuestion() {
  const index = editor.questionIndex || 0;
  if (index < editor.questions.length - 1) editor.questionIndex = index + 1;
  else { editor.step = 3; editor.checked = false; }
  stash(); onNavigate('editor');
}
export function handleBusinessClick(button) {
  if (button.dataset.action === 'previous-question' && editor) {
    if ((editor.questionIndex || 0) > 0) editor.questionIndex--; else editor.step = 1;
    stash(); onNavigate('editor'); return true;
  }
  if (button.dataset.action === 'skip-question' && editor) { advanceQuestion(); return true; }
  if (button.dataset.focusField && editor) {
    const field = document.querySelector(`[data-editor-field][name="${button.dataset.focusField}"]`);
    const group = field?.closest('details'); if (group) group.open = true;
    field?.focus(); field?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return true;
  }
  if (button.dataset.action === 'create-task') { startEditor(); return true; }
  if (button.dataset.action === 'business-home') { onNavigate('business'); return true; }
  if (button.dataset.editTask) { startEditor(button.dataset.editTask); return true; }
  if (button.dataset.businessFilter) { taskFilter = button.dataset.businessFilter; onNavigate('business'); return true; }
  if (button.dataset.proposalFilter) { proposalFilter = button.dataset.proposalFilter; onNavigate('inbox'); return true; }
  if (button.dataset.taskInbox) { proposalTask = button.dataset.taskInbox; proposalFilter = 'all'; onNavigate('inbox'); return true; }
  if (button.dataset.editorStep && editor) { editor.step = Number(button.dataset.editorStep); if (editor.step === 2 && !editor.questions.length) editor.questions = analyze(editor.task).questions; stash(); onNavigate('editor'); return true; }
  if (button.dataset.action === 'save-draft' && editor) { saveDraft(); return true; }
  if (button.dataset.decision) { if (decideProposal(button.dataset.proposalId, button.dataset.decision)) { onNavigate('inbox'); toast(button.dataset.decision === 'selected' ? 'Команда выбрана. Остальные предложения остаются доступны.' : 'Решение сохранено'); } return true; }
  if (button.dataset.confirmStage) { if (confirmMilestone(button.dataset.confirmStage)) { onNavigate('inbox'); toast('Этап подтверждён. Команда получила 10 баллов.'); } return true; }
  if (button.dataset.teamDetail) {
    const team = db.teams.find(t => t.id === button.dataset.teamDetail); if (!team) return true;
    showDialog(`<div class="eyebrow">СТУДЕНЧЕСКАЯ КОМАНДА</div><h2>${esc(team.name)}</h2><p>${esc(team.description)}</p><div class="tags">${esc(team.skills).split(',').map(s => `<span>${s.trim()}</span>`).join('')}</div><p class="muted">${teamPoints(team.id)} баллов за подтверждённые результаты</p>`); return true;
  }
  return false;
}
export function handleBusinessInput(target) {
  if (target.id === 'confirm-task' && editor) { editor.checked = target.checked; stash(); return; }
  if (target.hasAttribute('data-editor-field') && editor) {
    editor.task[target.name] = target.value; editor.checked = false;
    const check = document.querySelector('#confirm-task'); if (check) check.checked = false;
    stash();
    const panel = document.querySelector('#score-panel'); if (panel) panel.innerHTML = scorePanel();
    document.querySelectorAll('[data-preview-keys]').forEach(preview => {
      preview.textContent = preview.dataset.previewKeys.split(',').map(k => editor.task[k]).filter(Boolean).join(' · ') || 'Не заполнено';
    });
    const mobile = document.querySelector('#mobile-score'); if (mobile) mobile.textContent = `${scoreTask(editor.task, true)}/100`;
  }
}
export function handleBusinessChange(target) {
  if (target.id === 'inbox-task') { proposalTask = target.value; onNavigate('inbox'); return true; }
  return false;
}
export function handleBusinessSubmit(form) {
  if (!['description-form', 'questions-form', 'task-card-form', 'business-profile-form'].includes(form.id)) return false;
  const data = formData(form);
  if (form.id === 'business-profile-form') {
    if (!data.name) { toast('Введите название компании'); return true; }
    Object.assign(db.business, data); for (const task of ownedTasks()) task.company = data.name;
    save(); onNavigate('company'); toast('Профиль компании сохранён'); return true;
  }
  if (!editor) return true;
  Object.assign(editor.task, data);
  if (form.id === 'description-form') {
    if (!data.title || data.description.length < 15) { toast('Добавьте название и описание задачи'); return true; }
    const response = analyze(editor.task); editor.questions = response.questions; editor.questionIndex = 0; editor.step = 2;
    if (response.fallback) toast('Помощник вернул некорректный ответ. Используем локальные вопросы.');
  } else if (form.id === 'questions-form') { advanceQuestion(); return true; }
  else {
    if (!data.title || data.description.length < 15 || !form.querySelector('#confirm-task').checked) { toast('Проверьте название, описание и подтвердите сведения'); return true; }
    const existing = getTask(editor.task.id);
    if (existing && existing.ownerId !== BUSINESS_ID) return true;
    const task = { ...editor.task, id: editor.task.id || uid(), ownerId: BUSINESS_ID, company: db.business.name, logo: 'q.', handle: 'qadam.edu', tags: [data.category], time: 'Только что', published: true, confirmed: true, confirmedAt: new Date().toISOString() };
    task.score = scoreTask(task);
    if (existing) Object.assign(existing, task); else db.tasks.push(task);
    save(); editor = null; stash(); onNavigate('business'); toast(`Задача опубликована. Готовность — ${task.score}/100.`); return true;
  }
  stash(); onNavigate('editor'); return true;
}
export function resumeEditor() { if (editor) onNavigate('editor'); else startEditor(); }
