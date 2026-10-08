import test from 'node:test';
import assert from 'node:assert/strict';
import {battleFixture} from './battle-fixtures.js';
import {normalizeScene,actionPrompt} from '../web/scene.js';
import {normalizeBattle,validateBattleSettlement,battleFrame,battleGrowth,battleIsActive} from '../web/battle-model.js';
import {normalize,defaults} from '../web/state.js';
import {createGameBridge} from '../integration/game-bridge.js';
const clone=v=>JSON.parse(JSON.stringify(v));
test('all five battle entry scenarios normalize and settle against current saved stats',()=>{for(const trigger of ['dialogue','travel','dungeon','duel','ambush']){const f=battleFixture(trigger),s=normalizeScene(f.scene);assert.equal(validateBattleSettlement(s,f.state),true);assert.equal(s.battle.trigger,trigger);}});
test('timeline seeks are immutable and yield identical final HP/MP regardless of order',()=>{const b=normalizeBattle(battleFixture().scene.battle),before=JSON.stringify(b),final=battleFrame(b,b.events.length);for(const count of [0,8,3,1,7,8,4,8]){const frame=battleFrame(b,count);if(count===8)assert.deepEqual(frame,final);}assert.equal(JSON.stringify(b),before);assert.deepEqual(final,{player:{hp:54,mp:100},serin:{hp:0,mp:93}});});
test('damage, mana, dead actors, evade damage and outcome contradictions are refused before play',()=>{
  for(const mutate of [b=>b.events[0].damage=1,b=>b.events[3].mp_cost=8,b=>b.events[5].actor_hp_after=0,b=>b.events[4].damage=55,b=>b.outcome.resources[0].hp=99,b=>b.outcome.winner='enemy',b=>b.events.push({...b.events[0],id:'after-death'}),b=>b.events[2].calculation.realm_multiplier=1.25]){
    const b=clone(battleFixture().scene.battle);mutate(b);assert.throws(()=>normalizeBattle(b),/전투 검증/);
  }
});
test('speed and counter proof, held skills and registered art are mandatory',()=>{
  for(const mutate of [b=>b.participants[0].speed=90,b=>b.initiative.reason='',b=>b.events[1].result='dodge',b=>b.events[3].skill_id='not-held',b=>b.participants[0].art={id:'serin',outfit:'armor',emotion:'base'},b=>b.participants[1].art={id:'other',outfit:'armor',emotion:'base'},b=>b.enlightenment_progress=90]){const b=clone(battleFixture().scene.battle);mutate(b);assert.throws(()=>normalizeBattle(b),/전투 검증/);}
});
test('settlement rejects changed current stats, item rewards, injury omission and XP duplication',()=>{
  const f=battleFixture(),scene=normalizeScene(f.scene);
  for(const mutate of [s=>s.player.strength++,s=>s.player.hp--,s=>s.player.xp++,s=>s.inventory[0].quantity++,s=>s.game_state.events=[],s=>s.player.skills.push({name:'무단 기술'}),s=>s.player.battleModifiers={weapon_attack:999}]){const bad=clone(scene);mutate(bad);assert.throws(()=>validateBattleSettlement(bad,f.state),/전투 검증/);}
  const before=clone(f.state);before.player.hp--;assert.throws(()=>validateBattleSettlement(scene,before));
});
test('legacy saves stay exact and active, paused and completed battle saves roundtrip',()=>{
  assert.deepEqual(normalize(defaults()),defaults());const f=battleFixture(),s=normalizeScene(f.scene);
  for(const done of [false,true]){const save={...f.state,battleApplied:done?[s.battle.battle_id]:[],battlePlayback:{scene:s,index:done?8:3,speed:.5,paused:!done,done,replay:false}};assert.deepEqual(normalize(save),save);assert.equal(battleIsActive(save),!done);}
});
test('bridge player and inventory mutations are blocked until playback ends',()=>{
  const f=battleFixture(),state={...f.state,battlePlayback:{done:false}};const before=clone(state);const bridge=createGameBridge(state,{render(){},persist(){}});bridge.updatePlayer({hp:1});bridge.updateInventory([]);assert.deepEqual(state,before);
});
test('level reward carries XP, preserves damage and grants unallocated growth points',()=>{
  const f=battleFixture();f.state.player.xp=95;const growth=battleGrowth(f.state.player,45);assert.equal(growth.level,2);assert.equal(growth.xp,40);assert.equal(growth.unspentStatPoints,3);assert.equal(growth.maxHp,103);
  f.scene.player={...f.state.player,...growth,hp:57};delete f.scene.player.hpIncrease;validateBattleSettlement(normalizeScene(f.scene),f.state);
});
test('group participant resources extend without assuming a duel',()=>{
  const f=battleFixture(),ally=clone(f.scene.battle.participants[0]);ally.id='ally';ally.role='npc';ally.name='검증용 동료';f.scene.battle.participants.push(ally);f.scene.battle.outcome.resources.push({id:'ally',hp:100,mp:100});assert.equal(normalizeBattle(f.scene.battle).participants.length,3);
});
test('hyper cutin requires a held ability and never applies knight multipliers to spell damage',()=>{
  const f=battleFixture(),b=f.scene.battle,p=b.participants[0];p.realm='hyper';p.skills=[{id:'unique',name:'검증용 고유능력',kind:'unique',mp_cost:10,power:20,int_coefficient:.5,mana_coefficient:.5,basis:'검증만을 위한 사전 확정 능력'}];
  b.events=[{id:'u1',actor:'player',target:'serin',kind:'unique',result:'hit',skill_id:'unique',damage:30,mp_cost:10,actor_hp_after:100,actor_mp_after:90,target_hp_after:70,target_mp_after:100,narration:'고유능력 컷인 검증',calculation:{realm_multiplier:1,context_multiplier:1,defense:0}}];b.initiative={actor_id:'player',reason:'동률에서 사전 대비 우위'};b.outcome={...b.outcome,termination:'surrender',reason:'상대가 비무 종료에 동의',resources:[{id:'player',hp:100,mp:90},{id:'serin',hp:70,mp:100}]};assert.equal(normalizeBattle(b).events[0].kind,'unique');b.participants[0].realm='basic';assert.throws(()=>normalizeBattle(b),/고유능력/);
});
test('action prompt requests battle evidence and a final snapshot using the existing scene envelope',()=>{const f=battleFixture(),prompt=actionPrompt(f.state,'도적 조우','r1');assert.ok(prompt.includes('BATTLE_SCHEMA.md'));assert.ok(prompt.includes('COMBAT_GROWTH.md'));assert.ok(prompt.includes('ercedia_scene'));});
