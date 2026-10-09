import test from 'node:test';
import assert from 'node:assert/strict';
import {createTurnSync} from '../web/turn-sync.js';
import {actionPrompt} from '../web/scene.js';
import {worldData} from '../web/world-data.js';
import {economyState,scene,event,offer,apply} from './economy-fixtures.js';

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
