import {epicData} from './epic-data.js';
import {questItems} from './quest-data.js';
const check=(v,m)=>{if(!v)throw Error('에픽 의뢰 검증 · '+m);};
export function epicSeeds(){return [...epicData.lordship_quests,...epicData.village_quest_template.known_instance_seeds.map(q=>({...q,region_id:q.parent_lordship_id,scope:'settlement',scope_id:q.id.replace('EPIC-VILLAGE-','').replace(/-01$/,''),rewards:epicData.village_quest_template.rewards}))];}
export function epicEligibility(state,seed){
  const ids=new Set((state.quest_log||[]).filter(q=>q.status==='completed'&&q.claim_event_id&&(state.quest_event_ids||[]).includes(q.claim_event_id)&&!q.epic_id&&!q.id.startsWith('EPIC-')&&!q.repeatable&&(seed.scope==='settlement'?q.settlement_id===seed.scope_id:q.region_id===seed.region_id)).map(q=>q.id));
  const scope=seed.scope_id||seed.region_id,affection=state.local_reputation?.affection?.[scope]||0;
  return {completed_ids:[...ids],completed:ids.size,affection,eligible:ids.size>=epicData.thresholds.completed_quests||affection>=epicData.thresholds.region_affection};
}
export function epicContext(state){const region=state.gameState?.region;return {source:'quests/regional_epic_quests.json',thresholds:epicData.thresholds,local_reputation:state.local_reputation?.affection||{},seeds:epicSeeds().filter(q=>q.region_id===region).map(seed=>({id:seed.id,title:seed.title,scope:seed.scope,scope_id:seed.scope_id||seed.region_id,...epicEligibility(state,seed),...(epicEligibility(state,seed).eligible?{premise:seed.premise,stages:seed.stages||epicData.village_quest_template.stages,rewards:seed.rewards}:{})})),constraints:'해금은 제안 자격이다. 실제 발행·수주·증거·완료 보고 후 후보 중 하나만 지급. NPC 호감도·국가 명성을 지역 호감도로 복사하지 않는다.'};}
export function validateEpicQuest(state,q){
  const seed=epicSeeds().find(s=>s.id===(q.epic_id||q.id));if(!seed){check(!q.epic_id&&!q.id.startsWith('EPIC-'),'미등록 에픽 ID');return;}
  check(q.id===seed.id&&q.epic_id===seed.id&&q.region_id===seed.region_id&&q.rank==='EPIC','고유 에픽 ID·지역·등급');
  check(epicEligibility(state,seed).eligible,'해금 조건 미충족');
  if(seed.scope==='settlement')check(q.settlement_id===seed.scope_id,'마을 실적 범위');
  check(q.reward.item_ids.length===1&&q.reward.materials.length===0,'선택 보상은 한 개만');
  check(q.reward.xp===0&&q.reward.currency===0&&q.reward.affection_effects.length===0,'원본에 없는 추가 보상 금지');
  if(seed.rewards.choice_one_of)check(seed.rewards.choice_one_of.some(r=>r.catalog_id===q.reward.item_ids[0]),'등록된 지역 보상 후보');
  else {const item=questItems.find(i=>i.id===q.reward.item_ids[0]);check(item&&['유니크','에픽','전설'].includes(item.rarity)&&/^(ER-EQ-|BK-)/.test(item.id),'마을 보상은 등록된 유니크 이상 장비·기술서');}
}
export function normalizeLocalReputation(raw){
  check(raw&&typeof raw.affection==='object'&&raw.affection&&!Array.isArray(raw.affection)&&raw.events&&typeof raw.events==='object'&&!Array.isArray(raw.events),'지역 평가 저장');
  const allowed=new Set(epicSeeds().map(s=>s.scope_id||s.region_id));
  check(Object.entries(raw.affection).every(([id,v])=>allowed.has(id)&&Number.isInteger(v)&&Math.abs(v)<=100)&&Object.keys(raw.events).length<=10000,'지역 평가 범위·한도');
  return JSON.parse(JSON.stringify(raw));
}
export function planLocalReputation(state,scene){
  const next=state.local_reputation?normalizeLocalReputation(state.local_reputation):{affection:{},events:{}};
  for(const e of scene.locality_events||[]){
    check(e&&/^[A-Za-z0-9:_-]{1,100}$/.test(e.event_id)&&!['__proto__','constructor','prototype'].includes(e.event_id)&&Number.isInteger(e.delta)&&Math.abs(e.delta)<=100&&typeof e.reason==='string'&&e.reason.trim().length>0&&e.reason.length<=1000,'지역 평가 사건·근거');
    const seed=epicSeeds().find(s=>(s.scope_id||s.region_id)===e.scope_id);check(seed&&seed.region_id===(scene.game_state?.region||state.gameState?.region),'실제 지역');
    if(seed.scope==='settlement')check((scene.location||'').includes(seed.settlement),'실제 등록 마을');
    const record={scope_id:e.scope_id,delta:e.delta,reason:e.reason};
    if(Object.hasOwn(next.events,e.event_id)){check(JSON.stringify(next.events[e.event_id])===JSON.stringify(record),'동일 사건 변경');continue;}
    next.affection[e.scope_id]=Math.max(-100,Math.min(100,(next.affection[e.scope_id]||0)+e.delta));next.events[e.event_id]=record;
  }
  check(Object.keys(next.events).length<=10000,'지역 평가 사건 보관 한도');
  return next;
}
