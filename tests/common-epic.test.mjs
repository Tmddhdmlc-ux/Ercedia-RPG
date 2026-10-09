import test from 'node:test';
import assert from 'node:assert/strict';
import {npcCatalog,npcContext,resolveNPC,updateNPC} from '../web/npc-model.js';
import {characterVisual,placementFor} from '../web/character-art.js';
import {defaults,normalize} from '../web/state.js';
import {normalizeScene} from '../web/scene.js';
import {normalizeQuest,settleQuests} from '../web/quest-model.js';
import {epicSeeds,epicEligibility,planLocalReputation,validateEpicQuest} from '../web/epic-model.js';
const state=()=>({...defaults(),gameState:{date:'1-1-1',region:'W1',place:'노르발트'},quest_log:[],quest_event_ids:[]});
const normal=(i)=>normalizeQuest({id:'ordinary-'+i,title:'현장 조사 '+i,summary:'실제 증거 조사',type:'investigate',origin:'guild_board',rank:'F',region_id:'W1',status:'completed',claim_event_id:'claim-'+i,objectives:[{id:'clue',description:'현장 단서',current:1,target:1,verification:{kind:'clue',target_id:'proof-'+i},evidence_ids:['proof-'+i]}],reward:{xp:0,currency:0,item_ids:[],materials:[],affection_effects:[]}});
const unlocked=()=>{const s=state();s.quest_log=Array.from({length:5},(_,i)=>normal(i));s.quest_event_ids=s.quest_log.map(q=>q.claim_event_id);return s;};
const rawScene=(extra={})=>({schema_version:1,type:'ercedia_scene',scene_id:'test',location:'노르발트',time:'오전',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'현장 사건 확인'}],choices:[],game_state:{date:'1-1-1',region:'W1',place:'노르발트'},...extra});
test('24 common NPCs have their own standings, placement, assigned initial stats, concealed identities and persistent profiles',()=>{
  const common=npcCatalog.filter(p=>p.id.startsWith('ER-COM-'));assert.equal(common.length,24);
  for(const p of common){assert.ok(characterVisual(p.id).path.includes(p.id));assert.equal(placementFor(p.id).location_id,p.location_id);if(['ER-COM-015','ER-COM-024'].includes(p.id)){assert.equal(p.level,null);assert.equal(p.hp,null);assert.equal(p.strength,null);}else{assert.ok(p.level>0);assert.ok(p.hp>0);assert.ok(p.strength>0);}normalizeScene(rawScene({npc:{id:p.id,outfit:'none',emotion:'base',speaker:p.name}}));}
  const s=state();assert.ok(npcContext(s).nearby_npcs.some(p=>p.id==='ER-COM-001'));updateNPC(s,'ER-COM-001',{hp:25,maxHp:30});assert.equal(resolveNPC(normalize(s),'ER-COM-001').hp,25);
});
test('five unique verified ordinary completions unlock an epic; repeats, foreign quests and other reputations do not',()=>{
  const seed=epicSeeds()[0],s=unlocked();assert.equal(epicEligibility(s,seed).eligible,true);
  s.quest_log.pop();assert.equal(epicEligibility(s,seed).eligible,false);s.quest_log.push(s.quest_log[0]);assert.equal(epicEligibility(s,seed).eligible,false);
  s.relationships={serin:{affection:100}};s.world_engine={kingdom_reputation:{west:100}};assert.equal(epicEligibility(s,seed).eligible,false);
  s.quest_log=Array.from({length:5},(_,i)=>({...normal(i),repeatable:true}));assert.equal(epicEligibility(s,seed).eligible,false);
});
test('local reputation needs an actual regional event, deduplicates it and persists independently',()=>{
  const s=state(),e={event_id:'help-residents',scope_id:'W1',delta:30,reason:'실제 구호 물자를 전달한 공동체 평가'};
  const scene=normalizeScene(rawScene({locality_events:[e]}));Object.assign(s,settleQuests(s,scene));assert.equal(epicEligibility(s,epicSeeds()[0]).eligible,true);
  assert.deepEqual(planLocalReputation(s,scene),s.local_reputation);assert.deepEqual(normalize(s).local_reputation,s.local_reputation);
  assert.throws(()=>planLocalReputation(s,rawScene({locality_events:[{...e,delta:40}]})),/동일 사건 변경/);
  assert.throws(()=>planLocalReputation(s,rawScene({locality_events:[{...e,event_id:'wrong',scope_id:'S1'}]})),/실제 지역/);
});
test('epic offers grant nothing; validated report grants one registered candidate once and restores the save',()=>{
  const s=unlocked(),seed=epicSeeds()[0],item=seed.rewards.choice_one_of[0].catalog_id;
  const q=normalizeQuest({...normal('epic'),id:seed.id,epic_id:seed.id,title:seed.title,rank:'EPIC',status:'offered',claim_event_id:null,objectives:[{id:'resolution',description:'실제 결말 증거 확보',current:0,target:1,verification:{kind:'clue',target_id:'resolution'}}],reward:{xp:0,currency:0,item_ids:[item],materials:[],affection_effects:[]}});
  assert.throws(()=>validateEpicQuest(state(),q),/해금/);
  assert.throws(()=>validateEpicQuest(s,{...q,reward:{...q.reward,xp:1}}),/추가 보상/);
  assert.throws(()=>validateEpicQuest(s,{...q,reward:{...q.reward,item_ids:['ER-EQ-001']}}),/보상 후보/);
  const apply=extra=>Object.assign(s,settleQuests(s,normalizeScene(rawScene(extra))));
  apply({quest_updates:[q]});assert.equal(s.inventory.length,0);
  apply({quest_events:[{event_id:'epic-accept',quest_id:q.id,kind:'accept',reason:'실제 발행자 수락'}]});
  apply({world_events:[{event_id:'epic-proof',kind:'clue',target_id:'resolution',location:'노르발트',proof:'현장 갈등 해결 증거'}]});
  const report={quest_events:[{event_id:'epic-report',quest_id:q.id,kind:'report',reason:'실제 목표 보고와 후보 보상 확정'}]};apply(report);assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].id,item);assert.equal(s.quest_log.at(-1).status,'completed');assert.throws(()=>apply(report),/이미 적용/);assert.equal(s.inventory[0].quantity,1);assert.equal(normalize(s).quest_log.at(-1).epic_id,q.id);
});

test('village completions and community affection stay separate from the parent lordship',()=>{
  const village=epicSeeds().find(s=>s.scope==='settlement'),parent=epicSeeds().find(s=>s.region_id===village.region_id&&s.scope!=='settlement');
  const s=unlocked();s.gameState.region='W3';s.quest_log=s.quest_log.map(q=>({...q,region_id:'W3'}));
  assert.equal(epicEligibility(s,parent).eligible,true);assert.equal(epicEligibility(s,village).eligible,false);
  s.quest_log=s.quest_log.map(q=>({...q,settlement_id:village.scope_id}));assert.equal(epicEligibility(s,village).eligible,true);
  s.quest_log=[];const event={event_id:'solbrin-help',scope_id:village.scope_id,delta:30,reason:'현장에서 검증된 마을 구호'};
  s.local_reputation=planLocalReputation(s,{location:'솔브린 마을',locality_events:[event]});
  assert.equal(epicEligibility(s,village).eligible,true);assert.equal(epicEligibility(s,parent).eligible,false);
  assert.throws(()=>planLocalReputation(s,{location:'다른 마을',locality_events:[{...event,event_id:'foreign'}]}),/실제 등록 마을/);
  assert.equal(epicEligibility(normalize(s),village).eligible,true);
});
