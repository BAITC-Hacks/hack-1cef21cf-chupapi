import { tr } from './i18n.js';
import { tasks as initialTasks } from './data.js';
import { scoreTask, hasContent } from './scoring.js';

export const BUSINESS_ID = 'business-qadam';
export const TEAM_ID = 'chupapi';
export const categories = ['Все темы', 'Веб-разработка', 'Данные и AI', 'Дизайн', 'Социальные проекты'];
export const statusLabel = status => tr(({ pending: 'На рассмотрении', selected: 'Команда выбрана', rejected: 'Отклонено' })[status] || 'На рассмотрении');
export function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { window.dispatchEvent(new CustomEvent('alem-storage-error')); return false; }
}
export const uid = () => crypto.randomUUID();
const teamSeeds = [
  { id: 'orbit', name: 'Orbit', skills: 'React, Node.js, PostgreSQL', description: 'Три разработчика. Делаем веб-приложения от прототипа до работающего продукта.' },
  { id: 'pixel', name: 'Pixel People', skills: 'Figma, UX, React', description: 'Исследуем потребности пользователей и превращаем их в понятные интерфейсы.' },
  { id: 'syntax', name: 'Syntax', skills: 'Python, FastAPI, SQL', description: 'Автоматизируем процессы и любим задачи с данными.' },
  { id: 'nomad', name: 'Nomad Lab', skills: 'JavaScript, Vue, Firebase', description: 'Четыре студента, которым нравится быстро проверять идеи на практике.' },
  { id: 'datafolk', name: 'Datafolk', skills: 'Python, pandas, ML', description: 'Изучаем данные и строим понятные инструменты для принятия решений.' },
];
export const draftExamples = [
  'Нужен удобный учёт заявок. Сейчас всё в мессенджерах и таблицах.',
  'Хотим понять, сколько выпечки готовить, чтобы меньше списывать.',
  'Клиенты не доходят до записи на занятия. Хотим улучшить сайт.',
  'Нужен каталог местных мастерских с поиском изделий.',
  'Хотим наладить раздельный сбор отходов в кампусе.',
];
function makeInitial() {
  const tasks = initialTasks.map(t => {
    const cleaned = { ...t, ownerId: t.id === 'qadam' ? BUSINESS_ID : `business-${t.id}`, published: true, confirmed: true, interaction: t.id === 'qadam' ? 'Созвон раз в неделю на 30 минут, обратная связь по прототипу в течение двух дней.' : '', contact: t.id === 'qadam' ? 'Айдана · qadam@example.com (демо)' : t.contact };
    for (const key of ['data', 'constraints', 'success', 'contact']) if (!hasContent(cleaned[key])) cleaned[key] = '';
    if (t.id === 'green') Object.assign(cleaned, { context: '', result: '', contact: '' });
    return { ...cleaned, score: scoreTask(cleaned) };
  });
  tasks.push({ id: 'draft-qadam', ownerId: BUSINESS_ID, title: 'Обратная связь после занятий', description: 'Хотим собирать обратную связь студентов после занятий и понимать, что улучшать.', company: 'Qadam Education', logo: 'q.', handle: 'qadam.edu', category: 'Веб-разработка', tags: ['Веб-разработка'], score: 0, published: false, confirmed: false, weeks: '', time: 'Черновик' });
  const proposals = teamSeeds.map((team, i) => ({
    id: `seed-${team.id}`, teamId: team.id, taskId: 'qadam',
    idea: ['Соберём единое рабочее пространство: заявки, статусы и ответственные. Начнём с импорта CSV, чтобы быстро проверить процесс на реальных данных.', 'Спроектируем понятный интерфейс менеджера. Сначала проверим путь обработки заявки, затем соберём интерактивный прототип.', 'Автоматизируем загрузку заявок и добавим поиск дублей. Менеджеры смогут следить за статусами в простой веб-панели.', 'Сделаем компактный сервис учёта заявок с фильтрами, назначением менеджера и выгрузкой отчёта.', 'Изучим текущие заявки и соберём дашборд: нагрузка менеджеров, время ответа и потерянные обращения.'][i],
    plan: ['Неделя 1 — схема данных и прототип. Неделя 2 — импорт и статусы. Неделя 3 — тестирование с менеджерами.', 'Интервью с двумя менеджерами, карта сценариев, дизайн основных экранов и тестирование прототипа.', 'Проверка CSV, API импорта, интерфейс менеджера и итоговая демонстрация.', 'Прототип интерфейса, база данных, основные действия и тестирование.', 'Проверка данных, исследование причин потерь, дашборд и рекомендации.'][i],
    deadline: ['3 недели', '2 недели', '4 недели', '3 недели', '2 недели'][i], link: 'https://example.com/prototype', status: i === 0 ? 'selected' : 'pending', createdAt: '2026-09-23T07:00:00Z',
    ...(i === 0 ? { milestone: { description: 'Подготовили прототип импорта и список заявок со статусами. Все 50 тестовых записей импортируются без потерь.', link: 'https://example.com/demo', status: 'submitted' } } : {}),
  }));
  const oldProfile = read('alem.profile', {});
  const team = { name: 'Chupapi', skills: 'JavaScript, React, Python', description: 'Создаём полезные продукты и учимся на реальных задачах.', ...(oldProfile && typeof oldProfile.name === 'string' ? oldProfile : {}), id: TEAM_ID };
  const oldProposals = read('alem.proposals', []);
  if (Array.isArray(oldProposals)) for (const p of oldProposals) if (p && tasks.some(t => t.id === p.taskId) && typeof p.idea === 'string') proposals.push({ ...p, id: uid(), teamId: TEAM_ID, status: 'pending' });
  const oldSaved = read('alem.saved', []);
  return { version: 2, tasks, proposals, teams: [team, ...teamSeeds], saved: Array.isArray(oldSaved) ? oldSaved.filter(id => tasks.some(t => t.id === id)) : [], business: { id: BUSINESS_ID, name: 'Qadam Education', description: 'Помогаем студентам находить своё направление и получать практические навыки.', contact: 'Айдана · qadam@example.com (демо)', interaction: 'Созвон раз в неделю, обратная связь в течение двух дней.' } };
}
const stored = read('alem.workspace.v2', null);
export const db = stored?.version === 2 && Array.isArray(stored.tasks) && Array.isArray(stored.proposals) && Array.isArray(stored.teams) && stored.business && Array.isArray(stored.saved) ? stored : makeInitial();
export const save = () => write('alem.workspace.v2', db);
// Retire legacy presence-only scores without deleting any tasks or replies.
for (const task of db.tasks) task.score = scoreTask(task);
save();
export const publishedTasks = () => db.tasks.filter(t => t.published && !t.deletedAt);
export const ownedTasks = () => db.tasks.filter(t => t.ownerId === BUSINESS_ID && !t.deletedAt);
export const myProposals = () => db.proposals.filter(p => p.teamId === TEAM_ID);
export const incoming = () => db.proposals.filter(p => ownedTasks().some(t => t.id === p.taskId));
export const teamProfile = () => db.teams.find(t => t.id === TEAM_ID);
export const getTask = id => db.tasks.find(t => t.id === id);
export const teamPoints = id => db.proposals.filter(p => p.teamId === id && p.milestone?.status === 'confirmed').length * 10;
export function deleteTask(id) {
  const task = ownedTasks().find(t => t.id === id);
  if (!task) return false;
  // Keep the completed work and earned points in proposal history.
  task.deletedAt = new Date().toISOString(); task.published = false;
  db.saved = db.saved.filter(savedId => savedId !== id);
  save(); return true;
}
export function decideProposal(id, status) {
  const p = incoming().find(p => p.id === id);
  if (!p || !['selected', 'rejected', 'pending'].includes(status) || p.milestone) return false;
  p.status = status; save(); return true;
}
export function confirmMilestone(id) {
  const p = incoming().find(p => p.id === id);
  if (!p || p.status !== 'selected' || p.milestone?.status !== 'submitted') return false;
  p.milestone.status = 'confirmed'; p.milestone.confirmedAt = new Date().toISOString(); save(); return true;
}
