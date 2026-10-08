import {parseScene,actionPrompt} from './scene.js';
import {normalize} from './state.js';
let requestSequence=0;
function newRequestId(){
  if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
  if(typeof globalThis.crypto?.getRandomValues==='function')return [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');
  return `action-${Date.now()}-${++requestSequence}`;
}
export function mountChatUI(state,{render,persist,storage,embedded}){
  const $=id=>document.getElementById(id);
  let pending=null,timer=null,ackTimer=null,conversation=window.__ERCEDIA_CONFIG__?.conversation||'preview';
  const choiceButtons=Array.from({length:4},()=>{const button=document.createElement('button');button.type='button';$('scene-choices').append(button);return button;});
  const status=message=>{$('connection-status').textContent=message;};
  function notify(type,payload){if(embedded)parent.postMessage({channel:'ercedia',token:window.__ERCEDIA_CONFIG__.token,conversation,type,payload},'*');}
  const needsName=()=>!state.player.name.trim()||/^(플레이어|주인공|player)$/i.test(state.player.name.trim());
  function controls(){
    const naming=needsName(),wasHidden=$('name-setup').hidden;$('name-setup').hidden=!naming;
    if(naming&&wasHidden)queueMicrotask(()=>$('adventurer-name').focus({preventScroll:true}));
    $('action-label').textContent=naming?'자유 대화·행동':`${state.player.name}의 대화·행동`;
    const choices=state.scene?.choices||[],last=!state.scene||state.sceneIndex===state.scene.dialogue.length-1;
    choiceButtons.forEach((button,index)=>{const choice=choices[index];button.hidden=!choice;button.textContent=choice?.text||'';button.disabled=!!pending||!last||naming;button.onclick=choice?()=>submit(choice.text,choice.id):null;});
    $('free-action').disabled=!!pending||naming;$('send-action').disabled=!!pending||naming;$('cancel-wait').hidden=!pending;
  }
  function chooseName(){
    if(!needsName())return;
    const name=$('adventurer-name').value.trim();
    if(!name||/^(플레이어|주인공|player)$/i.test(name)){$('name-error').textContent='모험에 사용할 이름을 입력해주세요.';$('adventurer-name').focus();return;}
    state.chosenName=name;state.player.name=name;$('name-error').textContent='';
    render();controls();persist();status(`${name}님, 모험을 시작하세요.`);$('free-action').focus();
  }
  $('confirm-name').onclick=chooseName;
  $('name-setup').addEventListener('keydown',event=>{if(event.key==='Tab'){const first=$('adventurer-name'),last=$('confirm-name');if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  $('adventurer-name').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();chooseName();}});
  function cancel(message='대기를 해제했습니다. 재전송 전에 원본 채팅의 전송 여부를 확인하세요.'){
    clearTimeout(timer);clearTimeout(ackTimer);pending=null;controls();status(message);notify('cancel',{});
  }
  function submit(action,choiceId=null){
    if(pending||needsName()||!action.trim())return;
    if(action.length>2000)return status('자유 행동은 2,000자까지 입력할 수 있습니다.');
    try{
    const requestId=newRequestId();pending={requestId,choiceId};
    $('action-copy').value=actionPrompt(state,action,requestId);$('action-copy-area').hidden=false;
    controls();status(embedded?'ChatGPT 연결 중…':'이 요청을 ChatGPT에 보내고 응답 JSON을 아래에 붙여넣으세요.');
    notify('action',{text:$('action-copy').value,requestId});
    if(embedded)ackTimer=setTimeout(()=>{if(pending?.requestId===requestId&&!pending.acknowledged)cancel('게임 요청이 런처에 도착하지 않았습니다. Tampermonkey 런처를 최신 버전으로 업데이트하고 ChatGPT 페이지를 새로고침하세요.');},7000);
    timer=setTimeout(()=>cancel('응답 대기 시간이 지났습니다. 기존 장면은 유지됩니다. 원본 채팅 확인 또는 JSON 수동 적용을 이용하세요.'),120000);
    }catch(error){cancel(`요청 준비 실패 · ${error.message} · 입력은 유지됩니다. 다시 보내거나 원본 ChatGPT 입력창을 이용하세요.`);}
  }
  function apply(source){
    try{
      const scene=parseScene(source);
      if(state.seenScenes.includes(scene.scene_id))return status('이미 반영한 장면입니다. 중복 적용하지 않았습니다.');
      if(pending&&scene.reply_to&&scene.reply_to!==pending.requestId)return status('다른 요청의 응답입니다. 현재 장면을 유지합니다.');
      state.scene=scene;state.sceneIndex=0;
      state.seenScenes=[...state.seenScenes,scene.scene_id].slice(-100);
      if(scene.player)state.player={...scene.player,...(state.chosenName?{name:state.chosenName}:{})};
      if(scene.inventory)state.inventory=scene.inventory;
      if(scene.game_state)Object.assign(state.gameState,scene.game_state);
      cancel('새 장면을 반영했습니다.');$('free-action').value='';$('action-copy-area').hidden=true;
      render();controls();persist();notify('applied',{scene_id:scene.scene_id});
    }catch(error){status(`응답 적용 실패 · ${error.message} 기존 장면은 유지됩니다.`);notify('parse-error',{message:error.message});}
  }
  $('free-action-form').onsubmit=event=>{event.preventDefault();submit($('free-action').value);};
  // A sandboxed frame intentionally cannot submit native forms. Send through the bridge directly.
  $('send-action').type='button';
  $('send-action').onclick=()=>submit($('free-action').value);
  $('free-action').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();submit(event.currentTarget.value);}});
  $('apply-scene').onclick=()=>apply($('scene-json').value);
  $('cancel-wait').onclick=()=>{cancel();notify('cancel',{});};
  $('copy-action').onclick=async()=>{try{await navigator.clipboard.writeText($('action-copy').value);status('요청을 복사했습니다. ChatGPT에 붙여넣어 전송하세요.');}catch{$('action-copy').focus();$('action-copy').select();status('요청 전체를 선택했습니다. Ctrl+C로 복사하세요.');}};
  function restore(saved){
    cancel();delete state.chosenName;delete state.mapFaction;Object.assign(state,normalize(saved));
    $('adventurer-name').value='';$('name-error').textContent='';$('connection-tools').open=false;
    window.__ERCEDIA_CONFIG__&&(window.__ERCEDIA_CONFIG__.saved=state);
    render();controls();status('이 채팅의 저장 상태를 불러왔습니다.');
  }
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
    if(data.type==='action-ack'&&pending?.requestId===data.payload?.requestId){pending.acknowledged=true;clearTimeout(ackTimer);status('런처가 요청을 받았습니다. GPT 입력창으로 전달하는 중…');}
    if(data.type==='action-error')cancel(data.payload);
    if(data.type==='snapshot')notify('snapshot',{state:JSON.parse(JSON.stringify(state)),pending:!!pending,requestId:data.requestId});
    if(data.type==='update-player')window.gameBridge.updatePlayer(data.payload);
    if(data.type==='update-inventory')window.gameBridge.updateInventory(data.payload);
    if(data.type==='scene')apply(data.payload);
    if(data.type==='status')status(data.payload);
    if(data.type==='save-error')status('저장 실패 · 화면은 유지됩니다. JSON과 요청을 복사해 보관하세요.');
    if(data.type==='interrupt')cancel(data.payload);
  });
  if(embedded){document.body.classList.add('embedded-game');$('chat-runtime').hidden=false;notify('ready',{bridgeVersion:1,stateVersion:1});}
  else if(new URLSearchParams(location.search).has('game')){document.body.classList.add('embedded-game');$('chat-runtime').hidden=false;}
  controls();return {controls,apply,restore,notify,conversation:()=>conversation};
}
