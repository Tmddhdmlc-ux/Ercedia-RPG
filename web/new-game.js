import {introData} from './intro-data.js';
import {regionBackground} from './location-art.js';
import {introSteps,passiveCandidates,creationFields,initialPlayer,normalizeIntroDraft,passiveLimits} from './intro-model.js';
import {defaults,normalize} from './state.js';
import {mapData} from './map-data.js';
import {factionLocations} from './faction-data.js';
import {loadCampaignSettings,campaignNPCStates} from './campaign-settings.js';
import {npcCatalog} from './npc-model.js';
import {freshCampaign} from './new-game-state.js';
import {startRegionInfo,automaticStartLordship} from './start-regions.js';
export function mountNewGame(state,{render,persist,chat,embedded}){
  const $=id=>document.getElementById(id),game=document.querySelector('.game');
  const screen=$('intro-screen'),options=$('intro-options'),mapPanel=$('start-location-panel');
  let lastStep='',starting=false,settings=null;
  async function readSettings(){
    starting=true;chat.controls();
    try{settings=await loadCampaignSettings({onProgress:message=>{$('title-load-note').textContent=message;chat.reportStatus(message);}});return settings;}
    finally{starting=false;chat.controls();}
  }
  const available=()=>!!state.introDraft;
  const text=(tag,value,parent)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
  function save(){persist();chat.controls();}
  async function begin({restart=false}={}){
    if(chat.isPending())return false;
    await readSettings();
    if(!state.introDraft||restart)state.introDraft=normalizeIntroDraft({step:'name',previousView:state.introDraft?.previousView||{page:state.page,mapView:state.mapView,region:state.region}});
    save();render();
    document.dispatchEvent(new CustomEvent('ercedia:new-game-started',{detail:{settings}}));
    if(embedded)chat.sendSettings?.(settings);
    return true;
  }
  function cancel(){
    if(!state.introDraft)return;
    Object.assign(state,state.introDraft.previousView);delete state.introDraft;lastStep='';save();render();
    document.dispatchEvent(new Event('ercedia:intro-cancelled'));
  }
  function go(step){
    state.introDraft.step=step;
    if(['kingdom','lordship','confirmation'].includes(step)){
      state.page='map';state.mapView=state.introDraft.kingdom||'world';state.region=state.introDraft.lordship||state.mapView;
    }
    save();render();
  }
  function back(){
    if(['confirmation','lordship'].includes(state.introDraft.step)){go('kingdom');return;}
    const index=introSteps.indexOf(state.introDraft.step);if(index>0)go(introSteps[index-1]);
  }
  function next(){
    const draft=state.introDraft;if(!draft)return;
    if(draft.step==='name'&&!draft.name.trim()){ $('intro-error').textContent='너의 이름을 먼저 들려다오.';$('intro-input').focus();return; }
    if(['calling','response'].includes(draft.step)&&!introData.questions.find(q=>q.id===draft.step).options.some(o=>o.id===draft.answers[draft.step])){ $('intro-error').textContent='마음과 가까운 답 하나를 골라다오.';return; }
    if(draft.step==='passive'&&!passiveCandidates(draft.answers).includes(draft.passive)){ $('intro-error').textContent='네 여정에 함께할 기질 하나를 골라다오.';return; }
    if(draft.step==='goal'&&!draft.goal?.trim()){$('intro-error').textContent='이루고 싶은 꿈이나 어떤 사람으로 살아갈지 들려다오. 아직 모르겠다고 답해도 좋다.';$('intro-goal').focus();return;}
    if(draft.step==='lordship'&&!draft.lordship)return;
    go(introSteps[introSteps.indexOf(draft.step)+1]);
  }
  function syncMap(){
    const draft=state.introDraft;if(!draft||!['kingdom','lordship','confirmation'].includes(draft.step))return;
    const kingdom=introData.start_regions.find(r=>r.id===state.mapView);if(!kingdom){if(state.mapView==='world'&&draft.kingdom){draft.kingdom='';draft.lordship='';draft.step='kingdom';save();refresh();}return;}
    const id=automaticStartLordship(kingdom.id,draft.kingdom===kingdom.id?draft.lordship:null);
    if(draft.kingdom!==kingdom.id){
      draft.kingdom=kingdom.id;draft.lordship=id;draft.step='confirmation';state.region=id;save();refresh();
    }
  }
  async function complete(){
    if(chat.isPending()){$('intro-map-error').textContent='ChatGPT의 설정 읽기 응답을 기다리고 있습니다.';return;}
    try{
      if(!settings){$('intro-map-next').disabled=true;await readSettings();}
      const draft=state.introDraft,fields=creationFields(draft),passive=introData.passives.find(p=>p.id===fields.starting_passive_id);
      const place=mapData.locations.find(p=>p.id===fields.starting_lordship_id);
      const fresh=freshCampaign(state,draft,settings,globalThis.crypto?.randomUUID?.()||'campaign-'+Date.now());
      for(const key of Object.keys(state))delete state[key];Object.assign(state,fresh);lastStep='';
      save();render();
      const scene={schema_version:1,type:'ercedia_scene',scene_id:'new-game-'+Date.now()+'-'+Math.random().toString(36).slice(2),location:fresh.gameState.place,time:fresh.gameState.time,background_id:regionBackground(fields.starting_lordship_id),npc:null,dialogue:[{speaker:'나레이션',text:`${fields.character_name}, ${fields.starting_kingdom}의 ${place.label}에서 당신의 여정이 시작된다.`},{speaker:'나레이션',text:`당신은 영주령 안의 안전한 정착지에 도착했다. 아직 이름이 확정되지 않은 임시 시작점이다. ${passive.name}을 품고, 이제 첫걸음을 내딛는다.`}],choices:[]};
      chat.setCampaignSettings(null);chat.apply(JSON.stringify(scene));
      chat.setCampaignSettings(settings);
      document.dispatchEvent(new CustomEvent('ercedia:intro-completed',{detail:{settings}}));
      if(embedded)chat.submit('새 게임의 첫 GM 장면을 생성해주세요. 저장된 시작 왕국과 영주령 안의 안전한 임시 정착지에서 시작하고, 미확정 마을 이름을 공식 설정으로 고정하지 마세요. 에르세디아력 650년 7월 1일 오전 09:00부터 시작하세요. Lv1/HP100/MP100/기본 능력치 5종 10과 선택한 패시브 하나를 유지하세요. 세린이나 써니 빌리지를 이 지역으로 임의 이동시키지 마세요. 등록된 해당 지역 배경이 없으면 background_id=null, NPC 원화가 없으면 npc=null로 진행해주세요.');
    }catch(error){$('intro-map-error').textContent=error.message;$('intro-map-next').disabled=false;}
  }
  function refresh(){
    const draft=state.introDraft,isMap=draft&&['kingdom','lordship','confirmation'].includes(draft.step);
    game.dataset.introPhase=draft?(isMap?'map':'black'):'none';screen.hidden=!draft||isMap;mapPanel.hidden=!isMap;
    for(const child of game.children)if(child!==screen)child.inert=!!draft&&!isMap;
    for(const button of document.querySelectorAll('.tabs button'))button.disabled=!!draft&&button.id!=='fullscreen';
    $('new-game').disabled=chat.isPending();$('hud-player').disabled=!!draft;
    $('continue-game').hidden=!draft&&!state.player.name&&!state.scene;$('continue-game').textContent=draft?'이어하기 · 생성 계속':'이어하기';
    $('restore-previous-game').hidden=!!draft||!state.previousGame;
    for(const id of ['intro-back','intro-map-back','intro-cancel','intro-map-cancel'])$(id).hidden=true;
    const allowed=new Set();
    document.querySelectorAll('[data-region]').forEach(node=>{const eligible=allowed.has(node.dataset.region)||introData.start_regions.some(r=>r.id===node.dataset.region);node.dataset.startEligible=String(eligible);node.inert=!!isMap&&!eligible;});
    document.querySelectorAll('.map-detail-label').forEach(node=>node.dataset.startEligible=String(allowed.has(node.dataset.location)));
    document.querySelectorAll('.faction-pin').forEach(node=>node.inert=!!isMap);
    if(!draft){lastStep='';return;}
    $('intro-back').disabled=draft.step==='name';$('intro-error').textContent='';
    if(isMap){
      if(draft.kingdom){draft.lordship=automaticStartLordship(draft.kingdom,draft.lordship);if(draft.step==='lordship')draft.step='confirmation';}
      $('intro-map-title').textContent=draft.kingdom?'이 왕국에 첫발을 내딛겠느냐?':'어느 왕국으로 향하겠느냐?';
      const kingdomOptions=$('intro-kingdom-options');kingdomOptions.replaceChildren();
      for(const r of introData.start_regions){const button=text('button',startRegionInfo[r.id].title,kingdomOptions);button.type='button';button.setAttribute('aria-pressed',String(draft.kingdom===r.id));button.onclick=()=>{draft.kingdom=r.id;draft.lordship=automaticStartLordship(r.id,draft.kingdom===r.id?draft.lordship:null);go('confirmation');};}
      const place=mapData.locations.find(p=>p.id===draft.lordship),region=introData.start_regions.find(r=>r.id===draft.kingdom),passive=introData.passives.find(p=>p.id===draft.passive);
      if(region){$('map-detail-title').textContent=region.kingdom+' · 시작 가능한 영주령';$('map-detail-count').textContent=region.lordship_ids.length+'곳';}
      $('intro-map-summary').replaceChildren();
      if(region){const info=startRegionInfo[region.id];text('h3',info.title,$('intro-map-summary'));for(const value of [info.description,info.opportunity,'왕국 선택에 따른 추가 능력치·장비 보너스는 없습니다.',`시작 영주령 자동 배정: ${place?.label}`,`${draft.name} · ${passive?.name} · Lv.1 · HP/MP 100`])text('p',value,$('intro-map-summary'));}
      else text('p','위의 왕국 세 곳 중 하나를 눌러 풍경과 특징을 비교하세요. 시작 영주령은 자동으로 배정합니다.',$('intro-map-summary'));
      text('p','전선과 미개척지를 피해 등록된 영주령 안의 안전 정착지에서 시작합니다.',$('intro-map-summary'));
      $('intro-map-next').disabled=!place;$('intro-map-next').textContent=region?`${region.kingdom}에서 시작`:'왕국을 선택해주세요';
      return;
    }
    const question=introData.questions.find(q=>q.id===draft.step),candidates=passiveCandidates(draft.answers);
    const labels={name:'이름',gender:'성별',calling:'성격',response:'위험 앞의 선택',passive:'너의 기질',goal:'여정의 목표'};
    $('intro-progress').textContent=draft.step==='goal'?'너의 이야기 · 여정의 목표':draft.step==='passive'?'문답을 마치고 · 너의 기질':`여정의 문답 ${introSteps.indexOf(draft.step)+1} / 4 · ${labels[draft.step]}`;
    $('intro-title').textContent=question?.text||'네 대답 속에서 이런 기질이 느껴지는구나.';
    const descriptions={name:'이 여정에서 불리고 싶은 이름을 들려다오. 긴 자기소개는 하지 않아도 된다.',gender:'모습은 나중에 그려도 좋다. 지금은 성별만 답해다오.',calling:'옳고 그른 답은 없단다. 네 마음과 가장 가까운 말을 골라보거라.',response:'네가 그 자리에 있다고 생각하고, 마음이 가는 대로 답해보거라.',goal:'최고의 대장장이가 되겠다는 꿈도, 이름난 전사가 되겠다는 뜻도 좋다. 어떤 사람으로 살아갈지 네 말로 들려다오.'};
    $('intro-description').textContent=draft.step==='passive'?(candidates.length===1?'이 기질이 앞으로 네 여정에 작은 힘이 되어줄 것이다.':'두 가지 기질이 느껴지는구나. 그중 네 여정에 함께할 하나를 골라보거라.'):descriptions[draft.step];
    const input=$('intro-input'),typing=draft.step==='name';input.hidden=!typing;$('intro-input-label').hidden=!typing;
    const goalInput=$('intro-goal');goalInput.hidden=draft.step!=='goal';if(lastStep!==draft.step)goalInput.value=draft.goal||'';
    input.maxLength=40;input.placeholder='여정에서 불릴 이름';
    if(lastStep!==draft.step)input.value=draft.name;
    $('intro-input-label').textContent='너의 이름';
    $('intro-skip').hidden=true;
    $('intro-next').hidden=draft.step==='gender';$('intro-next').textContent=draft.step==='goal'?'이 뜻을 품고 떠난다':draft.step==='passive'?'이 기질을 받아들인다':draft.step==='response'?'대답을 마친다':draft.step==='name'?'이 이름으로 답한다':'답을 전한다';
    $('intro-next').disabled=draft.step==='passive'&&!candidates.includes(draft.passive)||['calling','response'].includes(draft.step)&&!question.options.some(o=>o.id===draft.answers[draft.step]);
    options.replaceChildren();
    if(draft.step==='gender')for(const option of question.options){
      const button=text('button',option.label,options);button.type='button';button.onclick=()=>{draft.appearance=option.value;next();};
    }
    if(['calling','response'].includes(draft.step))for(const option of question.options){
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(draft.answers[draft.step]===option.id));
      text('strong',option.label,button);options.append(button);
      button.onclick=()=>{draft.answers[draft.step]=option.id;if(draft.step==='response'){const ids=passiveCandidates(draft.answers);draft.passive=ids.length===1?ids[0]:'';}else draft.passive='';save();refresh();$('intro-next').focus();};
    }
    if(draft.step==='passive')for(const id of candidates){
      const passive=introData.passives.find(p=>p.id===id),button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(draft.passive===id));text('strong',passive.name,button);text('span',passive.description,button);text('small','제한: '+passiveLimits[id],button);text('small','능력치 증가·기사 경지·마법 서클·깨달음 지급 없음',button);options.append(button);
      button.onclick=()=>{draft.passive=id;save();refresh();$('intro-next').focus();};
    }
    if(lastStep!==draft.step){lastStep=draft.step;game.scrollTop=0;screen.scrollTop=0;queueMicrotask(()=>{if(draft.step==='goal')goalInput.focus({preventScroll:true});else if(typing)input.focus({preventScroll:true});else $('intro-title').focus({preventScroll:true});});}
  }
  const start=()=>begin().catch(error=>chat.reportStatus(error.message+' · 저장은 유지됩니다. 새 게임을 눌러 다시 시도하세요.'));
  $('new-game').onclick=start;$('intro-new-from-name').onclick=start;$('continue-game').onclick=()=>{if(!available())state.page='story';render();};
  $('intro-cancel').onclick=cancel;$('intro-map-cancel').onclick=cancel;$('intro-back').onclick=back;$('intro-map-back').onclick=back;
  $('intro-next').onclick=next;$('intro-skip').onclick=()=>{state.introDraft.appearance='';next();};
  $('intro-input').oninput=event=>{const d=state.introDraft;if(!d)return;if(d.step==='name')d.name=event.target.value;else if(d.step==='gender')d.appearance=event.target.value;save();};
  $('intro-goal').oninput=event=>{if(state.introDraft?.step==='goal'){state.introDraft.goal=event.target.value.slice(0,1000);save();}};
  $('intro-goal').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();next();}};
  $('intro-input').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();next();}};
  $('intro-map-next').onclick=()=>state.introDraft.kingdom&&state.introDraft.lordship?complete():go('confirmation');
  $('restore-previous-game').onclick=()=>{if(chat.isPending()||!state.previousGame)return;const previous=normalize(state.previousGame);for(const key of Object.keys(state))delete state[key];Object.assign(state,previous);save();render();};
  return {render:refresh,syncMap,begin,isStarting:()=>starting,setSettings:snapshot=>{settings=snapshot;}};
}
