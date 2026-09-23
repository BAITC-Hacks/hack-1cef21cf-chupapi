import test from 'node:test';
import assert from 'node:assert/strict';
import {demoData,readiness} from '../src/data.js';
import {fields,currentAssessment,scoreTask} from '../src/scoring.js';
import {inputKeys} from '../src/ai-contract.js';
import {upgradeDemoData} from '../src/demo-migration.js';

test('Synthetic dataset contains all four required collections and valid linked records',()=>{
  assert.equal(demoData.synthetic,true);
  for(const name of ['drafts','tasks','teams','proposals']){
    assert.ok(demoData[name].length>=5,name);
    assert.equal(new Set(demoData[name].map(item=>item.id)).size,demoData[name].length);
  }
  const completeness=new Set();
  for(const draft of demoData.drafts){
    assert.ok(draft.description.length>=15);assert.ok(draft.industry);assert.equal(draft.published,false);
    completeness.add(fields.filter(({key})=>draft[key]).length);
  }
  assert.ok(completeness.size>=3,'Drafts have different degrees of completeness');
  const tiers=new Set();
  for(const task of demoData.tasks){
    for(const {key} of fields)assert.equal(typeof task[key],'string',`${task.id}.${key}`);
    assert.equal(currentAssessment(task).source,'demo');assert.equal(task.score,scoreTask(task));
    assert.ok(task.score>=0&&task.score<=100);tiers.add(readiness(task.score));
  }
  assert.equal(tiers.size,4,'Demo cards cover every readiness tier');
  for(const team of demoData.teams)for(const key of ['name','interests','skills','technologies'])assert.ok(team[key]?.trim(),`${team.id}.${key}`);
  for(const proposal of demoData.proposals){
    assert.ok(demoData.teams.some(t=>t.id===proposal.teamId));assert.ok(demoData.tasks.some(t=>t.id===proposal.taskId));
    for(const key of ['idea','plan','deadline','link'])assert.ok(proposal[key]?.trim());
    assert.equal(new URL(proposal.link).protocol,'https:');
  }
});
const legacyCard=seed=>({...Object.fromEntries(inputKeys.map((key,i)=>[key,JSON.parse(seed.legacyRevision)[i]])),id:seed.id,company:seed.company,ownerId:seed.ownerId,published:true,confirmed:true,score:0});
test('Demo upgrade changes only untouched seeds, fills new fields and runs once',()=>{
  const workspace={tasks:demoData.tasks.map(legacyCard),teams:[{id:'chupapi',name:'Своя команда',skills:'Свои навыки'},{id:'orbit',name:'Orbit',skills:'React'}],proposals:structuredClone(demoData.proposals),saved:['qadam']};
  assert.equal(upgradeDemoData(workspace),true);
  assert.equal(workspace.tasks.filter(t=>!t.published).length,5);
  assert.deepEqual(workspace.tasks.filter(t=>t.published).map(t=>t.score),demoData.tasks.map(t=>t.score));
  assert.equal(workspace.teams[0].interests,'');assert.equal(workspace.teams[0].skills,'Свои навыки');
  assert.ok(workspace.teams[1].interests);assert.ok(workspace.teams[1].technologies);
  const after=structuredClone(workspace);assert.equal(upgradeDemoData(workspace),false);assert.deepEqual(workspace,after);
});
test('Demo upgrade preserves user edits, existing reviews, deleted drafts and earned points',()=>{
  const tasks=demoData.tasks.map(legacyCard);
  tasks[0].description='Изменённое пользователем описание задачи';
  tasks[1].assessment={source:'openai',custom:'Сохранённая оценка'};
  tasks[2].deletedAt='2026-09-23T08:00:00Z';tasks[2].published=false;
  const deletedDraft={...structuredClone(demoData.drafts[0]),deletedAt:'2026-09-23T08:00:00Z'};
  const customDraft={id:'my-draft',description:'Мой черновик',published:false};
  tasks.push(deletedDraft,customDraft);
  const protectedRecords=structuredClone(tasks.slice(0,3));
  const proposals=structuredClone(demoData.proposals);proposals[0].milestone.status='confirmed';
  const workspace={tasks,teams:[],proposals,saved:['qadam']};
  const history=structuredClone(proposals);upgradeDemoData(workspace);
  assert.deepEqual(workspace.tasks.slice(0,3),protectedRecords);
  assert.deepEqual(workspace.tasks.find(t=>t.id==='draft-qadam'),deletedDraft);
  assert.deepEqual(workspace.tasks.find(t=>t.id==='my-draft'),customDraft);
  assert.deepEqual(workspace.proposals,history);assert.deepEqual(workspace.saved,['qadam']);
});
