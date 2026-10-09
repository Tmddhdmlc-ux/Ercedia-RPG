import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {narrativeFocus} from '../web/narrative-context.js';
import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';
import {turnFacts} from '../web/turn-facts.js';
import {actionPrompt,normalizeScene} from '../web/scene.js';
import {npcContext} from '../web/npc-model.js';
import {townPeople} from '../web/town-people.js';
import {planNPCLife,validateLifeEvents} from '../web/npc-life.js';
const start=()=>({...defaults(),campaign_id:'narrative-fixture',player:initialPlayer('시험'),gameState:{region:'W1',place:'검증 장소',date:'650-07-01',time:'17:22',events:[]},scene:{scene_id:'fixture',npc:null,cast:[],dialogue:[],choices:[]}});
const actor=id=>({id,speaker:'화자 표시',outfit:'none',emotion:'base'});

test('registered cleric and healer roles survive missing duty without trusting runtime rank overrides',()=>{
 const s=start();s.scene.location=s.gameState.place;s.scene.npc=actor('ER-NPC-026');s.scene.cast=[actor('ER-NPC-026'),actor('ER-NPC-057')];s.npcStates={'ER-NPC-026':{rank:'경비 지휘관',private_note:'비밀'}};
 const before=JSON.stringify(s),focus=narrativeFocus(s);
 assert.equal(focus.voices[0].public_role,'중급 사제');assert.equal(focus.voices[1].public_role,'치료사');assert.match(focus.role_rule,/경비 지휘권/);
 const nearby=npcContext(s).nearby_npcs;assert.equal(nearby.find(n=>n.id==='ER-NPC-026').public_role,'중급 사제');assert.equal(nearby.find(n=>n.id==='ER-NPC-057').public_role,'치료사');
 assert.ok(nearby.every(n=>!Object.hasOwn(n,'strength')&&!Object.hasOwn(n,'private_note')));
 const people=townPeople(s);assert.equal(people.find(n=>n.id==='ER-NPC-026').job,'중급 사제');assert.equal(people.find(n=>n.id==='ER-NPC-057').job,'치료사');
 const sync=createTurnSync(),first=sync.prepare(s,'로한에게 안부를 묻는다');sync.acknowledge(first);const delta=sync.prepare(s,'로한에게 이어서 묻는다');assert.equal(delta.payload.state.turn_facts.narrative_focus.voices[0].public_role,'중급 사제');assert.equal(JSON.stringify(s),before);
});

test('narrative voices project registered current actors without creating meetings or leaking whole profiles',()=>{
 const s=start();s.scene.npc=actor('ER-COM-001');s.scene.cast=[actor('ER-COM-001'),actor('ER-COM-007'),actor('ER-NPC-081'),actor('unknown')];s.npcStates={'ER-COM-001':{hp:5,strength:99,private_note:'공개 금지'}};
 const before=JSON.stringify(s),f=narrativeFocus(s);
 assert.deepEqual(f.voices.map(v=>v.id),['ER-COM-001','ER-COM-007']);assert.ok(f.voices.every(v=>v.speech_style&&v.personality));assert.ok(f.voices.every(v=>!('hp' in v)&&!('strength' in v)&&!('private_note' in v)));assert.equal(JSON.stringify(s),before);
 s.scene.npc=null;s.scene.cast=[];assert.deepEqual(narrativeFocus(s),{});assert.equal(turnFacts(s,{},'안부를 묻는다').narrative_focus,undefined);
});
test('pending threat focuses an existing response while a resolved threat advances to aftermath',()=>{
 const s=start(),threat={event_id:'danger',kind:'threat',description:'수레 아래 주민이 있다',protected:'주민'},resolve={event_id:'safe',kind:'resolve',threat_id:'danger',description:'주민을 보호했다',protected:'주민'};
 s.quest_log=[{id:'ongoing',title:'운송',status:'active',story_required:true,story:[threat]},{id:'done',title:'완료',status:'completed',story:[threat,resolve]},{id:'offer',title:'제안',status:'offered'}];
 let f=narrativeFocus(s);assert.equal(f.threads.length,1);assert.equal(f.threads[0].phase,'respond_to_existing_threat');assert.equal(f.threads[0].completion_gate,'unresolved_threat');assert.match(f.report_rule,/해결을 날조하지/);assert.equal(f.threads[0].pending_threats[0].event_id,'danger');assert.match(f.pacing_rule,/한 턴/);assert.match(f.pacing_rule,/성공은 보장하지/);
 s.quest_log[0].story.push(resolve);f=narrativeFocus(s);assert.equal(f.threads[0].phase,'continue_work_or_aftermath');assert.equal(f.threads[0].pending_threats,undefined);assert.equal(f.threads[0].completion_gate,undefined);assert.equal(f.report_rule,undefined);
 s.quest_log[0].status='ready_to_report';assert.equal(narrativeFocus(s).threads[0].phase,'report_verified_result');assert.equal(s.quest_log[0].story.length,2);
});

