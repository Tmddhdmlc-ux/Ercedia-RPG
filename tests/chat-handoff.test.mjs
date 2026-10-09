import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatHandoff,installLocalHandoff,readChatHandoff} from '../web/chat-handoff.js';
import {mountChatConnection} from '../web/chat-connection-ui.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {defaults,normalize} from '../web/state.js';
import {mountNewGame} from '../web/new-game.js';
const settings=()=>({sha:'a'.repeat(40),paths:['BOOTSTRAP.md','WORLD.md'],files:{'BOOTSTRAP.md':'GM 안내 원문','WORLD.md':'공식 세계관 원문'}});
const packet=()=>{const state=defaults();state.player.name='검증';return {state,settings:settings(),action:'첫 GM 장면을 시작하세요.'};};
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
test('handoff contains complete settings and a named save, and rejects missing settings or an unfinished intro',()=>{
  assert.equal(validateChatHandoff(packet()).settings.files['WORLD.md'],'공식 세계관 원문');
  const p=packet();delete p.settings.files['WORLD.md'];assert.throws(()=>validateChatHandoff(p),/누락/);
  const unfinished=packet();unfinished.state.introDraft={step:'name'};assert.throws(()=>validateChatHandoff(unfinished),/게임 상태/);
});
test('local launcher only accepts same-window, same-origin requests and opens each new-chat transfer once',()=>{
  const store=new Map(),opened=[],replies=[];let receive;
  const scope={location:{hostname:'127.0.0.1',port:'4184',pathname:'/',origin:'http://127.0.0.1:4184'},addEventListener(type,fn){receive=fn;},postMessage:m=>replies.push(m)};
  assert.equal(installLocalHandoff({scope,write:(k,v)=>store.set(k,v),openTab:url=>opened.push(url),now:()=>100}),true);
  const e={source:scope,origin:scope.location.origin,data:{channel:'ercedia-handoff',type:'start',id,payload:packet()}};
  receive({...e,source:{}});receive({...e,origin:'https://bad.invalid'});assert.equal(opened.length,0);
  receive(e);receive(e);assert.equal(opened.length,1);assert.equal(opened[0],'https://chatgpt.com/#ercedia-handoff='+id);assert.equal(store.get('ercedia.handoff.v1:'+id).settings.files['WORLD.md'],'공식 세계관 원문');assert.equal(replies.at(-1).type,'opened');
});
test('a transfer cannot overwrite an existing ChatGPT conversation and expires after ten minutes',()=>{
  const location={hostname:'chatgpt.com',pathname:'/',hash:'#ercedia-handoff='+id},record={...packet(),created:100};
  assert.ok(readChatHandoff(location,()=>record,200));assert.equal(readChatHandoff({...location,pathname:'/c/existing'},()=>record,200),null);assert.equal(readChatHandoff(location,()=>record,600101),null);assert.equal(readChatHandoff({...location,hostname:'bad.invalid'},()=>record,200),null);
});
test('new-game button flow automatically transfers the already-read settings without pressing another button',async()=>{
  let messageHandler,completed;const oldDocument=globalThis.document,oldWindow=globalThis.window,oldTimeout=globalThis.setTimeout;
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},sent=[];
  globalThis.document={getElementById:get,addEventListener(type,fn){if(type==='ercedia:new-game-started')completed=fn;}};
  globalThis.window={location:{origin:'http://127.0.0.1:4184'},addEventListener(type,fn){messageHandler=fn;},postMessage:m=>sent.push(m)};globalThis.setTimeout=()=>0;
  try{mountChatConnection(packet().state,{embedded:false,isPending:()=>false});messageHandler({source:window,origin:window.location.origin,data:{channel:'ercedia-handoff',type:'ready',payload:{version:'1.2.1'}}});completed({detail:{settings:settings()}});assert.equal(sent.length,1);assert.equal(sent[0].type,'start');assert.equal(sent[0].payload.settings.files['WORLD.md'],'공식 세계관 원문');assert.equal(sent[0].payload.stage,'setup');assert.equal(sent[0].payload.state.player.name,'');assert.equal(sent[0].payload.state.introDraft.step,'name');assert.ok(validateChatHandoff(sent[0].payload));assert.deepEqual(normalize(sent[0].payload.state),sent[0].payload.state);}finally{globalThis.document=oldDocument;globalThis.window=oldWindow;globalThis.setTimeout=oldTimeout;}
});
test('ChatGPT frame handoff queues a real request with the full settings file and requires a reading confirmation',()=>{
  const h=uiHarness();try{
    window.__ERCEDIA_CONFIG__.features=['settings-attachment'];const state=packet().state;
    mountChatUI(state,{render(){},persist(){},storage:{},embedded:true});
    h.reply('bootstrap-campaign',{settings:settings(),action:'첫 장면 시작'});
    const action=h.messages.find(m=>m.type==='action');assert.ok(action);assert.match(action.payload.settingsFile.content,/공식 세계관 원문/);assert.match(action.payload.text,/settings_loaded/);assert.equal(h.messages.find(m=>m.type==='bootstrap-started').payload.started,true);
  }finally{h.close();}
});
test('settings are sent before entering a name, and the acknowledgement cannot mutate the setup or grant assets',()=>{
  const h=uiHarness();try{
    window.__ERCEDIA_CONFIG__.features=['settings-attachment'];const state=defaults();state.introDraft={step:'name'};const original=structuredClone(state);
    const chat=mountChatUI(state,{render(){},persist(){},storage:{},embedded:true});chat.sendSettings(settings());
    const action=h.messages.find(m=>m.type==='action');assert.ok(action);assert.match(action.payload.text,/이름·성별·직업·시작 지역은 아직 선택 전/);assert.ok(action.payload.settingsFile);assert.equal(state.player.name,'');
    const ack={schema_version:1,type:'ercedia_scene',scene_id:'settings-ready',reply_to:action.payload.requestId,location:'캐릭터 생성 준비',time:'시작 전',background_id:null,npc:null,dialogue:[{speaker:'시스템',text:'설정 읽기 완료'}],choices:[],settings_loaded:{commit:settings().sha,file_count:2}};
    h.reply('scene',JSON.stringify(ack));assert.equal(chat.isPending(),false);assert.deepEqual(state,original);assert.match(h.get('connection-status').textContent,/설정 읽기 확인 완료/);
    delete state.introDraft;state.player.name='이후 선택한 이름';chat.setCampaignSettings(settings());chat.submit('첫 게임 장면을 시작한다');
    const second=h.messages.filter(m=>m.type==='action').at(-1);assert.equal(second.payload.settingsFile,undefined);
  }finally{h.close();}
});
test('starting the new-game controller sends settings while the first name step is still empty',async()=>{
  const h=uiHarness(),oldFetch=globalThis.fetch;try{
    const sha='b'.repeat(40),files={'BOOTSTRAP.md':'시작 규칙','WORLD.md':'세계관','characters/player_default.json':'{}','characters/serin.json':'{}'},events=[],requests=[];
    globalThis.fetch=async url=>({ok:true,json:async()=>url.includes('/git/ref/')?{object:{sha}}:{tree:Object.keys(files).map(path=>({path,type:'blob'}))},text:async()=>files[url.split('/'+sha+'/')[1]]});
    document.dispatchEvent=event=>{events.push(event.type);return true;};const state=defaults();
    const controller=mountNewGame(state,{embedded:true,render(){},persist(){},chat:{controls(){},reportStatus(){},isPending:()=>false,sendSettings:s=>requests.push(s)}});
    assert.equal(await controller.begin(),true);assert.equal(requests.length,1);assert.equal(requests[0].files['WORLD.md'],'세계관');assert.equal(state.introDraft.step,'name');assert.equal(state.player.name,'');assert.deepEqual(events,['ercedia:new-game-started']);
  }finally{globalThis.fetch=oldFetch;h.close();}
});
