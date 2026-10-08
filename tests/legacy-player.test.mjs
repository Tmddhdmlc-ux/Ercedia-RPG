import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize} from '../web/state.js';
import {initializeNameOnlyPlayer} from '../web/legacy-player.js';
import {contextSummary} from '../web/scene.js';

test('name-only legacy save gets GitHub player template without losing identity or narrative',()=>{
  const state=defaults();state.player.name='청명';state.player.job='여행자';state.inventory=[{name:'소지품',quantity:1,category:'misc',description:'',effect:''}];state.gameState={events:['진행 기록']};
  const old=structuredClone(state);assert.deepEqual(normalize(old),old);
  assert.equal(initializeNameOnlyPlayer(state),true);
  assert.equal(state.player.name,'청명');assert.equal(state.player.job,'여행자');assert.equal(state.player.level,1);
  for(const key of ['strength','dexterity','intelligence','constitution','manaStat'])assert.equal(state.player[key],10);
  assert.equal(state.player.hp,100);assert.equal(state.player.mp,100);assert.equal(state.player.realm,'none');
  assert.deepEqual(state.inventory,old.inventory);assert.deepEqual(state.gameState,old.gameState);
  assert.equal(contextSummary(state).player.constitution,10);
  assert.equal(initializeNameOnlyPlayer(state),false);
});
test('never reinitialize known, injured, progressed, unnamed or active battle saves',()=>{
  for(const patch of [{hp:0},{hp:54,maxHp:100},{strength:10},{level:2},{xp:45},{levelHpBonus:3}]){
    const state=defaults();state.player={...state.player,name:'청명',...patch};const old=structuredClone(state);
    assert.equal(initializeNameOnlyPlayer(state),false);assert.deepEqual(state,old);
  }
  const state=defaults();assert.equal(initializeNameOnlyPlayer(state),false);state.player.name='청명';state.battlePlayback={done:false};assert.equal(initializeNameOnlyPlayer(state),false);
});
