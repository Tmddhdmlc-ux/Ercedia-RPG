import {registeredNPCArt,effectivePlacement,placedNPCs} from './character-art.js';
import {catalogData} from './catalog-data.js';
import {normalizeNPCProfile} from './npc-profile.js';
export const npcCatalog=catalogData.npcs;
export function npcRankLabel(p){const rank=p.rank||'미정';if(p.role==='monster')return '마수 등급 · '+rank;if(p.realm&&p.realm!=='none')return rank.includes('나이트')?rank:rank+' · '+({basic:'베이직',expert:'익스퍼트',hyper:'하이퍼',master:'마스터'})[p.realm]+' 나이트';return rank.includes('서클')?rank:rank+' · 전투 경지 미정';}
export function findNPC(id){return npcCatalog.find(p=>p.id===id||p.name===id)||null;}
function knownOverrides(raw,base){
  const normalized=normalizeNPCProfile(raw||{});
  // Legacy unknown values are absence of knowledge, not a command to erase canon.
  const result=Object.fromEntries(Object.entries(normalized).filter(([,v])=>v!==null));
  if(base?.id==='serin'&&base.location_id==='W3'&&['써니 빌리지 순찰','써니 빌리지 (순찰 활동; 정식 국가 소속 미확정)','솔브린 마을 순찰','솔브린 마을 (순찰 활동; 정식 국가 소속 미확정)'].includes(result.affiliation))delete result.affiliation;
  const numeric=['strength','dexterity','intelligence','constitution','manaStat'];
  if(normalized.level===null&&numeric.every(k=>normalized[k]==null)&&normalized.levelHpBonus===0)delete result.levelHpBonus;
  return result;
}
export function resolveNPC(state,id,profile={}){const base=findNPC(id);if(!base)return null;const p={...base,...knownOverrides(profile,base),...knownOverrides(state.npcStates?.[base.id],base),id:base.id};for(const [value,max] of [['hp','maxHp'],['mp','maxMp']])if(typeof p[value]==='number'&&typeof p[max]==='number')p[value]=Math.min(p[value],p[max]);return p;}
export function npcSnapshot(state,id){const p=resolveNPC(state,id,state.scene?.npc?.id===id?state.scene.npc.profile||{}:{});if(!p)return null;return {...p,stats:{strength:p.strength,dexterity:p.dexterity,intelligence:p.intelligence,constitution:p.constitution,manaStat:p.manaStat},level_hp_bonus:p.levelHpBonus,art:p.id==='serin'?{id:'serin',outfit:state.outfit,emotion:state.expression}:registeredNPCArt(p.id),placement:effectivePlacement(p.id,state)};}
export function updateNPC(state,id,profile){const base=findNPC(id);if(!base)throw Error('등록되지 않은 인물입니다.');state.npcStates={...state.npcStates,[base.id]:{...state.npcStates?.[base.id],...knownOverrides(profile)}};}
export function npcContext(state){const id=state.scene?.npc?.id||(state.character?'serin':null),changes={};for(const [npcId,profile]of Object.entries(state.npcStates||{})){const base=findNPC(npcId),delta=Object.fromEntries(Object.entries(profile).filter(([key,value])=>value!==null&&value!==base?.[key]));if(Object.keys(delta).length)changes[npcId]=delta;}return {catalog_digest:catalogData.digest,current_npc:id?npcSnapshot(state,id):null,npc_changes:changes,sources:catalogData.sources,art_registry:'characters/art_registry.json',placements:'characters/npc_placements.json',nearby_npcs:placedNPCs(state.gameState?.region||resolveNPC(state,id)?.location_id,null,state).map(p=>({id:p.id,name:findNPC(p.id)?.name,location_id:p.location_id,faction_id:p.faction_id}))};}
