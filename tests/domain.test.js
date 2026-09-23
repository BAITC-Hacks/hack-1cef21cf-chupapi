import test from 'node:test';
import assert from 'node:assert/strict';
import { fields, scoreTask, breakdown, hasContent, currentAssessment, validateAssessment } from '../src/scoring.js';
import { analyze, validateResponse } from '../src/assistant.js';
import { strongTask, strongReview, weakTask, weakReview } from './fixtures/quality.js';

test('Only confirmed fields count; preview never modifies the task', () => {
  const task = { ...strongTask, assessment: validateAssessment(strongReview, strongTask) };
  assert.equal(scoreTask(task), 0);
  assert.equal(scoreTask(task, true), 100);
  assert.equal(task.confirmed, undefined);
  task.confirmed = true;
  assert.equal(scoreTask(task), 100);
  task.success = '';
  assert.equal(currentAssessment(task), null);
  assert.equal(scoreTask(task), 0, 'Editing invalidates the whole review');
  task.assessment = validateAssessment({ ...strongReview, success: {level:0, reason:'Укажите проверяемый критерий приёмки.', evidence:[]} }, task);
  assert.equal(scoreTask(task), 85);
  assert.equal(breakdown(task).find(r => r.label === 'Критерии успеха').earned, 0);
});
test('Presence of arbitrary text and legacy scores never earn points', () => {
  const task = {...Object.fromEntries(fields.map(f => [f.key, 'Сведения предоставлены бизнесом'])), confirmed:true, score:100};
  assert.equal(scoreTask(task, true), 0);
  const weak = {...weakTask, confirmed:true, assessment:validateAssessment(weakReview, weakTask)};
  assert.ok(scoreTask(weak) < 20);
});
test('Partial answers earn partial credit, and reviews cannot cite unrelated or invented evidence', () => {
  const task = {...strongTask, confirmed:true};
  task.assessment = validateAssessment({...strongReview, data:{...strongReview.data,level:2}},task);
  assert.equal(scoreTask(task), 90);
  assert.throws(()=>validateAssessment({...strongReview, data:{...strongReview.data,evidence:[strongTask.success]}},task));
  assert.throws(()=>validateAssessment({...strongReview, data:{...strongReview.data,evidence:[]}},task));
  assert.throws(()=>validateAssessment({...strongReview, data:{...strongReview.data,level:100}},task));
  assert.throws(()=>validateAssessment({},task));
});
test('All intermediate levels count proportionally and useful adjacent fields are not zeroed out', () => {
  const levels = [0, 1, 2, 3, 4];
  const scores = levels.map(level => {
    const raw = Object.fromEntries(fields.map(({key}) => [key,{...strongReview[key],level}]));
    return scoreTask({...strongTask,assessment:validateAssessment(raw,strongTask)},true);
  });
  assert.deepEqual(scores,[0,25,50,75,100]);
  const raw = {...strongReview,contact:{level:0,reason:'Нет контакта.',evidence:[]}};
  assert.equal(scoreTask({...strongTask,assessment:validateAssessment(raw,strongTask)},true),95);
});
test('Whitespace differences in evidence are accepted, changed facts are rejected', () => {
  const task={...strongTask,data:'CSV с\n200\u00a0заявками'};
  const raw={...strongReview,data:{level:3,reason:'Уточните доступ.',evidence:['CSV с 200 заявками']}};
  assert.equal(validateAssessment(raw,task).fields.data.level,3);
  assert.throws(()=>validateAssessment({...raw,data:{...raw.data,evidence:['CSV с 300 заявками']}},task));
});
test('Boilerplate, repeated answers and demo contacts are capped even if provider overgrades them', () => {
  const task = {...weakTask};
  const inflated = Object.fromEntries(fields.map(({key})=>[key,{level:2,reason:'Указано достаточно информации для работы.',evidence:[task[key]]}]));
  const assessment = validateAssessment(inflated,task);
  for(const key of ['data','constraints','contact']) assert.equal(assessment.fields[key].level,0);
  const repeated = Object.fromEntries(fields.map(({key})=>[key,'Один и тот же ответ на все вопросы']));
  const repeatedReview=Object.fromEntries(fields.map(({key})=>[key,{level:2,reason:'Указано достаточно информации для работы.',evidence:[repeated[key]]}]));
  assert.equal(scoreTask({...repeated,assessment:validateAssessment(repeatedReview,repeated)},true),0);
});
test('Whitespace and known placeholders do not earn points', () => {
  for (const value of ['', '   ', '...', 'Не знаю', 'Пока не предоставлены.', 'Уточняется с бизнесом.', 'tbd', 'Не-а', 'Еще в процессе', 'Ну не знаю']) assert.equal(hasContent(value), false);
  assert.equal(hasContent('CSV из 200 обезличенных заявок'), true);
  assert.equal(hasContent('Пока нет сайта, заявки вручную записываем в таблицу.'), true);
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
test('Deleting tasks removes catalog entries and bookmarks but preserves earned progress',async()=>{
  const {db, deleteTask, getTask, ownedTasks, publishedTasks, incoming, teamPoints, confirmMilestone}=await import('../src/store.js');
  assert.equal(deleteTask('tary'),false,'Cannot delete another business task');
  const before=teamPoints('orbit');assert.equal(before,10);
  db.saved.push('qadam');
  assert.equal(deleteTask('draft-qadam'),true);
  assert.ok(!ownedTasks().some(t=>t.id==='draft-qadam'));
  assert.equal(deleteTask('qadam'),true);
  assert.ok(getTask('qadam').deletedAt);assert.ok(!getTask('qadam').published);
  assert.ok(!publishedTasks().some(t=>t.id==='qadam'));assert.ok(!db.saved.includes('qadam'));
  assert.equal(incoming().length,0);assert.equal(teamPoints('orbit'),before);
  assert.equal(confirmMilestone('seed-orbit'),false);assert.equal(deleteTask('qadam'),false);
  assert.ok(db.proposals.some(p=>p.id==='seed-orbit'),'Keep historical results');
});
