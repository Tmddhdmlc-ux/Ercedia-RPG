import test from 'node:test';
import assert from 'node:assert/strict';
import {createTurnSync} from '../web/turn-sync.js';
import {actionPrompt} from '../web/scene.js';
import {worldData} from '../web/world-data.js';
import {economyState,scene,event,offer,apply} from './economy-fixtures.js';

test('asking about ongoing NPC rest keeps dialogue instead of lodging and recovery facts',()=>{
 const s=economyState(),before=structuredClone(s);
 for(const action of ['그 직원은 아직 쉬고 있겠죠? 손목 상태를 살펴보고 싶다고 하셨잖아요.','마야는 지금 쉬고 있나요?','그분이 쉬고 계신가요?','브란이 쉬고 있는지 묻는다.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.trade,false,action);assert.equal(p.payload.state.turn_facts.recovery_wire,undefined);assert.equal(p.payload.state.economy,undefined);assert.ok(actionPrompt(s,action,'rest-question',{compact:true}).includes(action));}
 assert.deepEqual(s,before);
});
test('NPC rest questions do not suppress a separate player rest, treatment, or inn quote',()=>{
 const s=economyState();for(const action of ['그 직원은 쉬고 있나요? 나는 한 시간 쉰다.','마야가 쉬고 계신가요? 팔을 치료받고 싶다.','브란이 쉬고 있는지 확인하고 여관 숙박 가격을 묻는다.','여관에서 쉬고 싶어요.','잠을 잔다.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.trade,true,action);assert.ok(p.payload.state.turn_facts.recovery_wire,action);}
});

test('explicitly declined care with advice only omits medical commerce facts without changing action or resources',()=>{
 const s=economyState();s.player.hp=69;const before=structuredClone(s);
 for(const action of ['지금 진료를 받겠다는 건 아니고, 조언이 궁금해요.','치료는 받지 않고 이야기만 하고 싶어요.','진료를 안 받고 대화만 한다.']){
  const p=createTurnSync().prepare(s,action);assert.equal(p.domains.trade,false,action);assert.equal(p.payload.state.turn_facts.recovery_wire,undefined);assert.equal(p.payload.state.economy,undefined);assert.ok(actionPrompt(s,action,'advice',{compact:true}).includes(action));assert.ok(!actionPrompt(s,action,'advice',{compact:true}).includes('recovery_wire'));
 }
 assert.deepEqual(s,before);
});
test('declining care does not suppress a later treatment, medical quote, rest, or conditional inquiry',()=>{
 const s=economyState();for(const action of ['진료를 받겠다는 건 아니고 치료비만 묻는다.','진료를 받겠다는 건 아니고 붕대 처치를 요청한다.','진료를 안 받고 여관에서 쉰다.','진료를 안 받으면 위험한지 묻는다.','치료를 받지 않으면 어떻게 되나요?']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.trade,true,action);assert.ok(p.payload.state.turn_facts.recovery_wire,action);}
});

test('treatment, emergency care and explicit rest preserve real resources and provide service records without combat',()=>{
 const s=economyState();s.player.hp=69;s.gameState.events=['왼팔 교상'];const before=JSON.stringify(s);
 for(const action of ['늑대에게 물린 팔을 치료받는다.','응급 처치를 받는다.','여관에서 쉰다.','오늘은 휴식한다.','여관에서 하룻밤 묵는다.','치료비를 문의한다.']){
  const p=createTurnSync().prepare(s,action),f=p.payload.state.turn_facts;
  assert.equal(p.domains.trade,true,action);assert.equal(p.domains.combat,false,action);assert.ok(f.recovery_wire);
  assert.ok(f.recovery_wire.completion.includes('kind:service'));assert.ok(f.recovery_wire.narration.includes('가격 문의'));
  assert.deepEqual(f.recovery_wire.facilities,worldData.facilities.filter(x=>x.region_id==='W5'&&x.service.some(v=>['healing','rest','mana_rest'].includes(v))));
  assert.ok(actionPrompt(s,action,'recovery-test').includes('recovery_wire'));assert.equal(p.payload.state.player.hp,69);assert.equal(JSON.stringify(s),before);
 }
 assert.equal(createTurnSync().prepare(s,'길가의 꽃을 본다.').payload.state.turn_facts.recovery_wire,undefined);
});

test('quoted treatment and service can settle together once, capped by real HP and preserving injury memory',()=>{
 const s=economyState();s.player.hp=69;s.gameState.events=['왼팔 교상'];const o=offer();o.items=[];o.services=[{id:'care',service:'herbal_treatment',cost:80,basis:'합성 검사 진료 견적',hp_restore:50,inputs:[],outputs:[]}];
 const sc=scene(s,[event('offer',{offer:o}),event('service',{offer_id:o.id,service_id:'care'})]);apply(s,sc);
 assert.equal(s.player.hp,s.player.maxHp);assert.equal(s.wallet_copper,420);assert.equal(s.world_engine.transactions.length,1);assert.deepEqual(s.gameState.events,['왼팔 교상']);
 apply(s,sc);assert.equal(s.wallet_copper,420);assert.equal(s.world_engine.transactions.length,1);
});

test('failed treatment payment cannot heal or partially register an offer',()=>{
 const s=economyState();s.player.hp=69;const before=structuredClone(s),o=offer();o.services=[{id:'care',service:'herbal_treatment',cost:501,basis:'합성 검사 진료 견적',hp_restore:10}];
 assert.throws(()=>apply(s,scene(s,[event('offer',{offer:o}),event('service',{offer_id:o.id,service_id:'care'})])),/부족/);assert.deepEqual(s,before);
});

test('clinic service needs its actual venue and a corrected scene settles atomically',()=>{
 const s=economyState();s.player.hp=69;const before=structuredClone(s),o=offer();o.venue_name='검증 장터 임시 진료소';o.items=[];o.services=[{id:'care',service:'herbal_treatment',cost:80,basis:'합성 진료 견적',hp_restore:20}];
 const events=[event('offer',{offer:o}),event('service',{offer_id:o.id,service_id:'care'})];
 assert.throws(()=>apply(s,scene(s,events)),/실제 거래\/시설 장소 진입 필요/);assert.deepEqual(s,before);
 const corrected=scene(s,events,{location:o.venue_name,game_state:{...s.gameState,place:o.venue_name}});apply(s,corrected);assert.equal(s.player.hp,89);assert.equal(s.wallet_copper,420);assert.equal(s.world_engine.transactions.length,1);
 const p=createTurnSync().prepare(s,'상처를 치료받는다.');assert.ok(p.payload.state.turn_facts.recovery_wire.completion.includes('game_state.place와 scene.location은 offer.venue_name 또는 venue_id와 정확히 일치'));
});

test('healer profession mentions keep social and candidate context without care protocols while mixed care and fees retain them',()=>{
 const s=economyState();s.gameState.region='W1';s.scene={scene_id:'social',npc:{id:'ER-NPC-057',speaker:'마야 로웬',outfit:'none',emotion:'base'},cast:[],dialogue:[],choices:[]};const before=structuredClone(s);
 for(const action of ['치료사가 누구인지 묻는다.','치료사분들은 조용할 때 쉴 틈이 있나요?','치료사의 이름을 물으며 인사한다.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.trade,false,action);assert.equal(p.payload.state.turn_facts.recovery_wire,undefined);assert.ok(p.payload.state.npc_catalog.nearby_npcs.some(n=>n.id==='ER-NPC-057'));assert.ok(actionPrompt(s,action,'social',{compact:true}).includes('voices'));}
 for(const action of ['치료사에게 팔의 상처를 치료받는다.','치료사에게 진료를 요청한다.','치료사 비용을 물어본다.','치료사에게 처치를 받는다.','치료소를 찾는다.']){const p=createTurnSync().prepare(s,action);assert.ok(p.payload.state.turn_facts.recovery_wire,action);assert.equal(p.domains.combat,false,action);}
 assert.deepEqual(s,before);
});

test('ordinary meal quotes and consumed meals settle once without inventory or recovery and reject unapproved healing',()=>{
 const s=economyState();s.player.hp=69;const before=structuredClone(s),o=offer();o.items=[];o.services=[{id:'dinner',service:'simple_meal',cost:20,basis:'현장 수프와 빵 제공 견적',inputs:[],outputs:[]}];
 const quote=scene(s,[event('offer',{offer:o})]);apply(s,quote);assert.equal(s.wallet_copper,500);assert.equal(s.player.hp,69);assert.deepEqual(s.inventory,before.inventory);
 const meal=scene(s,[event('service',{offer_id:o.id,service_id:'dinner'})]);apply(s,meal);assert.equal(s.wallet_copper,480);assert.equal(s.player.hp,69);assert.deepEqual(s.inventory,before.inventory);const done=structuredClone(s);apply(s,meal);assert.deepEqual(s,done);
 const invalid=structuredClone(o);invalid.id='invalid-meal';invalid.services[0].hp_restore=10;const unchanged=structuredClone(s);assert.throws(()=>apply(s,scene(s,[event('offer',{offer:invalid})])),/회복 서비스 제한/);assert.deepEqual(s,unchanged);
 invalid.services[0].hp_restore=undefined;invalid.services[0].outputs=[{id:'ER-SUP-WARM-CLOTH',quantity:1}];assert.throws(()=>apply(s,scene(s,[event('offer',{offer:invalid})])),/소비 식사 물품 이전 금지/);assert.deepEqual(s,unchanged);
 const p=createTurnSync().prepare(before,'여관에서 저녁 식사 가격을 묻는다');assert.ok(p.payload.state.turn_facts.recovery_wire.price_baselines.some(x=>x.id==='simple_meal'));assert.deepEqual(before.player.hp,69);
});

test('a night begun within the quote deadline settles next morning but cannot backdate expired admission or ordinary trades',()=>{
 const s=economyState();s.gameState.date='650-07-30';s.gameState.time='18:00';const o=offer();o.items=[];o.valid_until='650-07-30';apply(s,scene(s,[event('offer',{offer:o})]));const before=structuredClone(s);
 const nextDay={...s.gameState,date:'650-08-01',time:'07:00'};
 assert.throws(()=>apply(s,scene(s,[event('service',{offer_id:o.id,service_id:'inn'})],{game_state:nextDay,time:'07:00'})),/견적 기한/);assert.deepEqual(s,before);
 const overnight=scene(s,[event('service',{offer_id:o.id,service_id:'inn',started_on:'650-07-30'})],{game_state:nextDay,time:'07:00'});apply(s,overnight);assert.equal(s.wallet_copper,400);assert.equal(s.world_engine.transactions.at(-1).started_on,'650-07-30');const done=structuredClone(s);apply(s,overnight);assert.deepEqual(s,done);
 assert.throws(()=>apply(s,scene(s,[event('service',{offer_id:o.id,service_id:'inn',started_on:'650-07-30'})])),/숙박 시작일/);assert.deepEqual(s,done);
 assert.throws(()=>apply(s,scene(s,[event('trade',{offer_id:o.id,item_id:'bread',quantity:1,direction:'buy',started_on:s.gameState.date})])),/숙박 시작일/);assert.deepEqual(s,done);
 const p=createTurnSync().prepare(before,'여관 개인실에서 다음 날 아침까지 잠을 잔다');assert.ok(p.payload.state.turn_facts.recovery_wire.completion.includes('service.started_on'));assert.deepEqual(before.gameState.date,'650-07-30');
});
