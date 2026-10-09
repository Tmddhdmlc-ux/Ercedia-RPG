import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize,load,KEY} from '../web/state.js';
import {writeSlot,saveSnapshot,slotCandidate,normalizeSlots,slotRecords,saveSummary} from '../web/save-slots.js';
import {freshCampaign} from '../web/new-game-state.js';
import {initialPlayer} from '../web/intro-model.js';
const game=()=>({...defaults(),campaign_id:'old-campaign',player:initialPlayer('청명'),gameState:{date:'650-07-03',place:'곡창길',events:['만남']},inventory:[{name:'곡식',quantity:2}],relationships:{serin:{affection:24,flags:['첫 만남'],interaction_history:['인사'],last_interaction_day:'650-07-03'}},battleApplied:['battle-1']});
const memory=()=>({value:null,setItem(key,value){assert.equal(key,KEY);this.value=value;},getItem(key){assert.equal(key,KEY);return this.value;}});
test('slots use the same v1 storage key and restore progression without recursive archives',()=>{
 const s=normalize(game()),store=memory(),before=structuredClone(s);writeSlot(s,store,KEY,1,'2026-10-09T01:00:00Z');
 s.player.hp=20;writeSlot(s,store,KEY,2);writeSlot(s,store,KEY,3);
 assert.equal(s.save_slots.length,3);for(const slot of s.save_slots)assert.equal(slot.state.save_slots,undefined);
 const restored=slotCandidate(load(store).state,1,normalize);assert.deepEqual(saveSnapshot(restored),before);assert.equal(restored.save_slots.length,3);assert.equal(restored.player.hp,100);assert.equal(restored.relationships.serin.affection,24);assert.deepEqual(restored.battleApplied,['battle-1']);
 const summary=saveSummary(restored);assert.equal(summary.name,'청명');assert.equal(summary.place,'곡창길');
});
test('overwrite changes one slot only; failed writes never change the game or saved slot',()=>{
 const s=game(),store=memory();writeSlot(s,store,KEY,1);writeSlot(s,store,KEY,2);const second=structuredClone(s.save_slots[1]);s.player.hp=31;writeSlot(s,store,KEY,1);assert.equal(s.save_slots[0].state.player.hp,31);assert.deepEqual(s.save_slots[1],second);
 const before=structuredClone(s);assert.throws(()=>writeSlot(s,{setItem(){throw Error('QuotaExceeded');}},KEY,1));assert.deepEqual(s,before);assert.throws(()=>writeSlot(s,store,KEY,7));
});
test('legacy saves retain their exact schema until a manual slot is created',()=>{
 const s=defaults();assert.deepEqual(normalize(s),s);assert.equal(normalize(s).save_slots,undefined);assert.deepEqual(normalizeSlots([null,{id:9,state:s},{id:1,state:{version:99}}]),[]);
 const bad={...game(),scene:{bad:true}};const current={...game(),save_slots:[{id:1,state:bad}]};assert.throws(()=>slotCandidate(current,1,normalize),/장면/);assert.throws(()=>slotCandidate(current,2,normalize),/비어/);
});
test('new campaigns preserve all manual slots while resetting current protagonist and avoiding backup recursion',()=>{
 const old=game(),store=memory();writeSlot(old,store,KEY,1);const draft={name:'새 여정',appearance:'',answers:{calling:'guard',response:'protect'},passive:'steadfast',kingdom:'east',lordship:'E2',previousView:{page:'story',region:'village',mapView:'world'}};
 const fresh=freshCampaign(old,draft,{files:{},paths:[]},'new-campaign');assert.equal(fresh.player.name,'새 여정');assert.deepEqual(fresh.save_slots,old.save_slots);assert.equal(fresh.previousGame.save_slots,undefined);assert.equal(slotCandidate(normalize(fresh),1,normalize).player.name,'청명');
});

