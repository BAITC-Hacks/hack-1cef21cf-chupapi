import { tr, getLocale } from './i18n.js';
import { db, BUSINESS_ID, categories, ownedTasks, incoming, getTask, uid, save, read, write, decideProposal, confirmMilestone, statusLabel, teamPoints, deleteTask } from './store.js';
import { fields, breakdown, scoreTask, currentAssessment } from './scoring.js';
import { analyze, localQuestions } from './assistant.js';
import { requestAssistant } from './ai-client.js';
import { cleanTask } from './ai-contract.js';
import { esc, icon, badge, toast, showDialog, formData, safeUrl, empty } from './ui.js';
import { readiness } from './data.js';

let editor = read('alem.editor.v2', null);
if (editor && (!editor.task || typeof editor.step !== 'number' || (editor.task.id && !ownedTasks().some(t => t.id === editor.task.id)))) editor = null;
let taskFilter = 'all';
let proposalFilter = 'all';
let proposalTask = 'all';
let onNavigate;
let pendingAI = null;
export function setBusinessNavigate(navigate) { onNavigate = navigate; }
const stash = () => write('alem.editor.v2', editor);
export function startEditor(id) {
  cancelBusinessAI();
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
  return `<div class="feed-tabs business-tabs">${[['all', tr("Все")], ['published', tr("В каталоге")], ['draft', tr("Черновики")]].map(([v,n]) => `<button data-business-filter="${v}" class="${taskFilter === v ? 'selected' : ''}">${n}<span>${mine.filter(t => v === 'all' || (v === 'published' ? t.published : !t.published)).length}</span></button>`).join('')}</div>
    ${visible.length ? visible.map(t => {
      const replies = incoming().filter(p => p.taskId === t.id);
      return `<article class="business-task"><div class="business-task-top"><span class="publication-state">${icon(t.published ? 'globe' : 'edit')}${t.published ? tr("В каталоге") : tr("Черновик")}</span><span class="muted-small">${esc(tr(t.category))}</span><button class="icon-button" data-delete-task="${t.id}" aria-label="${t.published ? tr("Удалить задачу") : tr("Удалить черновик")}">${icon('trash')}</button></div><button class="task-title" data-edit-task="${t.id}"><h2>${esc(t.title || tr("Без названия"))}</h2></button><p class="task-excerpt">${esc(t.description)}</p>${t.published ? `<div class="business-task-score">${badge(t)}</div>` : ''}<div class="business-task-actions">${t.published ? `<button class="secondary" data-edit-task="${t.id}">${icon('edit')}${tr("Редактировать")}</button><button class="primary" data-task-inbox="${t.id}">${tr("Отклики")} <span class="button-count">${replies.length}</span>${icon('arrow')}</button>` : `<span class="muted-small">${tr("Не опубликована")}</span><button class="primary" data-edit-task="${t.id}">${tr("Продолжить")} ${icon('arrow')}</button>`}</div></article>`;
    }).join('') : empty(tr("Задач пока нет"), tr("Опишите, с чем нужна помощь."), 'create-task', tr("Создать задачу"))}`;
}
function editorPage() {
  if (!editor) return empty(tr("Создайте первую задачу"), tr("Начните с короткого описания."), 'create-task', tr("Создать задачу"));
  const { task, step } = editor;
  if (pendingAI) return `<section class="ai-loading" role="status" aria-live="polite"><span class="ai-spinner"></span><h2>${pendingAI.kind === 'questions' ? tr("Уточняем вашу задачу") : pendingAI.kind === 'review' ? tr("Проверяем содержание") : tr("Собираем и проверяем карточку")}</h2><p>${pendingAI.kind === 'questions' ? tr("Подбираем вопросы по недостающим сведениям.") : tr("Проверяем конкретность ответов и критерии приёмки.")}</p><button class="secondary" data-action="cancel-ai">${tr("Вернуться к редактированию")}</button></section>`;
  return `<div class="editor-toolbar"><button class="text-button" data-page="business">${icon('back')} ${tr("Мои задачи")}</button><span>${task.published ? tr("Правки не опубликованы") : tr("Черновик")}</span><button class="icon-button" data-delete-task="${task.id || 'current-draft'}" aria-label="${task.published ? tr("Удалить задачу") : tr("Удалить черновик")}">${icon('trash')}</button></div><div class="wizard-steps">${[tr("Описание"), tr("Вопросы"), tr("Публикация")].map((name,i) => `<div class="${step === i+1 ? 'current' : step > i+1 ? 'done' : ''}" ${step === i+1 ? 'aria-current="step"' : ''}><span>${step > i+1 ? icon('check') : i+1}</span>${name}</div>`).join('')}</div><section class="editor-body">${step === 1 ? `<h2>${tr("С чем нужна помощь?")}</h2><form id="description-form"><label>${tr("Название")}<input data-editor-field name="title" value="${esc(task.title)}" maxlength="120" required placeholder="${tr("Например, учёт заявок")}"/></label><label>${tr("Что нужно сделать")}<textarea data-editor-field name="description" required minlength="15" maxlength="5000" rows="5" placeholder="${tr("Опишите проблему и что хотите изменить")}">${esc(task.description)}</textarea></label><div class="field-pair"><label>${tr("Направление")}<select data-editor-field name="category">${categories.slice(1).map(c => `<option value="${esc(c)}" ${task.category === c ? 'selected' : ''}>${tr(c)}</option>`).join('')}</select></label><label>${tr("Срок")} <span class="optional">${tr("необязательно")}</span><input data-editor-field name="weeks" value="${esc(task.weeks)}" maxlength="100" placeholder="${tr("Например, 3 недели")}"/></label></div><div class="form-actions"><button type="button" class="secondary" data-action="save-draft">${tr("Сохранить черновик")}</button><button class="primary">${tr("Уточнить с AI")} ${icon('spark')}</button></div></form>` : step === 2 ? questionsStep() : cardStep()}</section>`;
}
function questionsStep() {
  const questions = editor.questions;
  const index = Math.min(editor.questionIndex || 0, questions.length - 1);
  const q = questions[index];
  if (!q) return `<p>${tr("Вернитесь к описанию задачи.")}</p><button class="secondary" data-editor-step="1">${tr("Назад")}</button>`;
  return `<div class="question-position"><span>${tr("Вопрос")} ${index + 1} ${tr("из")} ${questions.length}</span><span class="demo-label">${editor.questionMode === 'openai' ? tr("AI-помощник") : tr("Локальный режим")}</span></div><div class="question-progress" aria-label="${tr("Прогресс вопросов")}">${questions.map((_,i) => `<span class="${i <= index ? 'filled' : ''}"></span>`).join('')}</div>${editor.questionMode === 'openai' && (editor.questionLocale || 'ru') !== getLocale() ? `<p class="ai-notice">${tr('Вопросы созданы на другом языке.')} <button type="button" class="text-button" data-action="refresh-questions">${tr('Обновить вопросы')}</button></p>` : ''}${editor.questionNotice ? `<p class="ai-notice">${esc(tr(editor.questionNotice))}</p>` : ''}<form id="questions-form"><label class="question-field"><span>${esc(editor.questionMode === 'openai' ? q.question : (localQuestions(editor.task, getLocale(), true).questions.find(item => item.key === q.key)?.question || tr(q.question)))}</span><textarea data-editor-field name="${q.key}" rows="6" maxlength="5000" placeholder="${tr("Ваш ответ")}">${esc(editor.task[q.key])}</textarea></label><div class="form-actions"><button type="button" class="secondary" data-action="previous-question">${icon('back')} ${tr("Назад")}</button><button class="primary">${index === questions.length - 1 ? tr("Собрать карточку") : tr("Далее")} ${icon('arrow')}</button></div><button type="button" class="text-button skip-question" data-action="skip-question">${tr("Не знаю, пропустить")}</button></form>`;
}
function cardStep() {
  const task = editor.task;
  const groups = [
    { title: tr("Описание"), keys: ['description','context','users'] },
    { title: tr("Результат"), keys: ['result','success'] },
    { title: tr("Данные и условия"), keys: ['data','constraints'] },
    { title: tr("Связь"), keys: ['contact','interaction'] },
  ];
  return `<div class="card-review-heading"><h2>${tr("Проверьте карточку")}</h2><button class="text-button" type="button" data-action="preview-card">${tr("Предпросмотр")} ${icon('external')}</button></div>${editor.cardMode ? `<p class="ai-card-status">${icon('check')}${editor.cardMode === 'openai' ? tr("Собрано AI из ваших сведений") : tr("Собрано из ваших ответов")}</p>` : ''}${editor.cardNotice ? `<p class="ai-notice">${esc(tr(editor.cardNotice))}</p>` : ''}<div id="quality-review">${qualityReview()}</div><form id="task-card-form"><label>${tr("Название")}<input data-editor-field name="title" value="${esc(task.title)}" required maxlength="120"/></label><div class="review-groups">${groups.map(group => `<details class="review-group"><summary><span><strong>${group.title}</strong><span class="review-preview" data-preview-keys="${group.keys.join(',')}">${esc(group.keys.map(k => task[k]).filter(Boolean).join(' · ') || tr("Не заполнено"))}</span></span>${icon('edit')}</summary><div class="review-fields">${group.keys.map(key => { const f = fields.find(f => f.key === key); return `<label>${tr(f.label)}<textarea data-editor-field name="${key}" rows="3" maxlength="5000" placeholder="${esc(tr(f.placeholder))}" ${key === 'description' ? 'required minlength="15"' : ''}>${esc(task[key])}</textarea></label>`; }).join('')}</div></details>`).join('')}<details class="review-group"><summary><span><strong>${tr("Направление и срок")}</strong><span class="review-preview" data-preview-keys="category,weeks">${esc(tr(task.category))} · ${esc(task.weeks || tr("Срок обсуждается"))}</span></span>${icon('edit')}</summary><div class="review-fields field-pair"><label>${tr("Направление")}<select data-editor-field name="category">${categories.slice(1).map(c => `<option value="${esc(c)}" ${task.category === c ? 'selected' : ''}>${tr(c)}</option>`).join('')}</select></label><label>${tr("Срок")}<input data-editor-field name="weeks" value="${esc(task.weeks)}" maxlength="100" placeholder="${tr("Обсуждается")}"/></label></div></details></div><label class="confirm-checkbox"><input id="confirm-task" type="checkbox" required ${editor.checked ? 'checked' : ''}/><span>${tr("Подтверждаю сведения в карточке")}</span></label><div class="form-actions"><button class="secondary" type="button" data-action="save-draft">${tr("Сохранить черновик")}</button><button class="primary">${task.published ? tr("Сохранить изменения") : tr("Опубликовать")} ${icon('arrow')}</button></div></form>`;
}
function qualityReview() {
  const task = editor.task;
  const review = currentAssessment(task);
  const issues = review ? fields.filter(f => review.fields[f.key].level < 4) : [];
  return `<section class="quality-review" aria-live="polite">${review && review.locale !== getLocale() ? `<p>${tr('Пояснения сохранены на языке последней проверки. Для перевода запустите проверку ещё раз.')}</p>` : ''}<div class="quality-heading"><strong>${review ? `${tr("Готовность")} ${scoreTask(task, true)}/100` : tr("Готовность не оценена")}</strong><button class="text-button" type="button" data-action="review-card">${review ? tr("Проверить ещё раз") : tr("Оценить с AI")} ${icon('spark')}</button></div>${review ? issues.length ? `<details class="quality-issues"><summary>${tr("Что уточнить ·")} ${issues.length} ${icon('chevron')}</summary>${issues.map(f => `<button type="button" data-focus-field="${f.key}"><strong>${tr(f.label)}</strong><span>${esc(tr(review.fields[f.key].reason))}</span>${icon('arrow')}</button>`).join('')}</details>` : `<p>${tr("Все критерии проработаны. Подтвердите сведения перед публикацией.")}</p>` : `<p>${task.assessment ? tr("Карточка изменена. Нужна повторная проверка.") : tr("Проверьте содержание, чтобы получить баллы. Без проверки можно опубликовать без рейтинга.")}</p>`}</section>`;
}
function scorePanel() {
  const task = editor.task; const review = currentAssessment(task);
  const score = scoreTask(task, true); const rows = breakdown(task, true);
  return `<section class="score-panel"><h2>${tr("Готовность задачи")}</h2><div class="score-value"><strong>${review ? score : '—'}</strong><span>/100</span></div><div class="score-progress"><span style="width:${score}%"></span></div><h3>${review ? tr(readiness(score)) : tr("Нужна оценка содержания")}</h3>${review ? `<div class="score-breakdown">${rows.map(r => `<div class="${r.complete ? 'complete' : ''}"><span>${icon(r.complete ? 'check' : 'plus')}${tr(r.label)}</span><b>${r.earned}<small>/${r.weight}</small></b></div>`).join('')}</div>` : ''}<p class="score-caption">${review ? tr("AI оценивает конкретность ответов. Сведения подтверждаете вы.") : tr("Заполненные поля сами по себе не дают баллов.")}</p></section>`;
}
export function businessAside(page) {
  if (page === 'editor' && editor) {
    if (editor.step === 3) return `<div id="score-panel">${scorePanel()}</div>`;
    return `<section class="editor-outline"><h2>${esc(editor.task.title || tr("Новая задача"))}</h2><div class="outline-steps">${[[tr("Описание"),tr("Что нужно сделать")],[tr("Вопросы"),tr("Уточните детали")],[tr("Публикация"),tr("Проверьте карточку")]].map(([name,label],i) => `<div class="${editor.step === i+1 ? 'current' : ''}"><span>${i+1}</span><div><strong>${name}</strong><small>${label}</small></div></div>`).join('')}</div></section>`;
  }
  const awaiting = incoming().filter(p => p.status === 'pending');
  return `<section class="side-summary"><h2>${esc(db.business.name)}</h2><div><span>${tr("Задач в каталоге")}</span><strong>${ownedTasks().filter(t => t.published).length}</strong></div><div><span>${tr("Команд выбрано")}</span><strong>${incoming().filter(p => p.status === 'selected').length}</strong></div></section><section class="side-section"><h2>${tr("Новые отклики")} <span>${awaiting.length}</span></h2><div class="inbox-preview">${awaiting.slice(0,3).map(p => { const team = db.teams.find(t => t.id === p.teamId); return `<button data-task-inbox="${p.taskId}"><span class="avatar tiny-avatar">${esc(team?.name.slice(0,2))}</span><span><strong>${esc(team?.name)}</strong><small>${esc(p.deadline)}</small></span>${icon('chevron')}</button>`; }).join('') || `<p class="muted">${tr("Новых откликов нет")}</p>`}</div><button class="side-link" data-page="inbox">${tr("Все отклики")} ${icon('arrow')}</button></section><footer>${tr("Alem · Демо")}</footer>`;
}
function inboxPage() {
  const all = incoming().filter(p => proposalTask === 'all' || p.taskId === proposalTask);
  const visible = all.filter(p => proposalFilter === 'all' || p.status === proposalFilter);
  return `<section class="inbox-intro"><label class="inbox-task-filter"><span class="sr-only">${tr("Задача для откликов")}</span><select id="inbox-task"><option value="all">${tr("Все ваши задачи")}</option>${ownedTasks().filter(t => t.published).map(t => `<option value="${t.id}" ${proposalTask === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label></section><div class="feed-tabs business-tabs">${[['all',tr("Все")],['pending',tr("Новые")],['selected',tr("Выбранные")],['rejected',tr("Отклонённые")]].map(([v,n]) => `<button data-proposal-filter="${v}" class="${proposalFilter === v ? 'selected' : ''}">${n}<span>${all.filter(p => v === 'all' || p.status === v).length}</span></button>`).join('')}</div>${visible.length ? visible.map(proposalCard).join('') : empty(tr("Пока нет откликов"), tr("Предложения команд появятся здесь. Опубликованные задачи доступны всем командам."), 'business-home', tr("Мои задачи"))}`;
}
function proposalCard(p) {
  const team = db.teams.find(t => t.id === p.teamId); const task = getTask(p.taskId);
  return `<article class="incoming-card"><div class="post-heading"><span class="avatar team-avatar">${esc(team?.name.slice(0,2))}</span><div class="company-info"><button class="team-link" data-team-detail="${esc(p.teamId)}">${esc(team?.name || tr("Команда"))}</button><span>${esc(team?.skills || '')}</span></div><span class="status-pill ${p.status === 'selected' ? 'selected-status' : ''}">${statusLabel(p.status)}</span></div><button class="proposal-task-link" data-open="${task.id}">${esc(task.title)} ${icon('arrow')}</button><p class="proposal-idea">${esc(p.idea)}</p><details class="proposal-plan disclosure"><summary>${tr("План работы")} ${icon('chevron')}</summary><p>${esc(p.plan)}</p></details><div class="proposal-links"><span>${icon('clock')}${esc(p.deadline)}</span><a href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer">${tr("Прототип")} ${icon('external')}</a></div>${p.milestone ? `<div class="milestone-card"><div class="eyebrow">${p.milestone.status === 'confirmed' ? tr("ЭТАП ПОДТВЕРЖДЁН · +10 БАЛЛОВ") : tr("РЕЗУЛЬТАТ НА ПРОВЕРКЕ")}</div><p>${esc(p.milestone.description)}</p><a href="${esc(safeUrl(p.milestone.link))}" target="_blank" rel="noopener noreferrer">${tr("Посмотреть результат ↗")}</a>${p.milestone.status === 'submitted' ? `<button class="primary" data-confirm-stage="${p.id}">${tr("Подтвердить этап")} ${icon('check')}</button>` : ''}</div>` : ''}<div class="decision-actions">${p.status === 'pending' ? `<button class="primary" data-decision="selected" data-proposal-id="${p.id}">${tr("Выбрать команду")} ${icon('check')}</button><button class="secondary" data-decision="rejected" data-proposal-id="${p.id}">${tr("Отклонить")}</button>` : !p.milestone ? `<button class="text-button" data-decision="pending" data-proposal-id="${p.id}">${tr("Вернуть на рассмотрение")}</button>` : ''}</div></article>`;
}
function companyPage() {
  return `<div class="team-cover" aria-hidden="true"></div><section class="team-page"><div class="avatar team-large">q.</div><h2>${esc(db.business.name)}</h2><p class="muted">${tr("Профиль компании")}</p><form id="business-profile-form"><label>${tr("Название компании")}<input name="name" required maxlength="100" value="${esc(db.business.name)}"/></label><label>${tr("О компании")}<textarea name="description" rows="4" maxlength="2000">${esc(db.business.description)}</textarea></label><label>${tr("Рабочий контакт")}<input name="contact" maxlength="300" value="${esc(db.business.contact)}"/></label><label>${tr("Формат взаимодействия")}<textarea name="interaction" rows="3" maxlength="1000">${esc(db.business.interaction)}</textarea></label><p class="form-note">${tr("Эти контакты используются в новых задачах.")}</p><button class="primary">${tr("Сохранить профиль")} ${icon('check')}</button></form></section>`;
}
function saveDraft() {
  const task = editor.task;
  if (!task.title?.trim()) { toast(tr("Добавьте короткое название задачи")); return; }
  const existing = getTask(task.id);
  if (!existing?.published) {
    const draft = { ...task, id: task.id || uid(), ownerId: BUSINESS_ID, published: false, confirmed: false, score: 0, company: db.business.name, logo: 'q.', handle: 'qadam.edu', tags: [task.category], time: 'Черновик' };
    if (existing) Object.assign(existing, draft); else db.tasks.push(draft);
    editor.task = structuredClone(draft); save();
  }
  stash(); onNavigate('business'); toast(tr("Черновик сохранён. К нему можно вернуться позже."));
}
async function advanceQuestion() {
  if (pendingAI) return;
  const index = editor.questionIndex || 0;
  if (index < editor.questions.length - 1) editor.questionIndex = index + 1;
  else { await runEditorAI('card'); return; }
  stash(); onNavigate('editor');
}
export function cancelBusinessAI() {
  if (pendingAI) { pendingAI.controller.abort(); pendingAI = null; }
}
async function runEditorAI(kind) {
  if (!editor || pendingAI) return;
  const current = editor;
  let task;
  try { task = cleanTask(current.task); } catch (error) { toast(error.message); return; }
  const operation = { editor: current, controller: new AbortController(), kind };
  pendingAI = operation;
  stash(); onNavigate('editor');
  try {
    const result = await requestAssistant(kind, task, operation.controller.signal);
    if (operation.controller.signal.aborted || editor !== current || pendingAI !== operation) return;
    if (kind === 'questions') {
      current.questions = result.questions; current.questionIndex = 0; current.step = 2;
      current.questionLocale = result.locale || getLocale(); current.questionMode = result.mode; current.questionNotice = result.notice || '';
    } else {
      if (kind === 'card') Object.assign(current.task, result.card);
      if (result.assessment || kind === 'card') current.task.assessment = result.assessment || null;
      if (kind === 'card') current.cardMode = result.mode;
      current.cardNotice = result.notice || '';
      if (!result.assessment && kind === 'review' && currentAssessment(current.task)) current.cardNotice += tr(" Показана предыдущая оценка этой версии карточки.");
      current.step = 3;
    }
    current.checked = false; pendingAI = null; stash(); onNavigate('editor');
  } catch (error) {
    if (!operation.controller.signal.aborted && pendingAI === operation) {
      pendingAI = null; onNavigate('editor'); toast(tr("Не удалось обработать задачу. Ответы сохранены."));
    }
  }
}
function previewCard() {
  const task = editor.task;
  showDialog(`<div class="eyebrow">${tr("ПРЕДПРОСМОТР · НЕ ОПУБЛИКОВАНО")}</div><h2>${esc(task.title)}</h2>${badge({ ...task, score: scoreTask(task, true) })}<div class="detail-sections">${fields.map(field => `<section><h3>${tr(field.label)}</h3><p>${esc(task[field.key] || tr("Нужно уточнить"))}</p></section>`).join('')}</div><button class="primary" data-action="close">${tr("Вернуться к карточке")}</button>`);
}
function confirmTaskDeletion(id) {
  const task = id === 'current-draft' ? editor?.task : ownedTasks().find(t => t.id === id);
  if (!task) return;
  showDialog(`<h2>${task.published ? tr("Удалить задачу?") : tr("Удалить черновик?")}</h2><p><strong>${esc(task.title || tr("Без названия"))}</strong></p><p>${task.published ? tr("Задача исчезнет из каталога. Новые отклики и сдача этапов станут недоступны. История предложений и уже начисленные баллы сохранятся.") : tr("Черновик и введённые ответы будут удалены.")}</p><div class="form-actions"><button class="secondary" data-action="close">${tr("Отмена")}</button><button class="primary" data-confirm-delete="${id}">${tr("Удалить")} ${icon('trash')}</button></div>`);
}
export function handleBusinessClick(button) {
  if (button.dataset.deleteTask) { confirmTaskDeletion(button.dataset.deleteTask); return true; }
  if (button.dataset.confirmDelete) {
    const id = button.dataset.confirmDelete;
    const unsaved = id === 'current-draft' && editor && !editor.task.id;
    if (unsaved || deleteTask(id)) {
      if (unsaved || editor?.task.id === id) { cancelBusinessAI(); editor = null; stash(); }
      if (proposalTask === id) proposalTask = 'all';
      document.querySelector('#task-dialog').close(); onNavigate('business'); toast(tr("Задача удалена"));
    }
    return true;
  }
  if (button.dataset.action === 'cancel-ai') { cancelBusinessAI(); onNavigate('editor'); return true; }
  if (button.dataset.action === 'refresh-questions' && editor) { runEditorAI('questions'); return true; }
  if (button.dataset.action === 'review-card' && editor) { runEditorAI('review'); return true; }
  if (button.dataset.action === 'preview-card' && editor) { previewCard(); return true; }
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
  if (button.dataset.decision) { if (decideProposal(button.dataset.proposalId, button.dataset.decision)) { onNavigate('inbox'); toast(button.dataset.decision === 'selected' ? tr("Команда выбрана. Остальные предложения остаются доступны.") : tr("Решение сохранено")); } return true; }
  if (button.dataset.confirmStage) { if (confirmMilestone(button.dataset.confirmStage)) { onNavigate('inbox'); toast(tr("Этап подтверждён. Команда получила 10 баллов.")); } return true; }
  if (button.dataset.teamDetail) {
    const team = db.teams.find(t => t.id === button.dataset.teamDetail); if (!team) return true;
    showDialog(`<div class="eyebrow">${tr("СТУДЕНЧЕСКАЯ КОМАНДА")}</div><h2>${esc(team.name)}</h2><p>${esc(team.description)}</p><div class="tags">${esc(team.skills).split(',').map(s => `<span>${s.trim()}</span>`).join('')}</div><p class="muted">${teamPoints(team.id)} ${tr("баллов за подтверждённые результаты")}</p>`); return true;
  }
  return false;
}
export function handleBusinessInput(target) {
  if (target.id === 'confirm-task' && editor) { editor.checked = target.checked; stash(); return; }
  if (target.hasAttribute('data-editor-field') && editor) {
    // A blur-triggered change after input must not replace the button being clicked.
    if (editor.task[target.name] === target.value) return;
    editor.task[target.name] = target.value; editor.checked = false;
    const check = document.querySelector('#confirm-task'); if (check) check.checked = false;
    stash();
    const panel = document.querySelector('#score-panel'); if (panel) panel.innerHTML = scorePanel();
    document.querySelectorAll('[data-preview-keys]').forEach(preview => {
      preview.textContent = preview.dataset.previewKeys.split(',').map(k => k === 'category' ? tr(editor.task[k]) : editor.task[k]).filter(Boolean).join(' · ') || tr("Не заполнено");
    });
    const quality = document.querySelector('#quality-review'); if (quality) quality.innerHTML = qualityReview();
  }
}
export function handleBusinessChange(target) {
  if (target.id === 'inbox-task') { proposalTask = target.value; onNavigate('inbox'); return true; }
  return false;
}
export async function handleBusinessSubmit(form) {
  if (!['description-form', 'questions-form', 'task-card-form', 'business-profile-form'].includes(form.id)) return false;
  const data = formData(form);
  if (form.id === 'business-profile-form') {
    if (!data.name) { toast(tr("Введите название компании")); return true; }
    Object.assign(db.business, data); for (const task of ownedTasks()) task.company = data.name;
    save(); onNavigate('company'); toast(tr("Профиль компании сохранён")); return true;
  }
  if (!editor || pendingAI) return true;
  Object.assign(editor.task, data);
  if (form.id === 'description-form') {
    if (!data.title || data.description.length < 15) { toast(tr("Добавьте название и описание задачи")); return true; }
    await runEditorAI('questions'); return true;
  } else if (form.id === 'questions-form') { await advanceQuestion(); return true; }
  else {
    if (!data.title || data.description.length < 15 || !form.querySelector('#confirm-task').checked) { toast(tr("Проверьте название, описание и подтвердите сведения")); return true; }
    const existing = getTask(editor.task.id);
    if (existing && existing.ownerId !== BUSINESS_ID) return true;
    const task = { ...editor.task, id: editor.task.id || uid(), ownerId: BUSINESS_ID, company: db.business.name, logo: 'q.', handle: 'qadam.edu', tags: [data.category], time: 'Только что', published: true, confirmed: true, confirmedAt: new Date().toISOString() };
    task.score = scoreTask(task);
    if (existing) Object.assign(existing, task); else db.tasks.push(task);
    save(); editor = null; stash(); onNavigate('business'); toast(currentAssessment(task) ? `${tr("Задача опубликована. Готовность —")} ${task.score}/100.` : tr("Задача опубликована без рейтинга. Оценку можно получить при редактировании.")); return true;
  }
  stash(); onNavigate('editor'); return true;
}
export function resumeEditor() { if (editor) onNavigate('editor'); else startEditor(); }
