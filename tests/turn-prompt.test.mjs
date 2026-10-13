import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {actionPrompt,turnContext,turnDomains,contextSummary,normalizeScene} from '../web/scene.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {catalogItem} from '../web/item-catalog.js';

function saved(){
  const state=defaults();state.player.name='시험 모험가';state.campaign_id='prompt-test';
  state.gameState={region:'W1',place:'솔브린 마을',date:'1000-01-01',time:'09:00'};
  state.scene={schema_version:1,type:'ercedia_scene',scene_id:'initial',location:'솔브린 마을',time:'09:00',background_id:'sunny_village_day',npc:null,dialogue:[{speaker:'나레이션',text:'마을에 도착했다.'}],choices:[{id:'talk',kind:'dialogue',text:'안부를 묻는다.'},{id:'shop',kind:'trade',text:'물품을 본다.'}]};
  return state;
}
test('ordinary continuation remains under 8000 characters and at least 70% smaller with approved story rules',()=>{
  const state=saved();state.intro_completed=true;state.journey_goal='가족을 찾는다';
  const original=structuredClone(state),action='안부를 묻는다.';
  const full=actionPrompt(state,action,'request-1'),short=actionPrompt(state,action,'request-1',{compact:true,choiceId:'talk'});
  assert.ok(short.length<8000);assert.ok(short.length<full.length*.30,JSON.stringify({short:short.length,full:full.length}));assert.ok(short.endsWith(action));assert.match(short,/reply_to="request-1"/);
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
test('repair and winter-material inquiries receive bounded local originals instead of default swords',()=>{
 const s=saved(),before=structuredClone(s),action='재료상에 신발 수선용 가죽과 방한 재료의 가격을 묻는다.',f=turnContext(s,turnDomains(s,action),action).turn_facts;
 assert.ok(f.items.length>0&&f.items.length<=6);for(const item of f.items){assert.equal(item.region_id,'W1');assert.equal(item.slot,undefined);assert.deepEqual(item,catalogItem(item.id));}
 assert.match(f.item_rule,/현지 재고·보유품이 아니다/);assert.match(f.item_rule,/NPC 대사나 지문에서 설명하지/);assert.ok(f.material_facilities.some(v=>v.id==='FAC-W1-02'&&v.service.includes('repair')));assert.ok(f.material_facilities.every(v=>v.id.startsWith('FAC-W1-')));assert.match(f.facility_wire,/없으면 생략/);assert.match(f.facility_wire,/system_events/);assert.match(f.facility_wire,/kind:service,offer_id/);assert.match(f.facility_wire,/실제 서비스가 끝나면/);assert.match(f.facility_wire,/game_state.place=실제 방문한 venue_id/);assert.ok(!f.facility_wire.includes('economy_events'));assert.deepEqual(s,before);
 const blade='철검 가격을 묻는다.',weapons=turnContext(s,turnDomains(s,blade),blade).turn_facts.items;assert.ok(weapons.some(i=>i.subtype==='sword'));
});
test('misnamed economy events are rejected instead of silently losing the financial evidence',()=>{
 const raw={schema_version:1,type:'ercedia_scene',scene_id:'wrong-economic-field',location:'상점',time:'오후',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'견적을 제시했다.'}],choices:[],economy_events:[{event_id:'quote',kind:'offer',reason:'실제 견적'}]};
 assert.throws(()=>normalizeScene(raw),/system_events/);
 const canonical={...raw};delete canonical.economy_events;canonical.system_events=raw.economy_events;assert.equal(normalizeScene(canonical).system_events[0].event_id,'quote');
});
test('local role inquiry retains unconfirmed candidates without creating meetings',()=>{
 const state=saved(),before=structuredClone(state),action='작업대의 사람에게 사냥꾼인지 묻는다.',context=turnContext(state,turnDomains(state,action),action);
 const hunter=context.adventure.regional_residents.find(n=>n.id==='ER-COM-007');
 assert.ok(hunter);assert.equal(hunter.known,false);assert.equal(hunter.presence_confirmed,false);assert.ok(hunter.speech_style);
 assert.equal(context.npc,null);assert.deepEqual(state,before);
 const ordinary=turnContext(state,turnDomains(state,'바람 소리를 듣는다.'),'바람 소리를 듣는다.');assert.ok(!ordinary.adventure?.regional_residents.some(n=>n.id===hunter.id));
});
test('ordinary conversation preserves scene texture without forcing brevity or new danger',()=>{
  const state=saved();
  assert.match(actionPrompt(state,'안부를 묻는다.','r',{compact:true}),/\[일상 대화 응답\]/);
  assert.match(actionPrompt(state,'안부를 묻는다.','r',{compact:true}),/필수 사건 증빙은 유지/);
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
test('ordinary UI turns remain compact before and after save restoration',()=>{
  const h=uiHarness(),state=saved();try{
    const chat=mountChatUI(state,{embedded:true,render(){},persist(){}});
    const actions=()=>h.messages.filter(m=>m.type==='action').map(m=>m.payload);
    chat.submit('안부를 묻는다.','talk');const first=actions().at(-1);
    assert.ok(!first.text.includes("[대장간 제작]"));assert.ok(!first.text.includes('"dungeon_pools"')); 
    h.reply('scene',JSON.stringify({...state.scene,scene_id:'next',reply_to:first.requestId}));
    assert.equal(chat.isPending(),false);
    chat.submit('안부를 묻는다.','talk');const second=actions().at(-1);
    assert.ok(second.text.length<first.text.length*1.1);assert.ok(second.text.endsWith('안부를 묻는다.'));
    chat.restore(saved());chat.submit('안부를 묻는다.','talk');assert.ok(!actions().at(-1).text.includes("[대장간 제작]"));
  }finally{h.close();}
});
test('failed responses do not cause automatic settings retransmission',()=>{
  const h=uiHarness(),state=saved();try{
    const chat=mountChatUI(state,{embedded:true,render(){},persist(){}});
    chat.submit('안부를 묻는다.');chat.apply('{"schema_version":99,"type":"ercedia_scene"}');chat.submit('안부를 묻는다.');
    const actions=h.messages.filter(m=>m.type==='action');assert.ok(!actions.at(-1).payload.text.includes("[대장간 제작]"));assert.equal(actions.at(-1).payload.settingsFile,undefined);
  }finally{h.close();}
});


test('execution requests delegate routine timing and outcomes while preserving information-only and progression safeguards',()=>{
 const s=saved();for(const compact of [true,false]){const prompt=actionPrompt(s,'개인 기초 단련 1회를 실행한다.','training-r',{compact});assert.match(prompt,/실행의 통상 시간·결과/);assert.match(prompt,/이번 사건·시각에 반영/);assert.match(prompt,/정보 문의는 실행 동의가 아닙니다/);assert.match(prompt,/큰 위험/);assert.match(prompt,/같은 날짜·분야 반복/);assert.match(prompt,/능력치 포인트 배분/);assert.match(prompt,/경지 돌파는 자동 확정하지/);}
 const compact=actionPrompt(s,'안부를 묻는다.','r',{compact:true});assert.match(compact,/kind는 dialogue\/travel\/quest\/investigate\/trade\/training\/action/);
});

test('public qualified roles survive a role inquiry when duty is missing without summoning or leaking stats',()=>{
 const s=saved(),before=structuredClone(s),action='정착지의 사제는 누구인지 묻는다.',context=turnContext(s,turnDomains(s,action),action),priest=context.npc_catalog.nearby_npcs.find(n=>n.id==='ER-NPC-026');
 assert.ok(priest);assert.equal(priest.public_role,'중급 사제');assert.ok(!('strength' in priest)&&!('hp' in priest));assert.equal(context.npc,null);assert.deepEqual(s,before);
 assert.ok(!turnContext(s,turnDomains(s,'바람 소리를 듣는다'),'바람 소리를 듣는다').npc_catalog.nearby_npcs.some(n=>n.id==='ER-NPC-026'));
 s.gameState.region='W3';assert.ok(!turnContext(s,turnDomains(s,action),action).npc_catalog.nearby_npcs.some(n=>n.id==='ER-NPC-026'));
});
