import {placedNPCs,placementLabel,registeredArt,artBase,heraldryPath} from './character-art.js';
import {findNPC} from './npc-model.js';
export function mountNPCLocations(state,{request,isPending,assetBase,onSelect}){
  const panel=document.getElementById('regional-npcs'),list=document.getElementById('regional-npc-list');
  const symbol=document.getElementById('region-heraldry');let key=null,buttons=[];
  symbol.onerror=()=>{symbol.hidden=true;};
  return {render(){
    const path=heraldryPath(state.region,state.mapFaction);symbol.hidden=!path;
    if(path){const url=artBase(assetBase)+path;if(symbol.getAttribute('src')!==url)symbol.src=url;symbol.alt='선택한 지역 또는 세력의 문장';}
    const rows=placedNPCs(state.region,state.mapFaction,state);panel.hidden=!rows.length||!!state.introDraft;
    const next=state.region+':'+(state.mapFaction||'')+':'+rows.map(p=>p.id+'@'+p.location_id).join(',');
    if(key!==next){key=next;buttons=[];list.replaceChildren();
      for(const pos of rows){
        const p=findNPC(pos.id);if(!p)continue;
        const card=document.createElement('article'),image=new Image(),name=document.createElement('button'),detail=document.createElement('p'),talk=document.createElement('button');
        image.loading='lazy';image.src=artBase(assetBase)+(registeredArt[p.id]?.portrait||'assets/characters/main/serin/base_transparent.png');image.alt=p.name+' 초상화';image.onerror=()=>{image.hidden=true;};
        name.type='button';name.className='npc-location-name';name.textContent=p.name;name.onclick=()=>onSelect(p.id);
        detail.textContent=p.affiliation+' · '+placementLabel(p.id,state);talk.type='button';talk.textContent=p.role==='monster'?'탐색 요청':'만남 요청';
        talk.onclick=()=>request(`${p.name} (${p.id})의 활동 지역 ${placementLabel(p.id,state)} (${pos.location_id})에서 ${p.role==='monster'?'흔적을 탐색':'만남을 시도'}하고 싶습니다. 현재 실제 위치·이동 거리·통행 조건·상대 일정과 소속을 확인하고 가능 여부를 판정해주세요. 지도상의 기본 거점 표시만으로 도착이나 만남을 확정하지 마세요.`);
        card.append(image,name,detail,talk);list.append(card);buttons.push(talk);
      }
    }
    document.getElementById('regional-npc-count').textContent=rows.length+'명';
    buttons.forEach(b=>b.disabled=isPending()||!!state.introDraft||!state.player.name.trim());
  }};
}
