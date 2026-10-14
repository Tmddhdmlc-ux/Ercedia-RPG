import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {turnFacts} from '../web/turn-facts.js';
import {turnDomains,turnContext} from '../web/scene.js';
const state=()=>({...defaults(),inventory:[],scene:{npc:null,dialogue:[],choices:[]},gameState:{region:'W1',place:'공동 배급소',date:'650-07-01',time:'17:09'}});
test('short canonical supply alias and spacing reach the original without unrelated weapons or granting ownership',()=>{
 const s=state(),before=structuredClone(s);
 for(const action of ['장갑 살 수 있는 곳','겨울용장갑 가격','ER-SUP-WINTER-GLOVES 가격']){
  assert.equal(turnDomains(s,action).trade,true);const f=turnContext(s,turnDomains(s,action),action).turn_facts;assert.ok(f.items.some(i=>i.id==='ER-SUP-WINTER-GLOVES'));assert.ok(f.items.every(i=>!i.slot));
 }
 const cloth=turnFacts(s,{trade:true},'방한천 가격');assert.ok(cloth.items.some(i=>i.id==='ER-SUP-WARM-CLOTH'));
 assert.deepEqual(s,before);
});
test('mixed equipment requests keep equipment references and unrelated queries do not infer supply stock',()=>{
 const s=state(),mixed=turnFacts(s,{trade:true},'장갑과 검 가격');
 assert.ok(mixed.items.some(i=>i.id==='ER-SUP-WINTER-GLOVES'));assert.ok(mixed.items.some(i=>i.slot==='weapon'||i.subtype==='sword'));
 assert.ok(!turnFacts(s,{trade:true},'검 가격').items.some(i=>i.id==='ER-SUP-WINTER-GLOVES'));
 assert.equal(s.inventory.length,0);
});
test('natural shopping and borrowing requests route trade context without misreading ordinary body descriptions',()=>{
 const s=state();
 for(const action of ['장갑 살 수 있는 곳','장갑을 사려고 해요','장갑을 빌릴 수 있나요','대여 보증금을 물어본다'])assert.equal(turnDomains(s,action).trade,true);
 assert.equal(turnDomains(s,'추워서 손의 살이 차갑다').trade,false);
});
