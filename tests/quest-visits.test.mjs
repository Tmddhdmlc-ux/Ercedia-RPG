import test from 'node:test';
import assert from 'node:assert/strict';
import {battleFixture} from './battle-fixtures.js';
import {normalizeScene} from '../web/scene.js';
import {settleQuests} from '../web/quest-model.js';
const state=()=>({...battleFixture().state,gameState:{date:'1-1-30',time:'23:50',region:'W3',place:'솔브린 마을'},quest_log:[{id:'errand',title:'물 확인',status:'active',type:'investigate',origin:'personal_npc',region_id:'W3',issuer_npc_id:'serin',objectives:[{id:'water',description:'주방에서 끓일 물 확인',current:0,target:1,verification:{kind:'clue',target_id:'water'}}],reward:{currency:5,xp:0,item_ids:[],materials:[],affection_effects:[]}}]});
const raw=()=>({schema_version:1,type:'ercedia_scene',scene_id:'returned',location:'솔브린 마을',time:'00:10',background_id:'sunny_village_day',npc:{id:'serin',speaker:'세린',outfit:'armor',emotion:'base'},dialogue:[{speaker:'세린',text:'주방의 답을 들었어.'}],choices:[],game_state:{date:'1-2-1',time:'00:10',region:'W3',place:'솔브린 마을'},quest_visits:[{id:'kitchen',region_id:'W3',location:'여관 주방',date:'1-1-30',time:'23:55',proof:'주방 담당자가 끓일 물을 준비할 수 있다고 답했다.'}],world_events:[{event_id:'water-confirmed',kind:'clue',target_id:'water',location:'여관 주방',visit_id:'kitchen',proof:'빈 운반 통을 직접 가져와야 한다는 조건을 들었다.'}],quest_events:[{event_id:'report',quest_id:'errand',kind:'report',reason:'세린에게 주방의 조건을 실제로 보고했다.'}]});
test('actual intermediate visit can settle at issuer; source location survives normalization and journal, reward once',()=>{
 const s=state(),before=structuredClone(s),scene=normalizeScene(raw()),result=settleQuests(s,scene);
 assert.deepEqual(s,before);assert.equal(scene.world_events[0].location,'여관 주방');assert.equal(scene.world_events[0].visit_id,'kitchen');assert.equal(result.quest_log[0].status,'completed');assert.equal(result.wallet_copper,(s.wallet_copper||0)+5);assert.ok(result.quest_log[0].journal.some(v=>v.includes('23:55 · 여관 주방')&&v.includes('운반 통')));
 assert.throws(()=>settleQuests({...s,...result},scene),/이미 적용|이전 턴에 수락/);
});
test('without a visit, intermediate place remains rejected; final-place legacy evidence still works',()=>{
 const a=raw();delete a.quest_visits;delete a.world_events[0].visit_id;assert.throws(()=>settleQuests(state(),normalizeScene(a)),/장소와 실제 위치/);
 a.world_events[0].location=a.location;assert.equal(settleQuests(state(),normalizeScene(a)).quest_log[0].status,'completed');
});
test('future, backdated, unordered, wrong region, unlinked or invalid-calendar visits reject atomically',()=>{
 const changes=[r=>r.quest_visits[0].time='23:49',r=>Object.assign(r.quest_visits[0],{date:'1-2-1',time:'00:11'}),r=>r.quest_visits.push({...r.quest_visits[0],id:'earlier',time:'23:54'}),r=>r.quest_visits[0].region_id='W1',r=>r.game_state.region='W1',r=>r.world_events[0].visit_id='planned',r=>r.world_events[0].location='시장',r=>r.quest_visits[0].date='1-1-31',r=>r.quest_visits[0].region_id='E5',r=>r.world_events[0].kind='dungeon_enter'];
 for(const change of changes){const s=state(),before=structuredClone(s),r=raw();change(r);assert.throws(()=>settleQuests(s,normalizeScene(r)));assert.deepEqual(s,before);}
});
test('visit evidence cannot retroactively satisfy a newly accepted contract or replace battle proof',()=>{
 const s=state(),r=raw();s.quest_log[0].status='offered';r.quest_events.unshift({event_id:'accept',quest_id:'errand',kind:'accept',reason:'지금 수락'});assert.throws(()=>settleQuests(s,normalizeScene(r)),/이전 턴에 수락/);
 const b=raw();b.world_events[0].kind='battle_win';assert.throws(()=>settleQuests(state(),normalizeScene(b)),/전투 정산/);
});
