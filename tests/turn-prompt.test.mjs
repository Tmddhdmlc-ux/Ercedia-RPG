import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {actionPrompt,turnContext,turnDomains,contextSummary} from '../web/scene.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';

function saved(){
  const state=defaults();state.player.name='시험 모험가';state.campaign_id='prompt-test';
  state.gameState={region:'W1',place:'솔브린 마을',date:'1000-01-01',time:'09:00'};
  state.scene={schema_version:1,type:'ercedia_scene',scene_id:'initial',location:'솔브린 마을',time:'09:00',background_id:'sunny_village_day',npc:null,dialogue:[{speaker:'나레이션',text:'마을에 도착했다.'}],choices:[{id:'talk',kind:'dialogue',text:'안부를 묻는다.'},{id:'shop',kind:'trade',text:'물품을 본다.'}]};
  return state;
}
test('ordinary continuation is at least 80% smaller and preserves authoritative live state',()=>{
  const state=saved();state.intro_completed=true;state.journey_goal='가족을 찾는다';
  const original=structuredClone(state),action='안부를 묻는다.';
  const full=actionPrompt(state,action,'request-1'),short=actionPrompt(state,action,'request-1',{compact:true,choiceId:'talk'});
  assert.ok(short.length<full.length*.2);assert.ok(short.endsWith(action));assert.match(short,/reply_to="request-1"/);
  const context=turnContext(state,turnDomains(state,action,'talk'));
  for(const key of ['player','inventory','quest_log','engine','game_state','npc_life','background_registry','skill_loadout'])assert.deepEqual(context[key],contextSummary(state)[key]);
  assert.equal(context.character_creation.journey_goal,state.journey_goal);
  for(const key of ['crafting','loot','growth','economy','regional_epics','dungeon_encounters'])assert.equal(context[key],undefined);
  assert.deepEqual(state,original);
});
test('choice metadata enables trade and quest context even without keyword matches',()=>{
  const state=saved();state.scene.choices.push({id:'q',kind:'quest',quest_id:'quest-real',text:'조건을 확인한다.'});
  assert.ok(turnContext(state,turnDomains(state,'물품을 본다.','shop')).economy);
  assert.ok(turnContext(state,turnDomains(state,'조건을 확인한다.','q')).regional_epics);
  assert.match(actionPrompt(state,'물품을 본다.','r',{compact:true,choiceId:'shop'}),/shop_open/);
});
test('ordinary resident dialogue retains personality and speech without the entire resident roster',()=>{
  const state=saved(),resident=contextSummary(state).adventure.regional_residents[0];
  state.scene.npc={id:resident.id,speaker:resident.name,outfit:'none',emotion:'base'};
  const context=turnContext(state,turnDomains(state,'안부를 묻는다.'));
  assert.deepEqual(context.adventure.regional_residents,[resident]);
  assert.ok(context.adventure.regional_residents[0].speech_style);
});
test('ordinary conversation requests brief output while detailed requests and mechanics remain unrestricted',()=>{
  const state=saved();
  assert.match(actionPrompt(state,'안부를 묻는다.','r',{compact:true}),/\[일상 대화 응답\]/);
  assert.match(actionPrompt(state,'안부를 묻는다.','r',{compact:true}),/필수 사건 증빙은 생략하지/);
  for(const action of ['자세하게 이야기를 듣는다.','긴 대사로 독백한다.','공격한다.','던전을 탐색한다.','의뢰를 보고한다.','수련한다.'])assert.ok(!actionPrompt(state,action,'r',{compact:true}).includes('[일상 대화 응답]'));
});
test('dungeon and combat turns retain rules without sending the global UI-only loot pools',()=>{
  const state=saved();state.world_engine={active_dungeon:'DUN-W1-01',dungeons:{'DUN-W1-01':{zone_id:'entrance'}}};
  const context=turnContext(state,turnDomains(state,'인사를 한다.'));
  assert.ok(context.dungeon_encounters);assert.ok(context.loot);assert.equal(context.loot.dungeon_pools,undefined);
  const prompt=actionPrompt(state,'공격한다.','battle-request',{compact:true});
  assert.match(prompt,/BATTLE_SCHEMA.md/);assert.match(prompt,/loot_mode/);
  assert.ok(!prompt.includes('"dungeon_pools"'));
});
test('the actual UI switches after a valid turn and falls back after save restoration',()=>{
  const h=uiHarness(),state=saved();try{
    const chat=mountChatUI(state,{embedded:true,render(){},persist(){}});
    const actions=()=>h.messages.filter(m=>m.type==='action').map(m=>m.payload);
    chat.submit('안부를 묻는다.','talk');const first=actions().at(-1);
    assert.match(first.text,/\[대장간 제작\]/);assert.ok(!first.text.includes('"dungeon_pools"')); 
    h.reply('scene',JSON.stringify({...state.scene,scene_id:'next',reply_to:first.requestId}));
    assert.equal(chat.isPending(),false);
    chat.submit('안부를 묻는다.','talk');const second=actions().at(-1);
    assert.ok(second.text.length<first.text.length*.2);assert.ok(second.text.endsWith('안부를 묻는다.'));
    chat.restore(saved());chat.submit('안부를 묻는다.','talk');assert.match(actions().at(-1).text,/\[대장간 제작\]/);
  }finally{h.close();}
});
test('failed responses never establish compact continuation context',()=>{
  const h=uiHarness(),state=saved();try{
    const chat=mountChatUI(state,{embedded:true,render(){},persist(){}});
    chat.submit('안부를 묻는다.');chat.apply('{"schema_version":99,"type":"ercedia_scene"}');chat.submit('안부를 묻는다.');
    const actions=h.messages.filter(m=>m.type==='action');assert.match(actions.at(-1).payload.text,/\[대장간 제작\]/);
  }finally{h.close();}
});
