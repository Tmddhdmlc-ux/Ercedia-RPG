import {battleFixture} from './battle-fixtures.js';
import {validateBattleSettlement} from '../web/battle-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {normalizeScene,turnDomains} from '../web/scene.js';
import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';
import {normalizeQuest,settleQuests} from '../web/quest-model.js';
import {validateTurnOutcome} from '../web/turn-outcome.js';
import {planEngineScene,equipItem,ensureEngine} from '../web/engine-model.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
const start=()=>({...defaults(),campaign_id:'regression',player:initialPlayer('민하'),wallet_copper:500,gameState:{region:'W1',place:'마을',date:'650-07-01',time:'09:00'}});
const scene=(id,extra={})=>normalizeScene({schema_version:1,type:'ercedia_scene',scene_id:id,location:'마을',time:'09:00',background_id:null,npc:{id:'ER-COM-001',speaker:'브란 오크펠',outfit:'none',emotion:'base'},dialogue:[{speaker:'나레이션',text:'작업 현장을 살핀다.'}],choices:[],...extra});
const quest=()=>({id:'cart-job',title:'자재 운반',summary:'브란의 현지 발주',origin:'personal_npc',type:'repair',status:'offered',rank:'F',region_id:'W1',issuer_npc_id:'ER-COM-001',issuer_name:'브란 오크펠',story_required:true,objectives:[{id:'cart',description:'운반 마무리',target:1,verification:{kind:'action',target_id:'cart-work'}}],reward:{currency:60,xp:10,item_ids:[],materials:[],affection_effects:[]}});
const threat={event_id:'cart-tilt',quest_id:'cart-job',kind:'threat',description:'수레가 기울어 작업자를 위협한다.',protected:'현지 작업자'};
const resolve={event_id:'cart-safe',quest_id:'cart-job',kind:'resolve',threat_id:'cart-tilt',description:'플레이어가 작업자를 물리고 수레를 지지했다. 브란이 함께 정리한다.',protected:'현지 작업자'};
const apply=(s,sc)=>Object.assign(s,settleQuests(s,sc));
test('transport acceptance, danger, response and payment persist exactly once and unlock real quest progress',()=>{
 const s=start();apply(s,scene('offer',{quest_updates:[quest()]}));
 apply(s,scene('accept-threat',{quest_events:[{event_id:'accept-cart',kind:'accept',quest_id:'cart-job',reason:'브란이 실제 수락 확인'}],story_events:[threat],choices:[{id:'rescue',text:'작업자를 물리고 수레를 지지한다.'},{id:'retreat',text:'안전한 곳에서 도움을 부른다.'}]}));
 const saved=structuredClone(s);
 assert.throws(()=>apply(s,scene('skip',{quest_events:[{event_id:'skip-pay',quest_id:'cart-job',kind:'report',reason:'생략'}]})),/위협|실제 목표/);assert.deepEqual(s,saved);
 apply(s,scene('response',{story_events:[resolve],world_events:[{event_id:'work-done',kind:'action',target_id:'cart-work',location:'마을',proof:'수레 지지와 운반 완료'}]}));
 const report=scene('paid',{quest_events:[{event_id:'pay-cart',kind:'report',quest_id:'cart-job',reason:'발주자가 작업과 구호 확인'}]});apply(s,report);
 assert.equal(s.wallet_copper,560);assert.equal(s.player.xp,10);assert.equal(s.quest_log[0].status,'completed');assert.equal(normalize(s).quest_log[0].story.length,2);
 const before=structuredClone(s);assert.throws(()=>apply(s,report),/이미 적용/);assert.deepEqual(s,before);
});
test('new danger cannot be introduced and resolved in a single response or seeded as finished progress',()=>{
 const s=start();apply(s,scene('offer',{quest_updates:[quest()]}));const before=structuredClone(s);
 assert.throws(()=>apply(s,scene('auto-resolved',{quest_events:[{event_id:'accept-cart',kind:'accept',quest_id:'cart-job',reason:'동의'}],story_events:[threat,resolve],choices:[{id:'a',text:'다음 일'},{id:'b',text:'휴식'}]})),/같은 응답/);assert.deepEqual(s,before);
 const fake=quest();fake.story=[{...threat,scene_id:'earlier'},{...resolve,scene_id:'later'}];const other=start();apply(other,scene('fake',{quest_updates:[fake]}));assert.equal(other.quest_log[0].story,undefined);
});
test('same response acceptance and real work is verified before reporting; prior evidence cannot complete a new contract',()=>{
 const s=start(),q=quest();delete q.story_required;
 apply(s,scene('first',{world_events:[{event_id:'past-work',kind:'action',target_id:'cart-work',location:'마을',proof:'별개 과거 작업'}]}));
 apply(s,scene('accept-work',{quest_updates:[q],quest_events:[{event_id:'accept',kind:'accept',quest_id:q.id,reason:'수락 확인'}],world_events:[{event_id:'current-work',kind:'action',target_id:'cart-work',location:'마을',proof:'수락 후 수행'}]}));
 assert.equal(s.quest_log[0].status,'ready_to_report');assert.deepEqual(s.quest_log[0].objectives[0].evidence_ids,['current-work']);
});
test('scoped canonical facts survive delta mode: real sword IDs, growth and valid contract forms',()=>{
 const s=start(),sync=createTurnSync();sync.acknowledge(sync.prepare(s,'인사한다.'));
 for(const action of ['혼자 검을 만든다.','검 가격과 재고를 알아본다.','유급 순찰 일거리를 받는다.','훈련한다.','검사 직업 등록을 마무리한다.']){
  const p=sync.prepare(s,action),facts=p.payload.state.turn_facts;assert.ok(facts);
  if(/검/.test(action)){assert.ok(facts.items.some(i=>i.id==='ER-EQ-001'));assert.match(facts.item_rule,/경제 기준가 키/);}
  if(/직업/.test(action))assert.match(facts.xp.profession,/kind:profession/);
  if(/훈련|만든/.test(action))assert.match(facts.xp.rule,/고정 지급표는 없/);
  if(/순찰/.test(action))assert.equal(facts.quests.new_quest.story_required,true);
  assert.match(incrementalPrompt(s,action,'r',p),/대사·gm_rulings는 지급/);
 }
 const fight=sync.prepare(s,'서리갈기 늑대를 사격한다.');assert.ok(fight.domains.combat);assert.ok(fight.payload.state.turn_facts.combat_actors.some(n=>n.id==='ER-NPC-081'));assert.ok(fight.payload.state.turn_facts.battle_wire);assert.ok(fight.payload.state.turn_facts.combat_actors.length<=3);
 const generic=sync.prepare(s,'근처에서 사냥한다.');assert.ok(generic.payload.state.turn_facts.combat_actors.some(n=>n.role==='monster'));assert.ok(generic.payload.state.turn_facts.combat_actors.length<=2);
});
test('a registered crafted sword becomes equipment while unknown baseline keys cannot create phantom equipment',()=>{
 const s=start();ensureEngine(s);const bad=scene('bad',{inventory:[{id:'basic_sword',name:'기본 검',quantity:1}]});assert.throws(()=>validateTurnOutcome(s,'검을 만든다.',bad),/미등록/);
 const crafted=scene('crafted',{inventory:[{id:'ER-EQ-001',quantity:1}]});validateTurnOutcome(s,'검을 만든다.',crafted);
 Object.assign(s,planEngineScene(s,crafted));assert.equal(s.inventory[0].category,'equipment');assert.equal(s.engine.instances[0].catalog_id,'ER-EQ-001');
 s.player.job='검사';equipItem(s,s.engine.instances[0].instance_id);assert.equal(s.player.battleModifiers.weapon_attack,2);
 // Legacy saves remain readable, including an old generic item; don't silently grant or delete it.
 const legacy=start();legacy.inventory=[{id:'basic_sword',name:'기본 검',quantity:1}];assert.equal(normalize(legacy).inventory[0].id,'basic_sword');
});
test('missing quest/payment/battle records are rejected without inventing state; unrelated quotations remain valid',()=>{
 const s=start();assert.throws(()=>validateTurnOutcome(s,'일거리',scene('bad-choice',{choices:[{id:'a',kind:'quest',text:'수락'},{id:'b',text:'돌아간다'}]})),/quest_id/);
 assert.throws(()=>validateTurnOutcome(s,'완료 보고',scene('ghost-pay',{dialogue:[{speaker:'나레이션',text:'보수 60동화를 받았다.'}]})),/지급 사건/);
 assert.doesNotThrow(()=>validateTurnOutcome(s,'보수 문의',scene('quote',{dialogue:[{speaker:'브란 오크펠',text:'보수는 60동화야.'}]})));
 assert.throws(()=>validateTurnOutcome(s,'늑대를 사격한다.',scene('prose-only',{dialogue:[{speaker:'나레이션',text:'화살이 늑대의 다리에 박혔다.'}]})),/실제 타격/);
});
test('unambiguous recent-dialogue objects normalize without a second GM round trip; malformed records stay rejected',()=>{
 const s=scene('history',{game_state:{recent_dialogue:[{speaker:'민하',text:'인사한다.',emotion:'base'}]}});assert.deepEqual(s.game_state.recent_dialogue,['민하: 인사한다.']);
 assert.throws(()=>scene('bad-history',{game_state:{recent_dialogue:[{speaker:'민하',text:'안녕',secret:'unknown'}]}}),/형식/);
});
test('actual chat application marks new quests as requiring a threat and rejects phantom payouts atomically',()=>{
 const h=uiHarness();try{
  const s=start(),chat=mountChatUI(s,{embedded:true,render(){},persist(){}}),q=quest();delete q.story_required;
  chat.submit('일거리를 조회한다.');let req=h.messages.filter(m=>m.type==='action').at(-1).payload;
  h.reply('scene',JSON.stringify({...scene('offer-ui',{quest_updates:[q]}),reply_to:req.requestId}));
  assert.equal(s.quest_log[0].story_required,true);assert.equal(s.wallet_copper,500);
  const before=structuredClone(s);chat.submit('완료 보고한다.');req=h.messages.filter(m=>m.type==='action').at(-1).payload;
  h.reply('scene',JSON.stringify({...scene('ghost-ui',{dialogue:[{speaker:'나레이션',text:'보수 60동화를 받았다.'}]}),reply_to:req.requestId}));
  assert.deepEqual(s,before);assert.ok(h.messages.some(m=>m.type==='parse-error'));assert.equal(chat.isPending(),true);
 }finally{h.close();}
});

test('verified battle injuries persist without a redundant GM sentence; damage contradictions remain rejected',()=>{
 const f=battleFixture();f.scene.game_state.events=Array.from({length:30},(_,i)=>'이력 '+i);
 const s=normalizeScene(f.scene);assert.equal(s.game_state.events.length,30);assert.ok(s.game_state.events.includes('검증용 경상'));assert.equal(validateBattleSettlement(s,f.state),true);
 assert.equal(normalizeScene(s).game_state.events.filter(e=>e==='검증용 경상').length,1);
 f.scene.battle.events[0].damage=999;assert.throws(()=>normalizeScene(f.scene),/전투 검증/);
});
