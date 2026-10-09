import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,normalize,load,KEY} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {writeSlot,slotCandidate} from '../web/save-slots.js';
import {persistSavedGame,recoverSavedGame,preserveSaveSlots} from '../web/save-preservation.js';
import {mountChatUI} from '../web/chat-ui.js';
import {mountNewGame} from '../web/new-game.js';
import {uiHarness} from './ui-harness.mjs';
const key='ercedia.tm.v1:conversation-a';
const game=()=>({...defaults(),player:initialPlayer('모험가'),campaign_id:'campaign-a',wallet_copper:170,inventory:[{name:'검',quantity:1}],gameState:{place:'솔브린 마을',date:'650-07-03'},relationships:{serin:{affection:12}}});
const store=()=>{const values=new Map();return {values,read:k=>values.get(k)??null,write:(k,v)=>values.set(k,structuredClone(v))};};
test('six slots, funds, protagonist and progression survive UI update, rollback to an archive-unaware UI, and a fresh launcher',()=>{
  const db=store(),state=game();for(let id=1;id<=6;id++){state.player.hp=100-id;writeSlot(state,{setItem(){}},KEY,id);}
  const saved=persistSavedGame(key,state,db);db.write(key+':backup',saved);
  const oldUI=structuredClone(saved);delete oldUI.save_slots;oldUI.player.hp=45;
  persistSavedGame(key,oldUI,db);const restarted=recoverSavedGame(key,db.read);
  assert.equal(restarted.player.hp,45);assert.equal(restarted.save_slots.length,6);assert.deepEqual(restarted.inventory,saved.inventory);assert.equal(restarted.wallet_copper,170);
  for(let id=1;id<=6;id++)assert.equal(slotCandidate(normalize(restarted),id,normalize).player.hp,100-id);
  assert.equal(recoverSavedGame('ercedia.tm.v1:conversation-b',db.read),null);
});
test('missing or empty primary saves recover the latest good copy; old update backups and slot banks remain usable',()=>{
  const db=store(),state=game();writeSlot(state,{setItem(){}},KEY,3);persistSavedGame(key,state,db);
  db.values.delete(key);assert.equal(recoverSavedGame(key,db.read).player.name,'모험가');
  db.write(key,defaults());assert.equal(recoverSavedGame(key,db.read).campaign_id,'campaign-a');
  db.values.delete(key+':recovery');db.write(key+':backup',state);assert.equal(recoverSavedGame(key,db.read).save_slots[0].id,3);
  db.values.delete(key+':backup');db.write(key,game());assert.equal(recoverSavedGame(key,db.read).save_slots[0].id,3);
  db.values.delete(key);assert.equal(recoverSavedGame(key,db.read).player.name,'모험가');
});
test('empty boot states and failed primary writes cannot destroy durable saves or archives',()=>{
  const db=store(),state=game();writeSlot(state,{setItem(){}},KEY,1);persistSavedGame(key,state,db);
  const before=structuredClone(db.read(key));assert.throws(()=>persistSavedGame(key,defaults(),db),/빈 게임/);assert.deepEqual(db.read(key),before);
  const next=structuredClone(before);next.player.hp=20;
  assert.throws(()=>persistSavedGame(key,next,{read:db.read,write(k,v){if(k===key)throw Error('quota');db.write(k,v);}}),/quota/);
  assert.deepEqual(db.read(key),before);db.values.delete(key);assert.equal(recoverSavedGame(key,db.read).player.hp,20);
  db.write(key,{version:99});db.values.delete(key+':recovery');db.values.delete(key+':slots');assert.throws(()=>recoverSavedGame(key,db.read),/원본을 보존/);assert.equal(db.read(key).version,99);
});
test('explicit slot overwrite is retained while missing archives are recovered without mixing auto saves from other chats',()=>{
  const state=game();writeSlot(state,{setItem(){}},KEY,1);const bank=structuredClone(state.save_slots);state.player.hp=27;writeSlot(state,{setItem(){}},KEY,1);
  const merged=preserveSaveSlots(state,bank);assert.equal(merged.save_slots[0].state.player.hp,27);assert.equal(bank[0].state.player.hp,100);
});
test('a newer durable slot survives a failed primary write even when that primary still contains the old slot',()=>{
  const db=store(),state=game();writeSlot(state,{setItem(){}},KEY,1,'2026-10-09T01:00:00Z');persistSavedGame(key,state,db);
  state.player.hp=22;writeSlot(state,{setItem(){}},KEY,1,'2026-10-09T02:00:00Z');
  assert.throws(()=>persistSavedGame(key,state,{read:db.read,write(k,v){if(k===key)throw Error('quota');db.write(k,v);}}));
  assert.equal(recoverSavedGame(key,db.read).save_slots[0].state.player.hp,22);
});
test('a corrupt or incompatible stored scene is read-only and failed restore leaves the entire live game intact',()=>{
  for(const value of ['{broken','null',JSON.stringify({version:99}),JSON.stringify({...game(),scene:{invalid:true}})]){
    const loaded=load({getItem:()=>value});assert.equal(loaded.saveBlocked,true);
  }
  const h=uiHarness();try{
    const state=game(),before=structuredClone(state);let success=0;
    const chat=mountChatUI(state,{embedded:true,storage:{},persist(){},render(){},onRestore(){success++;}});
    for(const bad of [{version:99},{...game(),scene:{invalid:true}}]){assert.throws(()=>chat.restore(bad));assert.deepEqual(state,before);}
    chat.restore(state);assert.equal(state.player.name,'모험가');assert.equal(success,1);
  }finally{h.close();}
});
test('the previous-game button retains all manual slots even though the campaign backup excludes them',()=>{
  const h=uiHarness();try{
    const state=game();writeSlot(state,{setItem(){}},KEY,2);const previous=game();previous.player.name='이전 인물';state.previousGame=previous;
    mountNewGame(state,{embedded:true,render(){},persist(){},chat:{controls(){},isPending:()=>false}});
    h.get('restore-previous-game').onclick();assert.equal(state.player.name,'이전 인물');assert.equal(state.save_slots.length,1);assert.equal(state.save_slots[0].id,2);
  }finally{h.close();}
});
test('the installed launcher includes durable recovery on startup, updates, route changes and explicit recovery',()=>{
  const source=readFileSync('tampermonkey/ercedia-rpg.user.js','utf8');
  assert.match(source,/function persistSavedGame/);assert.match(source,/function recoverSavedGame/);assert.match(source,/recover-save/);assert.match(source,/snapshot=writeGame\(result.state\)/);assert.match(source,/latestState=writeGame\(data.payload\)/);assert.match(source,/readGame\(`ercedia.tm.v1:\$\{next\}`\)/);assert.doesNotMatch(source,/\/\*__SAVE_PRESERVATION__\*\//);
});
