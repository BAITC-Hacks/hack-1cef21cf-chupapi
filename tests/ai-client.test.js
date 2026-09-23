import test from 'node:test';
import assert from 'node:assert/strict';
import {requestAssistant} from '../src/ai-client.js';
import {fallbackCard} from '../src/ai-contract.js';
import {strongTask} from './fixtures/quality.js';

test('Client retains a successfully assembled card when only assessment is unavailable',async t=>{
  const card={...fallbackCard(strongTask),data:'Дополнительные сведения из описания'};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({mode:'openai',card,assessment:null,score:null,assessmentStatus:'unavailable',reason:'assessment_validation',notice:'Повторите оценку.'})}));
  const result=await requestAssistant('card',strongTask);
  assert.equal(result.mode,'openai');assert.deepEqual(result.card,card);
  assert.equal(result.assessment,null);assert.equal(result.reason,'assessment_validation');
});
test('HTTP rate limits and missing server have actionable distinct messages',async t=>{
  for(const [status,reason] of [[429,'rate_limit'],[404,'server_missing'],[400,'invalid_input']]) {
    const mock=t.mock.method(globalThis,'fetch',async()=>({ok:false,status}));
    const result=await requestAssistant('card',strongTask);
    assert.equal(result.reason,reason);assert.deepEqual(result.card,fallbackCard(strongTask));assert.equal(result.score,null);
    mock.mock.restore();
  }
});
test('A timeout is distinguished from invalid evaluation and user cancellation',async t=>{
  const mock=t.mock.method(globalThis,'fetch',async()=>{throw Object.assign(new Error('timeout'),{name:'TimeoutError'});});
  assert.equal((await requestAssistant('review',strongTask)).reason,'timeout');
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>requestAssistant('review',strongTask,controller.signal));
  mock.mock.restore();
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({mode:'openai',assessment:{},score:100})}));
  const result=await requestAssistant('review',strongTask);
  assert.equal(result.reason,'invalid_response');assert.equal(result.score,null);
});
