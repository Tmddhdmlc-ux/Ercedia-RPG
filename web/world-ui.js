import {worldData} from './world-data.js';
import {emptyWorld,kingdomOf} from './world-engine.js';
import {catalogItem} from './item-catalog.js';
import {findNPC} from './npc-model.js';
export function mountWorldUI(state,{submit,isPending}){
  const $=id=>document.getElementById(id),roots={};
  for(const [key,parent,title]of [['country','status-panel','국가 명성·통행'],['party','status-panel','동료·파티'],['explore','map-sidebar','던전·지역 시설'],['trade','inventory-panel','상점·경매'],['calendar','quests-panel','달력·지역 소식']]){
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');details.className='world-system';summary.textContent=title;details.append(summary,body);$(parent).append(details);roots[key]={details,body};details.ontoggle=()=>{if(details.open)draw(key);};
  }
  const line=(parent,value)=>{const p=document.createElement('p');p.textContent=value;parent.append(p);};
  function request(parent,label,action,disabled=false){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled||isPending();button.onclick=()=>submit(action+' 실제 조건을 판정하고 성공한 변경만 WORLD_ENGINE_SCHEMA.md의 system_events로 확인하세요.');parent.append(button);}
  function draw(key){
    const w=state.world_engine||emptyWorld(state),root=roots[key].body,region=state.gameState.region,date=state.gameState.date||'날짜 미정';root.replaceChildren();
    if(key==='country'){
      for(const [k,name]of [['west','벨로아'],['east','드라켄'],['south','루메린']])line(root,`${name} · 명성 ${w.kingdom_reputation[k]}${w.wanted_flags[k]?' · 수배 중':''}`);
      line(root,'통행증과 실제 입국 허가가 있어야 타국 시설을 이용할 수 있습니다.');for(const p of w.entry_permits)line(root,`${p.purpose} · ${p.kingdom} · ${p.valid_until}까지`);
      for(const [route,name]of [['BORDER-WE-01','서동 검문관'],['BORDER-WS-01','서남 상단 관문'],['BORDER-ES-01','동남 교량 검문소']])request(root,name+' 문의',`${route} 국경 검문소의 현재 개방 상태와 필요한 통행증·보증인·합법 경로를 문의한다. 아직 이동하지 않는다.`);
    }
    if(key==='party'){
      line(root,'현재 파티 · '+(w.party.map(id=>findNPC(id)?.name||id).join(' · ')||'없음'));
      const accompanying=Object.entries(state.npc_life?.npcs||{}).filter(([,p])=>p.accompanying&&p.region===region);
      for(const[id,p]of accompanying){line(root,`${findNPC(id)?.name||id} · ${p.activity} · ${p.place}`);const removing=w.party.includes(id),members=removing?w.party.filter(v=>v!==id):[...w.party,id];request(root,removing?'파티에서 제외':'파티에 편성',`${id}의 동행 의사·위치·부상·직무를 확인하고 파티 members=${JSON.stringify(members)} 편성을 요청한다.`,!removing&&members.length>6);}
      if(!accompanying.length)line(root,'NPC와 실제로 만나 동행을 합의하면 이곳에서 파티를 편성할 수 있습니다.');
    }
    if(key==='explore'){
      line(root,`실제 위치 · ${region||'미확인'} · ${state.gameState.place||''}`);
      const active=w.active_dungeon&&worldData.dungeons.find(d=>d.id===w.active_dungeon);
      if(active){const run=w.dungeons[active.id];line(root,`${active.name} · ${run.resolved.length}/${active.zones.filter(z=>!z.optional).length} 구역 해결`);
        for(const z of active.zones){const done=run.resolved.includes(z.id),selected=z.id===run.zone_id;line(root,`${done?'✓':selected?'▶':'○'} ${z.name}`);if(!done)request(root,selected?'구역 조사·진행':'구역 진입 요청',`${active.id}의 ${z.id} ${z.name} 구역을 ${selected?'조사하고 실제 장애물을 해결':'진입'}한다. 구역 종류 ${z.type}, 진입 조건 ${z.entry_rule}. 전투는 먼저 관전하고 끝난 뒤 resolve_zone으로 확인한다. 단서 없는 숨겨진 방은 열지 않는다.`);}
        request(root,'퇴각 요청',`${active.id}에서 안전하게 퇴각을 시도한다. 부상·소모 자원과 복귀 장소를 기록하며 자동 회복하지 않는다.`);
        if(active.zones.filter(z=>!z.optional).every(z=>run.resolved.includes(z.id)))request(root,'클리어 확인·보상',`${active.id} 필수 구역과 실제 보스 ${run.boss_battle_id} 결과를 확인하고 clear_dungeon 보상 패키지를 한 번만 정산한다.`);
      }else for(const d of worldData.dungeons.filter(d=>d.region_id===region)){const run=w.dungeons[d.id];line(root,`${d.name} · 권장 Lv.${d.level_range.join('–')} · ${d.danger_rank}${run?.claimed?' · 최초 보상 수령함':''}`);request(root,run?.discovered?'탐험 요청':'입구 조사',`${d.id} ${d.name}의 현지 소문·입구·진입 조건을 조사하고 ${run?.discovered?'실제 던전 진입':'발견한 경우에만 discover_dungeon'}을 판정한다. 반복 탐험은 실제 재출현 증거가 있어야 한다.`);}
      for(const f of worldData.facilities.filter(f=>f.region_id===region)){line(root,f.name+' · '+f.description);request(root,'시설 방문·견적',`${f.id} ${f.name}에 실제 방문하여 ${f.service.join(', ')} 서비스의 현재 조건·비용·재료·산출물을 문의한다. 시설에 맞는 offer를 제시하되 거래·훈련은 아직 실행하지 않는다.`);}
      if(!worldData.dungeons.some(d=>d.region_id===region))line(root,'이 지역의 등록된 던전·시설이 없습니다. 지도 열람은 실제 이동이 아닙니다.');
    }
    if(key==='trade'){
      line(root,`보유 재화 · ${(state.currency||0).toLocaleString()} · 실제 현지 거래만 가능`);
      for(const o of Object.values(w.offers).filter(o=>o.region_id===region)){
        line(root,`${o.venue_name} · 견적 ${o.id} · ${o.valid_until}까지`);
        for(const r of o.items){line(root,`${catalogItem(r.id)?.name} · 재고 ${r.stock} · 구매 ${r.buy_price} / 판매 ${r.sell_price}`);request(root,'1개 구매',`견적 ${o.id}에서 ${r.id} 1개를 ${r.buy_price} 재화로 구매한다. 현재 장소·재고·재화·허가를 검사한다.`,!r.stock);request(root,'1개 판매',`견적 ${o.id}에서 소유한 ${r.id} 1개를 ${r.sell_price} 재화에 판매한다. 장착된 물품은 판매하지 않는다.`);}
        for(const service of o.services||[]){line(root,`${service.service} · 비용 ${service.cost}${service.xp?' · 확인된 훈련 XP '+service.xp:''}${service.hp_restore?' · HP +'+service.hp_restore:''}${service.mp_restore?' · MP +'+service.mp_restore:''}`);request(root,'서비스 요청',`견적 ${o.id}의 ${service.id} 서비스를 ${service.cost} 재화와 견적의 입력 재료로 이용한다. 견적의 산출물만 지급하며 경지를 자동 돌파하지 않는다.`);}
      }
      for(const a of Object.values(w.auctions).filter(a=>a.region_id===region)){
        line(root,`${catalogItem(a.item_id)?.name} · ${a.status} · 내 입찰 ${a.bid} · 예치 ${a.escrow} · 마감 ${a.closes_at}`);
        if(a.status==='open'){const input=document.createElement('input');input.type='number';input.min=String(Math.max(a.reserve,a.bid+1));input.value=input.min;input.setAttribute('aria-label',catalogItem(a.item_id)?.name+' 입찰액');root.append(input);const button=document.createElement('button');button.type='button';button.textContent='입찰 요청';button.disabled=isPending();button.onclick=()=>{const amount=Number(input.value);if(Number.isSafeInteger(amount)&&amount>0)submit(`${a.id} 경매에 ${amount} 재화를 입찰한다. 참가 자격·시간·자금을 검사하고 bid로 확인하며 마감 전에는 물품을 지급하지 않는다.`);};root.append(button);request(root,'마감 결과 확인',`${a.id} 경매의 실제 마감 시각·다른 입찰·진품 판정을 확인하고 auction_result로 낙찰 또는 예치금 환급을 처리한다.`);}
      }
      request(root,'현지 상점·경매 문의',`${region||'현재 지역'}의 실제 상인 또는 게시된 경매를 알아본다. 가격·재고·참가 자격을 현재 경제·명성·시점에 맞춰 offer 또는 auction으로 제시한다. 존재하지 않는 공식 길드나 고정 가격을 발명하지 않는다.`);
    }
    if(key==='calendar'){
      line(root,`${date} · 12개월 × 30일 · 계획은 실제 개최를 보장하지 않습니다.`);
      const year=w.calendar.month_cursor!==null?Math.floor(w.calendar.month_cursor/12):null;
      const visible=Object.values(w.annual_events).filter(e=>e.year===year&&(!e.region_id||e.region_id===region||e.known_to_player)&&e.known_to_player);
      for(const e of visible){line(root,`${e.month}월 · ${e.name} · ${e.status}${e.region_id?' · '+e.region_id:''}`);if(e.public_summary)line(root,e.public_summary);}
      if(!visible.length)line(root,'현재 알려진 연간 사건이 없습니다. 시간이 진행되면 일정 후보를 준비하고 GM이 조건과 결과를 판정합니다.');
      request(root,'현재 일정·지역 소식',`${date}의 현재 달력 후보와 실제 지역 상황을 확인한다. 조건에 맞는 사건만 calendar_result로 진행하고 먼 지역의 비밀은 소문·보고 없이 알려주지 않는다.`);
    }
  }
  return {render(){for(const[key,r]of Object.entries(roots))if(r.details.open)draw(key);}};
}
