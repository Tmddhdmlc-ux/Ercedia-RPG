import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {currentMapPoint,mapRegionContext,mountMapContext} from '../web/map-context.js';
import {uiHarness} from './ui-harness.mjs';
const start=()=>{const s=defaults();s.gameState={region:'W1',place:'노르발트',date:'650-07-01'};s.region='E2';s.mapView='east';s.npc_life={npcs:{},memories:[]};s.npcStates={};s.scene={location:'노르발트',cast:[],npc:null};return s;};
test('current position follows actual game location rather than a browsed map destination',()=>{
 const s=start(),before=JSON.stringify(s);assert.equal(currentMapPoint(s).id,'W1');assert.equal(mapRegionContext(s,'west').current,true);assert.equal(mapRegionContext(s,'E2').current,false);assert.equal(JSON.stringify(s),before);s.gameState.region='';s.gameState.place='행방 미확인';assert.equal(currentMapPoint(s),null);
});
test('hover lists registered facilities and resident candidates without granting or moving anything',()=>{
 const s=start(),before=JSON.stringify(s),local=mapRegionContext(s,'W1'),kingdom=mapRegionContext(s,'west');assert.ok(local.facilities.length);assert.ok(local.candidates.length);assert.ok(kingdom.facilities.length>=local.facilities.length);assert.equal(local.confirmed.length,0);assert.equal(JSON.stringify(s),before);
});
test('public location and schedules update NPC region previews and incapacitated NPCs disappear',()=>{
 const s=start(),id=mapRegionContext(s,'W1').candidates[0].id;s.npc_life.npcs[id]={known:true,region:'W1',place:'노르발트',activity:'거래 중',schedule:[{start:'650-07-01',end:'650-07-02',region:'E1',place:'칼트하임'}]};assert.ok(!mapRegionContext(s,'W1').confirmed.some(p=>p.id===id));assert.ok(mapRegionContext(s,'E1').confirmed.some(p=>p.id===id));assert.ok(!mapRegionContext(s,'E1').candidates.some(p=>p.id===id));s.npcStates[id]={hp:0};assert.ok(!mapRegionContext(s,'E1').confirmed.some(p=>p.id===id));
});
test('map hover is read-only, current-location button targets the real anchor and creation hides the old position',()=>{
 const h=uiHarness();try{
  const create=document.createElement;document.createElement=(...args)=>{const n=create(...args);n.offsetWidth=360;n.offsetHeight=300;return n;};document.createElementNS=(ns,tag)=>document.createElement(tag);window.innerWidth=1200;window.innerHeight=800;
  const panel=h.get('map-panel'),header=h.get('map-navigation'),pin=document.createElement('circle');pin.dataset.region='W1';pin.getBoundingClientRect=()=>({right:300,top:100});panel.querySelector=()=>header;panel.querySelectorAll=()=>[pin];const s=start(),before=JSON.stringify(s),selected=[];
  const ui=mountMapContext(s,{selectCurrent:p=>selected.push(p.id)});ui.render();pin.pointerenter();const tip=panel.children.at(-1);assert.equal(tip.hidden,false);assert.match(tip.children[0].textContent,/노르발트/);assert.equal(JSON.stringify(s),before);header.children[0].onclick();assert.deepEqual(selected,['W1']);assert.equal(JSON.stringify(s),before);s.introDraft={};ui.render();assert.equal(header.children[0].hidden,true);assert.equal(h.get('map-points').children.at(-1).style.display,'none');
 }finally{delete document.createElementNS;h.close();}
});
