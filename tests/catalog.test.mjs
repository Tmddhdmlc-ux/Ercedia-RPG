import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogData} from '../web/catalog-data.js';
import {npcCatalog,resolveNPC,npcSnapshot,updateNPC} from '../web/npc-model.js';
import {defaults,normalize} from '../web/state.js';
import {normalizeScene,contextSummary} from '../web/scene.js';
import {createGameBridge} from '../integration/game-bridge.js';
import {battleFixture} from './battle-fixtures.js';
import {validateBattleSettlement,normalizeBattle} from '../web/battle-model.js';
test('all 138 source NPC stats map exactly and only public allowlisted fields ship',()=>{
  for(const [path,list] of [['characters/npc_roster_100.json','characters'],['characters/core_cast_stats_38.json','roster']])for(const p of JSON.parse(readFileSync(path))[list]){const ui=resolveNPC(defaults(),p.id);assert.equal(ui.strength,p.stats.strength);assert.equal(ui.dexterity,p.stats.agility);assert.equal(ui.manaStat,p.stats.mana);assert.equal(ui.maxHp,p.stats.max_hp);assert.equal(ui.level,p.level);assert.equal(ui.speed,p.combat.speed);assert.ok(!Object.hasOwn(ui,'notes'));assert.ok(!Object.hasOwn(ui,'personality_seed'));}
  assert.equal(npcCatalog.length,163);assert.equal(catalogData.regional.dungeons.length,26);assert.equal(catalogData.regional.facilities.length,26);
});
test('NPC changes persist independently without healing or modifying source stats or legacy saves',()=>{
  const state=defaults(),base=resolveNPC(state,'ER-NPC-001');assert.deepEqual(normalize(state),state);updateNPC(state,base.id,{hp:base.hp-10,interest:40,secret:'ignored'});assert.equal(resolveNPC(state,base.id).hp,base.hp-10);assert.deepEqual(normalize(state),state);assert.equal(resolveNPC(defaults(),base.id).hp,base.hp);assert.equal(resolveNPC(state,base.id).secret,undefined);assert.deepEqual(npcSnapshot(state,base.id).art,{id:base.id,outfit:'none',emotion:'base'});
});
test('non-Serin registered scenes use none art and preserve five public stats',()=>{const raw=battleFixture().scene;delete raw.battle;raw.npc={id:'ER-NPC-001',outfit:'none',emotion:'base',speaker:'알윈 페르'};raw.npc_updates={'ER-NPC-001':{manaStat:18,level:30,hp:500}};const s=normalizeScene(raw);assert.equal(s.npc.id,'ER-NPC-001');assert.equal(s.npc_updates['ER-NPC-001'].manaStat,18);raw.npc.outfit='armor';assert.throws(()=>normalizeScene(raw));});
test('bridge and request context use the same GitHub NPC baseline and saved changes',()=>{const state=defaults();state.scene={npc:{id:'ER-NPC-001'},dialogue:[]};const bridge=createGameBridge(state,{render(){},persist(){}});bridge.updateNPC('ER-NPC-001',{hp:400});assert.equal(bridge.getNPC('ER-NPC-001').hp,400);assert.equal(contextSummary(state).npc_catalog.current_npc.hp,400);state.battlePlayback={done:false};bridge.updateNPC('ER-NPC-001',{hp:1});assert.equal(bridge.getNPC('ER-NPC-001').hp,400);});
test('battle refuses NPC stats that conflict with the catalog before playback',()=>{const f=battleFixture(),actor=f.scene.battle.participants[1];actor.id='ER-NPC-001';assert.throws(()=>validateBattleSettlement(f.scene,f.state),/GitHub\/현재 NPC/);});
test('new UI controls have real HTML anchors',()=>{const html=readFileSync('index.html','utf8');for(const id of ['npc-info-level','npc-info-manaStat','npc-info-source','npc-catalog-select','npc-catalog-search','regional-content-list'])assert.ok(html.includes(`id="${id}"`),id);});
test('registered monster multiplier stays separate from knight realm and validates physical loss',()=>{
  const f=battleFixture('dungeon'),npc=npcSnapshot(f.state,'ER-NPC-100'),enemy={...npc,side:'enemy',rank:npc.rank,level_hp_bonus:npc.levelHpBonus,skills:[],modifiers:{},art:null};
  const e={id:'m1',actor:enemy.id,target:'player',kind:'attack',result:'hit',skill_id:null,damage:100,mp_cost:0,actor_hp_after:enemy.hp,actor_mp_after:enemy.mp,target_hp_after:0,target_mp_after:100,narration:'검증용 피격',calculation:{base_roll:10,realm_multiplier:1,context_multiplier:1,defense:0}};
  f.scene.battle={...f.scene.battle,participants:[f.scene.battle.participants[0],enemy],events:[e],initiative:{actor_id:enemy.id,reason:''},outcome:{winner:'enemy',termination:'defeat',reason:'검증용 전투불능',xp_gain:0,items_added:[],items_consumed:[],injuries:[],resources:[{id:'player',hp:0,mp:100},{id:enemy.id,hp:enemy.hp,mp:enemy.mp}]}};
  const b=normalizeBattle(f.scene.battle);assert.equal(b.participants[1].realm,'none');assert.equal(b.participants[1].creature_multiplier,1.95);e.damage=60;assert.throws(()=>normalizeBattle(f.scene.battle),/피해 공식/);
});
