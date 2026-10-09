import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatHandoff,installLocalHandoff,readChatHandoff} from '../web/chat-handoff.js';
import {mountChatConnection} from '../web/chat-connection-ui.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {defaults} from '../web/state.js';
const settings=()=>({sha:'a'.repeat(40),paths:['BOOTSTRAP.md','WORLD.md'],files:{'BOOTSTRAP.md':'GM 안내 원문','WORLD.md':'공식 세계관 원문'}});
const packet=()=>{const state=defaults();state.player.name='검증';return {state,settings:settings(),action:'첫 GM 장면을 시작하세요.'};};
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
test('handoff contains complete settings and a named save, and rejects missing settings or an unfinished intro',()=>{
  assert.equal(validateChatHandoff(packet()).settings.files['WORLD.md'],'공식 세계관 원문');
  const p=packet();delete p.settings.files['WORLD.md'];assert.throws(()=>validateChatHandoff(p),/누락/);
  const unfinished=packet();unfinished.state.introDraft={step:'name'};assert.throws(()=>validateChatHandoff(unfinished),/캐릭터 설정/);
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
test('new-game completion automatically transfers the already-read settings without pressing another button',async()=>{
  let messageHandler,completed;const oldDocument=globalThis.document,oldWindow=globalThis.window,oldTimeout=globalThis.setTimeout;
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},sent=[];
  globalThis.document={getElementById:get,addEventListener(type,fn){if(type==='ercedia:intro-completed')completed=fn;}};
  globalThis.window={location:{origin:'http://127.0.0.1:4184'},addEventListener(type,fn){messageHandler=fn;},postMessage:m=>sent.push(m)};globalThis.setTimeout=()=>0;
  try{mountChatConnection(packet().state,{embedded:false,isPending:()=>false});messageHandler({source:window,origin:window.location.origin,data:{channel:'ercedia-handoff',type:'ready'}});completed({detail:{settings:settings()}});assert.equal(sent.length,1);assert.equal(sent[0].type,'start');assert.equal(sent[0].payload.settings.files['WORLD.md'],'공식 세계관 원문');}finally{globalThis.document=oldDocument;globalThis.window=oldWindow;globalThis.setTimeout=oldTimeout;}
});
test('ChatGPT frame handoff queues a real request with the full settings file and requires a reading confirmation',()=>{
  const h=uiHarness();try{
    window.__ERCEDIA_CONFIG__.features=['settings-attachment'];const state=packet().state;
    mountChatUI(state,{render(){},persist(){},storage:{},embedded:true});
    h.reply('bootstrap-campaign',{settings:settings(),action:'첫 장면 시작'});
    const action=h.messages.find(m=>m.type==='action');assert.ok(action);assert.match(action.payload.settingsFile.content,/공식 세계관 원문/);assert.match(action.payload.text,/settings_loaded/);assert.equal(h.messages.find(m=>m.type==='bootstrap-started').payload.started,true);
  }finally{h.close();}
});
