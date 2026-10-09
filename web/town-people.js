import {actualPlace,nearbyPeople,regionalCommonNPCs} from './adventure-model.js';
import {findNPC} from './npc-model.js';
import {calendarDay} from './quest-model.js';
// Public presence only. A regional placement is a search candidate, not a meeting.
export function townPeople(state){
  if(state.world_engine?.active_dungeon)return [];
  const {region,place}=actualPlace(state),today=calendarDay(state.gameState?.date);
  if(!region)return [];
  const people=new Map();
  for(const p of nearbyPeople(state)){
    const record=state.npc_life?.npcs?.[p.id];
    const scheduled=today===null?null:record?.schedule?.find(s=>calendarDay(s.start)<=today&&calendarDay(s.end)>=today);
    if(state.npcStates?.[p.id]?.hp===0||record?.activity==='전투불능')continue;
    if(!record?.accompanying&&scheduled&&(scheduled.region!==region||scheduled.place&&scheduled.place!==place&&scheduled.place!==region))continue;
    const inScene=state.scene?.location===place&&(state.scene.cast?.length?state.scene.cast:[state.scene.npc]).some(n=>n?.id===p.id);
    const confirmed=inScene||record?.accompanying||record?.known&&record.place===place;
    if(!confirmed)continue;
    people.set(p.id,{...p,job:findNPC(p.id)?.duty||'직업 미확인',confirmed:true});
  }
  for(const p of regionalCommonNPCs(state))if(!people.has(p.id))people.set(p.id,{...p,activity:'활동 확인 필요',confirmed:p.presence_confirmed});
  return [...people.values()].map(p=>{
    const moving=state.npc_life?.npcs?.[p.id]?.activity==='이동 중';
    const canTalk=p.confirmed&&!moving;
    return {...p,canTalk,unavailableReason:moving?'이동 중이라 지금 만날 수 없습니다.':p.confirmed?'':'현재 위치가 확인되지 않아 직접 만남은 아직 확인되지 않았습니다.'};
  }).sort((a,b)=>Number(b.confirmed)-Number(a.confirmed));
}
export function townConversation(state,id){
  const person=townPeople(state).find(p=>p.id===id);if(!person?.canTalk)return null;
  const {region,place}=actualPlace(state);
  return `[현지 인물 방문] 실제 출발지 ${region} · ${place}. ${person.name}(${id})을 ${person.confirmed?'찾아가 대화를 시도한다':'현지에서 찾아 위치를 확인한 뒤 대화를 시도한다'}. 현재 위치·일정·직무·접근 경로·이동 시간과 만남 가능 여부를 확인한다. 다른 곳으로 이동했다면 소환하지 말고 부재와 확인 가능한 행방을 안내한다. 실제 만남이 성립할 때만 npc 또는 cast에 등록 ID=${id}, 등록 의상·표정을 넣고 해당 인물의 말투로 dialogue를 출력한다. 처음 만남과 재회는 기존 life_events와 기억을 따른다. 클릭만으로 위치·만남·호감도·성과나 보상을 확정하지 않는다.`;
}
export function mountTownPeople(state,{submit,isPending}){
  const panel=document.createElement('aside');panel.className='town-people';panel.setAttribute('aria-label','현지 인물 목록');document.getElementById('stage').append(panel);
  panel.addEventListener('click',e=>e.stopPropagation());
  const heading=document.createElement('button');heading.type='button';heading.className='town-people-heading';
  const list=document.createElement('div');list.className='town-people-list';list.id='town-people-list';heading.setAttribute('aria-controls',list.id);
  panel.append(heading,list);let collapsed=false,selected=null;
  heading.onclick=()=>{collapsed=!collapsed;list.hidden=collapsed;heading.setAttribute('aria-expanded',String(!collapsed));};
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){selected=null;for(const row of list.querySelectorAll('.town-person')){row.classList.remove('is-open');row.querySelector('button').setAttribute('aria-expanded','false');}heading.focus({preventScroll:true});e.stopPropagation();e.preventDefault();}});
  const busy=()=>isPending()||!!state.introDraft||!!state.battlePlayback&&!state.battlePlayback.done;
  function render(){
    panel.hidden=state.page!=='story'||!!state.introDraft||!state.player.name||document.querySelector('.game').dataset.title==='active'||!!state.battlePlayback&&!state.battlePlayback.done||!!state.world_engine?.active_dungeon;
    if(panel.hidden)return;
    const origin=actualPlace(state),people=townPeople(state);heading.textContent=`현지 인물 · ${people.length} ${collapsed?'＋':'−'}`;heading.setAttribute('aria-expanded',String(!collapsed));list.hidden=collapsed;list.replaceChildren();
    if(!people.some(p=>p.id===selected))selected=null;
    for(const [confirmed,label] of [[true,'위치 확인'],[false,'지역 주민 · 위치 미확인']]){
      const group=people.filter(p=>p.confirmed===confirmed);if(!group.length)continue;
      const title=document.createElement('p');title.className='town-people-group';title.textContent=label;list.append(title);
      for(const person of group){
        const row=document.createElement('article');row.className='town-person';row.classList.toggle('is-open',selected===person.id);
        const name=document.createElement('button');name.type='button';name.className='town-person-name';name.setAttribute('aria-expanded',String(selected===person.id));
        const label=document.createElement('strong'),job=document.createElement('small');label.textContent=person.name;job.textContent=person.job;name.append(label,job);
        const availability=document.createElement('p');availability.className='town-person-availability';availability.dataset.available=String(person.canTalk);availability.textContent=person.canTalk?'대화 가능':person.confirmed?'이동 중 · 대화 불가':'위치 미확인 · 대화 불가';name.title=person.unavailableReason||'현재 위치가 확인된 인물입니다.';
        const detail=document.createElement('div');detail.className='town-person-detail';detail.id='town-person-'+person.id;name.setAttribute('aria-controls',detail.id);
        const activity=document.createElement('p'),place=document.createElement('p'),talk=document.createElement('button');activity.textContent=person.confirmed?(person.accompanying?'동행 중':person.activity):person.unavailableReason;place.textContent=person.confirmed?(person.place||actualPlace(state).place):'이 지역에서 찾아볼 수 있는 주민';talk.type='button';talk.textContent=person.canTalk?'대화하러 가기':'지금은 만날 수 없음';talk.disabled=busy()||!person.canTalk;talk.title=person.unavailableReason;
        talk.onclick=()=>{const current=actualPlace(state);if(busy()||current.region!==origin.region||current.place!==origin.place)return;const request=townConversation(state,person.id);if(request)submit(request);};
        name.onclick=()=>{selected=selected===person.id?null:person.id;for(const other of list.querySelectorAll('.town-person')){const active=other===row&&selected!==null;other.classList.toggle('is-open',active);other.querySelector('button').setAttribute('aria-expanded',String(active));}};
        row.onpointerenter=name.onfocus=()=>name.setAttribute('aria-expanded','true');
        row.onpointerleave=()=>{if(selected!==person.id&&!row.contains(document.activeElement))name.setAttribute('aria-expanded','false');};
        name.onblur=e=>{if(selected!==person.id&&!row.contains(e.relatedTarget))name.setAttribute('aria-expanded','false');};
        detail.append(activity,place,talk);row.append(name,availability,detail);list.append(row);
      }
    }
    if(!people.length){const empty=document.createElement('p');empty.className='town-people-empty';empty.textContent='현재 확인된 현지 인물이 없습니다.';list.append(empty);}
  }
  return {render};
}
