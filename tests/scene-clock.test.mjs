import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSceneClock} from '../web/scene-clock.js';
import {defaults} from '../web/state.js';
import {initializeNameOnlyPlayer} from '../web/legacy-player.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
test('precise scene clocks cannot advance without updating the saved clock, while legacy times remain compatible',()=>{
 const s={gameState:{date:'650-07-01',time:'11:18'}};
 assert.throws(()=>validateSceneClock(s,{time:'11:20'}),/시각 불일치/);
 assert.throws(()=>validateSceneClock(s,{time:'11:20',game_state:{time:'11:19'}}),/시각 불일치/);
 assert.doesNotThrow(()=>validateSceneClock(s,{time:'11:18'}));assert.doesNotThrow(()=>validateSceneClock(s,{time:'11:20',game_state:{date:'650-07-01',time:'11:20'}}));
 assert.doesNotThrow(()=>validateSceneClock({}, {time:'시작 전'}));assert.doesNotThrow(()=>validateSceneClock(s,{time:'해질녘'}));assert.doesNotThrow(()=>validateSceneClock({gameState:{time:'아침'}},{time:'09:00'}));
});
test('a mismatched host reply triggers repair before state mutation and a corrected reply commits once',()=>{
 const h=uiHarness(),s=defaults();s.player.name='시각 시험';s.campaign_id='clock-fixture';initializeNameOnlyPlayer(s);s.gameState={date:'650-07-01',time:'11:18',region:'W1',place:'작업장'};s.scene={schema_version:1,type:'ercedia_scene',scene_id:'clock-start',location:'작업장',time:'11:18',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'수업 조건을 묻는다.'}],choices:[]};
 const chat=mountChatUI(s,{embedded:true,render(){},persist(){}});
 try{chat.submit('수업 방법을 묻는다');const before=structuredClone(s),requests=()=>h.messages.filter(m=>m.type==='action').map(m=>m.payload),first=requests().at(-1),ruling={id:'lesson',topic:'수업 방법',decision:'30분 동안 지도자의 감독 아래 배운다.'};
  const raw={...s.scene,scene_id:'clock-bad',time:'11:20',reply_to:first.requestId,gm_rulings:[ruling]};h.reply('scene',JSON.stringify(raw));assert.deepEqual(s,before);assert.equal(requests().length,2);assert.notEqual(requests().at(-1).requestId,first.requestId);assert.match(requests().at(-1).text,/시각 불일치/);
  h.reply('scene',JSON.stringify({...raw,scene_id:'clock-fixed',reply_to:requests().at(-1).requestId,game_state:{...s.gameState,time:'11:20'}}));assert.equal(chat.isPending(),false);assert.equal(s.gameState.time,'11:20');assert.equal(s.scene.time,'11:20');assert.deepEqual(s.gm_rulings,[ruling]);assert.ok(!s.seenScenes.includes('clock-bad'));
 }finally{h.close();}
});
