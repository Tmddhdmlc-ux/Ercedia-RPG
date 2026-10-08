// Synthetic GM outcomes for reproducible tests. Never imported by production.
import {npcSnapshot} from '../web/npc-model.js';
import {battleGrowth} from '../web/battle-model.js';
import {catalogItem,itemCategory,itemDescription} from '../web/item-catalog.js';
export function confirmedMonsterBattle(state,{battleId,monsterId='ER-NPC-081',xp=0,items=[]}={}){
  const source=npcSnapshot({...state,npcStates:{}},monsterId),instanceId='instance-'+battleId;
  const p=state.player,stats=Object.fromEntries(['strength','dexterity','intelligence','constitution','manaStat'].map(k=>[k,p[k]])),modifiers=p.battleModifiers||{};
  const player={id:'player',name:p.name,side:'allied',role:'player',level:p.level,rank:'검증용 일반 여행자',realm:p.realm||'none',stats,hp:p.hp,maxHp:p.maxHp,mp:p.mp,maxMp:p.maxMp,speed:p.dexterity+Math.floor(p.strength/5)+(modifiers.equipment_speed_bonus||0)+(modifiers.status_speed_bonus||0),level_hp_bonus:p.levelHpBonus||0,modifiers,skills:[],potentials:state.engine?.bonuses?.potentials||{},art:null};
  const enemy={id:instanceId,catalog_id:monsterId,name:source.name+' · 검증 개체',side:'enemy',role:'monster',level:source.level,rank:source.rank,realm:'none',stats:source.stats,hp:source.maxHp,maxHp:source.maxHp,mp:source.maxMp,maxMp:source.maxMp,speed:source.speed,level_hp_bonus:source.level_hp_bonus,modifiers:{},skills:[],creature_multiplier:source.creatureMultiplier,art:source.art};
  let hp=enemy.hp;const events=[],amount=20+Math.floor(.65*p.strength+.2*p.dexterity)+(modifiers.weapon_attack||0)+(modifiers.technique_bonus||0);
  while(hp>0){const damage=Math.min(hp,amount);hp-=damage;events.push({id:'attack-'+events.length,actor:'player',target:instanceId,kind:'attack',result:'hit',skill_id:null,damage,mp_cost:0,actor_hp_after:p.hp,actor_mp_after:p.mp,target_hp_after:hp,target_mp_after:enemy.mp,narration:'검증용 공격 · '+damage+' 피해',calculation:{base_roll:20,realm_multiplier:1,context_multiplier:1,defense:0}});}
  const growth=battleGrowth(p,xp),bag=structuredClone(state.inventory);
  for(const r of items){const entry=catalogItem(r.id),old=bag.find(i=>i.id===r.id);if(old)old.quantity+=r.quantity;else bag.push({id:r.id,name:entry.name,quantity:r.quantity,category:itemCategory(entry),description:itemDescription(entry)});}
  const finalPlayer={...p,...growth,hp:p.hp+growth.hpIncrease};delete finalPlayer.hpIncrease;
  return {battle:{battle_id:battleId,trigger:'dungeon',participants:[player,enemy],initiative:{actor_id:'player',reason:'합성 GM 검증: 상대가 대응하지 못하는 상황을 고정. 실제 전투 판정 아님.'},events,outcome:{winner:'allied',termination:'defeat',reason:'실제 재생 상태의 적 HP 0',xp_gain:xp,items_added:items.map(r=>({name:catalogItem(r.id).name,quantity:r.quantity})),items_consumed:[],injuries:[],resources:[{id:'player',hp:p.hp,mp:p.mp},{id:instanceId,hp:0,mp:enemy.mp}]}},player:finalPlayer,inventory:bag,instanceId};
}
