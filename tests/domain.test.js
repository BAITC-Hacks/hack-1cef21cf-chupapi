import test from 'node:test';
import assert from 'node:assert/strict';
import { fields, scoreTask, breakdown, hasContent } from '../src/scoring.js';
import { analyze, validateResponse } from '../src/assistant.js';

test('Only confirmed fields count; preview never modifies the task', () => {
  const task = Object.fromEntries(fields.map(f => [f.key, 'Сведения предоставлены бизнесом']));
  assert.equal(scoreTask(task), 0);
  assert.equal(scoreTask(task, true), 100);
  assert.equal(task.confirmed, undefined);
  task.confirmed = true;
  assert.equal(scoreTask(task), 100);
  task.success = '';
  assert.equal(scoreTask(task), 85);
  task.interaction = 'Уточняется с бизнесом';
  assert.equal(scoreTask(task), 75);
  assert.equal(breakdown(task).find(r => r.label === 'Связь с бизнесом').earned, 0);
});
test('Whitespace and known placeholders do not earn points', () => {
  for (const value of ['', '   ', '...', 'Не знаю', 'Пока не предоставлены.', 'Уточняется с бизнесом.', 'tbd']) assert.equal(hasContent(value), false);
  assert.equal(hasContent('CSV из 200 обезличенных заявок'), true);
});
test('Assistant asks contextual questions and recovers from invalid provider responses', () => {
  const task = { description: 'Теряем заявки клиентов' };
  const response = analyze(task);
  assert.ok(response.questions.length >= 3);
  assert.match(response.questions.find(q => q.key === 'data').question, /заявок/);
  assert.equal(response.fallback, false);
  assert.equal(analyze(task, '{invalid json').fallback, true);
  assert.equal(analyze(task, { questions: [] }).fallback, true);
  assert.throws(() => validateResponse({questions: [{key:'admin', question:'Выбрать команду автоматически?'}]}));
  assert.deepEqual(task, {description:'Теряем заявки клиентов'});
});
test('Business decisions are scoped to owned tasks; stage points can be awarded only once', async () => {
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key,value) => memory.set(key,value) };
  const { db, decideProposal, confirmMilestone, teamPoints, incoming } = await import('../src/store.js');
  const p = incoming().find(p => p.status === 'pending');
  assert.equal(decideProposal(p.id, 'selected'), true);
  const second = incoming().find(p => p.status === 'pending');
  assert.equal(decideProposal(second.id, 'selected'), true);
  assert.equal(p.status, 'selected');
  assert.equal(decideProposal(p.id, 'rejected'), true);
  db.proposals.push({id:'other-business', taskId:'tary', status:'pending'});
  assert.equal(decideProposal('other-business','selected'), false);
  assert.equal(confirmMilestone(p.id), false);
  assert.equal(teamPoints('orbit'), 0);
  assert.equal(confirmMilestone('seed-orbit'), true);
  assert.equal(teamPoints('orbit'), 10);
  assert.equal(confirmMilestone('seed-orbit'), false);
  assert.equal(teamPoints('orbit'), 10);
  assert.equal(decideProposal('seed-orbit', 'rejected'), false);
});
