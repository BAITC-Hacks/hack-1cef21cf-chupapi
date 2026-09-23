import {demoData} from './data.js';
import {taskRevision} from './scoring.js';

// Upgrade only untouched seed cards. User edits, reviews, deletions and earned points are retained.
export function upgradeDemoData(workspace) {
  if ((workspace.demoDataVersion || 0) >= demoData.version) return false;
  for (const seed of demoData.tasks) {
    const task=workspace.tasks.find(t=>t.id===seed.id);
    if (task?.published && !task.deletedAt && !task.confirmedAt && !task.assessment && task.company===seed.company && taskRevision(task)===seed.legacyRevision) Object.assign(task,structuredClone(seed));
  }
  for (const seed of demoData.drafts) {
    if (!workspace.tasks.some(t=>t.id===seed.id)) workspace.tasks.push(structuredClone(seed));
  }
  for (const team of workspace.teams) {
    const seed=team.id==='chupapi'?null:demoData.teams.find(t=>t.id===team.id);
    team.interests ??= seed?.interests || '';
    team.technologies ??= seed?.technologies || '';
  }
  workspace.demoDataVersion=demoData.version;
  return true;
}