test('pending episodes retain the actual previous report and choices without adjudicating progress',()=>{
 const s=start();s.quest_log=[{id:'search',title:'수색 지원',status:'active',story:[{event_id:'missing',kind:'threat',description:'작업자 행방 불명',protected:'작업자'}]}];
 s.scene.dialogue=[{speaker:'로한',text:'바위 아래 흔적을 찾았지만 사람은 아직 못 찾았네.'}];s.scene.choices=[{id:'wait',text:'다음 수색 보고를 확인한다'}];
 const before=JSON.stringify(s),focus=narrativeFocus(s);assert.deepEqual(focus.previous_beat,{dialogue:[{speaker:'로한',text:'바위 아래 흔적을 찾았지만 사람은 아직 못 찾았네.'}],choices:['다음 수색 보고를 확인한다']});assert.match(focus.pacing_rule,/표현만 바꿔 반복하지/);assert.match(focus.pacing_rule,/성공은 보장하지/);assert.equal(JSON.stringify(s),before);
 s.quest_log[0].story.push({event_id:'found',kind:'resolve',threat_id:'missing',description:'실제 귀환 확인',protected:'작업자'});assert.equal(narrativeFocus(s).previous_beat,undefined);
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

test('arrival scenes retain farewell context without moving its speaker or weakening participant validation',()=>{
 const s=start(),raw={schema_version:1,type:'ercedia_scene',scene_id:'farewell-fixture',location:'휴식 공간',time:'21:00',background_id:null,npc:null,dialogue:[{speaker:'마야 로웬',speaker_id:'ER-NPC-057',text:'붕대는 그대로 두시고 쉬세요.'}],choices:[]};
 assert.throws(()=>normalizeScene(raw),/speaker_id는 현재 대화 참가자/);
 const cast=[{id:'ER-NPC-057',speaker:'마야 로웬',outfit:'none',emotion:'smile'}];assert.equal(normalizeScene({...raw,cast}).dialogue[0].speaker_id,'ER-NPC-057');
 for(const compact of [true,false])assert.ok(actionPrompt(s,'마야에게 인사하고 쉬러 간다.','farewell',{compact}).includes('출발지 인물을 npc/cast에 넣지'));
 const p=createTurnSync().prepare(s,'마야에게 인사하고 쉬러 간다.');assert.ok(incrementalPrompt(s,'마야에게 인사하고 쉬러 간다.','farewell',p).includes('speaker_id는 npc 또는 cast에 포함'));
 const source=normalizeScene({...raw,scene_id:'at-gate',location:'초소',npc:cast[0],dialogue:[{speaker:'마야 로웬',speaker_id:'ER-NPC-057',text:'붕대는 그대로 두시고 쉬세요.'}],game_state:{date:'650-07-01',region:'W1',place:'초소'}});Object.assign(s,planNPCLife(s,source));s.scene=source;s.gameState={...s.gameState,...source.game_state};
 const arrival=normalizeScene({...raw,dialogue:[{speaker:'나레이션',text:'마야는 붕대를 그대로 두고 쉬라고 당부했다. 민하는 작별하고 휴식 공간으로 돌아왔다.'}],game_state:{date:'650-07-01',region:'W1',place:'휴식 공간'}});Object.assign(s,planNPCLife(s,arrival));s.scene=arrival;s.gameState={...s.gameState,...arrival.game_state};assert.equal(s.npc_life.npcs['ER-NPC-057'].place,'초소');assert.equal(s.npc_life.npcs['ER-NPC-057'].last_meeting.place,'초소');assert.equal(townPeople(s).some(n=>n.id==='ER-NPC-057'),false);assert.equal(s.npc_life.memories.filter(m=>m.npc_id==='ER-NPC-057'&&m.action==='첫 만남').length,1);
});


test('new opportunities use bounded completed local public work without reopening contracts or claiming NPC knowledge',()=>{
 const s=start();s.scene.npc=actor('ER-COM-001');s.quest_log=Array.from({length:5},(_,i)=>({id:'done-'+i,title:'대조 작업 '+i,type:'investigate',region_id:'W1',status:'completed',story:[{event_id:'resolved-'+i,kind:'resolve',description:'플레이어는 주민에게 경고했고 일꾼들이 목재를 고정했다.'}]}));s.quest_log.push({id:'private',title:'미공개 업무',status:'completed',visibility:'private',region_id:'W1'},{id:'remote',title:'다른 권역',status:'completed',region_id:'E1'},{id:'open',title:'아직 맡은 일',status:'active',region_id:'W1'});const before=JSON.stringify(s),a='다른 일거리를 알아본다',f=narrativeFocus(s,a);
 assert.deepEqual(f.completed_work.map(q=>q.quest_id),['done-2','done-3','done-4']);assert.equal(f.completed_work[0].verified_result,s.quest_log[2].story[0].description);assert.match(f.opportunity_rule,/부상과 조건을 무시하지/);assert.match(f.opportunity_rule,/직접 요청한 반복 의뢰/);assert.match(f.contribution_rule,/발견·구조·치료·고정/);assert.match(f.knowledge_rule,/NPC 지식을 확정하지/);assert.match(f.knowledge_rule,/직접 전해 들은 기록이 없으면/);assert.equal(f.completed_work.some(q=>q.status==='offered'),false);assert.equal(JSON.stringify(s),before);
 const sync=createTurnSync();sync.acknowledge(sync.prepare(s,'인사한다'));assert.deepEqual(sync.prepare(s,a).payload.state.turn_facts.narrative_focus.completed_work,f.completed_work);for(const compact of [true,false])assert.ok(actionPrompt(s,a,'new-work',{compact}).includes('opportunity_rule'));
 assert.equal(narrativeFocus(s,'통로를 대피시킨다').completed_work,undefined);s.scene.npc=null;assert.equal(narrativeFocus(s,'혼자 쉰다').contribution_rule,undefined);
});


test('first meetings remain automatic and malformed life events identify missing common evidence fields',()=>{
 const s=start();s.scene.npc=actor('ER-COM-007');const f=narrativeFocus(s,'시그나를 직접 만난다');assert.match(f.life_event_rule,/엔진이 자동 기억/);assert.match(f.life_event_rule,/event_id,kind,date,source_id,reason/);assert.match(f.life_event_rule,/scene:<scene_id>/);
 assert.throws(()=>validateLifeEvents([{event_id:'first',date:'650-07-03',npc_id:'ER-COM-007',action:'첫 만남',result:'관찰 일을 제안했다',location:'장터',affection_delta:0,player_witnessed:true}]),/source_id 문자열 형식/);
 assert.throws(()=>validateLifeEvents([{event_id:'first',date:'650-07-03',source_id:'scene:meeting'}]),/reason 문자열 형식/);
 const scene={...s.scene,scene_id:'meeting',location:'장터',game_state:{region:'W1',place:'장터',date:'650-07-03'}};delete scene.cast;Object.assign(s,planNPCLife(s,scene));const first=s.npc_life.memories.filter(m=>m.npc_id==='ER-COM-007'&&m.action==='첫 만남');assert.equal(first.length,1);Object.assign(s,planNPCLife(s,scene));assert.equal(s.npc_life.memories.filter(m=>m.action==='첫 만남').length,1);
});

test('choice diversity reaches current offers and active episodes without treating remote offers as current work',()=>{
 const s=start();s.scene.npc=actor('ER-COM-007');s.quest_log=[{id:'local-offer',title:'관찰 의뢰',status:'offered',issuer_npc_id:'ER-COM-007'},{id:'remote-offer',title:'다른 제안',status:'offered',issuer_npc_id:'ER-COM-001'}];
 const before=JSON.stringify(s),sync=createTurnSync();assert.ok(narrativeFocus(s).choice_rule);sync.acknowledge(sync.prepare(s,'관찰 의뢰를 맡고 출발한다'));assert.ok(sync.prepare(s,'관찰 의뢰를 맡고 출발한다').payload.state.turn_facts.narrative_focus.choice_rule);assert.equal(JSON.stringify(s),before);
 s.scene.npc=null;assert.equal(narrativeFocus(s,'혼자 쉰다').choice_rule,undefined);assert.ok(narrativeFocus(s,'관찰 의뢰의 조건을 묻는다').choice_rule);s.quest_log[0].status='active';assert.ok(narrativeFocus(s,'위험한 흔적에 대응한다').choice_rule);s.quest_log[0].status='completed';assert.equal(narrativeFocus(s,'혼자 쉰다').choice_rule,undefined);
});

test('work-seeking paraphrases retain older completed local work without adding private or remote knowledge',()=>{
 const s=start();s.quest_log=Array.from({length:15},(_,i)=>({id:'done-'+i,title:'작업 '+i,status:'completed',region_id:'W1',type:'investigate'}));s.quest_log.push({id:'hidden',title:'비밀',status:'completed',visibility:'private',region_id:'W1'},{id:'elsewhere',title:'다른 지역',status:'completed',region_id:'E1'});const before=JSON.stringify(s);
 for(const action of ['숲에 나가지 않고 할 수 있는 일을 찾고 있다','왼팔에 무리 없이 맡을 수 있는 일을 묻는다']){const f=narrativeFocus(s,action);assert.equal(f.completed_work_history.length,12);assert.equal(f.completed_work_history[0].quest_id,'done-3');assert.deepEqual(f.completed_work.map(q=>q.quest_id),['done-12','done-13','done-14']);assert.ok(!f.completed_work_history.some(q=>['hidden','elsewhere'].includes(q.quest_id)));const p=createTurnSync().prepare(s,action);assert.deepEqual(p.payload.state.turn_facts.narrative_focus.completed_work_history,f.completed_work_history);}
 assert.equal(narrativeFocus(s,'맡은 일을 계속한다').completed_work_history,undefined);assert.equal(JSON.stringify(s),before);
});
