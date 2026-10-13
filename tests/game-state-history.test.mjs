import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeGameState} from '../web/game-state-update.js';
import {defaults} from '../web/state.js';
import {initializeNameOnlyPlayer} from '../web/legacy-player.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';

test('partial and full event histories preserve prior facts once, trim oldest at 30, and retain snapshot fields',()=>{
 const before={time:'15:55',events:Array.from({length:30},(_,i)=>'사건 '+i),quests:['진행 의뢰']},original=structuredClone(before);
 const next=mergeGameState(before,{time:'16:03',events:['사건 29','새 견적'],quests:[]});
 assert.equal(next.events.length,30);assert.equal(next.events[0],'사건 1');assert.equal(next.events.at(-1),'새 견적');assert.deepEqual(next.quests,[]);assert.equal(next.time,'16:03');assert.deepEqual(before,original);
 assert.deepEqual(mergeGameState(next,{events:next.events}).events,next.events);
 assert.deepEqual(mergeGameState(next,{events:[]}).events,next.events);
 assert.deepEqual(mergeGameState(next,{place:'가게'}).events,next.events);
});

test('real host application preserves prior events when the GM sends only the newest event, without duplicating replay',()=>{
 const h=uiHarness(),s=defaults();s.player.name='기록 시험';s.campaign_id='history-fixture';initializeNameOnlyPlayer(s);
 s.gameState={date:'650-07-01',time:'15:55',region:'W1',place:'보관소',events:['오전 목재 인계','오후 자기소개']};
 s.scene={schema_version:1,type:'ercedia_scene',scene_id:'history-start',location:'보관소',time:'15:55',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'준비물을 확인했다.'}],choices:[]};
 const chat=mountChatUI(s,{embedded:true,render(){},persist(){}});
 try{
  chat.submit('가게로 가서 견적을 확인한다');const request=h.messages.filter(m=>m.type==='action').at(-1).payload;
  const reply={...s.scene,scene_id:'history-quote',reply_to:request.requestId,location:'가게',time:'16:03',game_state:{date:'650-07-01',time:'16:03',region:'W1',place:'가게',events:['견적 확인, 결제 없음']}};
  h.reply('scene',JSON.stringify(reply));assert.equal(chat.isPending(),false);assert.deepEqual(s.gameState.events,['오전 목재 인계','오후 자기소개','견적 확인, 결제 없음']);assert.equal(s.gameState.time,'16:03');
  const saved=structuredClone(s);h.reply('scene',JSON.stringify(reply));assert.deepEqual(s,saved);
 }finally{h.close();}
});
