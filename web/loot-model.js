import {dropData} from './loot-data.js';
import {dungeonFoe} from './dungeon-encounter-model.js';
import {catalogItem,itemCategory,itemDescription,lootCatalog} from './item-catalog.js';
import {normalizeInventory} from './inventory.js';
import {wallet,splitCopper} from './wallet.js';
const check=(ok,message)=>{if(!ok)throw Error('전리품 검증: '+message);};
export function secureLootRoll(max){
  check(Number.isSafeInteger(max)&&max>0&&max<=1000000,'추첨 범위');
  const limit=Math.floor(4294967296/max)*max,buffer=new Uint32Array(1);let value;
  do{globalThis.crypto.getRandomValues(buffer);value=buffer[0];}while(value>=limit);
  return value%max+1;
}
export function lootCategory(roll){check(Number.isInteger(roll)&&roll>=1&&roll<=10000,'1~10000 판정값');return dropData.rules.categories.find(c=>roll>=c.min&&roll<=c.max);}
export function lootPool(monsterId,dungeonId,category,foeId=null){
  const monster=dropData.monsterPools[monsterId];check(monster,'등록된 마수 전리품 원본 필요');
  // Species-specific materials; regional equipment/books from the actual dungeon.
  if(['common','special'].includes(category))return monster[category];
  const foe=foeId?dungeonFoe(foeId):null;if(foeId)check(foe?.base_monster_id===monsterId&&foe.dungeon_id===dungeonId,'던전 개체 전리품 원본');
  const rank=foe?.rank||lootCatalog.monsters.find(m=>m.monster_id===monsterId).rank,limit=dropData.rules.rank_limits[rank],rarities=['하급','중급','고급','유니크','에픽'];
  return (dropData.dungeonPools[dungeonId]?.[category]||monster[category]||[]).filter(entry=>{const cat=catalogItem(entry.id);return cat&&cat.required_level<=limit.max_item_level&&rarities.indexOf(cat.rarity)<=rarities.indexOf(limit.max_rarity);});
}
export function validateLootRolls(battle){
  const rolls=battle.outcome.loot_rolls;
  if(rolls===undefined)return;
  check(battle.outcome.loot_mode==='per_kill_v1'&&Array.isArray(rolls),'처치별 판정 구조');
  const killed=battle.participants.filter(p=>p.side==='enemy'&&p.role==='monster'&&battle.outcome.resources.find(r=>r.id===p.id)?.hp===0);
  check(rolls.length===killed.length&&new Set(rolls.map(r=>r.participant_id)).size===rolls.length,'처치 개체마다 정확히 1회 판정');
  const quantities=new Map();
  for(const r of rolls){
    const actor=killed.find(p=>p.id===r.participant_id);check(actor&&(actor.catalog_id||actor.id)===r.monster_id,'처치한 마수 ID');
    const category=lootCategory(r.roll);check(category.id===r.category,'추첨 범위·분류 불일치');
    check((r.dungeon_foe_id||null)===(actor.dungeon_foe_id||null),'개체 전리품 증빙 일치');
    const pool=lootPool(r.monster_id,r.dungeon_id,r.category,r.dungeon_foe_id);
    if(!r.item_id){check(!pool.length||r.recoverable===false,'획득 후보를 임의로 버리지 마세요.');check(r.quantity===0,'미획득 수량');}
    else {const item=pool.find(i=>i.id===r.item_id);check(item&&r.recoverable!==false&&Number.isInteger(r.quantity)&&r.quantity>=item.min_qty&&r.quantity<=item.max_qty,'후보·재료 수량');const cat=catalogItem(r.item_id);check(cat,'등록 아이템');quantities.set(cat.name,(quantities.get(cat.name)||0)+r.quantity);}
  }
  for(const [name,count]of quantities)check(battle.outcome.items_added.filter(i=>i.name===name).reduce((sum,i)=>sum+i.quantity,0)>=count,'전리품의 종료 보상 누락');
}
export function prepareBattleLoot(state,scene,{roll=secureLootRoll}={}){
  const battle=scene.battle;if(!battle||battle.outcome.loot_mode!=='per_kill_v1'||battle.outcome.loot_rolls!==undefined)return scene;
  check(!scene.system_events?.some(e=>e.kind==='loot'),'처치별 자동 전리품과 기존 loot 사건 중복 금지');
  const next=JSON.parse(JSON.stringify(scene)),b=next.battle;
  check(!b.outcome.items_added.length,'처치별 모드의 아이템 보상은 엔진이 생성합니다. 사전 아이템 보상을 넣지 마세요.');
  check(Array.isArray(next.inventory),'전투 종료 인벤토리 필요');
  const dungeonId=state.world_engine?.active_dungeon||null;
  const recovered=b.outcome.winner==='allied'&&b.outcome.termination!=='escape';
  b.outcome.loot_rolls=[];
  for(const actor of b.participants.filter(p=>p.side==='enemy'&&p.role==='monster'&&b.outcome.resources.find(r=>r.id===p.id)?.hp===0)){
    const monsterId=actor.catalog_id||actor.id;
    const value=roll(10000),category=lootCategory(value),pool=lootPool(monsterId,dungeonId,category.id,actor.dungeon_foe_id);
    const entry=recovered&&pool.length?pool[roll(pool.length)-1]:null;
    const quantity=entry?entry.min_qty+roll(entry.max_qty-entry.min_qty+1)-1:0;
    const receipt={participant_id:actor.id,monster_id:monsterId,dungeon_id:dungeonId,roll:value,category:category.id,item_id:entry?.id||null,quantity,recoverable:recovered};
    if(actor.dungeon_foe_id)receipt.dungeon_foe_id=actor.dungeon_foe_id;
    b.outcome.loot_rolls.push(receipt);if(!entry)continue;
    const cat=catalogItem(entry.id),owned=next.inventory.find(i=>(i.catalog_id||i.id)===cat.id);
    if(owned){check(owned.quantity+quantity<=999999,'보관 수량 한도');owned.quantity+=quantity;}
    else {check(next.inventory.length<32,'가방이 가득 찼습니다. 전리품 정산 공간이 필요합니다.');next.inventory.push({id:cat.id,name:cat.name,quantity,category:itemCategory(cat),description:itemDescription(cat),...(cat.rarity?{rarity:cat.rarity}:{})});}
    const reward=b.outcome.items_added.find(i=>i.name===cat.name);if(reward)reward.quantity+=quantity;else {check(b.outcome.items_added.length<32,'전투 획득 목록 한도');b.outcome.items_added.push({id:cat.id,name:cat.name,quantity,...(cat.rarity?{rarity:cat.rarity}:{})});}
  }
  next.inventory=normalizeInventory(next.inventory);validateLootRolls(b);return next;
}
export function lootContext(){return {source:'items/drop_rules.json',...dropData.rules,dungeon_pools:dropData.dungeonPools};}
export function makeLootPopup(state,scene,balanceBefore){
  return {battle_id:scene.battle.battle_id,copper:Math.max(0,wallet(state)-balanceBefore),items:scene.battle.outcome.items_added.map(i=>({id:i.id||null,name:i.name,quantity:i.quantity,...(i.rarity?{rarity:i.rarity}:{})})),pending:true};
}
export function coinLootLabel(amount){const parts=splitCopper(amount),labels={gold:'금',silver:'은',copper:'동'};return Object.entries(parts).filter(([,n])=>n).map(([key,n])=>n.toLocaleString('ko-KR')+labels[key]).join(' ')+' 획득!';}
