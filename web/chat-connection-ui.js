import {loadCampaignSettings} from './campaign-settings.js';
export function mountChatConnection(state,{embedded,isPending,report}){
  const button=document.getElementById('connect-new-chat'),note=document.getElementById('chat-link-note'),install=document.getElementById('install-chat-launcher');
  const scope=window;let available=false,waiting=null,busy=false;
  button.hidden=install.hidden=note.hidden=!!embedded;if(embedded)return;
  const message=text=>{note.textContent=text;report?.(text);};
  const post=(type,id,payload)=>scope.postMessage({channel:'ercedia-handoff',type,id,payload},scope.location.origin);
  scope.addEventListener('message',event=>{
    const d=event.data;if(event.source!==scope||event.origin!==scope.location.origin||d?.channel!=='ercedia-handoff')return;
    if(d.type==='ready'){available=true;install.hidden=true;if(!waiting)message('런처 연결됨 · 새 게임의 캐릭터 설정을 완료하면 새 ChatGPT 채팅으로 자동 전송합니다.');}
    if(d.id!==waiting)return;
    if(d.type==='opened'||d.type==='error'){waiting=null;busy=false;button.disabled=false;message(d.payload);}
  });
  for(const delay of [0,1000,3000])setTimeout(()=>post('probe',crypto.randomUUID()),delay);
  message('새 게임 설정 완료 후 ChatGPT로 자동 전송합니다. Chrome/Edge에서 연결 런처를 먼저 설치하세요.');
  async function connect(settings=null){
    if(busy)return;
    if(!available){install.hidden=false;return message('이 브라우저에서 연결 런처가 감지되지 않았습니다. Chrome/Edge에 런처 1.2.0을 설치·업데이트하고 같은 게임 주소를 여세요.');}
    if(isPending()||state.introDraft||!state.player.name.trim())return message('새 게임의 캐릭터 설정과 진행 중인 응답을 먼저 완료하세요.');
    busy=true;button.disabled=true;
    try{
      settings=settings||await loadCampaignSettings({onProgress:message});
      waiting=crypto.randomUUID();const id=waiting;
      post('start',id,{settings,state:JSON.parse(JSON.stringify(state)),action:'이 새 ChatGPT 채팅의 게임 마스터로 시작하세요. 첨부한 GitHub 세계관·설정 원문을 먼저 읽고 전달된 현재 캠페인과 주인공 상태로 첫 장면을 진행하세요. 다른 채팅의 진행 기록을 복사하지 마세요.'});
      setTimeout(()=>{if(waiting===id){waiting=null;busy=false;button.disabled=false;message('새 채팅 연결 확인 시간이 지났습니다. 열린 ChatGPT 탭을 확인하세요. 자동 재전송하지 않습니다.');}},10000);
    }catch(error){busy=false;button.disabled=false;message(error.message);}
  }
  button.onclick=()=>connect();
  document.addEventListener('ercedia:intro-completed',event=>connect(event.detail?.settings));
}
