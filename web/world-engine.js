// GM adjudicates; this module validates and commits confirmed changes atomically.
import {worldData} from './world-data.js';
import {catalogItem,itemCategory,itemDescription,lootCatalog} from './item-catalog.js';
import {awardXP,ensureEngine,recalculateEquipment} from './engine-model.js';
import {calendarDay} from './quest-model.js';
import {findNPC,resolveNPC} from './npc-model.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const fail=m=>{throw Error('세계 엔진 검증 · '+m);};
const check=(v,m)=>{if(!v)fail(m);};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,120}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const integer=(v,min=0,max=999999)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=1000;
const day=v=>{const n=calendarDay(v);check(n!==null,'360일 달력 날짜');return n;};
export const kingdomOf=region=>({W:'west',E:'east',S:'south'})[region?.[0]]||({CW:'west',CE:'east',CS:'south'})[region]||null;
const kingdoms=['west','east','south'];
export function emptyWorld(state={}){
  const origin=({벨로아:'west',드라켄:'east',루메린:'south'})[state.starting_kingdom]||null;
  return {version:1,applied:{},loot_claims:{},dungeons:{},active_dungeon:null,party:[],national_origin:origin,kingdom_reputation:Object.fromEntries(kingdoms.map(k=>[k,k===origin?10:0])),entry_permits:[],wanted_flags:{},border_crossing_history:[],active_border_route:null,offers:{},auctions:{},transactions:[],calendar:{date:null,month_cursor:null},annual_events:{},monthly_world_state:{},facility_history:[]};
}
export function normalizeWorld(raw,state={}){
  check(raw?.version===1&&JSON.stringify(raw).length<=2000000,'세계 저장 구조/크기');
  const w={...emptyWorld(state),...clone(raw)};
  for(const key of ['applied','loot_claims','dungeons','offers','auctions','annual_events','monthly_world_state','kingdom_reputation','wanted_flags'])check(w[key]&&typeof w[key]==='object'&&!Array.isArray(w[key])&&Object.keys(w[key]).every(id),'세계 저장 '+key);
  for(const key of ['party','entry_permits','border_crossing_history','transactions','facility_history'])check(Array.isArray(w[key]),'세계 저장 '+key);
  check(Object.keys(w.applied).length<=10000&&w.party.length<=6&&new Set(w.party).size===w.party.length&&w.party.every(v=>findNPC(v)),'사건/동료 한도');
  for(const k of kingdoms)check(integer(w.kingdom_reputation[k],-100,100),'국가 명성');
  check(w.transactions.length<=1000&&w.entry_permits.length<=128&&Object.keys(w.annual_events).length<=5000,'세계 기록 한도');
  if(w.calendar.date)day(w.calendar.date);
  return w;
}
export function validateSystemEvents(raw){
  if(raw===undefined)return [];
  check(Array.isArray(raw)&&raw.length<=32,'system_events 최대 32개');
  const ids=new Set();return raw.map(e=>{check(e&&id(e.event_id)&&!ids.has(e.event_id)&&text(e.reason),'사건 ID/판정 근거');ids.add(e.event_id);check(['loot','discover_dungeon','enter_dungeon','enter_zone','resolve_zone','retreat','respawn','clear_dungeon','party','reputation','permit','wanted','border','offer','trade','service','auction','bid','auction_result','calendar_result'].includes(e.kind),'사건 종류');check(JSON.stringify(e).length<=16000,'사건 크기');return clone(e);});
}
function quantity(bag,catalogId){return bag.filter(i=>(i.catalog_id||i.id)===catalogId).reduce((n,i)=>n+i.quantity,0);}
function give(state,catalogId,amount){
  const item=catalogItem(catalogId);check(item&&integer(amount,1),'등록 아이템/수량');
  const existing=state.inventory.find(i=>(i.catalog_id||i.id)===catalogId);
  if(existing){check(existing.quantity+amount<=999999,'아이템 수량 한도');existing.quantity+=amount;}
  else {check(state.inventory.length<32,'가방이 가득 찼습니다. 보상은 아직 지급하지 않았습니다.');state.inventory.push({id:item.id,name:item.name,quantity:amount,category:itemCategory(item),description:itemDescription(item),...(item.rarity?{rarity:item.rarity}:{})});}
}
function take(state,catalogId,amount){
  check(integer(amount,1)&&quantity(state.inventory,catalogId)>=amount,'소유 아이템 부족');
  const e=ensureEngine(state);check(!e.instances.some(i=>i.catalog_id===catalogId&&Object.values(e.equipped).includes(i.instance_id)),'장착한 물품은 먼저 해제하세요.');
  let remaining=amount;for(const item of state.inventory)if((item.catalog_id||item.id)===catalogId){const n=Math.min(remaining,item.quantity);item.quantity-=n;remaining-=n;}state.inventory=state.inventory.filter(i=>i.quantity>0);
}
function money(state,delta){check(integer(state.currency||0)&&integer(delta,-999999999,999999999)&&integer((state.currency||0)+delta,0,999999999),'재화 부족/한도');state.currency=(state.currency||0)+delta;}
function resolvedBattle(state,scene,battleId){
  const battle=scene.battle?.battle_id===battleId?scene.battle:state.battlePlayback?.done&&state.battleApplied?.includes(battleId)&&state.battlePlayback.scene.battle.battle_id===battleId?state.battlePlayback.scene.battle:null;
  check(battle?.outcome.winner==='allied','실제 승리한 전투 필요');return battle;
}
function currentRun(w,dungeonId){const d=worldData.dungeons.find(d=>d.id===dungeonId),run=w.dungeons[dungeonId];check(d&&run?.discovered,'발견한 등록 던전 필요');return {d,run};}
function hasEvidence(scene,evidenceId,targetId){return scene.world_events?.some(v=>v.event_id===evidenceId&&v.target_id===targetId&&['action','clue'].includes(v.kind)&&text(v.proof));}
function legalVisit(w,region,date){const k=kingdomOf(region);check(k,'왕국 지역 확인');if(!w.national_origin||k===w.national_origin)return;check(w.border_crossing_history.some(h=>h.to===k&&h.result==='passed'&&day(h.date)<=day(date)),'타국 시설은 실제 입국 기록 필요');}
function assertOfferLocation(w,offer,scene,date){
  const region=scene.game_state?.region;check(offer.region_id===region,'현재 지역에서만 이용할 수 있습니다.');check([offer.venue_id,offer.venue_name].includes(scene.game_state?.place||scene.location),'실제 거래/시설 장소 진입 필요');legalVisit(w,region,date);
  check(day(date)<=day(offer.valid_until),'견적 기한 만료');
}
function rewardPack(table,run,e){
  const first=!run.claimed,rows=table.first_clear.guaranteed,xp=rows.find(r=>r.type==='xp')?.amount||0,bundle=rows.find(r=>r.type==='material_bundle');
  const material=e.material_id;check(bundle?.source_material_ids.includes(material),'지역 재료 묶음 후보에서 선택하세요.');
  const result={xp:first?xp:Math.floor(xp*table.repeat_clear.xp_fraction_of_first_clear),items:[{id:material,quantity:first?bundle.quantity:table.repeat_clear.material_quantity}]};
  if(e.optional_item_id){const pool=table.first_clear.optional_reward_pool;check(first&&[...pool.equipment_ids,...pool.book_ids].includes(e.optional_item_id)&&text(e.optional_reason),'최초 선택 보상 후보/획득 근거');result.items.push({id:e.optional_item_id,quantity:1});}return result;
}
export function advanceCalendar(w,date){
  const n=day(date),old=w.calendar.date?day(w.calendar.date):n;check(n>=old,'게임 시간 역행');
  const cursor=Math.floor(n/30),first=w.calendar.month_cursor??cursor;check(integer(first)&&cursor-first<=120,'월간 갱신은 최대 10년 단위');
  for(let c=first;c<=cursor;c++){
    const year=Math.floor(c/12),month=c%12+1,key=year+'-'+month;
    w.monthly_world_state[key]??={year,month,status:'awaiting_ruling',regional_changes:{}};
    for(const template of [...worldData.annual.world_events,...worldData.annual.region_events].filter(t=>t.month===month)){
      const ref=year+':'+template.id;if(w.annual_events[ref])continue;check(Object.keys(w.annual_events).length<5000,'달력 사건 보존 한도');
      w.annual_events[ref]={id:ref,template_id:template.id,year,month,region_id:template.region_id||null,name:template.name,category:template.type,status:'planned',known_to_player:template.public_info===true,effects:{},public_summary:template.description||''};
    }
  }
  const keys=Object.keys(w.monthly_world_state);while(keys.length>24)delete w.monthly_world_state[keys.shift()];
  w.calendar={date,month_cursor:cursor};
}
// The returned scene carries only engine-generated deltas. Caller still validates the whole turn.
export function planWorldScene(state,scene){
  const events=validateSystemEvents(scene.system_events),date=scene.game_state?.date||state.gameState?.date;
  if(!state.world_engine&&!events.length)return null;
  const next=clone(state);next.player={...next.player,...scene.player};next.inventory=clone(scene.inventory||next.inventory);next.gameState={...next.gameState,...scene.game_state};
  const w=state.world_engine?normalizeWorld(state.world_engine,state):emptyWorld(state);next.world_engine=w;
  if(date)advanceCalendar(w,date);check(date||!events.length,'세계 사건의 현재 날짜 필요');
  const generated=[],originalBag=clone(next.inventory),originalPlayer=clone(next.player);let reward=false;
  for(const e of events){
    const digest=JSON.stringify(e);if(Object.hasOwn(w.applied,e.event_id)){check(w.applied[e.event_id]===digest,'같은 사건 ID의 내용 변경');continue;}check(Object.keys(w.applied).length<10000,'중복 방지 기록 한도');
    if(e.kind==='loot'){
      const battle=resolvedBattle(state,scene,e.battle_id),monster=lootCatalog.monsters.find(m=>m.monster_id===e.monster_id),participantId=e.participant_id||e.monster_id,claim=e.battle_id+':'+participantId;
      check(monster&&battle.participants.some(p=>p.id===participantId&&(p.catalog_id||p.id)===e.monster_id&&p.side==='enemy')&&battle.outcome.resources.some(r=>r.id===participantId&&r.hp===0),'실제 토벌한 마수 필요');check(!w.loot_claims[claim],'이미 판정한 개체 전리품');
      check(Array.isArray(e.items)&&e.items.length<=monster.loot_rolls.normal_defeat_rolls,'전리품 판정 횟수');
      for(const r of e.items){const entry=monster.roll_table.find(i=>i.item_id===r.id);check(entry&&integer(r.quantity,entry.min_qty,entry.max_qty),'마수 재료/수량 불일치');
        if(scene.battle){check(battle.outcome.items_added.some(v=>v.name===catalogItem(r.id).name&&v.quantity===r.quantity)&&quantity(next.inventory,r.id)-quantity(state.inventory,r.id)===r.quantity,'전투 종료 스냅샷의 실제 전리품 필요');}
        else {check(!scene.inventory,'전리품 스냅샷 중복 금지');check(!battle.outcome.items_added.some(v=>v.name===catalogItem(r.id).name),'전투에서 이미 지급한 전리품');give(next,r.id,r.quantity);reward=true;}
      }w.loot_claims[claim]={event_id:e.event_id,items:clone(e.items),date};
    }
    else if(e.kind==='discover_dungeon'){
      const d=worldData.dungeons.find(d=>d.id===e.dungeon_id);check(d,'미등록 던전');w.dungeons[d.id]??={discovered:true,region_id:d.region_id,run_id:null,zone_id:null,resolved:[],evidence:[],clears:0,claimed:false,history:[]};
    }
    else if(['enter_dungeon','enter_zone','resolve_zone','retreat','respawn','clear_dungeon'].includes(e.kind)){
      const {d,run}=currentRun(w,e.dungeon_id),region=scene.game_state?.region||state.gameState?.region,place=scene.game_state?.place||scene.location;
      check(region===d.region_id,'던전의 실제 영주령 필요');
      if(e.kind==='enter_dungeon'){
        check(!w.active_dungeon&&id(e.run_id)&&(!run.run_id||run.retreated),'진행 중 던전/재출현 확인');check([d.id,d.name].includes(place),'실제 던전 입구 진입 필요');
        check(!run.run_id||e.run_id===run.run_id,'퇴각 후 재진입은 같은 탐험 기록');run.run_id=e.run_id;run.retreated=false;run.zone_id=run.zone_id||d.entrance_zone_id;w.active_dungeon=d.id;
        generated.push({event_id:e.event_id,kind:'dungeon_enter',target_id:d.id,location:d.id,proof:e.reason,quantity:1});
      }
      else if(e.kind==='respawn'){
        const table=lootCatalog.dungeon_rewards.find(t=>t.dungeon_id===d.id);check(table.repeatable&&run.clears>0&&!w.active_dungeon&&day(date)>day(run.cleared_at)&&hasEvidence(scene,e.evidence_id,d.id),'실제 후속 재출현 사건 필요');
        run.run_id=null;run.zone_id=null;run.resolved=[];run.evidence=[];run.retreated=false;
      }
      else {check(w.active_dungeon===d.id&&run.run_id,'현재 탐험 중 던전 필요');
        if(e.kind==='retreat'){check(![d.id,d.name].includes(place),'실제 던전 밖 복귀 장소 필요');run.retreated=true;w.active_dungeon=null;}
        else {check([d.id,d.name].includes(place),'실제 던전 내부 장소 필요');
          if(e.kind==='enter_zone'){
            const zone=d.zones.find(z=>z.id===e.zone_id),previous=d.zones.filter(z=>!z.optional&&z.order<(zone?.order||0));check(zone&&previous.every(z=>run.resolved.includes(z.id)),'앞선 필수 구역 해결 필요');check(!zone.optional||hasEvidence(scene,e.evidence_id,zone.id),'숨겨진 구역의 실제 단서 필요');run.zone_id=zone.id;
          }
          else if(e.kind==='resolve_zone'){
            const zone=d.zones.find(z=>z.id===e.zone_id);check(zone&&run.zone_id===zone.id&&!run.resolved.includes(zone.id),'현재 미해결 구역 필요');
            if(['combat','boss','miniboss','midboss'].includes(zone.type)){resolvedBattle(state,scene,e.battle_id);check(!run.evidence.includes(e.battle_id),'같은 전투로 다른 구역을 중복 해결할 수 없습니다.');run.evidence.push(e.battle_id);if(zone.type==='boss')run.boss_battle_id=e.battle_id;}
            else check(hasEvidence(scene,e.evidence_id,zone.id),'구역의 실제 행동/단서 증거 필요');run.resolved.push(zone.id);
          }
          else if(e.kind==='clear_dungeon'){
            check(e.battle_id===run.boss_battle_id,'실제 보스 전투 참조 필요');check(d.zones.filter(z=>!z.optional).every(z=>run.resolved.includes(z.id)),'필수 구역과 보스 미해결');check(!w.loot_claims[e.battle_id+':dungeon'],'이미 정산한 보스 패키지');
            const table=lootCatalog.dungeon_rewards.find(t=>t.dungeon_id===d.id);check(!run.claimed||table.repeatable,'재클리어 불가');
            const pack=rewardPack(table,run,e);check(!events.some(v=>v.kind==='loot'&&v.battle_id===e.battle_id),'보스 패키지와 개별 전리품 중복 금지');
            if(scene.battle){check(scene.battle.battle_id===e.battle_id&&pack.xp===scene.battle.outcome.xp_gain,'보스 최초 패키지 XP 정산 불일치');for(const r of pack.items)check(scene.battle.outcome.items_added.some(i=>i.name===catalogItem(r.id).name&&i.quantity===r.quantity),'보스 패키지 보상 불일치');}
            else {const boss=resolvedBattle(state,scene,e.battle_id);check(!boss.outcome.xp_gain&&!boss.outcome.items_added.length,'보스 보상은 최초 클리어 패키지로 통합하세요.');check(!scene.player&&!scene.inventory&&!scene.engine_events?.some(v=>v.kind==='xp')&&!scene.quest_events?.some(v=>v.kind==='report'),'던전 보상 스냅샷/XP 중복 금지');awardXP(next,pack.xp);for(const r of pack.items)give(next,r.id,r.quantity);reward=true;}
            w.loot_claims[e.battle_id+':dungeon']={event_id:e.event_id,date};run.claimed=true;run.clears++;run.cleared_at=date;run.history.push({run_id:run.run_id,event_id:e.event_id,date,rewards:pack});w.active_dungeon=null;
            generated.push({event_id:e.event_id,kind:'dungeon_clear',target_id:d.id,location:d.id,proof:e.reason,quantity:1});
          }
        }
      }
    }
    else if(e.kind==='party'){
      check(Array.isArray(e.members)&&e.members.length<=6&&new Set(e.members).size===e.members.length,'동료 최대 6명');
      for(const member of e.members){const p=state.npc_life?.npcs[member];check(findNPC(member)&&p?.accompanying&&p.region===next.gameState.region&&p.place===next.gameState.place&&resolveNPC(state,member)?.hp>0,'실제로 동행하는 현지 생존 동료 필요');}w.party=clone(e.members);
    }
    else if(e.kind==='reputation'){check(kingdoms.includes(e.kingdom)&&integer(e.delta,-200,200),'국가 명성 변경');w.kingdom_reputation[e.kingdom]=Math.max(-100,Math.min(100,w.kingdom_reputation[e.kingdom]+e.delta));}
    else if(e.kind==='wanted'){check(kingdoms.includes(e.kingdom)&&typeof e.wanted==='boolean','수배 상태');w.wanted_flags[e.kingdom]=e.wanted;}
    else if(e.kind==='permit'){
      const p=e.permit;check(id(p?.id)&&kingdoms.includes(p.kingdom)&&findNPC(p.issuer_id)&&text(p.authority)&&text(p.purpose)&&day(p.valid_until)>=day(p.valid_from)&&day(p.valid_from)<=day(date),'통행증 실제 발급/권한/기간');check(!w.entry_permits.some(v=>v.id===p.id)&&w.entry_permits.length<128,'통행증 중복/한도');w.entry_permits.push(clone(p));
    }
    else if(e.kind==='border'){
      const routes={'BORDER-WE-01':['west','east'],'BORDER-WS-01':['west','south'],'BORDER-ES-01':['east','south']},pair=routes[e.route_id],from=kingdomOf(state.gameState.region),to=kingdomOf(next.gameState.region);
      check(pair?.includes(from)&&pair.includes(e.to)&&from!==e.to&&['passed','inspection','refused','detained'].includes(e.result),'국경 경로/검문 결과');
      if(e.result==='passed'){
        check(e.open===true&&to===e.to,'개방된 관문/목적지');const p=w.entry_permits.find(p=>p.id===e.permit_id&&p.kingdom===e.to&&day(p.valid_from)<=day(date)&&day(p.valid_until)>=day(date));
        if(e.method==='illegal')check(text(e.illegal_basis),'비합법 통과 GM 판정 근거');
        else {check(p&&!w.wanted_flags[e.to]&&w.kingdom_reputation[e.to]>=-20,'유효 통행증/수배/명성');if(w.kingdom_reputation[e.to]<20&&e.to!==w.national_origin)check(text(p.guarantor)||text(p.contract),'초행 입국 보증인 또는 공인 계약');}
      }else check(to===from,'검문 미통과 상태에서 실제 국가 이동 금지');
      w.active_border_route=e.result==='passed'?null:e.route_id;w.border_crossing_history.push({event_id:e.event_id,route_id:e.route_id,from,to:e.to,date,result:e.result,reason:e.reason});
    }
    else if(e.kind==='offer'){
      const o=e.offer;check(id(o?.id)&&text(o.venue_id)&&text(o.venue_name)&&/^(W[1-5]|E[1-4]|S[1-4])$/.test(o.region_id)&&['shop','facility'].includes(o.type)&&day(o.valid_until)>=day(date),'현지 견적/기한');check(!w.offers[o.id],'동일 견적의 재작성 금지');
      check(Array.isArray(o.items)&&o.items.length<=40,'견적 품목');for(const r of o.items)check(catalogItem(r.id)&&integer(r.stock)&&integer(r.buy_price)&&integer(r.sell_price)&&text(r.price_basis),'등록 물품/재고/GM 가격 근거');
      if(o.type==='facility'){const f=worldData.facilities.find(f=>f.id===o.venue_id);check(f&&f.region_id===o.region_id&&Array.isArray(o.services),'등록 전문 시설');for(const s of o.services){check(id(s.id)&&f.service.includes(s.service)&&integer(s.cost)&&text(s.basis),'실제 시설의 승인 서비스 견적');for(const r of [...(s.inputs||[]),...(s.outputs||[])])check(catalogItem(r.id)&&integer(r.quantity,1),'제작 재료/산출물');for(const field of ['hp_restore','mp_restore'])if(s[field]!==undefined)check(integer(s[field])&&['healing','rest','mana_rest'].includes(s.service),'회복 서비스/자원');if(s.xp!==undefined)check(integer(s.xp)&&/train|training/.test(s.service),'훈련 서비스만 XP 지급');}}
      check(Object.keys(w.offers).length<128,'견적 보존 한도');w.offers[o.id]=clone(o);
    }
    else if(e.kind==='trade'||e.kind==='service'){
      const o=w.offers[e.offer_id];check(o,'실제 발행한 견적 필요');assertOfferLocation(w,o,scene,date);
      check(!scene.inventory&&!scene.player&&!scene.quest_events?.some(v=>v.kind==='report'),'거래/서비스 보상 스냅샷 중복 금지');
      if(o.type==='facility'){const f=worldData.facilities.find(f=>f.id===o.venue_id);if(f.exclusive_specialty&&f.kingdom==='드라켄')check(w.kingdom_reputation.east>=20&&text(e.education_approval),'드라켄 공인 서고의 명성/교육 등록 허가');}
      if(e.kind==='trade'){
        const r=o.items.find(r=>r.id===e.item_id);check(r&&integer(e.quantity,1)&&['buy','sell'].includes(e.direction),'거래 품목/방향');
        if(e.direction==='buy'){check(r.stock>=e.quantity,'재고 부족');money(next,-r.buy_price*e.quantity);give(next,r.id,e.quantity);r.stock-=e.quantity;}
        else {check(catalogItem(r.id).tradable!==false,'거래 불가 물품');take(next,r.id,e.quantity);money(next,r.sell_price*e.quantity);r.stock+=e.quantity;}
      }else {
        check(o.type==='facility','전문 시설 견적 필요');const s=o.services.find(s=>s.id===e.service_id);check(s,'시설 서비스');const f=worldData.facilities.find(f=>f.id===o.venue_id);
        if(f.exclusive_specialty&&f.kingdom==='드라켄')check(w.kingdom_reputation.east>=20&&text(e.education_approval),'드라켄 공인 서고의 명성/교육 등록 허가');
        money(next,-s.cost);for(const r of s.inputs||[])take(next,r.id,r.quantity);for(const r of s.outputs||[])give(next,r.id,r.quantity);if(s.hp_restore){check(next.player.hp>0,'전투불능 소생은 별도 실제 판정 필요');next.player.hp=Math.min(next.player.maxHp,next.player.hp+s.hp_restore);}if(s.mp_restore)next.player.mp=Math.min(next.player.maxMp,next.player.mp+s.mp_restore);if(s.xp){check(!scene.engine_events?.some(v=>v.kind==='xp'),'훈련 XP 중복');awardXP(next,s.xp);}check(w.facility_history.length<1000,'시설 기록 한도');w.facility_history.push({event_id:e.event_id,facility_id:f.id,service:s.service,date});
      }
      check(w.transactions.length<1000,'거래 보존 한도');w.transactions.push({event_id:e.event_id,kind:e.kind,offer_id:o.id,date});reward=true;
    }
    else if(e.kind==='auction'){
      const a=e.auction;check(id(a?.id)&&!w.auctions[a.id]&&catalogItem(a.item_id)&&text(a.venue_id)&&text(a.venue_name)&&/^(W[1-5]|E[1-4]|S[1-4])$/.test(a.region_id)&&integer(a.reserve)&&day(a.closes_at)>=day(date)&&text(a.price_basis)&&a.eligible===true,'실제 경매 개설/참가 자격');w.auctions[a.id]={...clone(a),status:'open',bid:0,escrow:0};
    }
    else if(e.kind==='bid'||e.kind==='auction_result'){
      const a=w.auctions[e.auction_id];check(a&&a.status==='open','진행 중 경매');
      if(e.kind==='bid'){assertOfferLocation(w,{...a,valid_until:a.closes_at},scene,date);check(day(date)<day(a.closes_at)&&integer(e.amount,1)&&e.amount>=a.reserve&&e.amount>a.bid,'경매 기한/최저 입찰액');money(next,-(e.amount-a.escrow));a.bid=e.amount;a.escrow=e.amount;reward=true;}
      else {check(day(date)>=day(a.closes_at)&&['won','lost','cancelled'].includes(e.result),'경매 종료 시점/승패');check(!scene.player&&!scene.inventory,'경매 지급 스냅샷 중복');if(e.result==='won'){check(a.escrow>0&&e.final_price===a.bid&&text(e.authenticity_proof),'입찰/낙찰가/진품 확인');give(next,a.item_id,1);}else money(next,a.escrow);a.escrow=0;a.status=e.result;reward=true;}
    }
    else if(e.kind==='calendar_result'){
      const entry=w.annual_events[e.ref_id];check(entry&&['active','resolved','cancelled'].includes(e.status)&&!['resolved','cancelled'].includes(entry.status),'현재 연간 사건 판정');check(entry.year*360+(entry.month-1)*30<=day(date),'미래 사건 실행 금지');
      check(typeof e.known_to_player==='boolean'&&(!e.known_to_player||text(e.public_summary)),'공개 사건 설명');check(e.effects&&typeof e.effects==='object'&&!Array.isArray(e.effects),'지역 효과');
      for(const[k,v]of Object.entries(e.effects))check(['security','food','treasury','morale','tradeRisk','warRisk','monsterRisk','prices'].includes(k)&&Number.isFinite(v)&&Math.abs(v)<=999999,'누적 지역 효과');
      Object.assign(entry,{status:e.status,known_to_player:e.known_to_player,public_summary:e.known_to_player?e.public_summary:'',effects:e.status==='resolved'?clone(e.effects):{}});
      const month=w.monthly_world_state[entry.year+'-'+entry.month];if(month&&e.status==='resolved'&&entry.region_id){const changes=month.regional_changes[entry.region_id]??={};for(const[k,v]of Object.entries(e.effects))changes[k]=(changes[k]||0)+v;}
    }
    w.applied[e.event_id]=digest;
  }
  const from=kingdomOf(state.gameState?.region),to=kingdomOf(next.gameState.region);
  if(from&&to&&from!==to)check(events.some(e=>e.kind==='border'&&e.result==='passed'&&e.to===to),'실제 국가 이동에는 검문 판정 필요');
  if(scene.battle)for(const member of w.party){const p=state.npc_life?.npcs[member];if(p?.accompanying&&p.region===state.gameState.region&&resolveNPC(state,member)?.hp>0)check(scene.battle.participants.some(v=>v.id===member&&v.side==='allied'),'동료의 자동전투 참가 누락');}
  if(reward){ensureEngine(next);recalculateEquipment(next);}
  const effective={...scene};if(JSON.stringify(originalBag)!==JSON.stringify(next.inventory))effective.inventory=next.inventory;if(JSON.stringify(originalPlayer)!==JSON.stringify(next.player))effective.player=next.player;
  if(generated.length)effective.world_events=[...(scene.world_events||[]),...generated.filter(e=>!scene.world_events?.some(v=>v.event_id===e.event_id)).map(e=>({...e,location:scene.game_state?.place||scene.location}))];
  normalizeWorld(w,next);return {scene:effective,world_engine:w,currency:next.currency||0};
}
