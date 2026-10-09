import {parseScene,actionPrompt} from './scene.js';
import {normalize} from './state.js';
import {battleIsActive,validateBattleSettlement} from './battle-model.js';
import {extractSceneJSON} from './response-json.js';
import {MAX_AUTO_REPAIRS,repairInstruction} from './response-recovery.js';
import {updateNPC,findNPC} from './npc-model.js';
import {initializeNameOnlyPlayer} from './legacy-player.js';
import {campaignSettingsAttachment,legacyCampaignPrompt,loadCampaignSettings} from './campaign-settings.js';
import {settleQuests} from './quest-model.js';
import {planEngineScene} from './engine-model.js';
import {planWorldScene} from './world-engine.js';
import {planNPCLife} from './npc-life.js';
function setupSettingsPrompt(requestId){return '새 게임 시작 버튼으로 세계관 설정 읽기를 시작합니다. 첨부 설정 전체를 먼저 읽고 GM 전용 비밀을 공개하지 마세요. 이름·성별·직업·시작 지역은 아직 선택 전입니다. 기존 주인공이나 과거 진행을 복사하거나 첫 게임 장면을 만들지 말고, 준비 확인만 ercedia_scene JSON 한 개로 답하세요. schema_version=1, type="ercedia_scene", 고유 scene_id, reply_to="'+requestId+'", location="캐릭터 생성 준비", time="시작 전", background_id=null, npc=null, dialogue=[{speaker:"시스템",text:"설정을 읽었습니다. 캐릭터 설정을 진행해주세요."}], choices=[]와 settings_loaded를 포함하세요. player/inventory/game_state/battle/의뢰/엔진 사건은 출력하지 마세요.';}
let requestSequence=0;
function refreshSettingsPrompt(state,requestId){return `현재 캠페인의 GitHub 설정을 최신 버전으로 동기화합니다. 첨부 전체를 읽고 이후 턴부터 최신 승인 규칙을 적용하세요. 새 게임이나 다음 턴을 시작하지 마세요. 현재 진행 기록·이름·자원·소지품·관계·완료 보상은 유지하며 새로운 기본값으로 덮어쓰지 마세요. 미구현 UI 기능을 구현했다고 주장하지 마세요. GM 전용 비밀의 공개 제한을 유지하세요. 설정 읽기 확인만 schema_version=1,type="ercedia_scene",고유 scene_id,reply_to="${requestId}",location="설정 동기화",time="현재",background_id=null,npc=null,dialogue=[{speaker:"시스템",text:"최신 설정을 확인했습니다."}],choices=[]와 settings_loaded를 포함한 JSON으로 출력하세요. player/inventory/game_state/battle/의뢰/엔진 사건은 출력하지 마세요. 현재 진행 참고: ${JSON.stringify({name:state.player.name,level:state.player.level,location:state.scene?.location,game_state:state.gameState})}`;}
function newRequestId(){
  if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
  if(typeof globalThis.crypto?.getRandomValues==='function')return [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');
  return `action-${Date.now()}-${++requestSequence}`;
}
export function mountChatUI(state,{render,persist,storage,embedded,getBattle,getIntro}){
  let loadedSettingsCommit=null;
  const $=id=>document.getElementById(id);
  let pending=null,timer=null,ackTimer=null,campaignSettings=null,requireSettingsConfirmation=false,settingsURL=null,conversation=window.__ERCEDIA_CONFIG__?.conversation||'preview';
  let failedRequest=null;
  let settingsRefreshing=false,settingsEpoch=0;
  const retiredRequests=new Set();
  function retire(id){if(!id)return;retiredRequests.add(id);if(retiredRequests.size>100)retiredRequests.delete(retiredRequests.values().next().value);}
  const choiceButtons=Array.from({length:4},()=>{const button=document.createElement('button');button.type='button';$('scene-choices').append(button);return button;});
  const status=message=>{
    $('connection-detail').textContent=message;
    const problem=/실패|못했|못한|못해|오류|시간.*지났|다른 요청|달라|초과|거절|전송 확인|네트워크|불일치|대기.*해제|원본.*확인|지정한 뒤|준비가 끝난|종료한 뒤/.test(message);
    const row=$('connection-status').parentElement;
    row.hidden=!pending&&!problem&&!settingsRefreshing;row.dataset.phase=(pending||settingsRefreshing)&&!problem?'waiting':problem?'error':'idle';
    $('connection-status').textContent=pending?.repairAttempt&&!problem?`응답 수정 중 (${pending.repairAttempt}/${MAX_AUTO_REPAIRS})…`:pending&&!problem?'상대의 반응을 기다리는 중…':message;
  };
  function notify(type,payload){if(embedded)parent.postMessage({channel:'ercedia',token:window.__ERCEDIA_CONFIG__.token,conversation,type,payload},'*');}
  const needsName=()=>!state.player.name.trim()||(!state.intro_completed&&/^(플레이어|주인공|player)$/i.test(state.player.name.trim()));
  function controls(){
    const creating=!!state.introDraft||battleIsActive(state)||settingsRefreshing||!!getIntro?.()?.isStarting(),naming=needsName()&&!creating,wasHidden=$('name-setup').hidden;$('name-setup').hidden=!naming;
    $('sync-settings').disabled=!!pending||creating;
    $('sync-settings').textContent=settingsRefreshing?'설정 읽는 중…':pending?.settingsRefresh?'설정 확인 중…':'설정 동기화';
    if(naming&&wasHidden)queueMicrotask(()=>$('adventurer-name').focus({preventScroll:true}));
    $('action-label').textContent=naming?'자유 대화·행동':`${state.player.name}의 대화·행동`;
    const choices=state.scene?.choices||[],last=!state.scene||state.sceneIndex===state.scene.dialogue.length-1;
    const choosing=!!choices.length&&last&&!naming&&!creating;
    $('scene-choices').hidden=!choosing;$('choice-heading').hidden=!choosing;
    $('scene-action-overlay').hidden=!choosing;
    choiceButtons.forEach((button,index)=>{const choice=choices[index];button.hidden=!choice;button.textContent=choice?`${index+1}. ${choice.text}`:'';button.disabled=!!pending||!last||naming||creating;button.onclick=()=>choose(index);});
    $('free-action').disabled=!!pending||naming||creating;$('send-action').disabled=!!pending||naming||creating;$('cancel-wait').hidden=!pending;
    $('retry-response').hidden=!failedRequest||!!pending;$('retry-response').disabled=!!pending||creating||naming;
  }
  function choose(index){
    const button=choiceButtons[index],choice=state.scene?.choices?.[index];
    if(!choice||button.disabled||$('scene-choices').hidden)return;
    $('free-action').value=choice.text;
    submit(choice.text,choice.id);
  }
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||!['1','2','3','4'].includes(event.key))return;
    if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],dialog,[role="dialog"]')||state.page!=='story'||document.querySelector('.game').dataset.title==='active')return;
    const index=Number(event.key)-1;if(choiceButtons[index].disabled||choiceButtons[index].hidden||$('scene-choices').hidden)return;
    event.preventDefault();choose(index);
  });
  function chooseName(){
    if(!needsName())return;
    const name=$('adventurer-name').value.trim();
    if(!name||/^(플레이어|주인공|player)$/i.test(name)){$('name-error').textContent='모험에 사용할 이름을 입력해주세요.';$('adventurer-name').focus();return;}
    state.chosenName=name;state.player.name=name;$('name-error').textContent='';
    initializeNameOnlyPlayer(state);
    render();controls();persist();status(`${name}님, 모험을 시작하세요.`);$('free-action').focus();
  }
  $('confirm-name').onclick=chooseName;
  $('name-setup').addEventListener('keydown',event=>{if(event.key==='Tab'){const first=$('intro-new-from-name'),last=$('confirm-name');if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  $('adventurer-name').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();chooseName();}});
  function cancel(message='대기를 해제했습니다. 재전송 전에 원본 채팅의 전송 여부를 확인하세요.'){
    clearTimeout(timer);clearTimeout(ackTimer);retire(pending?.requestId);pending=null;controls();status(message);notify('cancel',{});
  }
  function transportFailed(message){
    if(pending?.repairAttempt)failedRequest={...pending,error:message};
    cancel(message);
  }
  function submit(action,choiceId=null,recovery=null,setupOnly=false){
    const settingsRefresh=setupOnly==='refresh'||recovery?.settingsRefresh===true;
    setupOnly=setupOnly||recovery?.setupOnly===true;
    if(pending)return status('이전 요청의 응답을 기다리고 있습니다. 응답이 멈췄다면 대기 해제 후 다시 보내세요.');
    if(!setupOnly&&(state.introDraft||getIntro?.()?.isStarting()))return status('새 게임 준비가 끝난 뒤 보내주세요.');
    if(battleIsActive(state))return status('전투 결과를 확인하거나 즉시 종료한 뒤 보내주세요.');
    if(!setupOnly&&needsName())return status('주인공 이름을 지정한 뒤 보내주세요.');
    if(!action.trim())return;
    if(action.length>2000)return status('자유 행동은 2,000자까지 입력할 수 있습니다.');
    try{
    if(!setupOnly&&initializeNameOnlyPlayer(state)){render();persist();}
    const requestId=newRequestId(),settings=campaignSettings?campaignSettingsAttachment(campaignSettings):null;
    const request={requestId,choiceId,action,...(setupOnly?{setupOnly:true}:{}),...(settingsRefresh?{settingsRefresh:true}:{}),rootRequestId:recovery?.rootRequestId||requestId,repairAttempt:recovery?.repairAttempt||0};
    const supportsAttachment=!embedded||window.__ERCEDIA_CONFIG__?.features?.includes('settings-attachment');
    requireSettingsConfirmation=!!settings&&supportsAttachment;
    $('action-copy').value=(settingsRefresh?refreshSettingsPrompt(state,requestId):setupOnly?setupSettingsPrompt(requestId):actionPrompt(state,action,requestId))+(settings?'\n\n'+(supportsAttachment?settings.instruction:legacyCampaignPrompt(campaignSettings)):'')+(recovery?repairInstruction(request,recovery.error):'');$('action-copy-area').hidden=false;
    if(settings){if(settingsURL)URL.revokeObjectURL(settingsURL);settingsURL=URL.createObjectURL(new Blob([settings.file.content],{type:'text/plain;charset=utf-8'}));$('settings-download').href=settingsURL;$('settings-download').download=settings.file.name;$('settings-download').hidden=false;}
    failedRequest=null;pending=request;
    controls();status(embedded?(settings&&!supportsAttachment?'이전 런처로 요청을 전송합니다. GPT가 GitHub 원문을 직접 읽도록 요청했습니다. 전체 파일 자동 첨부는 런처 1.1.7에서 지원합니다.':'상대의 반응을 기다리는 중…'):'이 요청을 ChatGPT에 보내고 응답 JSON을 아래에 붙여넣으세요.');
    notify('action',{text:$('action-copy').value,requestId,...(settings&&supportsAttachment?{settingsFile:settings.file}:{})});
    if(embedded)ackTimer=setTimeout(()=>{if(pending?.requestId===requestId&&!pending.acknowledged)transportFailed('게임 요청이 런처에 도착하지 않았습니다. Tampermonkey 런처를 최신 버전으로 업데이트하고 ChatGPT 페이지를 새로고침하세요.');},7000);
    timer=setTimeout(()=>{if(pending?.requestId===requestId)transportFailed('응답 대기 시간이 지났습니다. 기존 장면은 유지됩니다. 원본 채팅 확인 또는 JSON 수동 적용을 이용하세요.');},120000);
    }catch(error){cancel(`요청 준비 실패 · ${error.message} · 입력은 유지됩니다. 다시 보내거나 원본 ChatGPT 입력창을 이용하세요.`);}
  }
  function apply(source,{commitBattle=false,fromHost=false,manual=false}={}){
    let mutationBegan=false;
    try{
      if(battleIsActive(state)&&!commitBattle)return status('전투 재생 중에는 후속 장면을 시작할 수 없습니다.');
      // Check identity before semantic validation: an obsolete invalid response must not repair the current turn.
      let reply;try{reply=JSON.parse(extractSceneJSON(source)||source)?.reply_to;}catch{}
      if(!reply&&typeof source==='string')reply=source.match(/"reply_to"\s*:\s*"([A-Za-z0-9_-]{1,100})"/)?.[1];
      if(!manual&&!commitBattle&&reply&&retiredRequests.has(reply))return status('종료한 요청의 늦은 응답입니다. 적용하지 않았습니다.');
      if(!manual&&pending&&reply&&reply!==pending.requestId)return status('다른 요청의 응답입니다. 현재 장면을 유지합니다.');
      let scene=parseScene(source);
      if(fromHost&&state.campaign_id&&!pending&&!commitBattle)return status('새 게임에서 요청하지 않은 이전 채팅 응답입니다. 기존 데이터는 적용하지 않았습니다.');
      if(fromHost&&pending&&scene.reply_to!==pending.requestId)throw Error('현재 요청의 reply_to가 누락되었습니다.');
      if(campaignSettings&&state.campaign_id&&scene.player){const fresh=state.player;for(const key of ['name','level','xp','strength','dexterity','intelligence','constitution','manaStat','hp','maxHp','mp','maxMp'])if(scene.player[key]!==fresh[key])throw Error(`새 게임 첫 응답의 ${key} 불일치: 현재 ${fresh[key]}, 응답 ${scene.player[key]}. 현재 초기 주인공을 유지하세요.`);}
      if(manual&&!pending?.settingsRefresh)requireSettingsConfirmation=false;
      if(campaignSettings&&(requireSettingsConfirmation||pending?.settingsRefresh)&&(scene.settings_loaded?.commit!==campaignSettings.sha||scene.settings_loaded?.file_count!==campaignSettings.paths.length))throw Error(`설정 읽기 확인 불일치: commit=${campaignSettings.sha}, file_count=${campaignSettings.paths.length} 확인이 필요합니다.`);
      if(pending?.setupOnly){
        if(scene.npc||scene.cast?.length||scene.player||scene.inventory||scene.game_state||scene.battle||scene.engine_events?.length||scene.world_events?.length||scene.quest_events?.length||scene.life_events?.length)throw Error('설정 준비 응답에 게임 진행 변경을 포함할 수 없습니다.');
        const refreshed=pending.settingsRefresh;loadedSettingsCommit=campaignSettings.sha;campaignSettings=null;cancel(refreshed?'최신 GitHub 설정 동기화 완료 · 현재 진행은 유지됩니다.':'세계관 설정 읽기 확인 완료 · 캐릭터 설정을 진행하세요.');$('sync-settings').title=`확인된 설정 ${loadedSettingsCommit.slice(0,7)}`;render();persist();notify('applied',{scene_id:scene.scene_id});return;
      }
      if(state.seenScenes.includes(scene.scene_id)){if(pending&&scene.reply_to===pending.requestId)cancel('이미 반영한 장면입니다. 새 scene_id로 다시 응답해야 합니다.');return status('이미 반영한 장면입니다. 중복 적용하지 않았습니다.');}
      if(pending&&scene.reply_to&&scene.reply_to!==pending.requestId)return status('다른 요청의 응답입니다. 현재 장면을 유지합니다.');
      const worldResult=planWorldScene(state,scene);if(worldResult)scene=worldResult.scene;
      const questBase=worldResult?{...state,currency:worldResult.currency}:state;
      if(scene.battle&&!commitBattle){
        if(state.battleApplied?.includes(scene.battle.battle_id))return status('이미 정산한 전투입니다. 다시보기로 관전하세요.');
        if(state.quest_log?.length||scene.quest_updates||scene.quest_events||scene.world_events)settleQuests(questBase,scene);
        planEngineScene(state,scene,null);
        planNPCLife(state,scene,null);
        validateBattleSettlement(scene,state);mutationBegan=true;
        getBattle().start(scene);cancel('전투 관전을 시작합니다.');notify('applied',{scene_id:scene.scene_id});$('battle-recovery').hidden=true;return;
      }
      const questResult=(state.quest_log?.length||scene.quest_updates||scene.quest_events||scene.world_events)?settleQuests(questBase,scene):null;
      const engineResult=planEngineScene(state,scene,questResult);
      const lifeResult=planNPCLife(state,scene,questResult);
      if(scene.npc&&state.scene?.npc?.id===scene.npc.id&&state.scene.npc.profile)scene.npc.profile={...state.scene.npc.profile,...scene.npc.profile};
      mutationBegan=true;failedRequest=null;state.scene=scene;state.sceneIndex=0;
      for(const [id,p] of Object.entries(scene.npc_updates||{}))updateNPC(state,id,p);
      if(scene.npc?.profile&&findNPC(scene.npc.id))updateNPC(state,scene.npc.id,scene.npc.profile);
      for(const npc of scene.cast||[])if(npc.profile&&findNPC(npc.id))updateNPC(state,npc.id,npc.profile);
      if(commitBattle)for(const r of scene.battle.outcome.resources)if(findNPC(r.id))updateNPC(state,r.id,{hp:r.hp,mp:r.mp});
      state.seenScenes=[...state.seenScenes,scene.scene_id].slice(-100);
      if(scene.player){
        const retained=Object.fromEntries(['constitution','manaStat','realm','levelHpBonus','unspentStatPoints','battleModifiers'].filter(k=>!Object.hasOwn(scene.player,k)&&Object.hasOwn(state.player,k)).map(k=>[k,state.player[k]]));
        state.player={...scene.player,...retained,...(state.chosenName?{name:state.chosenName}:{})};
      }
      if(scene.inventory)state.inventory=scene.inventory;
      if(scene.game_state)Object.assign(state.gameState,scene.game_state);
      if(worldResult)Object.assign(state,{world_engine:worldResult.world_engine,currency:worldResult.currency});
      if(questResult)Object.assign(state,questResult);
      if(engineResult)Object.assign(state,engineResult);
      if(lifeResult)Object.assign(state,lifeResult);
      if(state.chosenName)state.player.name=state.chosenName;
      cancel('새 장면을 반영했습니다.');$('free-action').value='';$('action-copy-area').hidden=true;$('battle-recovery').hidden=true;
      campaignSettings=null;
      $('settings-download').hidden=true;if(settingsURL){URL.revokeObjectURL(settingsURL);settingsURL=null;}
      state.page='story';render();controls();persist();notify('applied',{scene_id:scene.scene_id});
      requestAnimationFrame(()=>{const line=$('line');line.tabIndex=-1;line.focus({preventScroll:true});$('stage').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
    }catch(error){
      const rejected=pending;
      if(!mutationBegan&&rejected&&fromHost&&!manual&&!commitBattle){
        failedRequest={...rejected,error:error.message};
        cancel('응답 검증 오류 · 기존 상태와 입력을 유지합니다.');
        notify('parse-error',{message:error.message});
        if(embedded&&rejected.repairAttempt<MAX_AUTO_REPAIRS){
          const next={...failedRequest,repairAttempt:rejected.repairAttempt+1};
          submit(next.action,next.choiceId,next);
          return;
        }
        status(`응답 적용 실패 · 자동 수정 ${MAX_AUTO_REPAIRS}회 이후에도 오류가 남았습니다: ${error.message} · 다시 요청 또는 JSON 수동 적용을 이용하세요.`);
        controls();return;
      }
      const battleError=error.message.includes('전투 검증');
      if(battleError){cancel('전투 검증 오류 · 기존 상태를 유지합니다.');state.page='story';render();$('battle-recovery').hidden=false;$('battle-error').textContent=error.message;}
      else if(pending)cancel('응답 검증 오류 · 기존 상태와 입력을 유지합니다. 연결 도움에서 수정 응답을 적용하거나 다시 요청하세요.');
      status(`응답 적용 실패 · ${error.message} 기존 장면은 유지됩니다.`);notify('parse-error',{message:error.message});
    }
  }
  $('retry-response').onclick=()=>{if(!pending&&failedRequest)submit(failedRequest.action,failedRequest.choiceId,{...failedRequest,repairAttempt:Math.max(MAX_AUTO_REPAIRS,failedRequest.repairAttempt)});};
  $('battle-retry').onclick=()=>{const reason=$('battle-error').textContent;$('battle-recovery').hidden=true;submit('직전 전투 JSON이 검증에서 거절되었습니다: '+reason+'. BATTLE_SYSTEM.md와 tampermonkey/BATTLE_SCHEMA.md를 읽고 현재 저장 상태를 기준으로 전투 전체 사건과 종료 스냅샷을 수정하여 다시 출력해주세요.');};
  $('battle-recover-close').onclick=()=>{$('battle-recovery').hidden=true;};
  $('free-action-form').onsubmit=event=>{event.preventDefault();submit($('free-action').value);};
  // A sandboxed frame intentionally cannot submit native forms. Send through the bridge directly.
  $('send-action').type='button';
  $('send-action').onclick=()=>submit($('free-action').value);
  $('free-action').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();submit(event.currentTarget.value);}});
  $('apply-scene').onclick=()=>apply($('scene-json').value,{manual:true});
  $('cancel-wait').onclick=()=>{failedRequest=null;cancel();};
  $('copy-action').onclick=async()=>{try{await navigator.clipboard.writeText($('action-copy').value);status('요청을 복사했습니다. ChatGPT에 붙여넣어 전송하세요.');}catch{$('action-copy').focus();$('action-copy').select();status('요청 전체를 선택했습니다. Ctrl+C로 복사하세요.');}};
  function restore(saved){
    settingsEpoch++;campaignSettings=null;loadedSettingsCommit=null;
    failedRequest=null;cancel();for(const key of Object.keys(state))delete state[key];Object.assign(state,normalize(saved));
    $('adventurer-name').value='';$('name-error').textContent='';$('connection-tools').open=false;
    window.__ERCEDIA_CONFIG__&&(window.__ERCEDIA_CONFIG__.saved=state);
    render();controls();status('이 채팅의 저장 상태를 불러왔습니다.');
  }
  async function refreshSettings(){
    if(pending||settingsRefreshing||battleIsActive(state)||state.introDraft||getIntro?.()?.isStarting())return status('진행 중인 응답·전투·새 게임 준비를 완료한 뒤 설정 동기화를 누르세요.');
    settingsRefreshing=true;controls();const epoch=++settingsEpoch;
    try{const snapshot=await loadCampaignSettings({onProgress:status});if(epoch!==settingsEpoch)return;campaignSettings=snapshot;settingsRefreshing=false;submit('현재 게임 설정 동기화',null,null,'refresh');}
    catch(error){status(`설정 동기화 실패 · ${error.message} · 현재 진행은 유지됩니다.`);}
    finally{settingsRefreshing=false;controls();}
  }
  $('sync-settings').onclick=refreshSettings;
  window.addEventListener('message',event=>{
    const data=event.data;
    if(!embedded||event.source!==parent||data?.channel!=='ercedia'||data.token!==window.__ERCEDIA_CONFIG__.token)return;
    if(data.type==='restore'){
      cancel();conversation=data.conversation;window.__ERCEDIA_CONFIG__.conversation=conversation;
      restore(data.payload);notify('restored',{state:JSON.parse(JSON.stringify(state)),requestId:data.requestId});return;
    }
    if(data.type==='conversation'){
      conversation=data.conversation;window.__ERCEDIA_CONFIG__.conversation=conversation;return;
    }
    if(data.conversation!==conversation)return;
    if(data.type==='sync-settings'){refreshSettings();return;}
    if(data.type==='bootstrap-campaign'){
      if(pending||battleIsActive(state)||(!state.introDraft&&needsName()))return notify('bootstrap-started',{requestId:data.requestId,started:false,message:'새 채팅 게임 상태가 준비되지 않았습니다.'});
      campaignSettings=data.payload.settings;getIntro?.()?.setSettings?.(campaignSettings);submit(data.payload.action,null,null,!!state.introDraft);
      notify('bootstrap-started',{requestId:data.requestId,started:!!pending});return;
    }
    if(data.type==='action-ack'&&pending?.requestId===data.payload?.requestId){pending.acknowledged=true;clearTimeout(ackTimer);status('런처가 요청을 받았습니다. GPT 입력창으로 전달하는 중…');}
    if(data.type==='action-error'){transportFailed(data.payload);$('connection-tools').open=true;}
    if(data.type==='snapshot')notify('snapshot',{state:JSON.parse(JSON.stringify(state)),pending:!!pending||battleIsActive(state),requestId:data.requestId});
    if(data.type==='update-player')window.gameBridge.updatePlayer(data.payload);
    if(data.type==='update-inventory')window.gameBridge.updateInventory(data.payload);
    if(data.type==='scene')apply(data.payload,{fromHost:true});
    if(data.type==='status')status(data.payload);
    if(data.type==='save-error')status('저장 실패 · 화면은 유지됩니다. JSON과 요청을 복사해 보관하세요.');
    if(data.type==='interrupt')cancel(data.payload);
  });
  if(embedded){document.body.classList.add('embedded-game');$('chat-runtime').hidden=false;notify('ready',{bridgeVersion:1,stateVersion:1});}
  else if(new URLSearchParams(location.search).has('game')){document.body.classList.add('embedded-game');$('chat-runtime').hidden=false;}
  controls();status('게임 준비 완료');return {controls,apply,restore,notify,submit,refreshSettings,reportStatus:status,sendSettings:snapshot=>{campaignSettings=snapshot;submit('새 게임 설정 읽기',null,null,true);},setCampaignSettings:snapshot=>{campaignSettings=snapshot?.sha===loadedSettingsCommit?null:snapshot;},isPending:()=>!!pending||settingsRefreshing||battleIsActive(state)||!!getIntro?.()?.isStarting(),conversation:()=>conversation};
}
