import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCampaign} from '../web/new-game-state.js';
import {normalize,defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {npcContext,npcCatalog} from '../web/npc-model.js';
import {mountChatUI} from '../web/chat-ui.js';
import {uiHarness} from './ui-harness.mjs';
const draft={name:'새 모험가',appearance:'',answers:{calling:'guard',response:'protect'},passive:'steadfast',kingdom:'east',lordship:'E2',previousView:{page:'story',region:'village',mapView:'world'}};
test('new campaign clears old protagonist inventory quests battle and engine, keeping explicit backup',()=>{const old={...defaults(),player:{...initialPlayer('청명'),hp:32,xp:74,level:5},inventory:[{name:'옛 검',quantity:1}],engine:{version:1,equipped:{weapon:'old'}},quest_log:[{id:'old'}],currency:300,relationships:{serin:{affection:60}},battleApplied:['old-battle']};const fresh=freshCampaign(old,draft,{files:{},paths:[]},'new-campaign');assert.equal(fresh.background,true);assert.equal(fresh.player.name,'새 모험가');assert.equal(fresh.player.level,1);assert.equal(fresh.player.hp,100);assert.equal(fresh.player.xp,0);assert.deepEqual(fresh.inventory,[]);for(const key of ['quest_log','currency','relationships','engine','battleApplied'])assert.equal(fresh[key],undefined);assert.equal(fresh.previousGame.player.hp,32);assert.equal(fresh.gameState.region,'E2');assert.equal(normalize(fresh).campaign_id,'new-campaign');});
test('canonical NPC snapshots are not repeated in every GPT message; actual injuries remain',()=>{const state={npcStates:Object.fromEntries(npcCatalog.map(p=>[p.id,{level:p.level,hp:p.hp,maxHp:p.maxHp}]))};assert.deepEqual(npcContext(state).npc_changes,{});state.npcStates.serin.hp=200;assert.deepEqual(npcContext(state).npc_changes,{serin:{hp:200}});});
test('new campaign refuses unsolicited old host JSON, but accepts explicit manual scene',()=>{const h=uiHarness(),s={...defaults(),campaign_id:'new-campaign',player:initialPlayer('새 모험가')};try{const chat=mountChatUI(s,{embedded:true,render(){},persist(){}}),scene={schema_version:1,type:'ercedia_scene',scene_id:'old',reply_to:'old-request',location:'옛 마을',time:'오후',background_id:null,npc:null,dialogue:[{speaker:'청명',text:'옛 게임'}],choices:[]};h.reply('scene',JSON.stringify(scene));assert.equal(s.scene,null);assert.match(h.get('connection-detail').textContent,/이전 채팅/);chat.apply(JSON.stringify({...scene,scene_id:'manual',reply_to:undefined}),{manual:true});assert.equal(s.scene.scene_id,'manual');assert.equal(s.player.name,'새 모험가');}finally{h.close();}});

test('new games start in Ercedia year 650 without altering old campaign dates',()=>{
 const old={...defaults(),gameState:{date:'12-3-5',time:'22:30'}};
 const fresh=freshCampaign(old,draft,{files:{},paths:[]},'new-date');
 assert.equal(fresh.gameState.date,'650-07-01');assert.equal(fresh.gameState.time,'09:00');
 assert.equal(fresh.previousGame.gameState.date,'12-3-5');assert.equal(old.gameState.time,'22:30');
 const restored=normalize(fresh);assert.equal(restored.gameState.date,'650-07-01');
});
