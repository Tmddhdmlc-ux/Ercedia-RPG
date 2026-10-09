import test from 'node:test';
import assert from 'node:assert/strict';
import {dropData} from '../web/loot-data.js';
import {lootCategory,prepareBattleLoot,validateLootRolls,lootPool,makeLootPopup,coinLootLabel} from '../web/loot-model.js';
import {normalizeScene} from '../web/scene.js';
import {normalize} from '../web/state.js';
import {normalizeBattle,validateBattleSettlement} from '../web/battle-model.js';
import {confirmedMonsterBattle} from './world-fixtures.js';
import {economyState,scene as sceneFixture,event} from './economy-fixtures.js';
import {planWorldScene} from '../web/world-engine.js';
import {mountLootPopup} from '../web/loot-popup.js';
import {uiHarness} from './ui-harness.mjs';
import {rarityStyles} from '../web/item-rarity.js';
import {catalogItem} from '../web/item-catalog.js';
import {mountChatUI} from '../web/chat-ui.js';
const queue=values=>max=>{const value=values.shift();assert.ok(value>=1&&value<=max,`draw ${value}/${max}`);return value;};
function fixture(monsterId='ER-NPC-081'){
  const state=economyState(),f=confirmedMonsterBattle(state,{battleId:'loot-battle',monsterId});f.battle.outcome.loot_mode='per_kill_v1';
  const raw=sceneFixture(state,[],{battle:f.battle,player:f.player,inventory:f.inventory});
  return {state,scene:normalizeScene(raw)};
}
test('the full 10000-outcome partition yields the exact agreed rates, including 0.3% epic',()=>{
  const counts={};for(let n=1;n<=10000;n++){const id=lootCategory(n).id;counts[id]=(counts[id]||0)+1;}
  assert.deepEqual(counts,{common:6000,special:1000,lower:600,middle:200,high:100,unique:70,epic:30,none:2000});
  assert.throws(()=>lootCategory(0),/판정값/);assert.equal(Object.keys(dropData.dungeonPools).length,26);
});
test('one corpse gives one roll, canonical material and quantity; normalization preserves the result',()=>{
  const f=fixture(),next=prepareBattleLoot(f.state,f.scene,{roll:queue([6000,1,2])});
  assert.equal(next.battle.outcome.loot_rolls.length,1);assert.equal(next.battle.outcome.items_added[0].quantity,2);assert.equal(next.inventory[0].id,'MAT-001-1');
  validateBattleSettlement(next,f.state);assert.deepEqual(normalizeScene(next).battle.outcome.loot_rolls,next.battle.outcome.loot_rolls);
  assert.equal(prepareBattleLoot(f.state,next,{roll(){throw Error('reroll');}}),next);assert.equal(f.scene.inventory.length,0);
});
test('different instances of the same species roll independently and merge item stacks',()=>{
  const f=fixture(),enemy=structuredClone(f.scene.battle.participants[1]);enemy.id='second-wolf';f.scene.battle.participants.push(enemy);f.scene.battle.outcome.resources.push({id:enemy.id,hp:0,mp:enemy.mp});
  const next=prepareBattleLoot(f.state,f.scene,{roll:queue([1,1,1,6001,1,1])});
  assert.equal(next.battle.outcome.loot_rolls.length,2);assert.deepEqual(next.inventory.map(i=>i.id),['MAT-001-1','MAT-001-2']);
  const invalid=structuredClone(next.battle);invalid.outcome.loot_rolls[1].participant_id=invalid.outcome.loot_rolls[0].participant_id;assert.throws(()=>validateLootRolls(invalid),/개체마다/);
});
test('no drop and unavailable epic pools are consumed without reroll; survivors do not roll',()=>{
  const f=fixture(),nothing=prepareBattleLoot(f.state,f.scene,{roll:queue([10000])});assert.equal(nothing.inventory.length,0);assert.equal(nothing.battle.outcome.loot_rolls[0].category,'none');
  const epic=prepareBattleLoot(f.state,f.scene,{roll:queue([7971])});assert.equal(epic.inventory.length,0);assert.equal(epic.battle.outcome.loot_rolls[0].category,'epic');
  assert.deepEqual(lootPool('ER-NPC-081','DUN-W5-02','epic'),[]);
  f.scene.battle.outcome.resources[1].hp=1;assert.equal(prepareBattleLoot(f.state,f.scene,{roll(){throw Error('survivor roll');}}).battle.outcome.loot_rolls.length,0);
});
test('per-corpse ledger rejects repeat claims and legacy loot event double payout',()=>{
  const f=fixture(),next=prepareBattleLoot(f.state,f.scene,{roll:queue([1,1,1])}),plan=planWorldScene(f.state,next);
  assert.ok(plan.world_engine.loot_claims[next.battle.battle_id+':'+next.battle.participants[1].id]);
  assert.throws(()=>planWorldScene({...f.state,world_engine:plan.world_engine},next),/이미 정산/);
  assert.throws(()=>prepareBattleLoot(f.state,{...f.scene,system_events:[event('loot')]},{roll(){throw Error('must not roll');}}),/중복/);
  assert.equal(plan.wallet_copper,f.state.wallet_copper);
});
test('malformed categories, items, amounts and missing reward snapshots are rejected',()=>{
  const f=fixture(),next=prepareBattleLoot(f.state,f.scene,{roll:queue([1,1,1])});
  for(const alter of [b=>b.outcome.loot_rolls[0].category='epic',b=>b.outcome.loot_rolls[0].item_id='ER-EQ-300',b=>b.outcome.loot_rolls[0].quantity=100,b=>b.outcome.items_added=[]]){const invalid=structuredClone(next.battle);alter(invalid);assert.throws(()=>validateLootRolls(invalid),/전리품 검증/);}
  assert.doesNotThrow(()=>normalizeBattle(next.battle));
});
test('loot popup shows only committed receipts, currency and canonical rarity colors; dismiss survives save',()=>{
  const h=uiHarness(),f=fixture();let saves=0;
  try{
    const item=catalogItem('ER-EQ-241');f.state.page='story';f.state.battlePlayback={scene:f.scene,done:true,replay:false,index:f.scene.battle.events.length,speed:1,paused:false};f.state.battleApplied=[f.scene.battle.battle_id];
    f.scene.battle.outcome.items_added=[{id:item.id,name:item.name,quantity:1}];f.state.wallet_copper+=17;f.state.lootPopup=makeLootPopup(f.state,f.scene,f.state.wallet_copper-17);
    const ui=mountLootPopup(f.state,{persist(){saves++;},assetBase:'/'});ui.render();
    const overlay=h.get('stage').children.find(n=>n.id==='loot-popup'),panel=overlay.children[0],list=panel.children[1];
    assert.equal(overlay.hidden,false);assert.equal(list.children[0].textContent,'17동 획득!');assert.equal(list.children[1].dataset.rarity,item.rarity);assert.equal(list.children[1].style['--item-rarity-color'],rarityStyles[item.rarity].color);
    assert.ok(list.children[1].children.some(n=>n.textContent===item.name+' 획득!'));
    ui.dismiss();assert.equal(overlay.hidden,true);assert.equal(saves,1);assert.equal(normalize(f.state).lootPopup.pending,false);
    const uncommitted=structuredClone(f.state);uncommitted.lootPopup.pending=true;uncommitted.battleApplied=[];const other=mountLootPopup(uncommitted,{assetBase:'/'});other.render();assert.equal(h.get('stage').children.at(-1).hidden,true);
  }finally{h.close();}
});
test('popup follows actual currency receipts and never invents animal coins',()=>{
  assert.equal(coinLootLabel(17),'17동 획득!');assert.equal(coinLootLabel(10117),'1금 1은 17동 획득!');
  const f=fixture();assert.equal(makeLootPopup(f.state,f.scene,f.state.wallet_copper).copper,0);
});

