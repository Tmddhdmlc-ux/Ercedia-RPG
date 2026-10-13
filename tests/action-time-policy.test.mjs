import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {actionPrompt} from '../web/scene.js';
import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';
import {actionTimeInstruction} from '../web/action-time-policy.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {initializeNameOnlyPlayer} from '../web/legacy-player.js';

function start(){const s=defaults();s.player.name='시험 모험가';s.campaign_id='action-time-test';s.intro_completed=true;s.gameState={region:'W1',place:'작업장',date:'650-07-01',time:'11:08'};initializeNameOnlyPlayer(s);s.scene={schema_version:1,type:'ercedia_scene',scene_id:'start',location:'작업장',time:'11:08',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'벽 옆에 햇볕이 든다.'}],choices:[]};return s;}
test('all prompt paths distinguish minute-free actions from real waiting without mutating the clock',()=>{
 const s=start(),before=structuredClone(s),sync=createTurnSync();sync.acknowledge(sync.prepare(s,'한 걸음 옮긴다'));
 for(const action of ['네, 거기로 갈게요.','한 걸음 옮긴다','10분 기다린다','멀리 있는 마을로 이동한다']){
  for(const prompt of [actionPrompt(s,action,'r'),actionPrompt(s,action,'r',{compact:true}),incrementalPrompt(s,action,'r',sync.prepare(s,action))]){assert.equal(prompt.split(actionTimeInstruction).length-1,1);assert.match(prompt,/같은 HH:mm 허용/);assert.match(prompt,/명시한 기다림·작업·장거리 이동은 실제 소요/);assert.ok(prompt.endsWith(action));}
 }
 assert.deepEqual(s,before);
});
test('the real UI applies a same-minute scene and a subsequent timed scene without forcing a tick or reward',()=>{
 const h=uiHarness(),s=start(),chat=mountChatUI(s,{embedded:true,render(){},persist(){}}),baseline=structuredClone({player:s.player,inventory:s.inventory,wallet:s.wallet_copper});
 try{
  const request=()=>h.messages.filter(m=>m.type==='action').at(-1).payload.requestId;
  chat.submit('한 걸음 옮긴다');h.reply('scene',JSON.stringify({...s.scene,scene_id:'same-minute',reply_to:request(),dialogue:[{speaker:'나레이션',text:'볕이 드는 자리에 섰다.'}]}));
  assert.equal(chat.isPending(),false);assert.equal(s.gameState.time,'11:08');assert.equal(s.scene.time,'11:08');
  chat.submit('10분 조용히 기다린다');h.reply('scene',JSON.stringify({...s.scene,scene_id:'wait-ten',reply_to:request(),time:'11:18',game_state:{...s.gameState,time:'11:18'},dialogue:[{speaker:'나레이션',text:'10분 동안 조용히 머물렀다.'}]}));
  assert.equal(chat.isPending(),false);assert.equal(s.gameState.time,'11:18');assert.equal(s.scene.time,'11:18');assert.deepEqual({player:s.player,inventory:s.inventory,wallet:s.wallet_copper},baseline);
 }finally{h.close();}
});
