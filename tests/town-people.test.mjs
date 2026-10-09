import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {townPeople,townConversation,mountTownPeople} from '../web/town-people.js';
import {uiHarness} from './ui-harness.mjs';
const start=()=>{const s=defaults();s.player.name='테스트';s.page='story';s.gameState={...s.gameState,region:'W1',place:'노르발트',date:'650-07-01'};s.npc_life={npcs:{},memories:[]};s.npcStates={};s.world_engine={};s.scene={...s.scene,location:'노르발트',npc:null,cast:[]};return s;};
const all=node=>[node,...(node.children||[]).flatMap(all)];
test('local roster distinguishes confirmed cast from regional residents without creating meetings',()=>{
 const s=start(),before=JSON.stringify(s),residents=townPeople(s);assert.ok(residents.length);assert.ok(residents.every(p=>!p.confirmed));assert.equal(JSON.stringify(s),before);
 const id=residents[0].id;s.scene.cast=[{id}];assert.equal(townPeople(s).find(p=>p.id===id).confirmed,true);assert.match(townConversation(s,id),new RegExp(id));assert.match(townConversation(s,id),/클릭만으로/);s.scene.cast=[];s.scene.npc={id};assert.equal(townPeople(s).find(p=>p.id===id).confirmed,true); 
});
test('confirmed absence, schedules, incapacitation and dungeons prevent phantom visits',()=>{
 const s=start(),id=townPeople(s)[0].id;s.scene.cast=[{id}];s.npc_life.npcs[id]={known:true,region:'W1',place:'노르발트',location_confirmed:true,activity:'이동 중',schedule:[{start:'650-07-01',end:'650-07-02',region:'E1',place:'동쪽 도시'}]};assert.equal(townConversation(s,id),null);
 s.npc_life.npcs[id].schedule=[];s.npc_life.npcs[id].region='E1';s.npc_life.npcs[id].place='동쪽 도시';assert.equal(townConversation(s,id),null);
 delete s.npc_life.npcs[id];s.npcStates[id]={hp:0};assert.equal(townConversation(s,id),null);s.world_engine.active_dungeon='test';assert.deepEqual(townPeople(s),[]);
});
test('roster conversation uses the existing submit path and blocks busy or stale clicks',()=>{
 const h=uiHarness();try{
  const create=document.createElement;document.createElement=(...args)=>{const n=create(...args);n.querySelectorAll=sel=>all(n).slice(1).filter(v=>(v.className||'').split(' ').includes(sel.slice(1)));n.querySelector=sel=>sel==='button'?all(n).slice(1).find(v=>v.type==='button'):n.querySelectorAll(sel)[0];n.classList={toggle(cls,yes){const set=new Set((n.className||'').split(' '));if(yes)set.add(cls);else set.delete(cls);n.className=[...set].join(' ');},remove(cls){this.toggle(cls,false);}};return n;};
  const s=start(),sent=[],before=JSON.stringify(s);let pending=false;const ui=mountTownPeople(s,{submit:v=>sent.push(v),isPending:()=>pending});ui.render();const panel=h.get('stage').children[0],row=all(panel).find(n=>n.className.trim()==='town-person'),talk=all(row).find(n=>n.textContent==='찾아가서 대화');talk.onclick();assert.equal(sent.length,1);assert.match(sent[0],/현지 인물 방문/);assert.equal(JSON.stringify(s),before);
  let stopped=false;panel.click({stopPropagation(){stopped=true;}});assert.equal(stopped,true);pending=true;talk.onclick();assert.equal(sent.length,1);pending=false;s.gameState.region='E1';talk.onclick();assert.equal(sent.length,1);ui.render();s.introDraft={};ui.render();assert.equal(panel.hidden,true);
 }finally{h.close();}
});
