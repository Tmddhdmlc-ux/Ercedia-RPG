import test from 'node:test';
import assert from 'node:assert/strict';
import {worldData} from '../web/world-data.js';
import {dungeonEncounters} from '../web/dungeon-encounter-data.js';
import {dungeonFoeSnapshot,validateDungeonZoneBattle} from '../web/dungeon-encounter-model.js';
import {normalizeBattle,validateBattleSettlement} from '../web/battle-model.js';
import {prepareBattleLoot,lootPool} from '../web/loot-model.js';
import {contextSummary,actionPrompt,normalizeScene} from '../web/scene.js';
import {emptyWorld} from '../web/world-engine.js';
import {economyState,scene,event,apply} from './economy-fixtures.js';
import {confirmedMonsterBattle} from './world-fixtures.js';
function fixture(foeId){
 const p=dungeonFoeSnapshot(foeId),s=economyState(),d=worldData.dungeons.find(d=>d.id===p.dungeon_id);s.gameState.region=d.region_id;s.gameState.place=d.id;
 s.world_engine=emptyWorld(s);s.world_engine.active_dungeon=d.id;s.world_engine.dungeons[d.id]={discovered:true,run_id:'test-run',zone_id:p.allowed_zone_ids.at(-1),resolved:[],evidence:[],clears:0,claimed:false,retreated:false,history:[]};
 const f=confirmedMonsterBattle(s,{monsterId:p.base_monster_id,battleId:'encounter-'+foeId}),enemy=f.battle.participants[1];
 Object.assign(enemy,{name:p.name,dungeon_foe_id:p.id,rank:p.rank,level:p.level,stats:p.stats,hp:p.hp,maxHp:p.hp,mp:p.mp,maxMp:p.mp,speed:p.speed,level_hp_bonus:p.level_hp_bonus,creature_multiplier:p.creature_multiplier,skills:p.skills});
 const damage=f.battle.events[0].calculation.base_roll+Math.floor(.65*s.player.strength+.2*s.player.dexterity);let hp=p.hp;f.battle.events=[];
 while(hp>0){const dealt=Math.min(hp,damage);hp-=dealt;f.battle.events.push({id:'strike-'+f.battle.events.length,actor:'player',target:enemy.id,kind:'attack',result:'hit',skill_id:null,damage:dealt,mp_cost:0,actor_hp_after:s.player.hp,actor_mp_after:s.player.mp,target_hp_after:hp,target_mp_after:p.mp,narration:'합성 검사 공격',calculation:{base_roll:20,realm_multiplier:1,context_multiplier:1,defense:0}});}
 f.battle.outcome.resources[1].mp=p.mp;f.battle.outcome.loot_mode='per_kill_v1';
 return {s,d,p,raw:scene(s,[],{battle:f.battle,player:f.player,inventory:f.inventory})};
}
test('26 individual dungeon themes and 52 distinct registered foes remain linked to all 108 zones',()=>{
 assert.equal(dungeonEncounters.profiles.length,52);assert.equal(new Set(dungeonEncounters.profiles.map(p=>p.name)).size,52);
 assert.equal(new Set(worldData.dungeons.map(d=>d.encounter_profile.theme)).size,26);assert.equal(worldData.dungeons.reduce((n,d)=>n+d.zones.length,0),108);
 for(const d of worldData.dungeons){assert.ok(d.zones.find(z=>z.type==='boss').encounter_ids.includes(d.encounter_profile.boss_id));assert.ok(d.zones.find(z=>z.type==='combat').encounter_ids.includes(d.encounter_profile.elite_id));}
});
test('all 52 foe stats pass actual combat normalization and settlement, without changing species canon',()=>{
 for(const p of dungeonEncounters.profiles){const f=fixture(p.id),normalized=normalizeScene(f.raw);validateBattleSettlement(normalized,f.s);assert.equal(normalizeBattle(normalized.battle).participants[1].dungeon_foe_id,p.id);}
});
test('wrong dungeon, spawn zone and altered registered stats reject a foe battle',()=>{
 const f=fixture('DUN-W1-01-BOSS'),sc=normalizeScene(f.raw);let s=structuredClone(f.s);s.world_engine.active_dungeon='DUN-W2-01';assert.throws(()=>validateBattleSettlement(sc,s),/탐험/);
 s=structuredClone(f.s);s.world_engine.dungeons[f.d.id].zone_id=f.d.entrance_zone_id;assert.throws(()=>validateBattleSettlement(sc,s),/출현/);
 sc.battle.participants[1].stats.strength++;assert.throws(()=>validateBattleSettlement(sc,f.s),/능력치/);
});
test('a generic dead monster cannot clear a named boss; actual named kill can resolve the zone',()=>{
 const f=fixture('DUN-W1-01-BOSS'),b=normalizeBattle(f.raw.battle),zone=f.d.zones.find(z=>z.type==='boss');validateDungeonZoneBattle(f.d,zone,b);
 const wrong=structuredClone(b);delete wrong.participants[1].dungeon_foe_id;assert.throws(()=>validateDungeonZoneBattle(f.d,zone,wrong),/보스/);wrong.outcome.loot_mode=undefined;assert.doesNotThrow(()=>validateDungeonZoneBattle(f.d,zone,wrong));
 f.s.battleApplied=[b.battle_id];f.s.battlePlayback={done:true,scene:{battle:b}};apply(f.s,scene(f.s,[event('resolve_zone',{dungeon_id:f.d.id,zone_id:zone.id,battle_id:b.battle_id})]));assert.equal(f.s.world_engine.dungeons[f.d.id].boss_battle_id,b.battle_id);
});
test('boss and elite loot keep one roll per corpse and use their registered threat cap',()=>{
 const f=fixture('DUN-E2-02-BOSS'),sc=normalizeScene(f.raw);assert.ok(lootPool(f.p.base_monster_id,f.d.id,'epic',f.p.id).length);
 const values=[7971,1,1],next=prepareBattleLoot(f.s,sc,{roll:()=>values.shift()});assert.equal(next.battle.outcome.loot_rolls.length,1);assert.equal(next.battle.outcome.loot_rolls[0].dungeon_foe_id,f.p.id);assert.equal(next.battle.outcome.items_added.length,1);validateBattleSettlement(next,f.s);
});
test('local GM context includes only regional foes and sends dungeon, loot and crafting instructions',()=>{
 const s=economyState(),ctx=contextSummary(s);assert.equal(ctx.dungeon_encounters.profiles.length,4);assert.ok(ctx.dungeon_encounters.profiles.every(p=>p.dungeon_id.startsWith('DUN-W5-')));
 const prompt=actionPrompt(s,'던전 탐색','request');for(const term of ['[지역 던전]','[처치별 전리품]','[대장간 제작]'])assert.ok(prompt.includes(term));
});
test('an invented boss technique or changed cost cannot enter a registered encounter',()=>{
 const f=fixture('DUN-W1-01-BOSS'),sc=normalizeScene(f.raw);sc.battle.participants[1].skills[0].mp_cost++;assert.throws(()=>validateBattleSettlement(sc,f.s),/고유 기술/);
});
test('already paid boss items do not block later clear XP and are never paid twice',()=>{
 const f=fixture('DUN-W1-01-BOSS'),values=[1,1,1],next=prepareBattleLoot(f.s,normalizeScene(f.raw),{roll:()=>values.shift()});
 f.s.inventory=next.inventory;f.s.battleApplied=[next.battle.battle_id];f.s.battlePlayback={done:true,scene:next};const run=f.s.world_engine.dungeons[f.d.id];run.resolved=f.d.zones.map(z=>z.id);run.boss_battle_id=next.battle.battle_id;
 const before=structuredClone(f.s.inventory),raw=scene(f.s,[event('clear_dungeon',{dungeon_id:f.d.id,battle_id:next.battle.battle_id})]);apply(f.s,raw);assert.deepEqual(f.s.inventory,before);assert.ok(f.s.player.xp>0);assert.equal(f.s.world_engine.dungeons[f.d.id].clears,1);apply(f.s,raw);assert.deepEqual(f.s.inventory,before);
});
