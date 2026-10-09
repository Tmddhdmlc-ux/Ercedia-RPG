import {findNPC,npcCatalog} from './npc-model.js';
import {calendarDay} from './quest-model.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const present=scene=>scene.cast||(scene.npc?[scene.npc]:[]);
const fail=m=>{throw Error('NPC 생활 검증 · '+m);};
const text=(v,max=500)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('문자열 형식');return v;};
const npc=id=>{if(!findNPC(id)||findNPC(id).id!==id)fail('미등록 NPC');return id;};
const region=id=>{if(!/^(W[1-5]|E[1-4]|S[1-4]|CW|CE|CS)$/.test(id))fail('미등록 생활 권역');return id;};
const country=id=>({W:'west',E:'east',S:'south'})[id?.[0]]||({CW:'west',CE:'east',CS:'south'})[id];
const day=d=>{const n=calendarDay(d);if(n===null)fail('360일 달력 날짜');return n;};
export const roleActivities={knight:['순찰','수련','경비','휴식'],mage:['연구','마법서 학습','실험','휴식'],lord:['영지 운영','재정 관리','외교','휴식'],merchant:['재고 확보','거래','이동 준비','휴식'],priest:['의식','치유 준비','구호','휴식'],resident:['농업·생활','생활','휴식','생활'],bandit:['은신','약탈 준비','영역 경계','휴식'],monster:['먹이 활동','영역 경계','둥지 방어','휴식']};
export function lifeRole(id){const p=findNPC(id),s=(p?.rank||'')+' '+(p?.affiliation||'')+' '+(p?.duty||'');return p?.role==='monster'?'monster':/도적|약탈|해적/.test(s)?'bandit':/영주|공작|백작|후작|국왕|여왕/.test(p?.rank||'')?'lord':/나이트|기사/.test(s)?'knight':/서클|마법|연구/.test(s)?'mage':/상인|상단|무역/.test(s)?'merchant':/교단|성직|성자|성녀|사제/.test(s)?'priest':'resident';}
export function normalizeLife(raw){
  if(!raw||raw.version!==1)fail('저장 버전');
  if(!raw.npcs||!raw.applied||!Array.isArray(raw.memories)||!Array.isArray(raw.rumors)||!Array.isArray(raw.links)||!Array.isArray(raw.traces))fail('저장 구조');
  if(Object.keys(raw.applied).length>10000||Object.keys(raw.npcs).length>256||raw.memories.length>2000||raw.rumors.length>128||raw.links.length>256||raw.traces.length>512)fail('저장 한도');
  if(JSON.stringify(raw).length>2000000)fail('기억 저장 크기 한도: 백업 후 기록 정리 필요');
  for(const [id,p] of Object.entries(raw.npcs)){npc(id);if(p.region)region(p.region);if(p.updated_at)day(p.updated_at);if(p.schedule)for(const s of p.schedule){day(s.start);day(s.end);region(s.region);}}
  return clone(raw);
}
function empty(){return {version:1,clock:null,npcs:{},applied:{},memories:[],rumors:[],links:[],traces:[]};}
export function validateLifeEvents(events){
  if(!Array.isArray(events)||events.length>32)fail('사건은 최대 32개');
  return events.map(raw=>{
    const e={event_id:text(raw.event_id,100),kind:raw.kind,date:text(raw.date,80),source_id:text(raw.source_id,100),reason:text(raw.reason,1000)};day(e.date);
    if(!/^[A-Za-z0-9:_-]+$/.test(e.event_id)||['__proto__','constructor','prototype'].includes(e.event_id))fail('사건 ID 형식');
    if(!['schedule','move','experience','companion','condition','rumor','relay','npc_relation','region_effect'].includes(e.kind))fail('사건 종류');
    if(['schedule','move','experience','companion','condition'].includes(e.kind))e.npc_id=npc(raw.npc_id);
    if(e.kind==='condition'){if(!Array.isArray(raw.injuries)||raw.injuries.length>10||!['rested','tired','exhausted'].includes(raw.fatigue))fail('부상·피로 형식');e.injuries=raw.injuries.map(v=>text(v,160));e.fatigue=raw.fatigue;e.major_event=raw.major_event===null?null:text(raw.major_event,100);}
    if(e.kind==='schedule'){
      if(!Array.isArray(raw.entries)||raw.entries.length>16)fail('일정 한도');
      e.entries=raw.entries.map(s=>{if(day(s.end)<day(s.start))fail('일정 역전');return {start:s.start,end:s.end,region:region(s.region),place:text(s.place,160),activity:text(s.activity,100)};});
      const sorted=[...e.entries].sort((a,b)=>day(a.start)-day(b.start));for(let i=1;i<sorted.length;i++)if(day(sorted[i].start)<=day(sorted[i-1].end))fail('일정 중복');
    }
    if(e.kind==='move'){e.region=region(raw.region);e.place=text(raw.place,160);e.activity=text(raw.activity,100);if(raw.border!==undefined)e.border=clone(raw.border);}
    if(e.kind==='companion'){if(typeof raw.accompanying!=='boolean')fail('동행 여부');e.accompanying=raw.accompanying;}
    if(e.kind==='experience'){
      e.action=text(raw.action,160);e.result=text(raw.result,500);e.location=text(raw.location,160);e.follow_up=typeof raw.follow_up==='string'?raw.follow_up.slice(0,500):'';
      if(!Number.isInteger(raw.affection_delta)||Math.abs(raw.affection_delta)>200)fail('호감도 변화');e.affection_delta=raw.affection_delta;
      if(typeof raw.player_witnessed!=='boolean')fail('플레이어 경험 여부');e.player_witnessed=raw.player_witnessed;
      e.participants=(raw.participants||[]).map(npc);if(e.participants.length>16)fail('목격자 한도');
    }
    if(e.kind==='rumor'){
      e.memory_id=text(raw.memory_id,100);e.channel=raw.channel;if(!['witness','merchant','guild','priest','military','resident'].includes(e.channel))fail('전달 경로');
      e.from_npc=npc(raw.from_npc);e.to_npc=npc(raw.to_npc);e.arrives_at=text(raw.arrives_at,80);if(day(e.arrives_at)<=day(e.date))fail('소문은 이후 날짜에 도착');e.message=text(raw.message,500);e.distorted=raw.distorted===true;
    }
    if(e.kind==='relay'){e.rumor_id=text(raw.rumor_id,100);if(typeof raw.player_heard!=='boolean')fail('플레이어 전달 여부');e.player_heard=raw.player_heard;}
    if(e.kind==='npc_relation'){e.from_npc=npc(raw.from_npc);e.to_npc=npc(raw.to_npc);if(e.from_npc===e.to_npc)fail('동일 인물 관계');e.relation=text(raw.relation,100);e.player_known=raw.player_known===true;}
    if(e.kind==='region_effect'){e.region=region(raw.region);e.effect=text(raw.effect,500);e.player_known=raw.player_known===true;e.changes={};for(const [k,v]of Object.entries(raw.changes||{})){if(!['security','tradeRisk','morale','food','treasury','warRisk','monsterRisk','prices'].includes(k)||!Number.isFinite(v))fail('지역 변경값');e.changes[k]=v;}}
    return e;
  });
}
function initial(id){const p=findNPC(id);return {region:p.location_id,place:id==='serin'?'솔브린 마을':p.location_id||'위치 미확인',affiliation:p.affiliation,activity:'일정 미확인',destination:null,schedule:[],injuries:[],fatigue:null,quests:[],accompanying:false,major_event:null,updated_at:null,last_meeting:null,known:false};}
function crossBorder(from,to,proof,date){
  if(!from||country(from)===country(to))return;
  const routes={'BORDER-WE-01':['west','east'],'BORDER-WS-01':['west','south'],'BORDER-ES-01':['east','south']};
  const pair=routes[proof?.route];
  if(!pair?.includes(country(from))||!pair.includes(country(to))||proof.open!==true||proof.approved!==true||!proof.permit_id||!proof.authority||!proof.purpose||day(proof.valid_until)<day(date))fail('NPC 국경 통행 증명 필요');
  npc(proof.issuer_id);
}
export function planNPCLife(state,scene,questResult=null){
  if(!state.npc_life&&!scene.life_events&&!present(scene).length&&!scene.battle&&!state.quest_log?.length)return null;
  const life=state.npc_life?normalizeLife(state.npc_life):empty(),relationships=clone(questResult?.relationships||state.relationships||{});
  const date=scene.game_state?.date||state.gameState?.date||life.clock,now=calendarDay(date);
  if(life.clock&&now!==null&&now<day(life.clock))fail('게임 시간 역행');
  const get=id=>life.npcs[id]||(life.npcs[id]={...initial(id),...(state.npcStates?.[id]?.location_id?{region:state.npcStates[id].location_id,place:state.npcStates[id].location_id}:{} )});
  const knownSource=id=>id==='scene:'+scene.scene_id||id==='scene:'+state.scene?.scene_id||life.memories.some(m=>m.source_id===id)||scene.battle&&id==='battle:'+scene.battle.battle_id||(questResult?.quest_event_ids||state.quest_event_ids||[]).includes(id)||(scene.world_events||[]).some(e=>e.event_id===id)||life.applied[id]!==undefined;
  const remember=(m,delta=true)=>{
    if(life.memories.some(x=>x.event_id===m.event_id&&x.npc_id===m.npc_id))return;
    if(life.memories.length>=2000)fail('기억 저장 한도: 백업 후 기록 정리 필요');
    life.memories.push(m);
    if(delta&&m.affection_delta){const r=relationships[m.npc_id]||{affection:0,flags:[],interaction_history:[]};relationships[m.npc_id]={...r,affection:Math.max(-100,Math.min(100,r.affection+m.affection_delta)),interaction_history:[...(r.interaction_history||[]),m.event_id+': '+m.result].slice(-100),last_interaction_day:m.date};}
  };
  for(const e of validateLifeEvents(scene.life_events||[])){
    const digest=JSON.stringify(e);if(life.applied[e.event_id]){if(life.applied[e.event_id]!==digest)fail('같은 사건 ID의 내용 변경');continue;}
    if(now===null||day(e.date)>now)fail('현재 날짜 없는 사건 또는 미래 사건');
    if(!knownSource(e.source_id))fail('실제 선행 사건이 없는 변경');
    if(Object.keys(life.applied).length>=10000)fail('중복 방지 기록 한도');
    if(e.npc_id)get(e.npc_id);
    if(e.kind==='schedule'){get(e.npc_id).schedule=e.entries;get(e.npc_id).schedule_source=e.event_id;}
    if(e.kind==='move'){const p=get(e.npc_id);crossBorder(p.region,e.region,e.border,e.date);Object.assign(p,{region:e.region,place:e.place,activity:e.activity,destination:null,updated_at:e.date,location_confirmed:true});}
    if(e.kind==='companion'){const p=get(e.npc_id);if(e.accompanying&&!present(scene).some(n=>n.id===e.npc_id))fail('만나지 않은 인물 동행');p.accompanying=e.accompanying;}
    if(e.kind==='condition')Object.assign(get(e.npc_id),{injuries:e.injuries,fatigue:e.fatigue,major_event:e.major_event});
    if(e.kind==='experience'){
      if(e.player_witnessed&&!(present(scene).some(n=>n.id===e.npc_id)||scene.battle?.participants.some(p=>p.id===e.npc_id)||get(e.npc_id).accompanying&&get(e.npc_id).place===(scene.game_state?.place||scene.location)))fail('만나지 않은 NPC 직접 경험');
      for(const id of e.participants)if(get(id).region&&get(e.npc_id).region&&get(id).region!==get(e.npc_id).region)fail('다른 지역의 NPC가 즉시 목격');
      if((questResult?.quest_log||state.quest_log||[]).some(q=>q.claim_event_id===e.source_id&&q.reward.affection_effects.some(r=>r.npc_id===e.npc_id))&&e.affection_delta)fail('의뢰 호감도 이중 지급');
      if(e.affection_delta){const claim='affection-source:'+e.source_id+':'+e.npc_id;if(life.applied[claim])fail('같은 원인 사건의 호감도 이중 지급');life.applied[claim]='affection';}
      remember({...e});for(const id of e.participants.filter(id=>id!==e.npc_id))remember({...e,npc_id:id,affection_delta:0,player_witnessed:false});
    }
    if(e.kind==='rumor'){
      const m=life.memories.find(m=>m.event_id===e.memory_id&&m.npc_id===e.from_npc)||life.rumors.find(r=>r.id===e.memory_id&&r.to_npc===e.from_npc&&r.delivered);
      if(!m)fail('소문 발신자가 모르는 사건');if(life.rumors.length>=128)fail('소문 저장 한도');
      life.rumors.push({...e,id:e.event_id,delivered:false,player_heard:false});
    }
    if(e.kind==='relay'){const r=life.rumors.find(r=>r.id===e.rumor_id);if(r&&day(r.arrives_at)<=now)r.delivered=true;if(!r||!r.delivered||!present(scene).some(n=>n.id===r.to_npc))fail('도착하지 않거나 만나지 않은 소문');r.player_heard=e.player_heard;}
    if(e.kind==='npc_relation'){if(life.links.length>=256)fail('인물 관계 한도');life.links.push({...e});}
    if(e.kind==='region_effect'){
      const battle=scene.battle&&e.source_id==='battle:'+scene.battle.battle_id&&scene.battle.outcome.winner==='allied';
      const quest=(questResult?.quest_log||[]).some(q=>q.claim_event_id===e.source_id||scene.quest_events?.some(v=>v.event_id===e.source_id&&v.quest_id===q.id&&['fail','abandon'].includes(v.kind)));
      const world=scene.world_events?.some(v=>v.event_id===e.source_id&&v.proof);
      if(!battle&&!quest&&!world)fail('지역 변화는 실제 전투·의뢰·검증된 세계 사건 필요');
      if(life.traces.length>=512)fail('지역 기록 한도');life.traces.push({...e});
    }
    life.applied[e.event_id]=digest;
  }
  const priority=new Set([...present(scene).map(n=>n.id),...Object.keys(life.npcs).filter(id=>life.npcs[id].accompanying||life.npcs[id].major_event),...(questResult?.quest_log||state.quest_log||[]).filter(q=>['accepted','active','ready_to_report'].includes(q.status)).map(q=>q.issuer_npc_id)].filter(id=>findNPC(id)));
  for(const id of priority){const p=get(id);if(!p.accompanying&&now!==null&&p.updated_at!==date){const scheduled=p.schedule.find(s=>day(s.start)<=now&&day(s.end)>=now);if(scheduled){crossBorder(p.region,scheduled.region,null,date);Object.assign(p,{region:scheduled.region,place:scheduled.place,activity:scheduled.activity,location_confirmed:true});}else if(!p.schedule.length&&(!p.updated_at||now>day(p.updated_at)))p.activity=roleActivities[lifeRole(id)][now%4];p.updated_at=date;p.destination=p.schedule.find(s=>day(s.start)>now)?.place||null;}
    p.quests=(questResult?.quest_log||state.quest_log||[]).filter(q=>q.issuer_npc_id===id&&['accepted','active','ready_to_report'].includes(q.status)).map(q=>q.id);
    const stats=state.npcStates?.[id];if(stats?.hp===0)p.activity='전투불능';
  }
  for(const [id,p] of Object.entries(life.npcs)){if(p.accompanying&&p.region===state.gameState?.region&&p.place===state.gameState?.place){const area=scene.game_state?.region||state.gameState.region,place=scene.game_state?.place||scene.location;if(country(p.region)===country(area))Object.assign(p,{region:area,place,activity:'동행',updated_at:date||p.updated_at});}}
  for(const npc of present(scene)){const p=get(npc.id),place=scene.game_state?.place||scene.location,area=scene.game_state?.region||state.gameState?.region;
    if(p.region&&area&&country(p.region)!==country(area))fail('이동하지 않은 NPC가 다른 왕국에서 등장');
    if(p.location_confirmed&&p.place!==place&&p.place!==p.region&&!p.accompanying)fail('이동한 NPC가 이전 장소에서 등장');
    p.place=place;p.known=true;p.last_meeting={date:date||'날짜 미확인',place};
    const id='first-meeting:'+npc.id;if(!life.applied[id]){remember({event_id:id,npc_id:npc.id,date:date||'날짜 미확인',location:place,action:'첫 만남',result:'처음 대화를 나눴다.',affection_delta:0,follow_up:'재회 시 첫 만남을 기억한다.',player_witnessed:true,participants:[]});life.applied[id]='first';}
  }
  if(scene.battle){for(const p of scene.battle.participants.filter(p=>findNPC(p.id))){const id='battle-memory:'+scene.battle.battle_id+':'+p.id;if(life.applied[id])continue;if(scene.battle.outcome.resources.find(r=>r.id===p.id)?.hp===0)get(p.id).activity='전투불능';remember({event_id:id,npc_id:p.id,date:date||'날짜 미확인',location:scene.location,action:'함께한 전투',result:scene.battle.outcome.winner,affection_delta:0,follow_up:'',player_witnessed:true,participants:[]});life.applied[id]='battle';}}
  for(const q of questResult?.quest_log||[]){const old=(state.quest_log||[]).find(p=>p.id===q.id);if(old?.status===q.status||!findNPC(q.issuer_npc_id))continue;const id='quest-memory:'+q.id+':'+q.status;if(life.applied[id])continue;remember({event_id:id,npc_id:q.issuer_npc_id,date:date||'날짜 미확인',location:scene.location,action:'의뢰 '+({offered:'제안',accepted:'수락',active:'진행',ready_to_report:'보고 가능',completed:'완료',failed:'실패',expired:'기한 만료',abandoned:'포기',declined:'거절'})[q.status],result:q.title,affection_delta:0,follow_up:'',player_witnessed:true,participants:[]});life.applied[id]='quest';}
  if(now!==null){for(const r of life.rumors)if(!r.delivered&&day(r.arrives_at)<=now){r.delivered=true;get(r.to_npc);}life.clock=date;}
  normalizeLife(life);return {npc_life:life,relationships};
}
export function regionImpact(state,id,{publicOnly=false}={}){const traces=(state.npc_life?.traces||[]).filter(t=>t.region===id&&(!publicOnly||t.player_known));const calendar=Object.values(state.world_engine?.annual_events||{}).filter(e=>e.region_id===id&&e.status==='resolved'&&(!publicOnly||e.known_to_player)).map(e=>({event_id:e.id,changes:e.effects}));traces.push(...calendar);const changes={};for(const t of traces)for(const [key,value]of Object.entries(t.changes))changes[key]=(changes[key]||0)+value;return {region:id,changes,events:clone(traces)};}
export function lifeContext(state){const life=state.npc_life;if(!life)return null;const id=state.scene?.npc?.id,related=new Set([id,...present(state.scene||{}).map(p=>p.id),...Object.keys(life.npcs).filter(id=>life.npcs[id].accompanying),...(state.quest_log||[]).filter(q=>['accepted','active','ready_to_report'].includes(q.status)).map(q=>q.issuer_npc_id)]);return {clock:life.clock,regional_changes:regionImpact(state,state.gameState?.region).changes,npcs:Object.fromEntries([...related].filter(id=>life.npcs[id]).map(id=>[id,life.npcs[id]])),memories:[...life.memories.filter(m=>related.has(m.npc_id)&&m.action==='첫 만남'),...life.memories.filter(m=>related.has(m.npc_id)&&m.action!=='첫 만남').slice(-40)],rumors:life.rumors.filter(r=>r.delivered&&related.has(r.to_npc)).slice(-20),region_traces:life.traces.filter(t=>t.region===state.gameState?.region).slice(-10),relationships:life.links.filter(r=>related.has(r.from_npc)||related.has(r.to_npc)).slice(-16),constraints:'각 NPC는 자기 memories와 수신 완료 rumors만 안다. 다른 NPC 기록·플레이어 일지·미도착 소문은 대사 지식이 아니다. 직무·법·소속을 호감도보다 우선한다.'};}
export function publicLife(state,id){const life=state.npc_life,p=life?.npcs[id];return {activity:p?.known?p.activity:'확인되지 않음',accompanying:p?.accompanying||false,last_meeting:p?.last_meeting||null,quests:p?.known?p.quests:[],affection:state.relationships?.[id]?.affection??0,injuries:p?.known?p.injuries:[],fatigue:p?.known?p.fatigue:null,memories:life?.memories.filter(m=>m.npc_id===id&&m.player_witnessed).slice(-5)||[]};}
