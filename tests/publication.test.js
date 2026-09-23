import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAssessment} from '../src/scoring.js';
import {strongTask,strongReview} from './fixtures/quality.js';

// Exercise the business controller with minimal browser adapters; all API calls are mocked.
test('Confirmed publication reviews the current text and respects cancellation',async t=>{
  const memory=new Map();
  t.mock.method(globalThis,'setTimeout',()=>0);
  const original={localStorage:globalThis.localStorage,document:globalThis.document,FormData:globalThis.FormData};
  t.after(()=>{for(const [key,value] of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  let toastText='';
  const toast={set textContent(value){toastText=value;},classList:{add(){},remove(){}}};
  globalThis.document={querySelector:selector=>selector==='#toast'?toast:null,querySelectorAll:()=>[]};
  globalThis.FormData=class{constructor(form){return new Map(Object.entries(form.values));}};
  const {db,getTask}=await import('../src/store.js');
  const {setBusinessNavigate,startEditor,handleBusinessSubmit,cancelBusinessAI}=await import('../src/business.js');
  setBusinessNavigate(()=>{});
  let calls=0,respond;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{calls++;return respond(JSON.parse(options.body).task);});
  const reply=task=>({ok:true,json:async()=>({mode:'openai',assessment:validateAssessment(strongReview,task)})});
  const submit=(values,confirmed=true)=>handleBusinessSubmit({id:'task-card-form',values,querySelector:()=>({checked:confirmed})});
  const add=(id,reviewed=false)=>db.tasks.push({...strongTask,id,ownerId:'business-qadam',tags:[],published:true,confirmed:true,score:reviewed?100:0,...(reviewed?{assessment:validateAssessment(strongReview,strongTask)}:{})});

  await t.test('Confirmation is required before contacting AI or changing the catalog',async()=>{
    add('unconfirmed');startEditor('unconfirmed');
    await submit({...strongTask,title:'Неподтверждённая правка'},false);
    assert.equal(calls,0);assert.equal(getTask('unconfirmed').title,strongTask.title);
  });
  await t.test('A confirmed edit triggers one review without rewriting text',async()=>{
    add('changed',true);startEditor('changed');
    const values={...strongTask,title:'Подтверждённое дополнение'};respond=reply;
    const before=calls;await submit(values);
    assert.equal(calls,before+1);assert.equal(getTask('changed').title,values.title);
    assert.equal(getTask('changed').score,100);assert.ok(getTask('changed').assessment);
    for(const [key,value] of Object.entries(values))assert.equal(getTask('changed')[key],value);
  });
  await t.test('An unchanged, already reviewed card does not pay for another review',async()=>{
    add('unchanged',true);startEditor('unchanged');const before=calls;
    await submit(strongTask);assert.equal(calls,before);assert.equal(getTask('unchanged').score,100);
  });
  await t.test('Unavailable AI publishes confirmed text without carrying over a stale score',async()=>{
    add('unavailable',true);startEditor('unavailable');
    respond=()=>({ok:true,json:async()=>({mode:'local',assessment:null,score:null,notice:'AI недоступен.'})});
    await submit({...strongTask,success:'Главное чтобы было удобно'});
    const task=getTask('unavailable');assert.equal(task.published,true);assert.equal(task.score,0);
    assert.match(toastText,/AI недоступен/);assert.match(toastText,/без рейтинга/);
  });
  await t.test('Cancelling or switching away while reviewing cannot publish late or submit twice',async()=>{
    add('cancelled',true);startEditor('cancelled');let release;
    respond=task=>new Promise(resolve=>{release=()=>resolve(reply(task));});
    const before=calls;const pending=submit({...strongTask,title:'Отменённая правка'});
    await submit({...strongTask,title:'Повторное нажатие'});assert.equal(calls,before+1);
    cancelBusinessAI();release();await pending;
    assert.equal(getTask('cancelled').title,strongTask.title);
    assert.equal(getTask('cancelled').score,100);
  });
});
