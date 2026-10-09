import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {narrativeFocus} from '../web/narrative-context.js';
import {createTurnSync} from '../web/turn-sync.js';
import {turnFacts} from '../web/turn-facts.js';
import {actionPrompt} from '../web/scene.js';
const start=()=>({...defaults(),campaign_id:'narrative-fixture',player:initialPlayer('시험'),gameState:{region:'W1',place:'검증 장소',date:'650-07-01',time:'17:22',events:[]},scene:{scene_id:'fixture',npc:null,cast:[],dialogue:[],choices:[]}});
const actor=id=>({id,speaker:'화자 표시',outfit:'none',emotion:'base'});

test('narrative voices project registered current actors without creating meetings or leaking whole profiles',()=>{
 const s=start();s.scene.npc=actor('ER-COM-001');s.scene.cast=[actor('ER-COM-001'),actor('ER-COM-007'),actor('ER-NPC-081'),actor('unknown')];s.npcStates={'ER-COM-001':{hp:5,strength:99,private_note:'공개 금지'}};
 const before=JSON.stringify(s),f=narrativeFocus(s);
 assert.deepEqual(f.voices.map(v=>v.id),['ER-COM-001','ER-COM-007']);assert.ok(f.voices.every(v=>v.speech_style&&v.personality));assert.ok(f.voices.every(v=>!('hp' in v)&&!('strength' in v)&&!('private_note' in v)));assert.equal(JSON.stringify(s),before);
 s.scene.npc=null;s.scene.cast=[];assert.deepEqual(narrativeFocus(s),{});assert.equal(turnFacts(s,{},'안부를 묻는다').narrative_focus,undefined);
});
test('pending threat focuses an existing response while a resolved threat advances to aftermath',()=>{
 const s=start(),threat={event_id:'danger',kind:'threat',description:'수레 아래 주민이 있다',protected:'주민'},resolve={event_id:'safe',kind:'resolve',threat_id:'danger',description:'주민을 보호했다',protected:'주민'};
 s.quest_log=[{id:'ongoing',title:'운송',status:'active',story_required:true,story:[threat]},{id:'done',title:'완료',status:'completed',story:[threat,resolve]},{id:'offer',title:'제안',status:'offered'}];
 let f=narrativeFocus(s);assert.equal(f.threads.length,1);assert.equal(f.threads[0].phase,'respond_to_existing_threat');assert.equal(f.threads[0].pending_threats[0].event_id,'danger');
 s.quest_log[0].story.push(resolve);f=narrativeFocus(s);assert.equal(f.threads[0].phase,'continue_work_or_aftermath');assert.equal(f.threads[0].pending_threats,undefined);
 s.quest_log[0].status='ready_to_report';assert.equal(narrativeFocus(s).threads[0].phase,'report_verified_result');assert.equal(s.quest_log[0].story.length,2);
});
test('delta requests preserve unchanged current voice and remove it when the actor leaves',()=>{
 const s=start(),sync=createTurnSync();s.scene.npc=actor('ER-COM-001');s.gameState.events=['확인한 왼팔 교상'];
 const p=sync.prepare(s,'안부를 묻는다.');sync.acknowledge(p);
 const delta=sync.prepare(s,'이어서 묻는다.');assert.equal(delta.checkpoint,false);assert.equal(delta.payload.state.turn_facts.narrative_focus.voices[0].id,'ER-COM-001');assert.deepEqual(delta.payload.state.turn_facts.narrative_focus.recorded_consequences,['확인한 왼팔 교상']);sync.acknowledge(delta);
 s.scene.npc=null;s.gameState.events=[];const leave=sync.prepare(s,'잠시 쉰다.');assert.equal(leave.payload.state.turn_facts.narrative_focus,undefined);assert.ok(leave.payload.removed.includes('/turn_facts/narrative_focus'));assert.equal(s.player.hp,100);
});

test('fourth chosen quest precedes unrelated threats in full, compact and delta requests',()=>{
 const s=start();s.quest_log=Array.from({length:4},(_,i)=>({id:'contract-'+i,title:'계약 '+i,status:'active',story_required:true,story:[{event_id:'danger-'+i,kind:'threat',description:'위협 '+i,protected:'대상 '+i}]}));
 s.scene.choices=[{id:'respond-fourth',kind:'quest',quest_id:'contract-3',text:'주민을 끌어올린다.'}];const before=JSON.stringify(s),sync=createTurnSync();
 let p=sync.prepare(s,'주민을 끌어올린다.','respond-fourth');assert.equal(p.payload.state.turn_facts.narrative_focus.threads[0].quest_id,'contract-3');assert.equal(p.payload.state.turn_facts.narrative_focus.threads[0].scope,'selected');assert.equal(p.payload.state.turn_facts.narrative_focus.threads[0].pending_threats[0].event_id,'danger-3');sync.acknowledge(p);
 p=sync.prepare(s,'주민을 끌어올린다.','respond-fourth');assert.equal(p.checkpoint,false);assert.equal(p.payload.state.turn_facts.narrative_focus.threads[0].quest_id,'contract-3');
 for(const compact of [true,false]){const prompt=actionPrompt(s,'주민을 끌어올린다.','request',{compact,choiceId:'respond-fourth'});assert.ok(prompt.includes('"quest_id":"contract-3","title":"계약 3","scope":"selected"'));}
 assert.equal(JSON.stringify(s),before);
});

test('resolved response remains available and explicitly revisited completed quests cannot reopen their episode',()=>{
 const s=start(),story=[{event_id:'threat',kind:'threat',description:'수레가 무너진다',protected:'주민'},{event_id:'rescue',kind:'resolve',threat_id:'threat',description:'주민을 끌어올렸고 수레는 손상됐다',protected:'주민'}];s.quest_log=[{id:'rescue-job',title:'수레 복구',status:'completed',story_required:true,story}];
 assert.equal(narrativeFocus(s).threads,undefined);
 const f=narrativeFocus(s,'수레 복구 뒤 주민에게 안부를 묻는다.');assert.equal(f.threads[0].phase,'completed_aftermath');assert.deepEqual(f.threads[0].verified_aftermath,[{event_id:'rescue',threat_id:'threat',description:'주민을 끌어올렸고 수레는 손상됐다',protected:'주민'}]);assert.equal(f.threads[0].pending_threats,undefined);assert.equal(s.quest_log[0].status,'completed');assert.equal(s.quest_log[0].story.length,2);
});
