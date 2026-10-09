import test from 'node:test';
import assert from 'node:assert/strict';
import {choicePresentation} from '../web/choice-presentation.js';
import {normalizeScene} from '../web/scene.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {defaults} from '../web/state.js';
const quest={id:'test-cargo',title:'항구 화물 정리 보조',summary:'담당자에게 접수하고 작업 결과를 확인받는다.',status:'offered',rank:'F',reward:{xp:0,currency:60,item_ids:[],materials:[],affection_effects:[]},objectives:[{description:'빈 상자 정리'}]};
const choice={id:'apply',text:'항구 화물 정리 보조 일자리에 지원한다.'};
const scene=()=>({schema_version:1,type:'ercedia_scene',scene_id:'presentation',location:'공고판',time:'오전',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'공고를 확인한다.'}],choices:[choice,{id:'ask',text:'최근 소식을 묻는다.'}]});
test('legacy choices resolve exact quest titles without inventing XP and deduplicate scene/log entries',()=>{
  const p=choicePresentation(choice,{quest_log:[quest],scene:{quest_updates:[quest]}});
  assert.equal(p.title,quest.title);assert.equal(p.kind,'quest');assert.match(p.reward,/EXP 0/);assert.match(p.preview,/동화 60/);assert.match(p.preview,/빈 상자 정리/);
  assert.match(p.preview,/수락·완료·보상이 확정되지/);
  assert.equal(choicePresentation({id:'a',text:'목격담을 묻는다.'},{quest_log:[quest]}).kind,'dialogue');
});
test('optional choice metadata survives saves and unknown quests never fabricate contracts or rewards',()=>{
  const raw=scene();raw.choices[1]={id:'ask',text:'정찰 조건을 확인한다.',kind:'quest',title:'정찰 조건',quest_id:'unregistered',description:'접수 조건을 질문합니다.'};
  const saved=normalizeScene(raw);assert.deepEqual(normalizeScene(saved),saved);
  const p=choicePresentation(saved.choices[1],{quest_log:[]});assert.equal(p.quest,null);assert.equal(p.reward,'');assert.equal(p.preview,'접수 조건을 질문합니다.');
  raw.choices[1].kind='unknown';assert.throws(()=>normalizeScene(raw),/선택지 유형/);
});
test('quest choice displays a vertical titled reward row, hover/focus preview and sends the original action once',()=>{
  const h=uiHarness(),state={...defaults(),player:{...defaults().player,name:'검증'},scene:scene(),quest_log:[quest]};
  try{
    mountChatUI(state,{render(){},persist(){},embedded:true});
    const button=h.get('scene-choices').children[0];button.getBoundingClientRect=()=>({left:20,top:400});
    assert.equal(h.get('scene-choices').dataset.layout,'list');assert.equal(button.children[1].textContent,quest.title);assert.match(button.children[2].textContent,/EXP 0/);
    button.onpointerenter();assert.equal(h.get('stage').children.at(-1).hidden,false);assert.match(h.get('stage').children.at(-1).textContent,/동화 60/);
    button.onblur();assert.equal(h.get('stage').children.at(-1).hidden,true);
    button.onfocus();button.onclick();button.onclick();
    const actions=h.messages.filter(m=>m.type==='action');assert.equal(actions.length,1);assert.ok(actions[0].payload.text.endsWith(choice.text));assert.equal(state.quest_log[0].status,'offered');assert.deepEqual(state.inventory,[]);
  }finally{h.close();}
});
