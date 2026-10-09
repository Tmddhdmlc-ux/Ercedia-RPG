import {readFileSync} from 'node:fs';
const convenienceRules=readFileSync(new URL('../GAMEPLAY_CONVENIENCE_RULES.md',import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatHandoff,installLocalHandoff,readChatHandoff} from '../web/chat-handoff.js';
import {mountChatConnection} from '../web/chat-connection-ui.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {defaults,normalize} from '../web/state.js';
import {mountNewGame} from '../web/new-game.js';
const settings=()=>({sha:'a'.repeat(40),paths:['BOOTSTRAP.md','GAMEPLAY_CONVENIENCE_RULES.md','WORLD.md'],files:{'GAMEPLAY_CONVENIENCE_RULES.md':convenienceRules,'BOOTSTRAP.md':'GM 안내 원문','WORLD.md':'공식 세계관 원문'}});
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
test('completed prologue transfers the prepared settings and completed character without a setup turn',async()=>{
  let messageHandler,completed;const oldDocument=globalThis.document,oldWindow=globalThis.window,oldTimeout=globalThis.setTimeout;
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},sent=[];
  globalThis.document={getElementById:get,addEventListener(type,fn){if(type==='ercedia:intro-completed')completed=fn;}};
  globalThis.window={location:{origin:'http://127.0.0.1:4184'},addEventListener(type,fn){messageHandler=fn;},postMessage:m=>sent.push(m)};globalThis.setTimeout=()=>0;
  try{mountChatConnection(packet().state,{embedded:false,isPending:()=>false});messageHandler({source:window,origin:window.location.origin,data:{channel:'ercedia-handoff',type:'ready',payload:{version:'1.2.1'}}});completed({detail:{settings:settings()}});assert.equal(sent.length,1);assert.equal(sent[0].type,'start');assert.equal(sent[0].payload.settings.files['WORLD.md'],'공식 세계관 원문');assert.equal(sent[0].payload.stage,undefined);assert.equal(sent[0].payload.state.player.name,'검증');assert.equal(sent[0].payload.state.introDraft,undefined);assert.ok(validateChatHandoff(sent[0].payload));assert.deepEqual(normalize(sent[0].payload.state),sent[0].payload.state);}finally{globalThis.document=oldDocument;globalThis.window=oldWindow;globalThis.setTimeout=oldTimeout;}
});
test('automatic frame handoff does not send a setup request',()=>{
  const h=uiHarness();try{
    window.__ERCEDIA_CONFIG__.features=['settings-attachment'];const state=packet().state;
    mountChatUI(state,{render(){},persist(){},storage:{},embedded:true});
    h.reply('bootstrap-campaign',{settings:settings(),action:'첫 장면 시작'});
    assert.equal(h.messages.some(m=>m.type==='action'),false);assert.equal(h.messages.find(m=>m.type==='bootstrap-started').payload.started,false);
  }finally{h.close();}
});
test('explicit registration can precede a name and its acknowledgement cannot change the game',()=>{
  const h=uiHarness();try{
    window.__ERCEDIA_CONFIG__.features=['settings-attachment'];const state=defaults();state.introDraft={step:'name'};const original=structuredClone(state);
    const chat=mountChatUI(state,{render(){},persist(){},storage:{},embedded:true});chat.sendSettings(settings());
    const action=h.messages.find(m=>m.type==='action');assert.ok(action);assert.match(action.payload.text,/새 채팅방 설정 등록/);assert.ok(action.payload.settingsFile);assert.equal(state.player.name,'');
    const ack={schema_version:1,type:'ercedia_scene',scene_id:'settings-ready',reply_to:action.payload.requestId,location:'캐릭터 생성 준비',time:'시작 전',background_id:null,npc:null,dialogue:[{speaker:'시스템',text:'설정 읽기 완료'}],choices:[],settings_loaded:{commit:settings().sha,file_count:3}};
    h.reply('scene',JSON.stringify(ack));assert.equal(chat.isPending(),false);assert.deepEqual(state,original);assert.match(h.get('connection-status').textContent,/동기화 완료/);
    delete state.introDraft;state.player.name='이후 선택한 이름';chat.setCampaignSettings(settings());chat.submit('첫 게임 장면을 시작한다');
    const second=h.messages.filter(m=>m.type==='action').at(-1);assert.equal(second.payload.settingsFile,undefined);
  }finally{h.close();}
});
test('new-game controller immediately opens the region question and never sends a separate setup request',async()=>{
  const h=uiHarness(),oldFetch=globalThis.fetch;try{
    const sha='b'.repeat(40),files={'GAMEPLAY_CONVENIENCE_RULES.md':convenienceRules,'BOOTSTRAP.md':'시작 규칙','WORLD.md':'세계관','characters/player_default.json':'{}','characters/serin.json':'{}'},events=[],requests=[];
    globalThis.fetch=async url=>({ok:true,json:async()=>url.includes('/git/ref/')?{object:{sha}}:{tree:Object.keys(files).map(path=>({path,type:'blob'}))},text:async()=>files[url.split('/'+sha+'/')[1]]});
    document.dispatchEvent=event=>{events.push(event.type);return true;};const state=defaults();
    const controller=mountNewGame(state,{embedded:true,render(){},persist(){},chat:{controls(){},reportStatus(){},isPending:()=>false,sendSettings:s=>requests.push(s)}});
    assert.equal(await controller.begin(),true);assert.equal(requests.length,0);assert.equal(state.introDraft.step,'origin');assert.equal(state.player.name,'');assert.deepEqual(events,['ercedia:new-game-started']);
  }finally{globalThis.fetch=oldFetch;h.close();}
});

test('slot restore accepts an already validated candidate without another normalization or render; bridge restores retain defaults',()=>{
 const h=uiHarness();let renders=0;try{
  const state=defaults(),chat=mountChatUI(state,{embedded:true,render(){renders++;},persist(){},storage:{}});
  const prepared=normalize({...defaults(),player:{name:'새 여정'}});
  chat.restore(prepared,{prepared:true,deferRender:true});assert.equal(renders,0);assert.equal(state.player,prepared.player);assert.equal(state.player.name,'새 여정');
  chat.restore({version:1,player:{name:'기존 브리지'}});assert.equal(renders,1);assert.equal(state.player.name,'기존 브리지');assert.equal(state.scene,null);
 }finally{h.close();}
});
