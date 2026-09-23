import test from 'node:test';
import assert from 'node:assert/strict';
import {fallbackCard} from '../src/ai-contract.js';

test('Optional questions never replace the original description or require an answer',async t=>{
  const memory=new Map();
  const original={localStorage:globalThis.localStorage,document:globalThis.document,FormData:globalThis.FormData};
  t.after(()=>{for(const [key,value] of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  globalThis.document={querySelector:()=>null,querySelectorAll:()=>[]};
  globalThis.FormData=class{constructor(form){return new Map(Object.entries(form.values));}};
  const {db}=await import('../src/store.js');
  const business=await import('../src/business.js');business.setBusinessNavigate(()=>{});
  const description='Нужна система учёта заявок для менеджеров учебного центра.';
  const questions=['description','users','constraints'].map(key=>({key,question:`Какие сведения нужны для поля ${key}?`}));
  const requests=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    const task=JSON.parse(options.body).task;requests.push({url,task});
    return {ok:true,json:async()=>url.endsWith('/questions')?{mode:'openai',questions}:{mode:'local',card:fallbackCard(task),assessment:null,score:null}};
  });
  const state=()=>JSON.parse(memory.get('alem.editor.v2'));
  const submit=values=>business.handleBusinessSubmit({id:'questions-form',values});
  const skip=async()=>{business.handleBusinessClick({dataset:{action:'skip-question'}});await new Promise(setImmediate);};
  async function start(id){
    db.tasks.push({id,ownerId:'business-qadam',title:'Учёт заявок',description,published:false,confirmed:false});
    business.startEditor(id);
    await business.handleBusinessSubmit({id:'description-form',values:{title:'Учёт заявок',description}});
  }
  await t.test('All questions, including description and the last question, can be skipped',async()=>{
    await start('skip-all');
    for(let i=0;i<questions.length;i++)await skip();
    assert.equal(state().step,3);assert.equal(state().task.description,description);
    const {task}=requests.at(-1);assert.equal(task.description,description);assert.equal(task.users,'');assert.equal(task.constraints,'');
    assert.equal(state().task.assessment,null);
  });
  await t.test('A short clarification is saved separately and supplements the original brief',async()=>{
    await start('short-answer');
    business.handleBusinessInput({name:'description',value:'Не знаю',hasAttribute:()=>true});
    assert.equal(state().task.description,description);assert.equal(state().questionAnswers.description,'Не знаю');
    await submit({description:'Не знаю'});await skip();await skip();
    assert.equal(state().step,3);assert.equal(requests.at(-1).task.description,`${description}\n\nНе знаю`);
  });
  await t.test('Empty Next and skipping an unfinished answer preserve the source',async()=>{
    await start('empty-answer');
    business.handleBusinessInput({name:'description',value:'Незавершённый ответ',hasAttribute:()=>true});
    await skip();assert.equal(state().questionAnswers.description,'');assert.equal(state().task.description,description);
    business.handleBusinessClick({dataset:{action:'previous-question'}});
    await submit({description:''});await submit({users:''});await submit({constraints:''});
    assert.equal(state().step,3);assert.equal(requests.at(-1).task.description,description);
  });
  await t.test('An already damaged legacy draft can still leave the last question without AI or invented facts',async()=>{
    memory.set('alem.editor.v2',JSON.stringify({task:{title:'Старый черновик',description:'Нет',users:'Три менеджера'},step:2,questions,questionIndex:2}));
    const legacy=await import('../src/business.js?legacy-skip-regression');legacy.setBusinessNavigate(()=>{});
    const before=requests.length;legacy.handleBusinessClick({dataset:{action:'skip-question'}});await new Promise(setImmediate);
    assert.equal(requests.length,before);assert.equal(state().step,3);assert.equal(state().cardMode,'local');
    assert.equal(state().task.description,'Нет');assert.equal(state().task.users,'Три менеджера');assert.equal(state().task.assessment,null);
    assert.match(state().cardNotice,/Проверьте исходное описание/);
  });
});
