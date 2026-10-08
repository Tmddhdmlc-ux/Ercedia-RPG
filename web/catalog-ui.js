import {catalogData} from './catalog-data.js';
import {npcCatalog,resolveNPC,npcRankLabel} from './npc-model.js';
export function mountCatalogUI(state,{request,isPending}){
  const $=id=>document.getElementById(id),display=v=>typeof v==='number'?v.toLocaleString('ko-KR'):'미정';
  let selected='serin',query='',regionKey=null,regionCards=[];
  const options=new Map();for(const p of npcCatalog){const option=document.createElement('option');option.value=p.id;option.textContent=p.name+' · '+p.affiliation;options.set(p.id,option);$('npc-catalog-select').append(option);}
  const fields=['소속','레벨','경지·지위','체력','마나','근력','민첩','지능','체력 능력치','마나 능력치','속도','기초 공격','관심도'];
  const views=fields.map(label=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;row.append(dt,dd);$('npc-catalog-fields').append(row);return dd;});
  function refresh(){
    const matches=npcCatalog.filter(p=>[p.name,p.affiliation,p.rank,p.location_id||''].join(' ').toLowerCase().includes(query));
    const matchIds=new Set(matches.map(p=>p.id));for(const [id,option] of options){const visible=matchIds.has(id);option.hidden=!visible;option.disabled=!visible;}
    if(!matches.some(p=>p.id===selected))selected=matches[0]?.id||'';
    $('npc-catalog-select').value=selected;$('npc-catalog-empty').hidden=!!selected;$('npc-catalog-card').hidden=!selected;
    $('npc-catalog-count').textContent=`${matches.length} / ${npcCatalog.length}명`;
    if(selected){const p=resolveNPC(state,selected,state.scene?.npc?.id===selected?state.scene.npc.profile||{}:{});$('npc-catalog-name').textContent=p.name;
      const values=[p.affiliation,display(p.level),npcRankLabel(p),`${display(p.hp)} / ${display(p.maxHp)}`,`${display(p.mp)} / ${display(p.maxMp)}`,display(p.strength),display(p.dexterity),display(p.intelligence),display(p.constitution),display(p.manaStat),display(p.speed),`${display(p.attackMin)} ~ ${display(p.attackMax)}`,p.interest==null?'아직 기록 없음':`${p.interest} / 100`];views.forEach((view,i)=>view.textContent=values[i]);
      $('npc-catalog-source').textContent=p.statStatus==='unassigned'?'이 인물의 숫자 능력치는 GitHub에 아직 등록되지 않았습니다.':'GitHub 초기 밸런싱 수치에 이 채팅의 부상·마나·관계 변화를 반영합니다.';
    }
    const allowed=!isPending()&&!state.introDraft&&!!state.player.name.trim();regionCards.forEach(b=>b.disabled=!allowed);
  }
  $('npc-catalog-search').oninput=e=>{query=e.target.value.trim().toLowerCase();refresh();};$('npc-catalog-select').onchange=e=>{selected=e.target.value;refresh();};
  $('npc-catalog-current').onclick=()=>{query='';$('npc-catalog-search').value='';selected=state.scene?.npc?.id||'serin';refresh();};
  function region(){
    const id=state.region,items=[...catalogData.regional.dungeons.filter(p=>p.region_id===id).map(p=>({...p,kind:'던전'})),...catalogData.regional.facilities.filter(p=>p.region_id===id).map(p=>({...p,kind:'시설'}))];
    $('regional-content').hidden=!items.length||!!state.introDraft;
    if(regionKey!==id){regionKey=id;regionCards=[];$('regional-content-list').replaceChildren();
      for(const p of items){const card=document.createElement('article'),title=document.createElement('h4'),description=document.createElement('p'),button=document.createElement('button');title.textContent=p.name;description.textContent=p.kind==='던전'?`${p.danger_rank} · 권장 Lv.${p.min}–${p.max} · 현지 소문·탐색으로 입구 확인`:p.description;
        button.textContent=p.kind==='던전'?'탐색 요청':'방문 요청';button.type='button';button.onclick=()=>request(`${p.kingdom} ${p.region_id}의 ${p.kind} '${p.name}' (${p.id})${p.kind==='던전'?'를 탐색하고, 실제 도착·입구 발견·입장 가능 여부를 판정해주세요.':'에 방문하여 이용 가능한 서비스를 확인하고 싶습니다.'} 현재 위치와 국경 통행·전쟁·비용 조건을 지키고 버튼을 눌렀다는 이유로 즉시 이동·보상·전투를 확정하지 마세요. REGIONAL_DUNGEONS.md 및 locations/regional_dungeons_facilities.json${p.kind==='던전'?'과 locations/dungeon_layouts.json':''}을 참조해주세요. 미발견 비밀 방은 공개하지 마세요.`);
        card.append(title,description,button);$('regional-content-list').append(card);regionCards.push(button);
      }
      $('regional-specialty').textContent=items.length?catalogData.regional.specializations[items[0].kingdom]:'';
    }refresh();
  }
  refresh();return {refresh,region};
}
