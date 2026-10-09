import test from 'node:test';
import assert from 'node:assert/strict';
import {introData,playerTemplate} from '../web/intro-data.js';
import {passiveCandidates,creationFields,initialPlayer,normalizeIntroDraft} from '../web/intro-model.js';
import {defaults,normalize} from '../web/state.js';
import {normalizeScene,actionPrompt} from '../web/scene.js';
import {createGameBridge} from '../integration/game-bridge.js';
test('all sixteen answer combinations yield exactly the matching candidates without rolls',()=>{
  const q1=introData.questions.find(q=>q.id==='calling'),q2=introData.questions.find(q=>q.id==='response');
  for(const a of q1.options)for(const b of q2.options)assert.deepEqual(passiveCandidates({calling:a.id,response:b.id}),[...new Set([a.passive,b.passive])]);
});
test('only the thirteen approved lordships can be confirmed',()=>{
  for(const region of introData.start_regions)for(const id of region.lordship_ids){
    const fields=creationFields({name:'테스트',appearance:'',answers:{calling:'guard',response:'protect'},passive:'steadfast',kingdom:region.id,lordship:id});
    assert.equal(fields.starting_lordship_id,id);assert.equal(fields.starting_kingdom,region.kingdom);
  }
  assert.throws(()=>creationFields({name:'테스트',appearance:'',answers:{calling:'guard',response:'protect'},passive:'steadfast',kingdom:'west',lordship:'CW'}));
});
test('Lv1 resources and all five attributes come from an isolated template copy',()=>{
  const before=JSON.stringify(playerTemplate),p=initialPlayer('테스트');
  assert.equal(p.level,1);for(const key of ['hp','maxHp','mp','maxMp'])assert.equal(p[key],100);
  for(const key of ['strength','dexterity','intelligence','constitution','manaStat'])assert.equal(p[key],10);
  p.hp=1;assert.equal(JSON.stringify(playerTemplate),before);
});
test('legacy saves do not gain keys and draft resumes exactly',()=>{
  assert.deepEqual(normalize(defaults()),defaults());
  const old={...defaults(),player:{...defaults().player,name:'기존 이름'}};
  const draft=normalizeIntroDraft({step:'passive',name:'새 이름',answers:{calling:'guard',response:'escape'},passive:'traveler'});
  const saved={...old,introDraft:draft};assert.deepEqual(normalize(saved),saved);assert.equal(saved.player.name,'기존 이름');
});
test('completed character metadata and null-background first scenes survive normalization',()=>{
  const fields=creationFields({name:'테스트',appearance:'선택한 모습',answers:{calling:'guard',response:'escape'},passive:'traveler',kingdom:'east',lordship:'E2'});
  const saved={...defaults(),...fields,chosenName:'테스트',player:initialPlayer('테스트'),previousGame:defaults()};
  assert.deepEqual(normalize(saved),saved);
  assert.equal(normalizeScene({schema_version:1,type:'ercedia_scene',scene_id:'first',location:'임시 안전 정착지',time:'시작 시점',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'여정 시작'}],choices:[]}).background_id,null);
});

test('first scene requests retain approved origin, passive limits and five stats',()=>{
  const fields=creationFields({name:'테스트',appearance:'',answers:{calling:'guard',response:'escape'},passive:'traveler',kingdom:'east',lordship:'E2'});
  const state={...defaults(),...fields,player:initialPlayer('테스트')},prompt=actionPrompt(state,'첫 장면','request-1');
  for(const text of ['E2','traveler','미개척 마나 이상지대 자동 탐지 불가','constitution','manaStat','request-1'])assert.ok(prompt.includes(text));
});

test('legacy player updates preserve new optional attributes and chosen name',()=>{
  const state={...defaults(),chosenName:'테스트',player:initialPlayer('테스트')};
  const bridge=createGameBridge(state,{render(){},persist(){}});
  bridge.updatePlayer({...defaults().player,name:'다른 이름',hp:90,maxHp:100});
  assert.equal(state.player.name,'테스트');assert.equal(state.player.hp,90);assert.equal(state.player.constitution,10);assert.equal(state.player.manaStat,10);
  bridge.updatePlayer({...state.player,constitution:12,manaStat:13});assert.equal(state.player.constitution,12);assert.equal(state.player.manaStat,13);
});

test('journey persona survives campaign save and reaches GPT without granting skills or stats',()=>{
 const draft={name:'모험가',appearance:'여성',goal:'최고의 대장장이가 된다',answers:{calling:'artisan',response:'prepare'},passive:'craftsman',kingdom:'west',lordship:'W1'};
 const s={...defaults(),...creationFields(draft),player:initialPlayer(draft.name)};
 const restored=normalize(s);assert.equal(restored.journey_goal,draft.goal);
 assert.match(actionPrompt(restored,'첫 장면','goal-request'),/최고의 대장장이가 된다/);
 assert.equal(restored.player.level,1);assert.deepEqual(restored.player.skills,[]);
});
