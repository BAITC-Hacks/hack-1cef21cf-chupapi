import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {runAssistant, aiMiddleware} from '../server/ai.js';
import {cleanTask, cardKeys, fallbackCard, validateCard} from '../src/ai-contract.js';
import {localQuestions} from '../src/assistant.js';
import {fields, scoreTask} from '../src/scoring.js';
import {strongTask, strongReview, weakTask, weakReview} from './fixtures/quality.js';

const task = cleanTask({title:'Учёт заявок', description:'Учебный центр теряет заявки. Есть CSV с 200 обезличенными заявками. Решение используют три менеджера.', contact:'Айдана, test@example.com'});
const validQuestions = localQuestions(task);
const output = value => ({ok:true,status:200,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
const fragments = extra => ({card:{...Object.fromEntries(cardKeys.map(key=>[key,[]])),...extra}, assessment:Object.fromEntries(fields.map(({key})=>[key,{level:0,reason:'Требуется уточнить сведения для работы.',evidence:[]}]))});

test('No API key: explicit local mode and at least three distinct questions', async()=>{
  const result = await runAssistant('questions',task,{apiKey:'',fetchImpl:()=>assert.fail('No network expected')});
  assert.equal(result.mode,'local'); assert.equal(result.reason,'missing_key');
  assert.ok(result.questions.length>=3 && result.questions.length<=6);
  assert.equal(new Set(result.questions.map(q=>q.key)).size,result.questions.length);
});
test('Valid provider output is parsed and secrets stay in the server authorization header', async()=>{
  let request;
  const result = await runAssistant('questions',task,{apiKey:'test-server-only',fetchImpl:async(url,config)=>{request={url,...config};return output(validQuestions);}});
  assert.equal(result.mode,'openai');
  assert.equal(request.url,'https://api.openai.com/v1/responses');
  assert.equal(request.headers.Authorization,'Bearer test-server-only');
  assert.equal(JSON.parse(request.body).store,false);
  assert.equal(JSON.parse(request.body).text.format.strict,true);
  assert.ok(!JSON.stringify(result).includes('test-server-only'));
});
test('AI receives only task fields, not team profiles, participant traits or selection commands',async()=>{
  let body;
  await runAssistant('questions',{...task,teamProfile:{age:19,gender:'female',health:'private'},proposals:[{teamId:'winner'}],selectTeam:'winner'},{apiKey:'test',fetchImpl:async(_,config)=>{body=JSON.parse(config.body);return output(validQuestions);}});
  assert.deepEqual(JSON.parse(body.input),cleanTask(task));
  assert.match(body.instructions,/Не используй личные и чувствительные признаки/);
  assert.match(body.instructions,/Не выбирай команды и не назначай исполнителей/);
});
test('Malformed, duplicate, refused, and incomplete answers fall back safely',async()=>{
  for(const value of [{questions:[]},{questions:[validQuestions.questions[0],validQuestions.questions[0],validQuestions.questions[2]]}]){
    const result=await runAssistant('questions',task,{apiKey:'test',fetchImpl:async()=>output(value)});
    assert.equal(result.reason,'invalid_response');assert.ok(result.questions.length>=3);
  }
  const result=await runAssistant('questions',task,{apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})});
  assert.equal(result.reason,'incomplete');
});
test('Card extracts facts from user sources and keeps explicit answers',async()=>{
  const response=fragments({data:['CSV с 200 обезличенными заявками'], users:['три менеджера']});
  const result=await runAssistant('card',task,{apiKey:'test',fetchImpl:async()=>output(response)});
  assert.equal(result.mode,'openai');assert.equal(result.card.data,'CSV с 200 обезличенными заявками');
  assert.equal(result.card.contact,task.contact);assert.equal(result.card.description,task.description);
  assert.equal(result.card.success,'');
});
test('Unnecessary model rewrites of already filled fields cannot reject or replace original answers',async()=>{
  const response=fragments({description:['Совсем другой пересказ проблемы'],title:['Новый заголовок']});
  const result=await runAssistant('card',task,{apiKey:'test',fetchImpl:async()=>output(response)});
  assert.equal(result.mode,'openai');assert.equal(result.card.description,task.description);assert.equal(result.card.title,task.title);
});
test('Invalid assessment gets one repair over the validated card, not a complete reset',async()=>{
  const response=fragments({data:['CSV с 200 обезличенными заявками']});
  const good=response.assessment;
  response.assessment={};
  const requests=[];
  const result=await runAssistant('card',task,{apiKey:'test',fetchImpl:async(_,config)=>{
    requests.push(JSON.parse(config.body));
    return output(requests.length===1?response:{assessment:good});
  }});
  assert.equal(requests.length,2);
  assert.equal(requests[1].text.format.name,'task_review');
  assert.equal(JSON.parse(requests[1].input).data,'CSV с 200 обезличенными заявками');
  assert.equal(result.mode,'openai');assert.ok(result.assessment);
  assert.equal(result.card.data,'CSV с 200 обезличенными заявками');
});
test('Repeated assessment failure preserves the valid card, never invents a score, and stops after one repair',async()=>{
  let calls=0;
  const response=fragments({data:['CSV с 200 обезличенными заявками']});response.assessment={};
  const result=await runAssistant('card',task,{apiKey:'test',fetchImpl:async()=>{calls++;return output(response);}});
  assert.equal(calls,2);assert.equal(result.mode,'openai');
  assert.equal(result.card.data,'CSV с 200 обезличенными заявками');
  assert.equal(result.assessment,null);assert.equal(result.score,null);
  assert.equal(result.reason,'assessment_validation');assert.equal(result.assessmentStatus,'unavailable');
});
test('Invented facts reject the entire AI card and preserve the original input',async()=>{
  const response=fragments({data:['CSV с 50000 заявками']});
  assert.throws(()=>validateCard(response,task),/нет в ответах/);
  const result=await runAssistant('card',task,{apiKey:'test',fetchImpl:async()=>output(response)});
  assert.equal(result.mode,'local');assert.equal(result.reason,'card_validation');
  assert.deepEqual(result.card,fallbackCard(task));
});
test('Provider errors have safe notices without leaking raw errors or secrets',async()=>{
  for(const [status,code,reason] of [[401,'invalid_api_key','invalid_key'],[429,'insufficient_quota','quota'],[429,'rate_limit_exceeded','rate_limit'],[500,'server_error','unavailable']]){
    const result=await runAssistant('questions',task,{apiKey:'test-secret',fetchImpl:async()=>({ok:false,status,json:async()=>({error:{code,message:'private provider details'}})})});
    assert.equal(result.reason,reason);assert.ok(!JSON.stringify(result).includes('private provider details'));
  }
  const result=await runAssistant('card',task,{apiKey:'test',fetchImpl:async()=>{throw Object.assign(new Error('timeout'),{name:'TimeoutError'});}});
  assert.equal(result.reason,'timeout');
});
test('Input rejects wrong types and excessive text before contacting provider',async()=>{
  for(const input of [null,{description:'short'},{description:42},{description:'a'.repeat(5001)}]){
    await assert.rejects(()=>runAssistant('questions',input,{apiKey:'test',fetchImpl:()=>assert.fail('No network expected')}));
  }
});
test('The server computes score from validated field reviews, not provider or client totals', async()=>{
  for (const [input, assessment, expected] of [[strongTask,strongReview,100],[weakTask,weakReview,5]]) {
    const result=await runAssistant('review',{...input,score:100,assessment:strongReview},{apiKey:'test',fetchImpl:async()=>output({assessment,score:100})});
    assert.equal(result.mode,'openai'); assert.equal(result.score,expected);
    assert.equal(scoreTask({...input,assessment:result.assessment},true),expected);
    assert.equal(result.card,undefined,'Re-review must not rewrite user edits');
  }
});
test('Invalid or unavailable quality review never falls back to presence-based 100',async()=>{
  for (const bad of [undefined, {}, {...strongReview, data:{level:2,reason:'Данные есть.',evidence:['Выдуманный набор данных']}}]) {
    const result=await runAssistant('review',strongTask,{apiKey:'test',fetchImpl:async()=>output({assessment:bad})});
    assert.equal(result.mode,'local'); assert.equal(result.assessment,null); assert.equal(result.score,null);
  }
  const result=await runAssistant('card',strongTask,{apiKey:''});
  assert.equal(result.assessment,null); assert.equal(result.score,null);
  assert.deepEqual(result.card,fallbackCard(cleanTask(strongTask)));
});
test('HTTP route enforces JSON, method, origin and returns a working fallback', async(t)=>{
  const middleware=aiMiddleware({apiKey:''});
  const server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const origin=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${origin}/api/ai/questions`)).status,405);
  assert.equal((await fetch(`${origin}/api/ai/questions`,{method:'POST',body:'not json'})).status,415);
  assert.equal((await fetch(`${origin}/api/ai/questions`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:JSON.stringify({task})})).status,403);
  const response=await fetch(`${origin}/api/ai/questions`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({task})});
  assert.equal(response.status,200);assert.equal((await response.json()).mode,'local');
  const review=await fetch(`${origin}/api/ai/review`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({task:strongTask})});
  assert.equal(review.status,200);assert.equal((await review.json()).score,null);
});
