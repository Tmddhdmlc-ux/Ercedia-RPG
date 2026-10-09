import {introData} from './intro-data.js';
import {introSteps,passiveCandidates,creationFields,initialPlayer,normalizeIntroDraft,passiveLimits} from './intro-model.js';
import {defaults,normalize} from './state.js';
import {mapData} from './map-data.js';
import {factionLocations} from './faction-data.js';
import {loadCampaignSettings,campaignNPCStates} from './campaign-settings.js';
import {npcCatalog} from './npc-model.js';
import {freshCampaign} from './new-game-state.js';
export function mountNewGame(state,{render,persist,chat,embedded}){
  const $=id=>document.getElementById(id),game=document.querySelector('.game');
  const screen=$('intro-screen'),options=$('intro-options'),mapPanel=$('start-location-panel');
  let lastStep='',starting=false,settings=null,editingAppearance=false;
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
    save();render();return true;
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
    const index=introSteps.indexOf(state.introDraft.step);if(index>0)go(introSteps[index-1]);
  }
  function next(){
    const draft=state.introDraft;if(!draft)return;
    if(draft.step==='name'&&!draft.name.trim()){ $('intro-error').textContent='이름을 입력해주세요.';$('intro-input').focus();return; }
    if(['calling','response'].includes(draft.step)&&!introData.questions.find(q=>q.id===draft.step).options.some(o=>o.id===draft.answers[draft.step])){ $('intro-error').textContent='원하는 답변 하나를 선택한 뒤 다음을 눌러주세요.';return; }
    if(draft.step==='passive'&&!passiveCandidates(draft.answers).includes(draft.passive)){ $('intro-error').textContent='두 후보 중 패시브 하나를 선택해주세요.';return; }
    if(draft.step==='lordship'&&!draft.lordship)return;
    go(introSteps[introSteps.indexOf(draft.step)+1]);
  }
  function syncMap(){
    const draft=state.introDraft;if(!draft||!['kingdom','lordship','confirmation'].includes(draft.step))return;
    const kingdom=introData.start_regions.find(r=>r.id===state.mapView);if(!kingdom){if(state.mapView==='world'&&draft.kingdom){draft.kingdom='';draft.lordship='';draft.step='kingdom';save();refresh();}return;}
    const id=kingdom.lordship_ids.includes(state.region)?state.region:'';
    if(draft.kingdom!==kingdom.id||draft.lordship!==id){
      draft.kingdom=kingdom.id;draft.lordship=id;draft.step='lordship';save();refresh();
    }
  }
  async function complete(){
    try{
      if(!settings){$('intro-map-next').disabled=true;await readSettings();}
      const draft=state.introDraft,fields=creationFields(draft),passive=introData.passives.find(p=>p.id===fields.starting_passive_id);
      const place=mapData.locations.find(p=>p.id===fields.starting_lordship_id);
      const fresh=freshCampaign(state,draft,settings,globalThis.crypto?.randomUUID?.()||'campaign-'+Date.now());
      for(const key of Object.keys(state))delete state[key];Object.assign(state,fresh);lastStep='';
      save();render();
      const scene={schema_version:1,type:'ercedia_scene',scene_id:'new-game-'+Date.now()+'-'+Math.random().toString(36).slice(2),location:fresh.gameState.place,time:'시작 시점',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:`${fields.character_name}, ${fields.starting_kingdom}의 ${place.label}에서 당신의 여정이 시작된다.`},{speaker:'나레이션',text:`당신은 영주령 안의 안전한 정착지에 도착했다. 아직 이름이 확정되지 않은 임시 시작점이다. ${passive.name}을 품고, 이제 첫걸음을 내딛는다.`}],choices:[]};
      chat.setCampaignSettings(null);chat.apply(JSON.stringify(scene));
      chat.setCampaignSettings(settings);
      document.dispatchEvent(new Event('ercedia:intro-completed'));
      if(embedded)chat.submit('새 게임의 첫 GM 장면을 생성해주세요. 저장된 시작 왕국과 영주령 안의 안전한 임시 정착지에서 시작하고, 미확정 마을 이름을 공식 설정으로 고정하지 마세요. Lv1/HP100/MP100/기본 능력치 5종 10과 선택한 패시브 하나를 유지하세요. 세린이나 써니 빌리지를 이 지역으로 임의 이동시키지 마세요. 등록된 해당 지역 배경이 없으면 background_id=null, NPC 원화가 없으면 npc=null로 진행해주세요.');
    }catch(error){$('intro-map-error').textContent=error.message;$('intro-map-next').disabled=false;}
  }
  function refresh(){
    const draft=state.introDraft,isMap=draft&&['kingdom','lordship','confirmation'].includes(draft.step);
    game.dataset.introPhase=draft?(isMap?'map':'black'):'none';screen.hidden=!draft||isMap;mapPanel.hidden=!isMap;
    for(const child of game.children)if(child!==screen)child.inert=!!draft&&!isMap;
    for(const button of document.querySelectorAll('.tabs button'))button.disabled=!!draft&&button.id!=='fullscreen';
    $('new-game').disabled=chat.isPending();$('hud-player').disabled=!!draft;
    $('continue-game').hidden=!draft&&!state.player.name&&!state.scene;$('continue-game').textContent=draft?'이어하기 · 생성 계속':'이어하기';
    $('restore-previous-game').hidden=!state.previousGame;
    const allowed=new Set(introData.start_regions.flatMap(r=>r.lordship_ids));
    document.querySelectorAll('[data-region]').forEach(node=>{const eligible=allowed.has(node.dataset.region)||introData.start_regions.some(r=>r.id===node.dataset.region);node.dataset.startEligible=String(eligible);node.inert=!!isMap&&!eligible;});
    document.querySelectorAll('.map-detail-label').forEach(node=>node.dataset.startEligible=String(allowed.has(node.dataset.location)));
    document.querySelectorAll('.faction-pin').forEach(node=>node.inert=!!isMap);
    if(!draft){lastStep='';return;}
    $('intro-back').disabled=draft.step==='name';$('intro-error').textContent='';
    if(isMap){
      $('intro-map-title').textContent=draft.step==='confirmation'?'시작 위치와 캐릭터 확인':draft.step==='kingdom'?'어느 왕국에서 시작할까요?':'시작할 영주령을 선택하세요';
      const place=mapData.locations.find(p=>p.id===draft.lordship),region=introData.start_regions.find(r=>r.id===draft.kingdom),passive=introData.passives.find(p=>p.id===draft.passive);
      if(region){$('map-detail-title').textContent=region.kingdom+' · 시작 가능한 영주령';$('map-detail-count').textContent=region.lordship_ids.length+'곳';}
      $('intro-map-summary').replaceChildren();
      if(draft.step==='confirmation'){
        for(const value of [`이름: ${draft.name}`,`모습: ${draft.appearance||'나중에 정하기'}`,`삶: ${introData.questions.find(q=>q.id==='calling').options.find(o=>o.id===draft.answers.calling)?.label}`,`위험 앞 행동: ${introData.questions.find(q=>q.id==='response').options.find(o=>o.id===draft.answers.response)?.label}`,`패시브: ${passive?.name}`,`${region?.kingdom} · ${place?.label}`, 'Lv.1 · HP 100/100 · MP 100/100', '근력·민첩·지능·체력·마나 능력치 각각 10','첫 장면은 이 영주령 안의 임시 안전 정착지에서 시작합니다.'])text('p',value,$('intro-map-summary'));
      }else text('p',place?`${region.kingdom} · ${place.label} 선택됨`:'왕국 버튼과 지도 표식 또는 지역 목록을 이용하세요. 일반 Lv.1 시작은 13개 영주령만 선택할 수 있습니다.',$('intro-map-summary'));
      if(place){const sites=factionLocations.filter(p=>p.anchor_id===place.id);text('p','등록된 공개 세력 거점: '+(sites.length?sites.map(p=>p.name).join(' · '):'이 영주령에 배정된 거점 정보 없음'),$('intro-map-summary'));}
      text('p','시작 조건: 전선·미개척지는 제외하고, 영주령 안의 안전한 정착지에서 시작합니다.',$('intro-map-summary'));
      $('intro-map-next').disabled=!place;$('intro-map-next').textContent=draft.step==='confirmation'?'이 위치에서 새 게임 시작':'선택 결과 확인';
      return;
    }
    const question=introData.questions.find(q=>q.id===draft.step),candidates=passiveCandidates(draft.answers);
    const labels={name:'이름',gender:'모습 · 선택 사항',calling:'배경 선택',response:'행동 성향',passive:'패시브 확인'};
    if(lastStep!==draft.step)editingAppearance=!!draft.appearance;
    $('intro-progress').textContent=`캐릭터 생성 ${introSteps.indexOf(draft.step)+1} / 5 · ${labels[draft.step]} → 이후 시작 지역 선택`;
    const titles={name:'주인공의 이름을 정해주세요',gender:'모습을 지금 정할까요?',calling:'어떤 배경의 주인공으로 시작할까요?',response:'위험을 만나면 먼저 무엇을 할까요?',passive:'선택한 성향으로 얻는 패시브'};
    $('intro-title').textContent=titles[draft.step];
    const descriptions={name:'게임에서 사용할 이름만 입력하면 됩니다. 실제 이름이나 자기소개는 필요하지 않습니다.',gender:'선택 사항입니다. 버튼으로 고르거나 나중에 정해도 됩니다. 직접 적기는 원하는 경우에만 사용하며, 능력치와 주인공 이미지에는 영향을 주지 않습니다.',calling:'실제 자신의 경험을 쓰는 질문이 아닙니다. 만들고 싶은 주인공의 배경 하나를 선택하세요. 직업·장비가 확정되는 것은 아니며 작은 패시브의 후보를 정합니다.',response:'주인공이 취했으면 하는 행동 하나를 선택하세요. 앞선 배경과 함께 패시브 1개를 결정하며, 답변은 뒤로 가서 바꿀 수 있습니다.'};
    $('intro-description').textContent=draft.step==='passive'?(candidates.length===1?'두 선택이 같은 패시브를 가리켰습니다. 아래 효과를 확인하고 시작 지역을 고르세요.':'두 선택이 서로 다른 패시브를 가리켰습니다. 원하는 효과 하나를 선택하세요. 둘 다 얻는 것은 아닙니다.'):descriptions[draft.step];
    const input=$('intro-input'),typing=draft.step==='name'||draft.step==='gender'&&editingAppearance;input.hidden=!typing;$('intro-input-label').hidden=!typing;
    input.maxLength=draft.step==='name'?40:200;input.placeholder=draft.step==='name'?'예: 청명':'예: 검은 머리의 여행자 (선택 사항, 200자 이내)';
    if(lastStep!==draft.step)input.value=draft.step==='name'?draft.name:draft.appearance;
    $('intro-input-label').textContent=draft.step==='name'?'주인공 이름 (필수)':'성별·모습 직접 입력 (선택)';
    $('intro-skip').hidden=draft.step!=='gender'||!editingAppearance;$('intro-skip').textContent='모습은 나중에 정하기';
    $('intro-next').hidden=draft.step==='gender'&&!editingAppearance;$('intro-next').textContent=draft.step==='passive'?'이 패시브로 시작 지역 선택':draft.step==='response'?'패시브 확인':'다음';
    $('intro-next').disabled=draft.step==='passive'&&!candidates.includes(draft.passive)||['calling','response'].includes(draft.step)&&!question.options.some(o=>o.id===draft.answers[draft.step]);
    options.replaceChildren();
    if(draft.step==='gender'){
      for(const [label,value] of [['남성','남성'],['여성','여성'],['나중에 정하기','']]){
        const button=text('button',label,options);button.type='button';button.onclick=()=>{draft.appearance=value;next();};
      }
      const edit=text('button','직접 적기 · 선택 사항',options);edit.type='button';edit.setAttribute('aria-expanded',String(editingAppearance));edit.onclick=()=>{editingAppearance=!editingAppearance;refresh();if(editingAppearance)input.focus();};
    }
    if(question?.options)for(const option of question.options){
      const button=document.createElement('button'),passive=introData.passives.find(p=>p.id===option.passive);button.type='button';button.setAttribute('aria-pressed',String(draft.answers[draft.step]===option.id));
      text('strong',option.label,button);text('span',`패시브 후보: ${passive.name}`,button);text('small',passive.description,button);options.append(button);
      button.onclick=()=>{draft.answers[draft.step]=option.id;if(draft.step==='response'){const ids=passiveCandidates(draft.answers);draft.passive=ids.length===1?ids[0]:'';}else draft.passive='';save();refresh();$('intro-next').focus();};
    }
    if(draft.step==='passive')for(const id of candidates){
      const passive=introData.passives.find(p=>p.id===id),button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(draft.passive===id));text('strong',passive.name,button);text('span',passive.description,button);text('small','제한: '+passiveLimits[id],button);text('small','능력치 증가·기사 경지·마법 서클·깨달음 지급 없음',button);options.append(button);
      button.onclick=()=>{draft.passive=id;save();refresh();$('intro-next').focus();};
    }
    if(lastStep!==draft.step){lastStep=draft.step;game.scrollTop=0;screen.scrollTop=0;queueMicrotask(()=>{if(typing)input.focus({preventScroll:true});else $('intro-title').focus({preventScroll:true});});}
  }
  const start=()=>begin().catch(error=>chat.reportStatus(error.message+' · 저장은 유지됩니다. 새 게임을 눌러 다시 시도하세요.'));
  $('new-game').onclick=start;$('intro-new-from-name').onclick=start;$('continue-game').onclick=()=>{if(!available())state.page='story';render();};
  $('intro-cancel').onclick=cancel;$('intro-map-cancel').onclick=cancel;$('intro-back').onclick=back;$('intro-map-back').onclick=back;
  $('intro-next').onclick=next;$('intro-skip').onclick=()=>{state.introDraft.appearance='';next();};
  $('intro-input').oninput=event=>{const d=state.introDraft;if(!d)return;if(d.step==='name')d.name=event.target.value;else if(d.step==='gender')d.appearance=event.target.value;save();};
  $('intro-input').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();next();}};
  $('intro-map-next').onclick=()=>state.introDraft.step==='confirmation'?complete():go('confirmation');
  $('restore-previous-game').onclick=()=>{if(chat.isPending()||!state.previousGame)return;const previous=normalize(state.previousGame);for(const key of Object.keys(state))delete state[key];Object.assign(state,previous);save();render();};
  return {render:refresh,syncMap,begin,isStarting:()=>starting};
}
