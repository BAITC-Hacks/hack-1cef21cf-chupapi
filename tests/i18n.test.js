import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tr, setLocale, getLocale, messagesKK} from '../src/i18n.js';
import {fields, rules, validateAssessment, scoreTask, hasContent} from '../src/scoring.js';
import {localQuestions} from '../src/assistant.js';
import {runAssistant} from '../server/ai.js';
import {strongTask, strongReview} from './fixtures/quality.js';

test('UI messages and shared field labels have Kazakh translations',()=>{
  for (const file of ['main','business','student','ui']) {
    const source=readFileSync(new URL(`../src/${file}.js`,import.meta.url),'utf8');
    for (const match of source.matchAll(/tr\(("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)) {
      const key=match[1][0]==='"'?JSON.parse(match[1]):match[1].slice(1,-1);
      assert.ok(messagesKK[key],`Missing translation: ${key}`);
    }
  }
  for(const text of [...fields.flatMap(f=>[f.label,f.placeholder]),...rules.map(r=>r.label)]) assert.ok(messagesKK[text],text);
});
test('Locale changes labels without rewriting source text or rating evidence',()=>{
  setLocale('kk'); assert.equal(getLocale(),'kk'); assert.equal(tr('Мои задачи'),'Менің тапсырмаларым');
  assert.equal(tr('Введите не менее {count} символов.',{count:15}),'Кемінде 15 таңба енгізіңіз.');
  assert.equal(tr('Пользовательский текст — не переводить'),'Пользовательский текст — не переводить');
  const task={...strongTask,assessment:validateAssessment(strongReview,strongTask,'kk')};
  assert.equal(task.assessment.locale,'kk');assert.equal(scoreTask(task,true),100);
  setLocale('ru'); assert.equal(scoreTask(task,true),100);assert.equal(tr('Мои задачи'),'Мои задачи');
  for(const placeholder of ['Білмеймін','Әлі дайын емес','Нақтылануда']) assert.equal(hasContent(placeholder),false);
});
test('Kazakh fallback has three to six contextual questions and localized errors',async()=>{
  const task={description:'Оқу орталығындағы өтінімдер кестелерде жоғалып кетеді.'};
  const questions=localQuestions(task,'kk').questions;
  assert.ok(questions.length>=3&&questions.length<=6);
  assert.match(questions.find(q=>q.key==='data').question,/өтінім/);
  const result=await runAssistant('questions',task,{locale:'kk',apiKey:''});
  assert.equal(result.locale,'kk');assert.match(result.notice,/ЖИ/);assert.deepEqual(result.questions,questions);
});
test('Requested locale reaches the provider without changing input facts',async()=>{
  let body;
  const result=await runAssistant('review',strongTask,{locale:'kk',apiKey:'test',fetchImpl:async(_,options)=>{
    body=JSON.parse(options.body);
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({assessment:strongReview})}]}]})};
  }});
  assert.match(body.instructions,/казахский \(kk\)/);
  assert.equal(JSON.parse(body.input).description,strongTask.description);
  assert.equal(result.assessment.locale,'kk');assert.equal(result.score,100);
});
