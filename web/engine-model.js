import {engineData} from './engine-data.js';
import {battleGrowth} from './battle-model.js';
export const statKeys=['strength','dexterity','intelligence','constitution','manaStat'];
export const statLabels={strength:'근력',dexterity:'민첩',intelligence:'지능',constitution:'체질',manaStat:'마나 친화력'};
const mapping={strength:'strength',dexterity:'agility',intelligence:'intelligence',constitution:'constitution',manaStat:'mana'};
export const copyEngine=value=>JSON.parse(JSON.stringify(value));
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function engineItem(id){return engineData.equipment.find(i=>i.id===id)||engineData.books.find(i=>i.id===id)||null;}
export function normalizeEngine(raw){
  if(!raw||raw.version!==1||JSON.stringify(raw).length>200000)return null;
  const e=copyEngine(raw);e.applied=Array.isArray(e.applied)?e.applied.filter(id=>typeof id==='string').slice(0,10000):[];e.equipped=e.equipped||{};e.instances=Array.isArray(e.instances)?e.instances.slice(0,128):[];e.learned=Array.isArray(e.learned)?e.learned.slice(0,70):[];e.bonuses=e.bonuses||{};return e;
}
export function ensureEngine(state){
  const e=state.engine||(state.engine={version:1,applied:[],equipped:{},instances:[],learned:[],bonuses:{},serial:0});
  const counts=new Map();
  for(const item of state.inventory){const id=item.catalog_id||item.id,cat=engineItem(id);if(!cat)continue;counts.set(id,(counts.get(id)||0)+item.quantity);}
  for(const [id,count]of counts){const owned=e.instances.filter(i=>i.catalog_id===id);for(let n=owned.length;n<count;n++){e.serial=(e.serial||0)+1;e.instances.push({instance_id:'owned-'+e.serial,catalog_id:id});}}
  const keep=new Map();e.instances=e.instances.filter(i=>{const n=keep.get(i.catalog_id)||0;keep.set(i.catalog_id,n+1);return n<(counts.get(i.catalog_id)||0);});
  for(const slot of ['weapon','armor','accessory'])if(!e.instances.some(i=>i.instance_id===e.equipped[slot]))delete e.equipped[slot];
  return e;
}
export function equippedCatalog(state){const e=ensureEngine(state);return Object.values(e.equipped).map(id=>e.instances.find(i=>i.instance_id===id)).filter(Boolean).map(i=>engineItem(i.catalog_id));}
export function equipmentBonuses(state){
  const b=Object.fromEntries(statKeys.map(k=>[k,0]));Object.assign(b,{weapon_attack:0,equipment_hp_bonus:0,equipment_mp_bonus:0,equipment_speed_bonus:0,defense:0,resistance:0,spell_power:0,potentials:{}});
  for(const item of equippedCatalog(state)){for(const k of statKeys)b[k]+=item.stats[mapping[k]]||0;for(const k of ['weapon_attack','defense','resistance','spell_power'])b[k]+=item.stats[k]||0;b.equipment_hp_bonus+=item.stats.hp_bonus||0;b.equipment_mp_bonus+=item.stats.mp_bonus||0;b.equipment_speed_bonus+=item.stats.speed_bonus||0;for(const p of item.potentials)b.potentials[p.effect_key]=Math.max(b.potentials[p.effect_key]||0,p.value);}
  return b;
}
export function recalculateEquipment(state){
  const e=ensureEngine(state),old=e.bonuses,p=state.player,b=equipmentBonuses(state),hpLoss=p.maxHp-p.hp,mpSpent=p.maxMp-p.mp;
  for(const key of statKeys)if(Number.isFinite(p[key]))p[key]+=b[key]-(old[key]||0);
  p.battleModifiers=p.battleModifiers||{};
  for(const key of ['weapon_attack','equipment_hp_bonus','equipment_mp_bonus','equipment_speed_bonus'])p.battleModifiers[key]=(p.battleModifiers[key]||0)+b[key]-(old[key]||0);
  if(statKeys.every(k=>Number.isFinite(p[k]))){p.maxHp=Math.max(1,100+10*(p.constitution-10)+3*(p.strength-10)+(p.levelHpBonus||0)+(p.battleModifiers.equipment_hp_bonus||0)+(p.battleModifiers.status_hp_bonus||0));p.maxMp=Math.max(0,100+6*(p.manaStat-10)+(p.battleModifiers.equipment_mp_bonus||0)+(p.battleModifiers.status_mp_bonus||0));p.hp=Math.max(0,Math.min(p.maxHp,p.maxHp-hpLoss));p.mp=Math.max(0,Math.min(p.maxMp,p.maxMp-mpSpent));}
  e.bonuses=b;return state;
}
export function combatPreview(state){
  const p=state.player,m=p.battleModifiers||{},realm={none:1,basic:1,expert:1.25,hyper:1.65,master:2.2}[p.realm||'none'],base=Math.floor(.65*p.strength+.2*p.dexterity)+(m.weapon_attack||0)+(m.technique_bonus||0);
  return {hp:p.maxHp,mp:p.maxMp,attack:[Math.floor((10+base)*realm),Math.floor((20+base)*realm)],speed:p.dexterity+Math.floor(p.strength/5)+(m.equipment_speed_bonus||0)+(m.status_speed_bonus||0),defense:state.engine?.bonuses.defense||0,resistance:state.engine?.bonuses.resistance||0,spell_power:state.engine?.bonuses.spell_power||0};
}
export function statCost(current){return current<=50?1:current<=100?2:4;}
export function investStat(state,key){
  check(statKeys.includes(key),'미등록 능력치');check(!state.battlePlayback||state.battlePlayback.done,'전투 중에는 투자할 수 없습니다.');const e=ensureEngine(state),base=state.player[key]-(e.bonuses[key]||0);check(Number.isFinite(base)&&base>=1,'능력치가 확정되지 않았습니다.');const cost=statCost(base);check((state.player.unspentStatPoints||0)>=cost,'능력치 포인트가 부족합니다.');state.player.unspentStatPoints-=cost;state.player[key]++;recalculateEquipment(state);return state;
}
export function equipItem(state,instanceId){
  const e=ensureEngine(state),owned=e.instances.find(i=>i.instance_id===instanceId),item=engineItem(owned?.catalog_id);check(item?.slot,'소유한 장비가 아닙니다.');check(state.player.level>=item.required_level,'요구 레벨 '+item.required_level);check(item.equip_class==='공용'||item.equip_class==='all'||state.player.job.includes(item.equip_class),'직업 조건: '+item.equip_class);e.equipped[item.slot]=instanceId;return recalculateEquipment(state);
}
export function unequipItem(state,slot){check(['weapon','armor','accessory'].includes(slot),'장비 슬롯 오류');delete ensureEngine(state).equipped[slot];return recalculateEquipment(state);}
export function bookEligibility(state,id){
  const b=engineData.books.find(b=>b.id===id);if(!b)return '등록된 기술서가 아닙니다.';
  if(!state.inventory.some(i=>(i.catalog_id||i.id)===id))return '기술서를 소유하고 있지 않습니다.';
  if(!state.player.job.includes(b.required_class))return '직업 조건: '+b.required_class;
  if(state.player.level<b.required_level)return '요구 레벨 '+b.required_level;
  if(b.required_circle&&(state.engine?.registration?.circle||0)<b.required_circle)return '필요 서클 '+b.required_circle+' · 실제 서클 확인이 필요합니다.';
  if((b.prerequisite_skill_ids||[]).some(id=>!state.player.skills.some(s=>s.id===id)))return '선행 기술이 필요합니다.';return '';
}
export function learnBook(state,id,proof){
  check(!bookEligibility(state,id),bookEligibility(state,id));check(typeof proof==='string'&&proof.trim().length>0,'GM의 학습·연습 확인이 필요합니다.');const b=engineData.books.find(b=>b.id===id),e=ensureEngine(state);if(e.learned.includes(id))return state;
  check(state.player.skills.length<30,'기술 목록이 가득 찼습니다.');e.learned.push(id);state.player.skills.push({id:b.skill_id,name:b.skill_name,description:b.effect_summary,formula:b.category==='sword_manual'?`STR * 0.65 + DEX * 0.2 + ${10+b.physical_technique_bonus}`:'',enabled:true,mp_cost:b.base_mp_cost,spell_base_power:b.spell_base_power,technique_bonus:b.physical_technique_bonus,element:b.element,book_id:id});return state;
}
export function usableSkills(state){return state.player.skills.filter(s=>s.enabled&&(s.mp_cost||0)<=state.player.mp&&(!s.book_id||!bookEligibility(state,s.book_id)));}
export function awardXP(state,amount){check(Number.isSafeInteger(amount)&&amount>=0,'경험치 수치 오류');check(Number.isInteger(state.player.level)&&Number.isInteger(state.player.xp),'주인공 성장 정보가 미정입니다.');const growth=battleGrowth(state.player,amount);state.player={...state.player,...growth,hp:Math.min(growth.maxHp,state.player.hp+growth.hpIncrease)};delete state.player.hpIncrease;return state;}
export function validateEngineEvents(raw){if(raw===undefined)return [];check(Array.isArray(raw)&&raw.length<=30,'engine_events는 최대 30개');return raw.map(event=>{check(event&&typeof event==='object'&&/^[A-Za-z0-9_-]{1,100}$/.test(event.event_id||''),'엔진 사건 ID 오류');check(typeof event.kind==='string'&&event.kind.length<50,'엔진 사건 종류 오류');check(typeof event.reason==='string'&&event.reason.trim().length>0&&event.reason.length<=1000,'엔진 판정 사유 필요');return copyEngine(event);});}
export function applyEngineEvent(state,event){
  const e=ensureEngine(state);if(e.applied.includes(event.event_id))return false;check(e.applied.length<10000,'엔진 사건 기록 보존 한도 초과');
  if(event.kind==='xp')awardXP(state,event.amount);
  else if(event.kind==='profession'){check(['검사','마법사'].includes(event.job),'직업 오류');state.player.job=event.job;e.registration={...(e.registration||{}),job:event.job,...(event.circle?{circle:event.circle}:{})};check(!event.circle||(Number.isInteger(event.circle)&&event.circle>=1&&event.circle<=10),'서클 확인 오류');}
  else if(event.kind==='learn_book')learnBook(state,event.catalog_id,event.reason);
  else throw Error('지원하지 않는 엔진 사건: '+event.kind);
  e.applied.push(event.event_id);return true;
}
export function planEngineScene(state,scene,questResult){
  if(!state.engine&&!scene.engine_events?.length)return null;
  const next=copyEngine(state);if(scene.player)next.player={...next.player,...scene.player};if(scene.inventory)next.inventory=copyEngine(scene.inventory);if(scene.game_state)Object.assign(next.gameState,scene.game_state);if(questResult)Object.assign(next,questResult);
  for(const event of scene.engine_events||[]){check(!(event.kind==='xp'&&(scene.battle||scene.quest_events?.some(q=>q.kind==='report'))),'중복 경험치 정산 금지');applyEngineEvent(next,event);}
  recalculateEquipment(next);return {engine:next.engine,player:next.player,inventory:next.inventory};
}
