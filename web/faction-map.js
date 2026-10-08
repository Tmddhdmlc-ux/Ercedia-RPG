import {factionLocations} from './faction-data.js';
import {mapData} from './map-data.js';
export const factionTypes={knight_order:['기사단','⚔','#ecc27e'],magic_tower:['마법탑','✦','#c7a4f4'],sanctuary:['교단 성지','✧','#e6e2bb'],guild:['길드','⌂','#a6d69d'],mercenary:['용병·호위','⚑','#e6a595'],merchant:['상단','◆','#e9cc6c'],civic:['민간조직','●','#a0d7d9'],diplomacy:['중재','◇','#bdd2ed']};
export function visibleFactions(view,selection){
  if(view==='world')return [];
  const anchor=mapData.locations.find(p=>p.id===selection);
  return factionLocations.filter(p=>p.region===view&&(!anchor||p.anchor_id===anchor.id));
}
export function factionInfo(id){
  const p=factionLocations.find(p=>p.id===id);
  if(!p)return null;
  const anchor=mapData.locations.find(a=>a.id===p.anchor_id);
  return {title:p.name,description:p.detail,fields:[['분류',factionTypes[p.type][0]],['대표 인물',p.leader||'미정'],['소속·단체',p.group],['활동 권역',anchor.label]],note:'대표 인물은 기본 활동 담당자이며 현재 실시간 위치를 뜻하지 않습니다. 거점의 세부 위치는 지도 배치 제안입니다.'};
}
export function mountFactionMap(state,{select}){
  const svg=document.getElementById('map-points'),container=document.getElementById('map-container');
  const list=document.getElementById('faction-list'),panel=document.getElementById('faction-panel');
  const tooltip=document.getElementById('faction-tooltip'),nodes=new Map();
  const ns='http://www.w3.org/2000/svg';
  function hide(){tooltip.hidden=true;}
  function show(p,node){
    tooltip.replaceChildren();
    const name=document.createElement('strong'),details=document.createElement('span');name.textContent=p.name;
    details.textContent=`${p.leader||'대표 인물 미정'} · ${p.group}\n${p.detail}`;tooltip.append(name,details);tooltip.hidden=false;
    const bounds=container.getBoundingClientRect(),point=node.getBoundingClientRect();
    tooltip.style.left=Math.max(8,Math.min(bounds.width-tooltip.offsetWidth-8,point.left-bounds.left+point.width/2-tooltip.offsetWidth/2))+'px';
    tooltip.style.top=Math.max(8,Math.min(bounds.height-tooltip.offsetHeight-8,point.bottom-bounds.top+8))+'px';
  }
  for(const p of factionLocations){
    const [type,glyph,color]=factionTypes[p.type];
    const group=document.createElementNS(ns,'g');group.dataset.faction=p.id;group.setAttribute('class','faction-pin');group.setAttribute('transform',`translate(${p.x*1536} ${p.y*1024})`);group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',p.name);group.setAttribute('aria-describedby','faction-tooltip');group.style.setProperty('--faction-color',color);
    const circle=document.createElementNS(ns,'circle');circle.setAttribute('r','14');
    const icon=document.createElementNS(ns,'text');icon.setAttribute('text-anchor','middle');icon.setAttribute('dy','.35em');icon.textContent=glyph;
    group.append(circle,icon);svg.append(group);
    const button=document.createElement('button');button.dataset.faction=p.id;
    const title=document.createElement('b'),caption=document.createElement('span'),organization=document.createElement('span');title.textContent=p.name;caption.textContent=`${type} · ${p.leader||'대표 인물 미정'}`;organization.textContent=p.group;organization.className='faction-card-group';button.append(title,caption,organization);list.append(button);
    for(const node of [group,button]){
      node.addEventListener('click',()=>{hide();select(p);});
      node.addEventListener('mouseenter',()=>show(p,group));node.addEventListener('mouseleave',hide);
      node.addEventListener('focus',()=>show(p,group));node.addEventListener('blur',hide);
    }
    group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();hide();select(p);}});
    nodes.set(p.id,{group,button});
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  container.addEventListener('scroll',hide);
  return {hide,render(){
    hide();const visible=visibleFactions(state.mapView,state.region);const ids=new Set(visible.map(p=>p.id));
    panel.hidden=state.mapView==='world';
    document.getElementById('faction-count').textContent=`${visible.length}곳`;
    document.getElementById('faction-empty').hidden=visible.length>0;
    for(const [id,{group,button}] of nodes){const active=ids.has(id);group.style.display=active?'':'none';button.hidden=!active;group.classList.toggle('selected',id===state.mapFaction);button.classList.toggle('selected',id===state.mapFaction);group.setAttribute('aria-pressed',String(id===state.mapFaction));button.setAttribute('aria-pressed',String(id===state.mapFaction));}
  }};
}
