// Only public display fields are accepted; lore secrets never enter this card.
import {mapData} from './map-data.js';
export function normalizeNPCProfile(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('npc.profile은 공개 인물 정보 객체여야 합니다.');
  const profile={};
  if(raw.location_id!==undefined){if(!mapData.locations.some(p=>p.id===raw.location_id))throw Error('등록되지 않은 NPC 지역입니다.');profile.location_id=raw.location_id;}
  if(['none','basic','expert','hyper','master'].includes(raw.realm))profile.realm=raw.realm;
  for(const key of ['name','affiliation','rank','interestText'])if(typeof raw[key]==='string')profile[key]=raw[key].trim().slice(0,160);
  for(const key of ['level','strength','dexterity','intelligence','constitution','manaStat','hp','maxHp','mp','maxMp','interest','speed','levelHpBonus']){
    if(raw[key]===null)profile[key]=null;
    else if(typeof raw[key]==='number'&&Number.isFinite(raw[key]))profile[key]=Math.min(['interest','level'].includes(key)?100:999999999,Math.max(key==='level'?1:0,Math.floor(raw[key])));
  }
  return profile;
}
