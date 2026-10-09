export function validateChatHandoff(payload){
  if(!payload||typeof payload!=='object'||JSON.stringify(payload).length>4000000)throw Error('게임 전달 데이터가 너무 크거나 올바르지 않습니다.');
  const s=payload.settings;
  if(!/^[a-f0-9]{40}$/.test(s?.sha||'')||!Array.isArray(s.paths)||s.paths.length>500||new Set(s.paths).size!==s.paths.length||!s.paths.includes('BOOTSTRAP.md')||!s.paths.includes('WORLD.md'))throw Error('전체 GitHub 설정이 필요합니다.');
  let size=0;for(const path of s.paths){if(typeof path!=='string'||typeof s.files?.[path]!=='string')throw Error('누락된 설정 원문이 있습니다.');size+=s.files[path].length;}if(size>1500000)throw Error('설정 원문이 전송 한도를 초과했습니다.');
  const setup=payload.stage==='setup'&&payload.state?.introDraft?.step==='name';
  if(payload.state?.version!==1||(!setup&&(!payload.state.player?.name?.trim()||payload.state.introDraft))||typeof payload.action!=='string'||!payload.action.trim()||payload.action.length>2000)throw Error('새 게임 설정 또는 현재 게임 상태가 올바르지 않습니다.');
  return payload;
}
export function readChatHandoff(location,read,now=Date.now()){
  if(!['chatgpt.com','chat.openai.com'].includes(location.hostname)||!['/',''].includes(location.pathname))return null;
  const id=new URLSearchParams(location.hash.replace(/^#/,'' )).get('ercedia-handoff');if(!/^[a-f0-9-]{36}$/.test(id||''))return null;
  const key='ercedia.handoff.v1:'+id,record=read(key);
  if(!record||!Number.isFinite(record.created)||now-record.created<0||now-record.created>600000)return null;
  try{return {...validateChatHandoff(record),key};}catch{return null;}
}
export function installLocalHandoff({scope,write,openTab,now=Date.now}){
  if(!['127.0.0.1','localhost'].includes(scope.location.hostname)||scope.location.port!=='4184'||!['/','/index.html'].includes(scope.location.pathname))return false;
  const reply=(type,id,payload)=>scope.postMessage({channel:'ercedia-handoff',type,id,payload},scope.location.origin);
  const handled=new Set();
  scope.addEventListener('message',event=>{
    const d=event.data;if(event.source!==scope||event.origin!==scope.location.origin||d?.channel!=='ercedia-handoff')return;
    if(d.type==='probe'){reply('ready',d.id,{version:'1.2.1'});return;}
    if(d.type!=='start'||!/^[a-f0-9-]{36}$/.test(d.id||'')||handled.has(d.id))return;
    try{validateChatHandoff(d.payload);handled.add(d.id);const key='ercedia.handoff.v1:'+d.id;write(key,{...d.payload,created:now()});openTab('https://chatgpt.com/#ercedia-handoff='+d.id);reply('opened',d.id,'새 ChatGPT 채팅에서 설정과 게임 상태를 전달하고 있습니다.');}
    catch(error){reply('error',d.id,error.message);}
  });return true;
}
