import test from 'node:test';
import assert from 'node:assert/strict';
import {uiHarness} from './ui-harness.mjs';
import {defaults} from '../web/state.js';
import {mountChatUI} from '../web/chat-ui.js';
import {mountTitleMenu} from '../web/title-menu.js';
test('returning to title and loading repeatedly never sends setup or restores a heavy first-turn request',()=>{
 const h=uiHarness();try{
  document.dispatchEvent=()=>true;document.body.classList.toggle=()=>{};const state=defaults();state.player.name='시험';state.player.level=1;state.intro_completed=true;
  const chat=mountChatUI(state,{embedded:true,render(){},persist(){}});let title;
  title=mountTitleMenu(state,{newGame:{},isPending:()=>chat.isPending(),render:()=>title.refresh(),openLoad:()=>{chat.restore(structuredClone(state));title.enter();}});
  title.enter();for(let i=0;i<3;i++){h.get('title-return').onclick();h.get('title-load-game').onclick();}
  assert.equal(h.messages.some(m=>m.type==='action'),false);chat.submit('주변을 살펴본다');const actions=h.messages.filter(m=>m.type==='action');assert.equal(actions.length,1);assert.equal(actions[0].payload.settingsFile,undefined);assert.ok(!actions[0].payload.text.includes('새 게임 시작 버튼으로'));
 }finally{h.close();}
});


test('legacy launcher update and version-check messages cannot register or fill a ChatGPT request',()=>{
 const h=uiHarness(),oldFetch=globalThis.fetch;let reads=0;
 globalThis.fetch=async()=>{reads++;throw Error('unexpected settings download');};
 try{const state=defaults(),before=structuredClone(state);mountChatUI(state,{embedded:true,render(){},persist(){}});
  for(let i=0;i<3;i++)h.reply('sync-settings',null);
  h.reply('bootstrap-campaign',{});
  assert.equal(reads,0);assert.equal(h.messages.some(m=>m.type==='action'),false);assert.equal(h.get('action-copy').value,'');assert.deepEqual(state,before);
 }finally{globalThis.fetch=oldFetch;h.close();}
});

test('title registration button is available without a save, shows progress, and requires an explicit click',async()=>{
 const h=uiHarness();try{
  document.dispatchEvent=()=>true;document.body.classList.toggle=()=>{};
  const state=defaults(),before=structuredClone(state);let calls=0,busy=false,message='',release;
  const title=mountTitleMenu(state,{newGame:{},render(){},isPending:()=>busy,getSettingsStatus:()=>({busy,message}),registerSettings:async()=>{calls++;busy=true;message='설정 파일을 읽는 중…';title.refresh();await new Promise(resolve=>release=resolve);busy=false;message='최신 설정 등록 완료';}});
  assert.equal(calls,0);assert.equal(h.get('title-register-settings').disabled,false);assert.equal(h.get('title-load-game').disabled,true);
  const running=h.get('title-register-settings').onclick();assert.equal(calls,1);assert.equal(h.get('title-register-settings').disabled,true);assert.equal(h.get('title-load-note').textContent,message);
  await h.get('title-register-settings').onclick();assert.equal(calls,1);release();await running;
  assert.equal(h.get('title-register-settings').disabled,false);assert.equal(h.get('title-load-note').textContent,'최신 설정 등록 완료');assert.deepEqual(state,before);assert.equal(h.game.dataset.title,'active');
 }finally{h.close();}
});
