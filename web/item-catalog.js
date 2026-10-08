import {engineData} from './engine-data.js';
export const itemCatalog=[...engineData.equipment,...engineData.books,...engineData.loot.materials];
export const lootCatalog=engineData.loot;
export function catalogItem(id){return itemCatalog.find(p=>p.id===id)||null;}
export function itemCategory(item){return item.slot?'equipment':item.skill_id?'book':'material';}
export function itemIconURL(item,base){const entry=catalogItem(item?.catalog_id||item?.id);return entry?(base||'https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@'+engineData.assetCommit+'/')+entry.icon_path:null;}
export function itemDescription(item){return item.lore||item.description||item.effect_summary||'';}
export function itemDetails(item){
  if(item.slot)return ['요구 Lv.'+item.required_level+' · '+item.equip_class,Object.entries(item.stats).filter(([,v])=>v).map(([k,v])=>({strength:'근력',agility:'민첩',intelligence:'지능',constitution:'체질',mana:'마나 친화력',weapon_attack:'무기 공격력',spell_power:'주문 보정',defense:'방어',resistance:'저항',hp_bonus:'체력',mp_bonus:'마나',speed_bonus:'속도'})[k]+' +'+v).join(' / '),...item.potentials.map(p=>p.name+' · '+p.description)].filter(Boolean).join('\n');
  if(item.skill_id)return ['요구 Lv.'+item.required_level+' · '+item.required_class+(item.required_circle?' · '+item.required_circle+'서클':''),item.skill_name+' · MP '+item.base_mp_cost,item.mastery_rule].join('\n');
  return item.origin_monster_name+' · '+item.region_id+' · '+(item.quality==='rare'?'희귀 재료':'일반 재료');
}
