import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {actionPrompt} from '../web/scene.js';
import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';
import {operatingRules} from '../web/gm-turn-policy.js';
import {narrationStyle} from '../web/narration-style.js';
import {mergeRulings} from '../web/gm-rulings.js';

function fixture(){const s=defaults();s.campaign_id='policy-test';s.gameState={region:'W1',place:'목재 운송길',date:'650-07-01',time:'10:00',events:['브란에게 위험을 알렸다.']};s.scene={scene_id:'threat-scene',location:'목재 운송길',time:'10:00',npc:{id:'ER-COM-001',speaker:'브란 오크펠',outfit:'none',emotion:'base'},dialogue:[{speaker:'브란 오크펠',text:'길 아래에 사람이 있어!'}],choices:[{id:'protect',kind:'action',quest_id:'timber',text:'아래쪽 주민을 대피시킨다.'}]};s.quest_log=[{id:'timber',title:'목재 운송',status:'accepted',issuer_npc_id:'ER-COM-001',story_required:true,story:[{event_id:'rolling-load',kind:'threat',description:'기울어진 목재가 주민의 통행로를 위협한다.',protected:'통행 중인 주민'}]}];return s;}
function head(prompt){return JSON.parse(prompt.split('[현재 장면과 행동]\n')[1].split('\n\n')[0]);}

test('routine responses can omit new rulings while existing decisions remain immutable and new methods append',()=>{
 const s=fixture(),prior={id:'teaching',topic:'기초 목공 수업',decision:'브란의 동의와 공개된 작업 조건으로 수업을 진행한다.'};s.gm_rulings=[prior];const before=structuredClone(s);
 assert.deepEqual(mergeRulings(s,{}),[prior]);assert.deepEqual(mergeRulings(s,{gm_rulings:[]}),[prior]);
 const next={id:'advanced-class',topic:'추가 수업 방법',decision:'추가 재료와 장인의 동의가 필요하다.'};assert.deepEqual(mergeRulings(s,{gm_rulings:[next]}),[prior,next]);assert.throws(()=>mergeRulings(s,{gm_rulings:[{...prior,decision:'자동 성공'}]}),/임의로/);assert.deepEqual(s,before);
 const sync=createTurnSync(),p=sync.prepare(s,'조용히 쉰다');
 for(const prompt of [actionPrompt(s,'조용히 쉰다','r'),actionPrompt(s,'조용히 쉰다','r',{compact:true}),incrementalPrompt(s,'조용히 쉰다','r',p)]){assert.match(prompt,/새 미정 진행 방법 확정 때만 gm_rulings/);assert.match(prompt,/일반 대화·기존 절차·불변 수치 재확인은 생략/);assert.match(prompt,/대사·gm_rulings로 지급\/완료\/전투를 대신하지/);}
});

test('all request paths share the novel policy without legacy quotas or a brevity override',()=>{
 const s=fixture(),sync=createTurnSync(),p=sync.prepare(s,'브란에게 소감을 묻는다');
 for(const prompt of [actionPrompt(s,'브란에게 소감을 묻는다','r'),actionPrompt(s,'브란에게 소감을 묻는다','r',{compact:true}),incrementalPrompt(s,'브란에게 소감을 묻는다','r',p)]){
  assert.equal(prompt.split(narrationStyle).length-1,1);assert.match(prompt,/짧은 농담·맞장구·이미 이해한 답/);assert.match(prompt,/새 질문·오해·상황 변화가 없으면/);
  assert.ok(!/대화60%|묘사40%|1~3개 짧은 대사|짧게 답하/.test(prompt));
  assert.match(prompt,/비율·개수는 고정하지/);assert.match(prompt,/교훈·재요약·선택 질문 대신/);
  assert.match(prompt,/전지적 비밀 독백·플레이어 대리 반응/);
  assert.match(prompt,/결과를 먼저 정하거나 모두 같은 결말로 합치지/);
  assert.match(prompt,/life_events experience.affection_delta/);
 }
});

