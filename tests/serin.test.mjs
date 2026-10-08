import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,normalize} from '../web/state.js';
import {resolveNPC,npcSnapshot,updateNPC} from '../web/npc-model.js';
import {createGameBridge} from '../integration/game-bridge.js';
import {contextSummary,normalizeScene} from '../web/scene.js';
import {validateBattleSettlement,battleFrame} from '../web/battle-model.js';
import {serinCanonFixture} from './battle-fixtures.js';
import {locationLabel} from '../web/location-label.js';

test('registered Serin stats exactly match source JSON and engine snapshot',()=>{
  const raw=JSON.parse(readFileSync('characters/serin.json')),p=npcSnapshot(defaults(),'serin');
  assert.equal(p.level,raw.level);assert.equal(p.realm,raw.realm);
  for(const [ui,source] of Object.entries({strength:'strength',dexterity:'agility',intelligence:'intelligence',constitution:'constitution',manaStat:'mana',hp:'hp',maxHp:'max_hp',mp:'mp',maxMp:'max_mp'}))assert.equal(p[ui],raw.stats[source]);
  assert.equal(p.levelHpBonus,65);assert.equal(p.speed,31);assert.equal(p.attackMin,31);assert.equal(p.attackMax,41);
});
test('null old NPC fields fall back consistently without modifying the stored save',()=>{
  const {state}=serinCanonFixture(),before=structuredClone(state),p=resolveNPC(state,'serin',state.scene.npc.profile);
  assert.equal(p.level,18);assert.equal(p.hp,330);assert.equal(p.mp,136);assert.equal(p.levelHpBonus,65);assert.equal(p.interest,41);
  const bridge=createGameBridge(state,{});assert.equal(bridge.getNPC('serin').hp,330);assert.equal(contextSummary(state).npc_catalog.current_npc.constitution,22);
  assert.deepEqual(state,before);assert.deepEqual(normalize(state),before);
});
test('injured, drained, defeated and advanced NPC values override defaults and survive reload',()=>{
  for(const hp of [297,0]){const {state}=serinCanonFixture();updateNPC(state,'serin',{hp,mp:97,strength:27,interest:53});const restored=normalize(state),p=npcSnapshot(restored,'serin');assert.equal(p.hp,hp);assert.equal(p.mp,97);assert.equal(p.strength,27);assert.equal(p.interest,53);assert.equal(p.maxHp,330);assert.deepEqual(restored,state);}
});
test('real registered Serin enters battle, changes HP by 18, and rejects mismatched stats',()=>{
  const {state,scene}=serinCanonFixture(),normalized=normalizeScene(scene);
  assert.equal(validateBattleSettlement(normalized,state),true);assert.deepEqual(battleFrame(normalized.battle,1).serin,{hp:312,mp:136});
  const bad=structuredClone(normalized);bad.battle.participants[1].stats.strength=10;assert.throws(()=>validateBattleSettlement(bad,state),/GitHub\/현재 NPC/);
  updateNPC(state,'serin',{hp:312,mp:136});assert.equal(npcSnapshot(normalize(state),'serin').hp,312);assert.equal(npcSnapshot(state,'serin').interest,41);assert.equal(npcSnapshot(state,'serin').levelHpBonus,65);
});
test('later unknown updates cannot erase a recorded injury, mana drain or relationship',()=>{
  const {state}=serinCanonFixture();updateNPC(state,'serin',{hp:297,mp:97,interest:53});updateNPC(state,'serin',{hp:null,mp:null,interest:null,level:null,levelHpBonus:0});
  const p=npcSnapshot(normalize(state),'serin');assert.equal(p.hp,297);assert.equal(p.mp,97);assert.equal(p.interest,53);assert.equal(p.levelHpBonus,65);
});
test('approved Solbrin identity replaces only obsolete placeholders while preserving campaign records',()=>{
  const {state}=serinCanonFixture();state.npcStates.serin={...state.npcStates.serin,affiliation:'써니 빌리지 (순찰 활동; 정식 국가 소속 미확정)',hp:297,mp:97};
  const before=structuredClone(state),source=JSON.parse(readFileSync('characters/serin.json')),p=npcSnapshot(state,'serin');
  assert.equal(p.affiliation,source.affiliation);assert.equal(p.location_id,'W3');assert.equal(p.hp,297);assert.equal(p.mp,97);assert.equal(p.interest,41);assert.deepEqual(state,before);
  assert.equal(contextSummary(state).location,'솔브린 마을');assert.equal(state.scene.location,'써니 빌리지');assert.equal(locationLabel('다른 장소'),'다른 장소');
  updateNPC(state,'serin',{affiliation:'게임에서 확정한 새 소속'});assert.equal(npcSnapshot(state,'serin').affiliation,'게임에서 확정한 새 소속');
});