test('production chat commits loot and 17 copper only after battle; replay and pending dialogue cannot pay again',()=>{
  const h=uiHarness(),f=fixture();try{
    f.scene.system_events=[event('cash_receipt',{source:'dungeon_treasure',source_id:'loot-chest',evidence_id:'loot-proof',amount:17,available_copper:17})];
    f.scene.world_events=[{event_id:'loot-proof',kind:'clue',target_id:'loot-chest',location:f.state.gameState.place,proof:'실제 상자에서 동화17개 확인'}];
    let started;const chat=mountChatUI(f.state,{embedded:true,render(){},persist(){},getBattle:()=>({start(s){started=s;}})});
    chat.apply(JSON.stringify(f.scene),{manual:true});assert.ok(started,h.get('integration-status').textContent);assert.equal(f.state.wallet_copper,500);assert.equal(f.state.inventory.length,0);
    assert.equal(started.battle.outcome.loot_rolls.length,1);
    f.state.battleApplied=[started.battle.battle_id];f.state.battlePlayback={scene:started,done:true,replay:false,index:started.battle.events.length,speed:1,paused:false};
    chat.apply(JSON.stringify(started),{commitBattle:true});assert.equal(f.state.wallet_copper,517);assert.equal(f.state.lootPopup.copper,17);assert.equal(f.state.lootPopup.pending,true);
    const before=structuredClone(f.state);chat.apply(JSON.stringify(started),{commitBattle:true});assert.deepEqual(f.state,before);
    const messages=h.messages.length;chat.submit('다음 행동');assert.equal(h.messages.length,messages);
  }finally{h.close();}
});