test('full, compact and incremental requests share one operating policy and lead with the same actual conflict',()=>{
 const s=fixture(),before=structuredClone(s),action=s.scene.choices[0].text;
 const prompts=[actionPrompt(s,action,'r',{choiceId:'protect'}),actionPrompt(s,action,'r',{compact:true,choiceId:'protect'}),incrementalPrompt(s,action,'r',createTurnSync().prepare(s,action,'protect'))];
 for(const prompt of prompts){assert.equal(prompt.split(operatingRules).length,2);assert.ok(prompt.indexOf('rolling-load')<prompt.indexOf('[판정 순서]'));assert.match(prompt,/reply_to="r"/);assert.equal(head(prompt).threads[0].completion_gate,'unresolved_threat');assert.equal(head(prompt).declared_action,action);assert.match(prompt,/큰 위험/);assert.match(prompt,/모두 같은 결말로 합치지/);}
 assert.match(head(prompts[0]).scene_image_rule,/내부·외부/);assert.match(head(prompts[0]).scene_image_rule,/없으면 null/);assert.match(head(prompts[0]).reply_pacing_rule,/농담·맞장구/);assert.match(head(prompts[0]).reply_pacing_rule,/새 질문·오해·변화/);assert.deepEqual(head(prompts[0]),head(prompts[1]));assert.deepEqual(head(prompts[1]),head(prompts[2]));assert.deepEqual(s,before);
});

test('verified resolution replaces the pending threat in the next briefing without restarting the contract',()=>{
 const s=fixture(),sync=createTurnSync();sync.acknowledge(sync.prepare(s,'주민을 보호한다','protect'));
 s.quest_log[0].story.push({event_id:'evacuation',kind:'resolve',threat_id:'rolling-load',description:'주민은 대피했고 일부 목재가 손상됐다.',protected:'통행 중인 주민'});s.gameState.events.push('주민 대피, 일부 목재 손상');s.scene.dialogue=[{speaker:'브란 오크펠',text:'사람부터 빼낸 건 잘했어. 남은 나무는 내가 살펴보지.'}];
 const p=sync.prepare(s,'남은 목재를 정리한다'),prompt=incrementalPrompt(s,'남은 목재를 정리한다','r2',p),brief=head(prompt);
 assert.equal(brief.threads[0].phase,'continue_work_or_aftermath');assert.equal(brief.threads[0].pending_threats,undefined);assert.match(brief.threads[0].verified_aftermath[0].description,/목재가 손상/);assert.equal(brief.recorded_consequences.at(-1),'주민 대피, 일부 목재 손상');assert.equal(p.payload.state.quest_log[0].status,'accepted');
});

test('the public briefing never copies unobserved life memories, hidden links or private character seeds',()=>{
 const s=fixture();s.npc_life={npcs:{},memories:[{npc_id:'ER-COM-001',player_witnessed:false,result:'PRIVATE_MEMORY_SENTINEL'}],rumors:[],traces:[],links:[{player_known:false,relation:'PRIVATE_LINK_SENTINEL'}]};s.npc_changes={'ER-COM-001':{personality_seed:'PRIVATE_PERSONALITY_SENTINEL'}};
 const brief=JSON.stringify(head(actionPrompt(s,'브란에게 인사한다','r',{compact:true})));
 assert.ok(!brief.includes('PRIVATE_'));assert.equal(head(actionPrompt(s,'브란에게 인사한다','r')).voices[0].id,'ER-COM-001');
});

test('ordinary dialogue excludes irrelevant crafting and combat protocols while execution retains real resources',()=>{
 const s=fixture();s.quest_log=[];const sync=createTurnSync(),first=sync.prepare(s,'안부를 묻는다');sync.acknowledge(first);
 const plain=incrementalPrompt(s,'안부를 묻는다','r',sync.prepare(s,'안부를 묻는다'));assert.ok(!plain.includes('[대장간 제작]'));assert.ok(!plain.includes('battle_wire'));
 for(const action of ['공격한다','단독으로 검을 제작한다','유료 치료를 받는다']){const packet=sync.prepare(s,action);assert.deepEqual(packet.payload.state.player,s.player);assert.deepEqual(packet.payload.state.inventory,s.inventory);assert.ok(packet.payload.state.turn_facts);}
});

test('moving narrative focus ahead of rules leaves authoritative wire records and sync acknowledgement untouched',()=>{
 const s=fixture(),sync=createTurnSync(),p=sync.prepare(s,'주민을 대피시킨다','protect'),before=structuredClone(p),prompt=incrementalPrompt(s,'주민을 대피시킨다','r',p);
 const wire=JSON.parse(prompt.split('현재 상태:\n')[1].split('\n\n플레이어')[0]);
 assert.equal(wire.state.turn_facts.narrative_focus,undefined);assert.deepEqual(wire.state.quest_log,p.payload.state.quest_log);assert.deepEqual(wire.anchor,p.payload.anchor);assert.deepEqual(p,before);assert.equal(sync.acknowledge(p),true);
 assert.ok(head(prompt).previous_beat);assert.equal(head(prompt).last_dialogue,undefined);
});