import {mountSaveUI} from '../web/save-ui.js';
function uiHarness(s,store){
 class Node{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.textContent='';this.disabled=false;this.listeners={};}append(...nodes){for(const n of nodes){if(n.parent)n.parent.children=n.parent.children.filter(c=>c!==n);n.parent=this;this.children.push(n);}}prepend(n){this.children.unshift(n);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.listeners[k]=f;}showModal(){this.open=true;}close(){this.open=false;}focus(){}}
 const old=globalThis.document,game=new Node('main'),title=new Node('section'),actions=new Node('div'),utility=new Node('details');game.dataset.title='closed';const listeners={};
 globalThis.document={createElement:t=>new Node(t),querySelector:q=>q==='.game'?game:q==='.utility-actions'?actions:utility,getElementById:()=>title,activeElement:new Node('button'),addEventListener:(k,f)=>listeners[k]=f};
 let pending=false,entered=0,restored=0;const ui=mountSaveUI(s,{storage:store,isPending:()=>pending,restore(candidate,options){assert.deepEqual(options,{prepared:true,deferRender:true});restored++;for(const k of Object.keys(s))delete s[k];Object.assign(s,candidate);},enter(){entered++;game.dataset.title='closed';}});
 const dialog=()=>[...game.children,...title.children].find(n=>n.tag==='dialog');
 return {ui,game,title,dialog,pending:v=>pending=v,entered:()=>entered,restored:()=>restored,listeners,close:()=>globalThis.document=old};
}
test('save window selects slots, confirms overwrite, blocks pending requests, and loads the complete save',()=>{
 const s=normalize(game()),store=memory(),h=uiHarness(s,store);
 try{h.ui.open('save');let d=h.dialog(),list=d.children[3],confirm=d.children[5];assert.equal(list.children.length,6);assert.equal(confirm.disabled,true);list.children[0].onclick();confirm.onclick();assert.equal(s.save_slots.length,1);s.player.hp=44;
 confirm.onclick();assert.match(confirm.textContent,/덮어쓰기 확정/);assert.equal(s.save_slots[0].state.player.hp,100);confirm.onclick();assert.equal(s.save_slots[0].state.player.hp,44);
 s.player.hp=7;h.ui.open('load');d=h.dialog();d.children[3].children[1].onclick();h.pending(true);h.ui.refresh();assert.equal(d.children[5].disabled,true);d.children[5].onclick();assert.equal(s.player.hp,7);h.pending(false);h.ui.refresh();d.children[5].onclick();assert.equal(s.player.hp,44);assert.equal(h.restored(),1);assert.equal(h.entered(),1);assert.equal(d.open,false);
 }finally{h.close();}
});
test('title load dialog and automatic continue are accessible; failed slot loading preserves current progress',()=>{
 const s=normalize(game()),store=memory();writeSlot(s,store,KEY,1);s.player.hp=10;const h=uiHarness(s,store);
 try{h.game.dataset.title='active';h.ui.open('load');const d=h.dialog();assert.equal(d.parent,h.title);assert.equal(d.children[1].children[0].disabled,true);d.children[3].children[1].onclick();store.setItem=()=>{throw Error('quota');};d.children[5].onclick();assert.equal(s.player.hp,10);assert.equal(h.restored(),0);assert.match(d.children[4].textContent,/불러오기 실패/);
 d.children[3].children[0].onclick();d.children[5].onclick();assert.equal(h.entered(),1);assert.equal(h.restored(),0);assert.equal(s.player.hp,10);
 }finally{h.close();}
});

test('slot listing never reads histories; only the selected game is copied and normalized',()=>{
 const selected=game(),other=game();Object.defineProperty(other,'longHistory',{enumerable:true,get(){throw Error('unselected history traversed');}});
 const state={...game(),save_slots:[{id:1,state:selected},{id:2,state:other}]};
 assert.equal(slotRecords(state.save_slots)[1].state,other);let calls=0;
 const restored=slotCandidate(state,1,s=>{calls++;return normalize(s);});assert.equal(calls,1);assert.equal(restored.save_slots[1].state,other);
 restored.player.hp=2;assert.equal(selected.player.hp,100);assert.equal(saveSnapshot(state).save_slots,undefined);
 const h=uiHarness(state,memory());try{h.ui.open('load');h.ui.refresh();assert.equal(h.ui.hasSlots(),true);h.dialog().children[3].children[1].onclick();assert.equal(h.dialog().children[5].disabled,false);}finally{h.close();}
});
