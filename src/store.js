import { tr } from './i18n.js';
import { demoData } from './data.js';
import { upgradeDemoData } from './demo-migration.js';
import { scoreTask } from './scoring.js';

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
export const draftExamples = demoData.drafts;
function makeInitial() {
  const tasks = structuredClone([...demoData.tasks, ...demoData.drafts]);
  const teams = structuredClone(demoData.teams);
  const proposals = structuredClone(demoData.proposals);
  const oldProfile = read('alem.profile', {});
  const team = teams.find(team => team.id === TEAM_ID);
  if (oldProfile && typeof oldProfile.name === 'string') Object.assign(team, oldProfile, {id:TEAM_ID});
  const oldProposals = read('alem.proposals', []);
  if (Array.isArray(oldProposals)) for (const p of oldProposals) if (p && tasks.some(t => t.id === p.taskId) && typeof p.idea === 'string') proposals.push({ ...p, id: uid(), teamId: TEAM_ID, status: 'pending' });
  const oldSaved = read('alem.saved', []);
  return { version: 2, demoDataVersion: demoData.version, tasks, proposals, teams, saved: Array.isArray(oldSaved) ? oldSaved.filter(id => tasks.some(t => t.id === id)) : [], business: structuredClone(demoData.business) };
}
const stored = read('alem.workspace.v2', null);
export const db = stored?.version === 2 && Array.isArray(stored.tasks) && Array.isArray(stored.proposals) && Array.isArray(stored.teams) && stored.business && Array.isArray(stored.saved) ? stored : makeInitial();
export const save = () => write('alem.workspace.v2', db);
upgradeDemoData(db);
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
