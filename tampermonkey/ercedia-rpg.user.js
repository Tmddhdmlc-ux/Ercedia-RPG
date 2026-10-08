// ==UserScript==
// @name         에르세디아 RPG · 고정 런처
// @namespace    https://github.com/Tmddhdmlc-ux/Ercedia-RPG
// @version      1.1.6
// @description  GitHub 게임 UI 업데이트, 상태 복원 및 실험적 ChatGPT 연결
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/main/tampermonkey/ercedia-rpg.meta.js
// @downloadURL  https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/main/tampermonkey/ercedia-rpg.user.js
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addElement
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// ==/UserScript==
(()=>{
  'use strict';
  // Extract a completed scene object from rendered code or surrounding assistant prose.
// Only JSON.parse is used. Strings, escaped quotes and braces inside dialogue are respected.
function extractSceneJSON(source){
  if(typeof source!=='string'||source.length>120000)return null;
  let depth=0,start=-1,quoted=false,escape=false;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(depth===0){if(char==='{'){start=i;depth=1;quoted=false;escape=false;}continue;}
    if(quoted){if(escape)escape=false;else if(char==='\\')escape=true;else if(char==='"')quoted=false;continue;}
    if(char==='"')quoted=true;else if(char==='{')depth++;else if(char==='}'&&--depth===0){
      const candidate=source.slice(start,i+1);try{if(JSON.parse(candidate)?.type==='ercedia_scene')return candidate;}catch{}
    }
  }
  return null;
}

  if(document.getElementById('ercedia-game-root'))return;
  const HOST='https://tmddhdmlc-ux.github.io/Ercedia-RPG';
  const REPO='Tmddhdmlc-ux/Ercedia-RPG',CACHE='ercedia.launcher.releases.v1';
  const root=document.createElement('div');root.id='ercedia-game-root';
  const shadow=root.attachShadow({mode:'open'}),style=document.createElement('style');
  style.textContent=`:host{position:fixed;inset:auto;z-index:2147483600;color:#e9eded;font:12px/1.6 system-ui;display:block}*{box-sizing:border-box}[hidden]{display:none!important}.window{height:100%;display:flex;flex-direction:column;background:#101920;border:1px solid #d6b77c66;border-radius:10px;overflow:hidden;box-shadow:0 12px 60px #0008}.toolbar{display:flex;gap:7px;align-items:center;padding:8px 12px;border-bottom:1px solid #ffffff22;flex-shrink:0;flex-wrap:wrap}.toolbar strong{color:#d6b77c;margin-right:auto}button{font:inherit;border:1px solid #ffffff33;background:#22323e;color:#e9eded;border-radius:5px;padding:5px 9px;cursor:pointer}button:disabled{opacity:.4;cursor:default}label{display:flex;align-items:center;gap:5px;font-size:11px}.status{font-size:10px;color:#b7c8d1;width:100%;overflow-wrap:anywhere}iframe{flex:1;min-height:0;width:100%;border:0;background:#101920}.launcher{position:fixed;bottom:20px;right:20px}iframe.stage-frame{position:absolute;left:-20000px;top:0;width:1000px;height:1100px;opacity:0;pointer-events:none}:host([data-mode=debug]) .window{border-color:#86bed0}:host([data-mode=closed]){inset:auto!important;bottom:20px!important;right:20px!important;width:auto!important;height:auto!important}.debug-info{font-size:10px;padding:7px 12px;background:#132330;color:#9db2bf}.loading{padding:30px;color:#d6b77c}.toolbar strong{cursor:move;user-select:none;touch-action:none}.resize-handle{position:absolute;bottom:0;right:0;width:24px;height:24px;padding:0;cursor:nwse-resize;touch-action:none;z-index:2;background:#20333f;color:#d6b77c;border-radius:5px 0 8px 0}:host([data-adjusting=true]) iframe{pointer-events:none}`;
  const win=document.createElement('section');win.className='window';
  const toolbar=document.createElement('div');toolbar.className='toolbar';
  function button(text,id){const el=document.createElement('button');el.textContent=text;el.id=id;toolbar.append(el);return el;}
  const title=document.createElement('strong');title.textContent='에르세디아 RPG';toolbar.append(title);
  const version=document.createElement('span');version.id='ui-version';toolbar.append(version);
  const mode=button('디버그 모드','launcher-mode'),check=button('최신 버전 확인','check-update'),update=button('업데이트 적용','apply-update'),rollback=button('이전 버전 복구','rollback-update');update.hidden=true;rollback.disabled=true;
  const label=document.createElement('label'),auto=document.createElement('input');auto.type='checkbox';label.append(auto,'GPT 자동 연결');toolbar.append(label);
  const resetSize=button('창 기본 크기','reset-size');
  const close=button('게임 종료','close-game'),status=document.createElement('div');status.className='status';status.setAttribute('role','status');toolbar.append(status);
  const info=document.createElement('div');info.className='debug-info';info.textContent='자동 연결은 실험 기능입니다. 실패하면 요청 복사 → ChatGPT 직접 전송 → 응답 JSON 수동 적용을 사용하세요.';info.hidden=true;
  const loading=document.createElement('p');loading.className='loading';loading.textContent='저장된 UI 또는 GitHub 최신 UI를 불러오는 중…';
  const stage=document.createElement('div');stage.className='stage';
  const launcher=document.createElement('button');launcher.className='launcher';launcher.textContent='✧ 에르세디아 열기';launcher.hidden=true;
  const resizeHandle=document.createElement('button');resizeHandle.className='resize-handle';resizeHandle.textContent='◢';resizeHandle.setAttribute('aria-label','창 크기 조절 · 방향키로도 조절 가능');win.append(resizeHandle);
  shadow.append(style,win,stage,launcher);win.append(toolbar,info,loading);document.documentElement.append(root);root.dataset.mode='game';
  const receivedActions=new Set();let responseCandidate='',responseStableAt=0,responseSent='';
  let conversation=conversationId(),lastURL=location.href,active=null,prepared=null,previous=null,candidate=null,latestState=null,pending=null,checking=false,switching=false,lastCheck=0,latestFingerprint='',lastApplied='',scanTimer=null,routeTimer=null;
  const waiters=new Map();
  function conversationId(){return location.pathname.match(/\/c\/([^/]+)/)?.[1]||`draft:${location.pathname}`;}
  const storageKey=()=>`ercedia.tm.v1:${conversation}`;
  function read(key,fallback=null){try{return GM_getValue(key,fallback);}catch{return fallback;}}
  function write(key,value){GM_setValue(key,value);}
  const AUTO_KEY='ercedia.launcher.auto-connect.v1';auto.checked=read(AUTO_KEY,true)!==false;
  function post(record,type,payload,requestId){record?.frame.contentWindow.postMessage({channel:'ercedia',token:record.token,conversation,type,payload,requestId},'*');}
  function send(type,payload){post(active,type,payload);}
  function tell(message){status.textContent=message;send('status',message);}
  function setMode(value){root.dataset.mode=value;if(value!=='closed')applyBounds();win.hidden=value==='closed';launcher.hidden=value!=='closed';info.hidden=value!=='debug';mode.textContent=value==='debug'?'게임 모드':'디버그 모드';if(value==='game'){checkLatest(false);scan();}}
  mode.onclick=()=>setMode(root.dataset.mode==='debug'?'game':'debug');close.onclick=()=>setMode('closed');launcher.onclick=()=>setMode('game');
  if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('에르세디아 열기',()=>setMode('game'));
  const BOX_KEY='ercedia.launcher.window.v1';
  function defaultBounds(){const width=Math.min(960,innerWidth-20),height=Math.min(760,innerHeight-20);return {width,height,x:Math.max(0,(innerWidth-width)/2),y:Math.max(0,(innerHeight-height)/2)};}
  let bounds=read(BOX_KEY,defaultBounds());
  function applyBounds(){
    for(const k of ['x','y','width','height'])if(!Number.isFinite(bounds?.[k]))bounds=defaultBounds();
    bounds.width=Math.min(innerWidth-8,Math.max(Math.min(360,innerWidth-8),bounds.width));bounds.height=Math.min(innerHeight-8,Math.max(Math.min(360,innerHeight-8),bounds.height));
    bounds.x=Math.max(4,Math.min(innerWidth-bounds.width-4,bounds.x));bounds.y=Math.max(4,Math.min(innerHeight-bounds.height-4,bounds.y));
    root.style.width=bounds.width+'px';root.style.height=bounds.height+'px';root.style.left=bounds.x+'px';root.style.top=bounds.y+'px';
  }
  function saveBounds(){try{write(BOX_KEY,bounds);}catch{status.textContent='창 크기를 저장하지 못했습니다. 현재 크기는 유지됩니다.';}}
  function draggable(handle,resize){let drag;
    handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,bounds:{...bounds}};handle.setPointerCapture(event.pointerId);root.dataset.adjusting='true';event.preventDefault();});
    handle.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;bounds=resize?{...drag.bounds,width:drag.bounds.width+dx,height:drag.bounds.height+dy}:{...drag.bounds,x:drag.bounds.x+dx,y:drag.bounds.y+dy};applyBounds();});
    const finish=()=>{if(!drag)return;drag=null;root.dataset.adjusting='false';saveBounds();};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
  }
  title.tabIndex=0;title.setAttribute('aria-label','게임 창 이동');draggable(title,false);draggable(resizeHandle,true);
  for(const [handle,resize] of [[title,false],[resizeHandle,true]])handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?40:10;const horizontal=['ArrowLeft','ArrowRight'].includes(event.key),positive=['ArrowRight','ArrowDown'].includes(event.key);bounds[resize?(horizontal?'width':'height'):(horizontal?'x':'y')]+=positive?step:-step;applyBounds();saveBounds();});
  resetSize.onclick=()=>{bounds=defaultBounds();applyBounds();saveBounds();};window.addEventListener('resize',applyBounds);applyBounds();
  function request(url){
    if(!/^https:\/\/(api\.github\.com\/repos\/Tmddhdmlc-ux\/Ercedia-RPG\/commits\/main|raw\.githubusercontent\.com\/Tmddhdmlc-ux\/Ercedia-RPG\/[a-f0-9]{40}\/integration\/(game\.html|update-manifest\.json))(?:\?|$)/.test(url))return Promise.reject(Error('허용되지 않은 배포 경로입니다.'));
    return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,timeout:20000,headers:{'Accept':'application/vnd.github+json'},onload:r=>{if(r.status!==200)return reject(Error(`GitHub 응답 ${r.status}`));if(r.finalUrl&&new URL(r.finalUrl).origin!==new URL(url).origin)return reject(Error('배포 요청이 다른 도메인으로 이동했습니다.'));resolve(r.responseText);},onerror:()=>reject(Error('네트워크 연결 실패')),ontimeout:()=>reject(Error('다운로드 시간 초과'))}));
  }
  async function verify(release){
    if(!release||!/^[a-f0-9]{40}$/.test(release.sha)||release.manifest?.bridgeVersion!==1||release.manifest?.stateVersion!==1||release.manifest?.sceneSchemaVersion!==1||release.manifest?.entry!=='integration/game.html'||typeof release.html!=='string'||release.html.length>2000000)throw Error('지원하지 않는 UI 또는 저장 버전입니다.');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(release.html)))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==release.manifest.sha256)throw Error('UI 파일의 검증값이 일치하지 않습니다.');return release;
  }
  function frameRequest(record,type,payload){
    const requestId=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiters.delete(requestId);reject(Error('상태 확인 시간 초과'));},10000);waiters.set(requestId,{record,resolve:value=>{clearTimeout(timer);resolve(value);}});post(record,type,payload,requestId);});
  }
  function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
  function createFrame(release,saved){
    const token=crypto.randomUUID(),config={token,conversation,saved,assetBase:`https://raw.githubusercontent.com/${REPO}/${release.sha}/`};
    const bootstrap=`window.__ERCEDIA_CONFIG__=${JSON.stringify(config).replaceAll('<','\\u003c')};window.__ERCEDIA_STORAGE__={getItem:()=>window.__ERCEDIA_CONFIG__.saved?JSON.stringify(window.__ERCEDIA_CONFIG__.saved):null,setItem:(key,value)=>{const state=JSON.parse(value);window.__ERCEDIA_CONFIG__.saved=state;parent.postMessage({channel:'ercedia',token:window.__ERCEDIA_CONFIG__.token,conversation:window.__ERCEDIA_CONFIG__.conversation,type:'save',payload:state},'*');}};`;
    const html=release.html.replace('/*__ERCEDIA_BOOTSTRAP__*/',()=>bootstrap+"window.addEventListener('error',event=>parent.postMessage({channel:'ercedia',token:window.__ERCEDIA_CONFIG__.token,conversation:window.__ERCEDIA_CONFIG__.conversation,type:'boot-error',payload:event.message},'*'));");
    const record={release,token,frame:null,ready:false,health:null,html};
    const promise=new Promise((resolve,reject)=>{record.resolve=resolve;record.reject=reject;record.timer=setTimeout(()=>reject(Error(record.ready?'게임은 시작했지만 이미지 확인이 지연됐습니다.':'게임 프레임이 응답하지 않습니다. 호스팅 주소 또는 페이지의 프레임 허용 정책을 확인하세요.')),35000);});
    candidate=record;record.frame=GM_addElement(win,'iframe',{class:'stage-frame',title:'에르세디아 게임 화면',sandbox:'allow-scripts',allow:'fullscreen; clipboard-write',src:HOST+'/integration/frame.html#token='+token+'&conversation='+encodeURIComponent(conversation)});
    record.promise=promise;return record;
  }
  function ready(record){if(record.ready&&record.health!==null){clearTimeout(record.timer);record.health?record.resolve(record):record.reject(Error('새 UI 이미지 로드 실패 · 기존 UI를 유지합니다.'));}}
  async function activate(release,initial=false){
    if(switching)return;if(!initial&&(pending||generating()))return tell('대화 진행 중에는 업데이트할 수 없습니다. 응답 완료 또는 대기 해제 후 적용하세요.');
    switching=true;update.disabled=true;rollback.disabled=true;
    let record,old=active,route=conversation;
    try{
      let snapshot=latestState||read(storageKey());
      if(old){const result=await frameRequest(old,'snapshot',null);if(result.pending||generating())throw Error('게임 행동을 기다리는 중입니다.');snapshot=result.state;write(`${storageKey()}:backup`,snapshot);}
      tell(initial?'게임 UI를 시작하고 있습니다…':'새 UI를 별도 영역에서 검사하는 중… 현재 화면은 유지됩니다.');
      record=createFrame(await verify(release),snapshot);await record.promise;
      if(route!==conversation)throw Error('채팅이 전환되어 업데이트 적용을 취소했습니다.');
      if(old){const fresh=await frameRequest(old,'snapshot',null);if(fresh.pending||pending||generating())throw Error('검사 중 대화가 시작되어 적용을 보류했습니다.');snapshot=fresh.state;}
      const restored=await frameRequest(record,'restore',snapshot);
      if(snapshot&&canonical(restored.state)!==canonical(snapshot))throw Error('상태 구조가 호환되지 않아 적용을 취소했습니다.');
      // Cache before changing the visible frame; a storage error leaves the current UI intact.
      write(CACHE,{current:release,previous:old?.release||previous});
      write(storageKey(),restored.state);
      active=record;candidate=null;latestState=restored.state;previous=old?.release||previous;
      record.frame.classList.remove('stage-frame');loading.hidden=true;old?.frame.remove();
      version.textContent=`런처 1.1.6 · UI ${release.manifest.version} · ${release.sha.slice(0,7)}`;
      prepared=null;update.hidden=true;rollback.disabled=!previous;
      tell(initial?'고정 UI 연결됨 · 자동 연결은 꺼져 있습니다.':'UI 업데이트 완료 · 장면과 게임 상태를 복원했습니다.');
    }catch(error){record?.frame.remove();candidate=null;tell(`${error.message} · 마지막 정상 화면과 저장 상태를 유지합니다.`);if(initial)loading.textContent='GitHub UI를 시작하지 못했습니다. 최신 버전 확인으로 재시도하거나 localhost 수동 게임 화면을 사용하세요.';}
    finally{switching=false;update.disabled=false;rollback.disabled=!previous;}
  }
  async function checkLatest(force=false){
    if(checking||switching||(!force&&Date.now()-lastCheck<600000))return;
    checking=true;lastCheck=Date.now();check.disabled=true;
    try{
      const commit=JSON.parse(await request(`https://api.github.com/repos/${REPO}/commits/main?check=${Date.now()}`));
      if(!/^[a-f0-9]{40}$/.test(commit.sha))throw Error('커밋 식별자가 올바르지 않습니다.');
      if(commit.sha===active?.release.sha||commit.sha===prepared?.sha){if(force)tell('현재 확인된 최신 UI입니다.');return;}
      const base=`https://raw.githubusercontent.com/${REPO}/${commit.sha}/integration/`;
      const manifest=JSON.parse(await request(base+'update-manifest.json'));
      if(active&&manifest.sha256===active.release.manifest.sha256&&manifest.assetDigest===active.release.manifest.assetDigest){if(force)tell('게임 UI 변경이 없습니다.');return;}
      const release=await verify({sha:commit.sha,manifest,html:await request(base+'game.html')});
      if(!active)return await activate(release,true);
      prepared=release;update.hidden=false;tell(`새 UI 발견 · 현재 v${active.release.manifest.version} → v${manifest.version} (${commit.sha.slice(0,7)}). 진행 상태를 유지한 채 업데이트 적용을 누르세요.`);
    }catch(error){tell(`업데이트 확인 실패 · ${error.message} · 기존 UI와 저장 상태를 유지합니다.`);if(!active)loading.textContent='GitHub 연결 실패 · 최신 버전 확인 버튼으로 다시 시도하세요.';}
    finally{checking=false;check.disabled=false;}
  }
  check.onclick=()=>checkLatest(true);update.onclick=()=>prepared&&activate(prepared);rollback.onclick=()=>previous&&activate(previous);
  const latest=()=>{const nodes=document.querySelectorAll('[data-message-author-role="assistant"]');return nodes[nodes.length-1];};
  const generating=()=>[...document.querySelectorAll('[data-testid="stop-button"],button[aria-label="Stop generating"],button[aria-label="응답 생성 중지"],[data-testid="composer-submit-button"][data-state="stop"]')].some(button=>visible(button)&&button.getAttribute('aria-hidden')!=='true');
  function baseline(){latestFingerprint=latest()?.textContent||'';}
  baseline();auto.onchange=()=>{try{write(AUTO_KEY,auto.checked);}catch{}responseCandidate='';responseSent='';scan();tell(auto.checked?'GPT 자동 연결 켜짐 · 입력 전송과 장면 응답 반영':'수동 모드 · 요청 복사와 JSON 적용을 사용하세요.');};
  function pageRoots(){
    const roots=[document];
    for(let i=0;i<roots.length;i++)for(const element of roots[i].querySelectorAll('*')){
      if(element!==root&&element.shadowRoot)roots.push(element.shadowRoot);
    }
    return roots;
  }
  function visible(element){
    const box=element.getBoundingClientRect(),css=getComputedStyle(element);
    return element.isConnected&&box.width>0&&box.height>0&&css.display!=='none'&&css.visibility!=='hidden'&&!element.closest('[hidden],[inert]');
  }
  function findComposer(){
    const candidates=[];
    // ChatGPT editors may be ProseMirror, Lexical, a textbox, or a textarea.
    for(const scope of pageRoots())for(const element of scope.querySelectorAll('textarea,[contenteditable],[role="textbox"]')){
      if(!visible(element)||element.disabled||element.readOnly||element.getAttribute('aria-disabled')==='true')continue;
      if(element.tagName!=='TEXTAREA'&&!element.isContentEditable)continue;
      // Nested editable children are part of the same editor, not separate inputs.
      if(element.parentElement?.closest('[contenteditable="true"],[contenteditable="plaintext-only"]'))continue;
      const hint=[element.id,element.getAttribute('data-testid'),element.getAttribute('aria-label'),element.getAttribute('placeholder'),element.getAttribute('data-placeholder')].filter(Boolean).join(' ');
      if(/search|검색/i.test(hint)||element.closest('[data-message-author-role],[role="dialog"]'))continue;
      let score=/prompt-textarea|composer/i.test(hint)?100:0;
      if(/ChatGPT|message|prompt|메시지|물어보|프롬프트/i.test(hint))score+=60;
      if(element.closest('form,[data-testid*="composer"],[id*="composer"]'))score+=35;
      if(element.matches('.ProseMirror,[data-lexical-editor="true"]'))score+=25;
      if(element.getAttribute('role')==='textbox')score+=10;
      const box=element.getBoundingClientRect();
      if(element.isContentEditable&&box.width>250&&box.bottom>innerHeight*.6)score+=20;
      score+=Math.min(20,element.getBoundingClientRect().bottom/Math.max(1,innerHeight)*20);
      candidates.push({element,score});
    }
    candidates.sort((a,b)=>b.score-a.score);
    // Do not write to an unrelated search or message-edit field.
    return candidates[0]?.score>=35?candidates[0].element:null;
  }
  function failAction(message){setMode('debug');tell(message);pending=null;send('action-error',message);}
  async function deliver(payload){
    pending=payload.requestId;baseline();
    if(!auto.checked){setMode('debug');tell('수동 모드 · 요청 복사로 원본 ChatGPT에 전송하세요.');return;}
    if(generating())return failAction('ChatGPT가 응답 중입니다. 완료 후 다시 보내세요.');
    let editor;
    for(let attempt=0;attempt<10;attempt++){
      if(pending!==payload.requestId)return;
      editor=findComposer();if(editor)break;
      await new Promise(resolve=>setTimeout(resolve,300));
    }
    if(!editor)return failAction('ChatGPT 입력창을 인식하지 못했습니다. 페이지 새로고침 후 다시 보내세요.');
    const existing=('value' in editor?editor.value:editor.textContent)||'';
    if(existing.trim())return failAction('원본 ChatGPT 입력창에 작성 중인 내용이 있습니다. 먼저 비운 뒤 다시 보내세요.');
    editor.focus();
    if('value' in editor){const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;setter?setter.call(editor,payload.text):editor.value=payload.text;}
    else {
      const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(editor);selection.removeAllRanges();selection.addRange(range);
      let inserted=false;try{inserted=document.execCommand('insertText',false,payload.text);}catch{}
      if(!inserted){const paragraphs=payload.text.split('\n').map(line=>{const p=document.createElement('p');p.textContent=line;return p;});editor.replaceChildren(...paragraphs);}
    }
    editor.dispatchEvent(new InputEvent('input',{bubbles:true,composed:true,inputType:'insertText',data:payload.text}));
    tell('ChatGPT 입력창 감지 · 요청 전달 완료 · 전송 버튼을 기다리는 중…');
    let submit;
    for(let attempt=0;attempt<12;attempt++){
      await new Promise(resolve=>setTimeout(resolve,200));
      if(conversation!==conversationId()||pending!==payload.requestId)return;
      const selectors='button[data-testid="send-button"],button[data-testid="composer-submit-button"],button[aria-label="Send prompt"],button[aria-label="프롬프트 보내기"],button[aria-label="메시지 보내기"]';
      submit=pageRoots().flatMap(scope=>[...scope.querySelectorAll(selectors)]).find(button=>visible(button)&&!button.disabled&&button.getAttribute('aria-disabled')!=='true'&&!/stop|중지/i.test(button.getAttribute('aria-label')||'')&&button.dataset.state!=='stop');
      if(!submit)submit=editor.closest('form')?.querySelector('button[type="submit"]');
      if(submit&&!submit.disabled&&!generating())break;submit=null;
    }
    if(!submit||submit.disabled)return failAction('GPT 입력창에는 요청을 넣었지만 전송하지 못했습니다. 원본 입력창의 전송 버튼을 확인하세요.');
    submit.click();tell('전송을 시도했습니다. 응답을 기다리는 중…');
    setTimeout(()=>{if(pending===payload.requestId&&(('value' in editor?editor.value:editor.textContent)||'').trim()&&!generating())tell('전송 확인이 되지 않았습니다. 원본 입력창을 확인하세요. 자동 재전송은 하지 않습니다.');},1200);
  }
  function responseSources(){
    const sources=[],visited=new Set();
    // New ChatGPT layouts may omit data-message-author-role on the response.
    const selector='[data-message-author-role="assistant"],[data-turn="assistant"],.agent-turn,article[data-testid^="conversation-turn"],[data-testid^="conversation-turn"],pre,[data-testid="code-block"],.markdown';
    for(const scope of pageRoots()){
      const nodes=[...scope.querySelectorAll(selector)].reverse();
      for(const node of nodes){
        if(node.closest('[data-message-author-role="user"],[data-turn="user"]')||node.closest('[contenteditable="true"],textarea'))continue;
        for(const text of [node.textContent,node.innerText])if(text&&!visited.has(text)){
          visited.add(text);sources.push(text);
        }
      }
    }
    return sources;
  }
  let responseNotice='';
  function scan(){
    if(!auto.checked||!active||generating())return;
    const values=responseSources().map(extractSceneJSON).filter(Boolean);
    const scenes=values.map(value=>({value,scene:JSON.parse(value)}));
    const found=scenes.find(({scene})=>pending?scene.reply_to===pending:!latestState?.seenScenes?.includes(scene.scene_id));
    // A response without reply_to remains compatible with the v1 bridge.
    const fallback=pending?scenes.find(({scene})=>!scene.reply_to&&!latestState?.seenScenes?.includes(scene.scene_id)):null;
    const value=(found||fallback)?.value;
    if(!value&&pending&&scenes.length){
      const message='GPT 장면 JSON을 찾았지만 현재 요청의 reply_to와 다릅니다. 응답의 요청 ID를 확인하세요.';
      if(responseNotice!==message){responseNotice=message;tell(message);}return;
    }
    if(!value||value===responseSent)return;
    if(value!==responseCandidate){responseCandidate=value;responseStableAt=Date.now();return;}
    if(Date.now()-responseStableAt<1200)return;
    responseNotice='';responseSent=value;latestFingerprint=value;tell('GPT 장면 응답 감지 · 게임 화면에 적용하는 중…');send('scene',value);
  }
  function scheduleScan(){if(!auto.checked||scanTimer)return;scanTimer=setTimeout(()=>{scanTimer=null;scan();},600);}
  new MutationObserver(scheduleScan).observe(document.body,{childList:true,subtree:true,characterData:true});
  setInterval(()=>{if(auto.checked&&active)scan();},1000);
  window.addEventListener('message',event=>{
    const data=event.data,record=[active,candidate].find(v=>v&&event.source===v.frame.contentWindow&&data?.token===v.token);
    if(!record||data.channel!=='ercedia')return;
    if(data.conversation!==conversation){
      if(data.type==='action')record.frame.contentWindow.postMessage({channel:'ercedia',token:record.token,conversation:data.conversation,type:'action-error',payload:'채팅 연결 상태가 달라 요청을 전달하지 않았습니다. 페이지를 새로고침하세요.'},'*');
      return;
    }
    if(data.type==='boot-error'&&record===candidate){clearTimeout(record.timer);record.reject(Error('게임 시작 오류 · '+data.payload));}
    if(data.type==='shell-ready'){post(record,'boot',record.html);status.textContent='게임 로더 연결됨 · 화면을 시작하는 중…';}
    if(data.type==='ready'){if(data.payload.bridgeVersion!==1||data.payload.stateVersion!==1)return record.reject(Error('브리지 호환성 오류'));record.ready=true;ready(record);}
    if(data.type==='health'){record.health=data.payload.ok;ready(record);}
    if(data.payload?.requestId){const waiter=waiters.get(data.payload.requestId);if(waiter?.record===record){waiters.delete(data.payload.requestId);waiter.resolve(data.payload);}}
    if(record!==active)return;
    if(data.type==='save'){latestState=data.payload;try{write(storageKey(),latestState);}catch{send('save-error',null);}}
    if(data.type==='action'){
      post(record,'action-ack',{requestId:data.payload.requestId});
      if(receivedActions.has(data.payload.requestId))return;
      receivedActions.add(data.payload.requestId);if(receivedActions.size>100)receivedActions.delete(receivedActions.values().next().value);
      deliver(data.payload).catch(error=>{tell('GPT 입력 전달 실패 · '+error.message);send('action-error','GPT 입력 전달에 실패했습니다. 원본 입력을 확인하고 다시 시도하세요.');});
    }
    if(data.type==='cancel')pending=null;
    if(data.type==='applied'){pending=null;lastApplied=latestFingerprint;tell(`장면 적용 · ${data.payload.scene_id}`);}
    if(data.type==='parse-error')tell(`응답 해석 오류 · ${data.payload.message} · JSON 수동 적용을 사용하세요.`);
  });
  setInterval(()=>{
    if(location.href===lastURL)return;lastURL=location.href;const next=conversationId();if(next===conversation)return;
    clearTimeout(scanTimer);clearTimeout(routeTimer);const wasDraft=conversation.startsWith('draft:')&&!!pending;
    const saved=wasDraft?latestState:read(`ercedia.tm.v1:${next}`);conversation=next;if(!wasDraft)pending=null;lastApplied='';responseCandidate='';responseSent='';latestState=saved;
    if(wasDraft&&saved)try{write(storageKey(),saved);}catch{}baseline();if(wasDraft){send('conversation',null);tell('새 채팅에 게임 요청 연결 · GPT 응답을 기다리는 중…');}else{send('restore',saved);tell('채팅 전환 · 저장 상태 복원 요청');}
  },500);
  setInterval(()=>checkLatest(false),600000);
  (async()=>{const cache=read(CACHE);previous=cache?.previous||null;if(cache?.current)await activate(cache.current,true);if(!active&&cache?.previous)await activate(cache.previous,true);await checkLatest(true);})();
})();
