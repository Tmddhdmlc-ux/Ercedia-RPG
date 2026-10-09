import {dungeonEncounters} from './dungeon-encounter-data.js';
const check=(v,m)=>{if(!v)throw Error('던전 개체 검증: '+m);};
export function dungeonFoe(id){return dungeonEncounters.profiles.find(p=>p.id===id)||null;}
export function dungeonFoeSnapshot(id){const p=dungeonFoe(id);if(!p)return null;return {...p,maxHp:p.hp,maxMp:p.mp,strength:p.stats.strength,dexterity:p.stats.dexterity,intelligence:p.stats.intelligence,constitution:p.stats.constitution,manaStat:p.stats.manaStat,levelHpBonus:p.level_hp_bonus};}
export function validateDungeonFoe(actor,state){
  const p=dungeonFoe(actor.dungeon_foe_id);check(p&&actor.role==='monster'&&actor.side==='enemy'&&actor.catalog_id===p.base_monster_id,'등록 정예·보스와 원본 종 일치');
  check(state.world_engine?.active_dungeon===p.dungeon_id,'해당 던전의 실제 탐험 중에만 등장');
  check(p.allowed_zone_ids.includes(state.world_engine.dungeons[p.dungeon_id]?.zone_id),'지정 출현 구역 필요');
  check(actor.name===p.name&&actor.rank===p.rank&&actor.realm==='none','개체 이름·마수 위협등급 일치');
  for(const key of ['level','hp','mp','speed','level_hp_bonus'])check(actor[key]===p[key],'등록 수치 '+key);
  check(actor.maxHp===p.hp&&actor.maxMp===p.mp&&actor.creature_multiplier===p.creature_multiplier,'등록 최대 자원·마수 배율');
  for(const key of Object.keys(p.stats))check(actor.stats[key]===p.stats[key],'등록 능력치 '+key);
  check(Object.values(actor.modifiers).every(v=>v===0),'등록되지 않은 개체 보정 금지');
  for(const skill of actor.skills){const known=p.skills.find(s=>s.id===skill.id);check(known&&['name','kind','mp_cost','technique_bonus'].every(k=>skill[k]===known[k])&&skill.base_power===undefined&&skill.magic_power===undefined,'등록 고유 기술·비용·위력 일치');}
}
export function validateDungeonZoneBattle(d,zone,battle){
  if(!d.encounter_profile||battle.outcome.loot_mode!=='per_kill_v1')return; // Existing recorded legacy battles remain settleable.
  if(!['boss','miniboss','midboss'].includes(zone.type))return;
  const required=zone.type==='boss'?d.encounter_profile.boss_id:d.encounter_profile.elite_id;
  const actors=battle.participants.filter(p=>p.side==='enemy'&&p.dungeon_foe_id===required);
  check(actors.length===1&&battle.outcome.resources.some(r=>r.id===actors[0].id&&r.hp===0),'구역의 실제 지정 '+(zone.type==='boss'?'보스':'정예')+' 처치 필요');
}
export function dungeonEncounterContext(state){const id=state.world_engine?.active_dungeon,region=state.gameState?.region;return {source:'locations/dungeon_encounters.json',profiles:dungeonEncounters.profiles.filter(p=>id?p.dungeon_id===id:p.dungeon_id.startsWith('DUN-'+region+'-')),rule:'정예·보스는 dungeon_foe_id와 base_monster_id를 catalog_id로 기록하고 등록 수치로 전투한다. 예고 동작·지형·대응을 서술하며 자동 적중·자동 약점 성공을 금지. 새 보스와 미지 구역은 요약 생략 금지.'};}
