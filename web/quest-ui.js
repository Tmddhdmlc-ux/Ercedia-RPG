import {questProgress,calendarDay,questMapPoint} from './quest-model.js';
import {mapData} from './map-data.js';
import {findNPC} from './npc-model.js';
import {questItems} from './quest-data.js';
export const questLabels={offered:'수주 가능',accepted:'수락됨',active:'진행 중',ready_to_report:'보고 가능',completed:'완료',failed:'실패',expired:'기한 만료',abandoned:'포기',declined:'거절'};
export function currentQuestRegion(state){
  if(/^(W[1-5]|E[1-4]|S[1-4])$/.test(state.gameState.region||''))return state.gameState.region;
  const place=state.gameState.place||state.scene?.location||'';
  return mapData.locations.find(p=>p.kind==='lordship'&&place.includes(p.label))?.id||(/솔브린|써니 빌리지/.test(place)?'W3':null);
}
export function mountQuestUI(state,{chat,switchTo,persist,showMap}){
  const $=id=>document.getElementById(id);let filter='active',selected=null;
  const regionName=id=>mapData.locations.find(p=>p.id===id)?.label||id;
  function deadline(q){const end=calendarDay(q.deadline_at),now=calendarDay(state.gameState.date);return !q.deadline_at?'기한 없음':end!==null&&now!==null?`기한 ${Math.max(0,end-now)}일 남음`:`기한 ${q.deadline_at}`;}
  function issuer(q){return q.issuer_name||findNPC(q.issuer_npc_id)?.name||q.issuer_faction_id||'발행자 미정';}
  function action(q,kind){if(chat.isPending())return;switchTo('story');chat.controls();chat.submit(`의뢰 [${q.id}] 「${q.title}」에 대해 ${({accept:'수락하고 싶습니다. 발행자의 실제 조건과 호감도·성격·상황을 확인해 수락 여부를 판정해주세요',decline:'정중하게 거절합니다',detail:'목표와 보상, 조건을 자세히 듣고 싶습니다',abandon:'포기 의사를 전하고 실제 결과를 판정받겠습니다',report:'실제 목표 증거를 제출하고 발행자에게 완료 보고합니다. 검증 뒤 quest_events report로 한 번만 정산해주세요'})[kind]}. 제 행동만으로 성공이나 완료를 확정하지 마세요.`);}
  function button(label,fn){const el=document.createElement('button');el.type='button';el.textContent=label;el.disabled=chat.isPending();el.onclick=fn;return el;}
  function render(){
    const log=state.quest_log||[],nowRegion=currentQuestRegion(state),busy=chat.isPending()||!!state.introDraft;
    $('quest-region').textContent=(nowRegion?regionName(nowRegion):'현재 영주령 미확인')+` · 보유 재화 ${state.currency||0}`;$('quest-board').disabled=busy||!nowRegion;
    const groups={active:['accepted','active','ready_to_report'],available:['offered'],complete:['completed'],failed:['failed','expired','abandoned','declined']};
    document.querySelectorAll('[data-quest-filter]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.questFilter===filter));});
    const shown=log.filter(q=>groups[filter].includes(q.status)&&(filter!=='available'||q.origin!=='guild_board'||q.region_id===nowRegion));
    if(selected&&!shown.some(q=>q.id===selected))selected=null;
    const list=$('quest-list');list.replaceChildren();$('quest-empty').hidden=!!shown.length;
    $('quest-empty').textContent=filter==='available'?'현재 알려진 의뢰가 없습니다. 현지 게시 창구를 조회하거나 NPC와 대화해보세요.':'이 분류에 기록된 의뢰가 없습니다.';
    for(const q of shown){const card=document.createElement('button');card.type='button';card.className='quest-card';card.dataset.status=q.status;card.setAttribute('aria-pressed',String(selected===q.id));const title=document.createElement('strong'),meta=document.createElement('span'),issuerLine=document.createElement('span'),bar=document.createElement('progress'),footer=document.createElement('span');title.textContent=q.title;meta.textContent=`${q.rank||'미정'}등급 · ${questLabels[q.status]}`;issuerLine.textContent=`${issuer(q)} · ${regionName(q.region_id)}`;bar.max=100;bar.value=questProgress(q);bar.setAttribute('aria-label',q.title+' 진행률');footer.textContent=`진행 ${bar.value}% · ${deadline(q)}`;card.append(title,meta,issuerLine,bar,footer);card.onclick=()=>{selected=q.id;render();};list.append(card);}
    const q=log.find(q=>q.id===selected),detail=$('quest-detail');detail.hidden=!q;detail.replaceChildren();
    if(q){const heading=document.createElement('h3'),description=document.createElement('p'),info=document.createElement('p');heading.textContent=q.title;description.textContent=q.summary;info.textContent=`발행자 ${issuer(q)} · ${regionName(q.region_id)} · ${deadline(q)}`;detail.append(heading,description,info);
      const goals=document.createElement('ul');for(const o of q.objectives){const li=document.createElement('li');li.textContent=`${o.current>=o.target?'✓':'○'} ${o.description} · ${o.current}/${o.target}`;goals.append(li);}detail.append(goals);
      const reward=document.createElement('p');reward.textContent=`약속 보상: EXP ${q.reward.xp} · 재화 ${q.reward.currency} · 아이템 ${q.reward.item_ids.length+q.reward.materials.length}종 · 호감도 ${q.reward.affection_effects.length}명${q.claim_event_id?' · 지급 완료':''}`;detail.append(reward);
      if(q.reward.item_ids.length||q.reward.materials.length){const items=document.createElement('p');items.textContent=[...q.reward.item_ids.map(id=>questItems.find(i=>i.id===id)?.name||id),...q.reward.materials.map(r=>`${questItems.find(i=>i.id===r.id)?.name||r.id} ×${r.quantity}`)].join(' · ');detail.append(items);}
      for(const effect of q.reward.affection_effects){const p=document.createElement('p');p.textContent=`${findNPC(effect.npc_id)?.name||effect.npc_id} 호감도 ${effect.delta>=0?'+':''}${effect.delta} · ${effect.reason}`;detail.append(p);}
      const journal=document.createElement('details'),summary=document.createElement('summary');summary.textContent='진행 기록';journal.append(summary);for(const entry of q.journal.slice(-20)){const p=document.createElement('p');p.textContent=entry;journal.append(p);}detail.append(journal);
      const actions=document.createElement('div');actions.className='quest-actions';if(q.status==='offered'){actions.append(button('수락 요청',()=>action(q,'accept')),button('거절',()=>action(q,'decline')));}if(['accepted','active','ready_to_report'].includes(q.status))actions.append(button('포기 요청',()=>action(q,'abandon')));if(q.status==='ready_to_report')actions.append(button('완료 보고',()=>action(q,'report')));actions.append(button('자세히 듣기',()=>action(q,'detail')));const point=questMapPoint(q);if(point)actions.append(button('지도에서 보기',()=>showMap(point)));detail.append(actions);
    }
    const offers=log.filter(q=>q.status==='offered'&&q.origin!=='guild_board'&&(!q.issuer_npc_id||q.issuer_npc_id===state.scene?.npc?.id));
    const proposal=$('quest-proposals');proposal.replaceChildren();proposal.hidden=!offers.length||!!state.introDraft;
    for(const q of offers.slice(0,3)){const card=document.createElement('article'),title=document.createElement('strong'),body=document.createElement('p'),actions=document.createElement('div');title.textContent=`의뢰 제안 · ${q.title}`;body.textContent=`${q.rank||'미정'}등급 · ${issuer(q)} · ${q.summary}`;actions.className='quest-actions';actions.append(button('수락',()=>action(q,'accept')),button('거절',()=>action(q,'decline')),button('자세히 듣기',()=>{selected=q.id;filter='available';switchTo('quests');render();}),button('조건 협상',()=>{$('free-action').focus();}));card.append(title,body,actions);proposal.append(card);}
  }
  $('quests-tab').onclick=()=>{if(state.introDraft||state.battlePlayback&&!state.battlePlayback.done)return;switchTo('quests');render();persist();};
  document.querySelectorAll('[data-quest-filter]').forEach(el=>el.onclick=()=>{filter=el.dataset.questFilter;render();});
  $('quest-to-story').onclick=()=>{switchTo('story');persist();};
  $('quest-board').onclick=()=>{const region=currentQuestRegion(state);if(!region||chat.isPending())return;switchTo('story');chat.submit(`현재 ${regionName(region)}(${region})의 실제 현지 게시·연락 창구에 접근할 수 있는지 확인하고, 가능하면 현재 날짜·전쟁·마수·NPC 사정에 맞는 수주 가능 의뢰를 조회합니다. 접근 불가면 이동 조건을 알려주세요. quest_updates offered로 실제 발행 가능한 의뢰만 기록하고, 공식 길드 본부나 지부를 새로 만들지 마세요. 고정 템플릿을 그대로 반복하지 마세요.`);};
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.key.toLowerCase()!=='q'||e.target?.closest?.('input,textarea,select,[contenteditable="true"],dialog,[role="dialog"]')||document.querySelector('.game').dataset.title==='active')return;e.preventDefault();if(state.page==='quests')$('quest-to-story').click();else $('quests-tab').click();});
  return {render};
}
