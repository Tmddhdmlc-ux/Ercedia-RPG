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
