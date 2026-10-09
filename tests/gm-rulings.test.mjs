import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize} from '../web/state.js';
import {normalizeScene,actionPrompt} from '../web/scene.js';
import {mergeRulings} from '../web/gm-rulings.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
const ruling={id:'promotion-sword',topic:'검사 전직 경로',decision:'현지 스승의 호위 시험을 수행하고 실제 보고한 뒤 전직 자격을 검토한다.'};
const scene=(id,rulings)=>({schema_version:1,type:'ercedia_scene',scene_id:id,location:'마을',time:'09:00',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'전직 시험의 조건을 들었다.'}],choices:[],gm_rulings:rulings});
test('public GM methods survive application, save restoration and next-turn context without granting progression',()=>{
 const h=uiHarness();try{const s=defaults();s.player.name='시험';const player=structuredClone(s.player),game=structuredClone(s.gameState);let saved;
 const chat=mountChatUI(s,{embedded:true,render(){},persist(){saved=JSON.parse(JSON.stringify(s));}});
 chat.apply(JSON.stringify(scene('one',[ruling])));assert.deepEqual(s.gm_rulings,[ruling]);assert.deepEqual(s.player,player);assert.deepEqual(s.gameState,game);
 const restored=normalize(saved);assert.deepEqual(restored.gm_rulings,[ruling]);assert.match(actionPrompt(restored,'전직 시험을 수행한다.','r',{compact:true}),/현지 스승의 호위 시험/);
 chat.apply(JSON.stringify(scene('two',[ruling])));assert.equal(s.gm_rulings.length,1);
 const before=JSON.stringify(s);chat.apply(JSON.stringify(scene('three',[{...ruling,decision:'즉시 전직 성공'}])));assert.equal(JSON.stringify(s),before);
 }finally{h.close();}
});
test('ruling records reject conflicting IDs, oversized content and invalid schemas before mutation',()=>{
 const s=defaults(),before=JSON.stringify(s);for(const records of [[ruling,ruling],[{...ruling,decision:'x'.repeat(801)}],Array(9).fill(ruling),[{id:'bad',topic:'',decision:'x'}]])assert.throws(()=>normalizeScene(scene('bad',records)));
 assert.deepEqual(mergeRulings(s,scene('empty',[])),[]);assert.equal(JSON.stringify(s),before);assert.equal(Object.hasOwn(normalize(s),'gm_rulings'),false);
});
test('new campaigns never inherit prior rulings and both prompt modes allow missing methods rather than rejecting them',()=>{
 const s=defaults();s.player.name='시험';s.gm_rulings=[ruling];assert.equal(Object.hasOwn(defaults(),'gm_rulings'),false);
 for(const compact of [true,false]){const prompt=actionPrompt(s,'전직 방법을 알아본다.','r',{compact});assert.match(prompt,/전직/);assert.match(prompt,/gm_rulings/);assert.match(prompt,/현지 스승의 호위 시험/);}
});
