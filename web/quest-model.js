import {catalogData} from './catalog-data.js';
import {questItems} from './quest-data.js';
import {battleGrowth} from './battle-model.js';
import {normalizeInventory} from './inventory.js';
import {mapData} from './map-data.js';
const statuses=['offered','accepted','active','ready_to_report','completed','failed','expired','abandoned','declined'];
const types=['hunt','escort','delivery','gather','investigate','dungeon','repair','diplomacy','training'];
const kinds=['battle_win','dungeon_enter','dungeon_clear','gather','delivery','escort','clue','action'];
const terminal=new Set(['completed','failed','expired','abandoned','declined']);
const txt=(v,max=1000)=>typeof v==='string'?v.slice(0,max):'';
const integer=(v,max=999999)=>Number.isInteger(v)&&v>=0&&v<=max?v:0;
const fail=message=>{throw Error('의뢰 검증 · '+message);};
export function calendarDay(value){
  const m=/^(\d{1,6})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value||'');
  return m&&+m[2]>=1&&+m[2]<=12&&+m[3]>=1&&+m[3]<=30?(+m[1]*360+(+m[2]-1)*30+(+m[3]-1)):null;
}
export function normalizeQuest(raw){
  if(!raw||!txt(raw.id,100)||!txt(raw.title,160)||!statuses.includes(raw.status)||!types.includes(raw.type)||!['guild_board','personal_npc','dynamic_event'].includes(raw.origin))fail('의뢰 ID·제목·유형·상태 확인');
  if(!/^(W[1-5]|E[1-4]|S[1-4])$/.test(raw.region_id||''))fail('등록된 13영주령 ID 필요');
  if(!Array.isArray(raw.objectives)||!raw.objectives.length||raw.objectives.length>10)fail('목표는 1~10개');
  const ids=new Set(),objectives=raw.objectives.map(o=>{
    if(!o?.id||ids.has(o.id)||!txt(o.description)||!Number.isInteger(o.target)||o.target<1||o.target>999999||!kinds.includes(o.verification?.kind)||!txt(o.verification.target_id,100))fail('구체적인 목표 ID와 검증 방식 필요');
    ids.add(o.id);return {id:txt(o.id,100),description:txt(o.description),current:Math.min(o.target,integer(o.current)),target:o.target,verification:{kind:o.verification.kind,target_id:txt(o.verification.target_id,100),...(o.verification.recipient_id?{recipient_id:txt(o.verification.recipient_id,100)}:{})},evidence_ids:Array.isArray(o.evidence_ids)?o.evidence_ids.filter(v=>typeof v==='string').slice(-1000):[]};
  });
  const reward=raw.reward||{};
  return {id:txt(raw.id,100),title:txt(raw.title,160),summary:txt(raw.summary,3000),origin:raw.origin,type:raw.type,status:raw.status,rank:['F','E','D','C','B'].includes(raw.rank)?raw.rank:null,region_id:raw.region_id,target_location_id:txt(raw.target_location_id,100)||null,issuer_npc_id:txt(raw.issuer_npc_id,100)||null,issuer_faction_id:txt(raw.issuer_faction_id,100)||null,issuer_name:txt(raw.issuer_name,160),accepted_at:txt(raw.accepted_at,80)||null,deadline_at:txt(raw.deadline_at,80)||null,claim_event_id:txt(raw.claim_event_id,100)||null,visibility:['public','revealed','private'].includes(raw.visibility)?raw.visibility:'revealed',objectives,reward:{xp:integer(reward.xp),currency:integer(reward.currency),item_ids:Array.isArray(reward.item_ids)?reward.item_ids.filter(v=>typeof v==='string').slice(0,32):[],materials:Array.isArray(reward.materials)?reward.materials.slice(0,32).map(v=>({id:txt(v.id,100),quantity:integer(v.quantity)||1})):[],affection_effects:Array.isArray(reward.affection_effects)?reward.affection_effects.slice(0,16).map(v=>({npc_id:txt(v.npc_id,100),delta:Number.isInteger(v.delta)&&Math.abs(v.delta)<=200?v.delta:0,reason:txt(v.reason)})):[]},journal:Array.isArray(raw.journal)?raw.journal.filter(v=>typeof v==='string').slice(-100).map(v=>txt(v)):[]};
}
export function normalizeQuestLog(raw){const result=[];for(const q of Array.isArray(raw)?raw.slice(0,100):[]){try{const v=normalizeQuest(q);if(!result.some(p=>p.id===v.id))result.push(v);}catch{}}return result;}
export function normalizeWorldEvents(raw){
  if(!Array.isArray(raw)||raw.length>50)fail('world_events는 최대 50개');
  const ids=new Set();return raw.map(e=>{
    if(!txt(e?.event_id,100)||ids.has(e.event_id)||!kinds.includes(e.kind)||!txt(e.target_id,100)||!txt(e.location,160)||!txt(e.proof))fail('실제 사건 ID·종류·장소·증거 필요');ids.add(e.event_id);
    return {event_id:txt(e.event_id,100),kind:e.kind,target_id:txt(e.target_id,100),location:txt(e.location,160),proof:txt(e.proof),recipient_id:txt(e.recipient_id,100),subject_alive:e.subject_alive===true,item_name:txt(e.item_name,60),quantity:integer(e.quantity)||1};
  });
}
const itemById=id=>questItems.find(i=>i.id===id);
const quantity=(bag,name)=>bag.filter(i=>i.name===name).reduce((n,i)=>n+i.quantity,0);
export function settleQuests(state,scene){
  const quests=normalizeQuestLog(state.quest_log),ledger=[...(state.quest_event_ids||[])],before=state.inventory,bag=scene.inventory||before;
  const now=calendarDay(scene.game_state?.date||state.gameState.date),location=scene.game_state?.place||scene.location,region=scene.game_state?.region||state.gameState.region;
  const updates=scene.quest_updates||[];
  for(const raw of updates){
    const old=quests.find(q=>q.id===raw.id);
    if(old){if(old.status!=='offered')fail('수락한 의뢰 조건은 임의 변경할 수 없습니다.');const q=normalizeQuest(raw);if(q.status!=='offered')fail('상태는 quest_events로 변경');Object.assign(old,q,{objectives:q.objectives.map(o=>({...o,current:0,evidence_ids:[]})),claim_event_id:null});}
    else {if(quests.length>=100)fail('의뢰 기록은 최대 100개');const q=normalizeQuest(raw);if(q.status!=='offered')fail('새 의뢰는 offered');q.objectives=q.objectives.map(o=>({...o,current:0,evidence_ids:[]}));q.claim_event_id=null;quests.push(q);}
  }
  const events=[];
  if(scene.battle&&scene.battle.outcome.winner==='allied')for(const p of scene.battle.participants.filter(p=>p.side==='enemy'&&scene.battle.outcome.resources.find(r=>r.id===p.id)?.hp===0))events.push({event_id:`battle:${scene.battle.battle_id}:${p.id}`,kind:'battle_win',target_id:p.id,location,proof:'확정된 전투 종료',quantity:1});
  for(const e of scene.world_events||[]){
    if(e.kind==='battle_win')fail('토벌 증거는 전투 정산에서만 생성');
    if(e.location!==location&&e.location!==scene.location)fail('사건 장소와 실제 위치 불일치');
    if(['dungeon_enter','dungeon_clear'].includes(e.kind)&&(!catalogData.regional.dungeons.some(d=>d.id===e.target_id)||![e.target_id,catalogData.regional.dungeons.find(d=>d.id===e.target_id)?.name].includes(location)))fail('실제 등록 던전 진입·클리어 위치 필요');
    if(e.kind==='gather'){const item=itemById(e.target_id);if(!item||quantity(bag,item.name)-quantity(before,item.name)<e.quantity)fail('실제 재료 획득 확인 실패');}
    if(e.kind==='delivery'){const item=itemById(e.target_id);if(!item||!e.recipient_id||quantity(before,item.name)-quantity(bag,item.name)<e.quantity)fail('수령인과 실제 물자 인계 필요');}
    if(e.kind==='escort'&&!e.subject_alive)fail('호위 대상의 생존 상태 필요');
    events.push(e);
  }
  // Gather objectives follow real inventory increases, even if GM omitted a separate event.
  for(const q of quests)for(const o of q.objectives)if(o.verification.kind==='gather'){const item=itemById(o.verification.target_id),gain=item?quantity(bag,item.name)-quantity(before,item.name):0;if(gain>0&&!events.some(e=>e.kind==='gather'&&e.target_id===item.id))events.push({event_id:`inventory:${scene.scene_id}:${item.id}`,kind:'gather',target_id:item.id,quantity:gain});}
  for(const q of quests){
    if(!terminal.has(q.status)&&q.deadline_at&&now!==null&&calendarDay(q.deadline_at)!==null&&now>calendarDay(q.deadline_at)){q.status='expired';q.journal.push('게임 날짜 기준 기한 만료');}
    if(!['accepted','active','ready_to_report'].includes(q.status))continue;
    for(const e of events){if(ledger.includes(e.event_id))continue;for(const o of q.objectives){if(o.verification.kind!==e.kind||o.verification.target_id!==e.target_id||o.evidence_ids.includes(e.event_id))continue;
      if(e.kind==='delivery'&&e.recipient_id!==(o.verification.recipient_id||q.issuer_npc_id))fail('의뢰 물자 수령인 불일치');
      o.current=Math.min(o.target,o.current+(e.quantity||1));o.evidence_ids.push(e.event_id);q.journal.push(`${o.description} · ${o.current}/${o.target}`);}}
    q.status=q.objectives.every(o=>o.current>=o.target)?'ready_to_report':'active';
  }
  for(const e of events)if(!ledger.includes(e.event_id))ledger.push(e.event_id);
  let player=structuredClone({...state.player,...scene.player}),inventory=structuredClone(bag),currency=state.currency||0,relationships=structuredClone(state.relationships||{});
  for(const e of scene.quest_events||[]){
    if(ledger.includes(e.event_id))fail('이미 적용한 의뢰 사건입니다. 보상 중복을 막았습니다.');
    const q=quests.find(q=>q.id===e.quest_id);if(!q)fail('등록되지 않은 의뢰 사건');
    if(e.kind==='accept'){if(q.status!=='offered')fail('수락 가능한 의뢰가 아닙니다.');q.status='accepted';q.accepted_at=scene.game_state?.date||state.gameState.date||null;}
    else if(e.kind==='decline'){if(q.status!=='offered')fail('제안 중인 의뢰만 거절 가능');q.status='declined';}
    else if(e.kind==='abandon'||e.kind==='fail'){if(!['accepted','active','ready_to_report'].includes(q.status))fail('진행 의뢰만 포기·실패 가능');q.status=e.kind==='fail'?'failed':'abandoned';}
    else if(e.kind==='report'){
      if(q.status!=='ready_to_report'||q.claim_event_id)fail('실제 목표 확인과 미지급 보상 필요');
      if(q.issuer_npc_id?scene.npc?.id!==q.issuer_npc_id:region!==q.region_id)fail('발행자에게 실제 보고해야 합니다.');
      if(scene.player||scene.inventory||scene.npc_updates)fail('의뢰 보상은 UI가 한 번만 정산합니다. report 장면에 보상 스냅샷을 중복 포함하지 마세요.');
      if(q.reward.xp){if(![player.level,player.xp,player.maxHp,player.hp,player.strength].every(Number.isFinite))fail('경험치 지급에 필요한 현재 능력치 미정');const growth=battleGrowth(player,q.reward.xp);player={...player,...growth,hp:Math.min(growth.maxHp,player.hp+growth.hpIncrease)};delete player.hpIncrease;}
      for(const r of [...q.reward.item_ids.map(id=>({id,quantity:1})),...q.reward.materials]){const item=itemById(r.id);if(!item)fail('미등록 보상 아이템');const old=inventory.find(i=>i.name===item.name);if(old)old.quantity+=r.quantity;else{if(inventory.length>=32)fail('인벤토리 여유 공간 필요');inventory.push({name:item.name,quantity:r.quantity,id:item.id,category:item.category,description:item.description||item.effect||'',effect:item.effect||'',rarity:item.rarity});}}
      currency+=q.reward.currency;
      for(const r of q.reward.affection_effects){const old=relationships[r.npc_id]||{affection:0,flags:[],interaction_history:[]};relationships[r.npc_id]={...old,affection:Math.max(-100,Math.min(100,old.affection+r.delta)),interaction_history:[...(old.interaction_history||[]),`${e.event_id}: ${r.reason}`].slice(-100),last_interaction_day:scene.game_state?.date||state.gameState.date||null};}
      q.status='completed';q.claim_event_id=e.event_id;
    }else fail('미지원 의뢰 사건');
    q.journal.push(e.reason);ledger.push(e.event_id);
  }
  // Keep accepted event IDs for the entire save lifetime, never drop reward tombstones.
  if(ledger.length>10000)fail('사건 기록 보관 한도 도달');
  return {quest_log:quests,quest_event_ids:ledger,player,inventory:normalizeInventory(inventory),currency,relationships};
}
export function questProgress(q){return Math.round(q.objectives.reduce((n,o)=>n+Math.min(o.current,o.target)/o.target,0)/q.objectives.length*100);}
export function questMapPoint(q){const anchor=q.target_location_id||q.region_id;return mapData.locations.find(p=>p.id===anchor||p.id===q.region_id||p.code===q.region_id)||mapData.locations.find(p=>p.label?.includes(q.region_id));}
