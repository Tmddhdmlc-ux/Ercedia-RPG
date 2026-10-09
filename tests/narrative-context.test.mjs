import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {narrativeFocus} from '../web/narrative-context.js';
import {createTurnSync} from '../web/turn-sync.js';
import {turnFacts} from '../web/turn-facts.js';
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
