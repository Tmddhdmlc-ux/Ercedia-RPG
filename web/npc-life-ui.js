import {publicLife,lifeRole} from './npc-life.js';
import {findNPC} from './npc-model.js';
export function mountNPCLifeUI(state,{submit,isPending,getNPC}){
  const $=id=>document.getElementById(id),info=document.createElement('section'),actions=document.createElement('div'),journal=document.createElement('details'),summary=document.createElement('summary');
  info.className='npc-life-info';info.setAttribute('aria-label','인물의 활동과 기억');$('npc-info-card').append(info);
  actions.className='npc-life-actions';$('npc-action-menu').append(actions);summary.textContent='모험 일지 · 직접 경험한 사건';journal.append(summary);journal.className='adventure-journal';$('quests-panel').append(journal);
  const labels={talk:'대화하기',news:'최근 소식 묻기',quest:'개인 의뢰 확인',trade:'거래하기',companion:'동행 요청',advice:'수련 조언 요청',master:'사사 요청',goodbye:'작별 인사'};
  function render(){
    const id=getNPC?getNPC()?.id:state.scene?.npc?.id,p=id?publicLife(state,id):null;info.replaceChildren();actions.replaceChildren();
    if(p){const name=findNPC(id)?.name||id,role=lifeRole(id),lead=document.createElement('p');lead.textContent=`현재 활동: ${p.activity} · ${p.accompanying?'동행 중':'동행하지 않음'} · 호감도 ${p.affection} / 100`;info.append(lead);
      const last=document.createElement('p');last.textContent=p.last_meeting?`마지막 만남: ${p.last_meeting.date} · ${p.last_meeting.place}`:'이전 만남 기록 없음';info.append(last);
      const condition=document.createElement('p');condition.textContent=`피로: ${({rested:'휴식 충분',tired:'피곤함',exhausted:'탈진'})[p.fatigue]||'미확인'} · 부상: ${p.injuries.join(' · ')||'기록 없음'}`;info.append(condition);
      const quests=document.createElement('p');quests.textContent='관련 의뢰: '+(p.quests.map(id=>(state.quest_log||[]).find(q=>q.id===id)?.title||id).join(' · ')||'없음');info.append(quests);
      for(const m of p.memories){const line=document.createElement('p');line.textContent=`${m.date} · ${m.action}: ${m.result}`;info.append(line);}
      $('npc-interest-label').textContent=state.player.name+'에 대한 호감도';$('npc-info-interest').textContent=p.affection+' / 100';$('npc-info-interest-text').textContent='실제 사건으로 기록된 단일 호감도 · 요구 승낙을 보장하지 않습니다.';
      const main=['talk','news',role==='merchant'?'trade':'quest','goodbye'],more=document.createElement('details'),heading=document.createElement('summary');heading.textContent='추가 행동';more.append(heading);
      for(const key of [...main,...Object.keys(labels).filter(k=>!main.includes(k))]){const b=document.createElement('button');b.type='button';b.textContent=labels[key]+(['companion','advice','quest'].includes(key)&&p.affection<20?' · 조건 확인':key==='master'&&p.affection<50?' · 조건 확인':'');b.disabled=isPending();b.onclick=()=>submit(`${name}(${id})에게 ${labels[key]} 행동을 요청합니다. 현재 일정·소속·호감도·기억·본인 의사·법적 조건을 확인하고 반응을 판정하세요. 메뉴 클릭만으로 동행·거래·사사·의뢰가 성공하지 않습니다.`);(main.includes(key)?actions:more).append(b);}actions.append(more);
    }
    journal.replaceChildren(summary);const memories=state.npc_life?.memories.filter(m=>m.player_witnessed).slice(-30)||[];for(const m of memories){const line=document.createElement('p');line.textContent=`${m.date} · ${findNPC(m.npc_id)?.name||m.npc_id} · ${m.location} · ${m.action}: ${m.result}`;journal.append(line);}
    for(const t of state.npc_life?.traces.filter(t=>t.player_known).slice(-10)||[]){const line=document.createElement('p');line.textContent=`${t.date} · ${t.region}: ${t.effect}`;journal.append(line);}
    if(!memories.length){const line=document.createElement('p');line.textContent='직접 경험한 주요 사건이 여기에 기록됩니다.';journal.append(line);}
  }
  return {render};
}
