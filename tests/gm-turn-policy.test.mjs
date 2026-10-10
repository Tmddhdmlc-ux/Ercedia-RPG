import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {actionPrompt} from '../web/scene.js';
import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';
import {operatingRules} from '../web/gm-turn-policy.js';

function fixture(){const s=defaults();s.campaign_id='policy-test';s.gameState={region:'W1',place:'목재 운송길',date:'650-07-01',time:'10:00',events:['브란에게 위험을 알렸다.']};s.scene={scene_id:'threat-scene',location:'목재 운송길',time:'10:00',npc:{id:'ER-COM-001',speaker:'브란 오크펠',outfit:'none',emotion:'base'},dialogue:[{speaker:'브란 오크펠',text:'길 아래에 사람이 있어!'}],choices:[{id:'protect',kind:'action',quest_id:'timber',text:'아래쪽 주민을 대피시킨다.'}]};s.quest_log=[{id:'timber',title:'목재 운송',status:'accepted',issuer_npc_id:'ER-COM-001',story_required:true,story:[{event_id:'rolling-load',kind:'threat',description:'기울어진 목재가 주민의 통행로를 위협한다.',protected:'통행 중인 주민'}]}];return s;}
function head(prompt){return JSON.parse(prompt.split('[현재 장면과 행동]\n')[1].split('\n\n')[0]);}

test('full, compact and incremental requests share one operating policy and lead with the same actual conflict',()=>{
 const s=fixture(),before=structuredClone(s),action=s.scene.choices[0].text;
 const prompts=[actionPrompt(s,action,'r',{choiceId:'protect'}),actionPrompt(s,action,'r',{compact:true,choiceId:'protect'}),incrementalPrompt(s,action,'r',createTurnSync().prepare(s,action,'protect'))];
 for(const prompt of prompts){assert.equal(prompt.split(operatingRules).length,2);assert.ok(prompt.indexOf('rolling-load')<prompt.indexOf('[판정 순서]'));assert.match(prompt,/reply_to="r"/);assert.equal(head(prompt).threads[0].completion_gate,'unresolved_threat');assert.equal(head(prompt).declared_action,action);assert.match(prompt,/큰 위험/);assert.match(prompt,/모두 같은 결말로 합치지/);}
 assert.deepEqual(head(prompts[0]),head(prompts[1]));assert.deepEqual(head(prompts[1]),head(prompts[2]));assert.deepEqual(s,before);
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
