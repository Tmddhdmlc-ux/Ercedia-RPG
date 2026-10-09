import {mapData} from './map-data.js';
import {worldData} from './world-data.js';
import {factionLocations} from './faction-data.js';
import {npcCatalog} from './npc-model.js';
import {actualPlace,regionalCommonNPCs} from './adventure-model.js';
import {calendarDay} from './quest-model.js';
export function currentMapPoint(state){
  const {region,place}=actualPlace(state);
  return mapData.locations.find(p=>p.id===region)||mapData.locations.find(p=>p.kind==='lordship'&&place.includes(p.label))||null;
}
export function mapRegionContext(state,id){
  const anchor=mapData.locations.find(p=>p.id===id),region=mapData.regions.find(p=>p.id===id);
  const ids=anchor?[anchor.id]:mapData.locations.filter(p=>p.region===id&&p.kind==='lordship').map(p=>p.id);
  const today=calendarDay(state.gameState?.date),current=currentMapPoint(state),confirmed=[],candidates=[];
  for(const p of npcCatalog){
    const record=state.npc_life?.npcs?.[p.id],schedule=today===null?null:record?.schedule?.find(s=>calendarDay(s.start)<=today&&calendarDay(s.end)>=today);
    if(state.npcStates?.[p.id]?.hp===0||record?.activity==='전투불능')continue;
    const inScene=ids.includes(actualPlace(state).region)&&(state.scene?.cast?.length?state.scene.cast:state.scene?.npc?[state.scene.npc]:[]).some(n=>n.id===p.id)&&state.scene?.location===actualPlace(state).place;
    const location=record?.accompanying?actualPlace(state):{region:schedule?.region||record?.region,place:schedule?.place||record?.place};
    if(record?.known&&ids.includes(location.region)||inScene&&!record?.location_confirmed&&!schedule){confirmed.push({id:p.id,name:p.name,place:location.place||actualPlace(state).place,activity:record?.known?record.activity:'활동 확인 필요'});}
  }
  const seen=new Set(confirmed.map(p=>p.id));
  for(const local of ids){const probe={...state,gameState:{...state.gameState,region:local,place:local}};for(const p of regionalCommonNPCs(probe))if(!seen.has(p.id)){candidates.push({id:p.id,name:p.name,job:p.job});seen.add(p.id);}}
  return {title:anchor?.label||region?.label||'지역 정보',current:!!current&&ids.includes(current.id),facilities:worldData.facilities.filter(p=>ids.includes(p.region_id)),factions:factionLocations.filter(p=>ids.includes(p.anchor_id)),confirmed,candidates};
}
export function mountMapContext(state,{selectCurrent}){
  const svg=document.getElementById('map-points'),panel=document.getElementById('map-panel'),ns='http://www.w3.org/2000/svg';
  const marker=document.createElementNS(ns,'g');marker.classList.add('map-current-position');marker.setAttribute('aria-label','현재 위치');marker.style.pointerEvents='none';
  const ring=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');ring.setAttribute('r','25');label.setAttribute('text-anchor','middle');label.setAttribute('y','-35');label.textContent='▼ 내 위치';marker.append(ring,label);svg.append(marker);
  const locate=document.createElement('button');locate.type='button';locate.className='map-locate-current';locate.onclick=()=>{const point=currentMapPoint(state);if(point)selectCurrent(point);};panel.querySelector('.map-navigation').append(locate);
  const tip=document.createElement('aside');tip.className='map-region-preview';tip.id='map-region-preview';tip.setAttribute('role','tooltip');tip.hidden=true;panel.append(tip);
  let leaveTimer;function hide(){clearTimeout(leaveTimer);tip.hidden=true;}tip.onpointerenter=()=>clearTimeout(leaveTimer);tip.onpointerleave=hide;window.addEventListener('resize',hide);
  function show(id,node){
    clearTimeout(leaveTimer);const info=mapRegionContext(state,id);tip.replaceChildren();
    const heading=document.createElement('h3');heading.textContent=info.title+(info.current?' · 현재 위치':'');tip.append(heading);
    for(const [title,rows] of [['시설',info.facilities.map(p=>p.name)],['공개 거점',info.factions.map(p=>p.name)],['현재 위치 확인',info.confirmed.map(p=>`${p.name} · ${p.place} · ${p.activity}`)],['찾아볼 주민 · 위치 확인 필요',info.candidates.map(p=>`${p.name} · ${p.job}`)]]){
      const heading=document.createElement('strong'),list=document.createElement('ul');heading.textContent=title;tip.append(heading);for(const text of rows.length?rows:['확인된 정보 없음']){const li=document.createElement('li');li.textContent=text;list.append(li);}tip.append(list);
    }
    tip.hidden=false;const rect=node.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(window.innerWidth-tip.offsetWidth-8,rect.right+12))+'px';tip.style.top=Math.max(8,Math.min(window.innerHeight-tip.offsetHeight-8,rect.top))+'px';
  }
  for(const node of panel.querySelectorAll('[data-region],[data-map-view]')){
    const id=node.dataset.region||node.dataset.mapView;node.setAttribute('aria-describedby',tip.id);node.addEventListener('pointerenter',()=>show(id,node));node.addEventListener('pointerleave',()=>{leaveTimer=setTimeout(hide,150);});node.addEventListener('focus',()=>show(id,node));node.addEventListener('blur',hide);node.addEventListener('click',hide);
  }
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  return {render(){hide();const p=currentMapPoint(state);locate.hidden=!!state.introDraft;locate.disabled=!p;locate.textContent=p?'⌖ 내 위치 · '+actualPlace(state).place:'⌖ 현재 위치 미확인';marker.style.display=!state.introDraft&&p&&(state.mapView==='world'||state.mapView===p.region)?'':'none';if(p)marker.setAttribute('transform',`translate(${p.x*1536} ${p.y*1024})`);locate.title='현재 영주령으로 지도 이동 · 세부 위치 좌표는 미정';}};
}
