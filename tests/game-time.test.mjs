import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGameTime,gameTimeView,timeAtmosphere,mountGameTime} from '../web/game-time.js';
import {uiHarness} from './ui-harness.mjs';
test('game clock recognizes five phases and Korean AM/PM without inventing minutes',()=>{
 for(const [raw,phase] of [['05:00','dawn'],['09:15','morning'],['14:30','day'],['18:40','evening'],['23:59','night'],['00:00','night']])assert.equal(parseGameTime(raw).phase,phase);
 assert.equal(parseGameTime('오후 3:20').clock,'15:20');assert.equal(parseGameTime('오전 12:00').clock,'00:00');
 assert.equal(parseGameTime('오후').clock,'');assert.equal(parseGameTime('시작 시점').phase,'unknown');assert.equal(parseGameTime('24:00').clock,'');
});
test('360-day date and old saves remain unchanged; new scene phase prevents stale stored time',()=>{
 const s={campaign_id:'a',gameState:{date:'1-12-30',time:'14:30'},scene:{time:'오후'}},before=JSON.stringify(s);assert.equal(gameTimeView(s).clock,'14:30');assert.equal(gameTimeView(s).dateLabel,'에르세디아력 1년 12월 30일');assert.equal(JSON.stringify(s),before);
 s.scene.time='밤';assert.equal(gameTimeView(s).phase,'night');assert.equal(gameTimeView(s).clock,'');
 s.scene.game_state={date:'2-01-01',time:'05:10'};assert.equal(gameTimeView(s).dateLabel,'에르세디아력 2년 1월 1일');assert.equal(gameTimeView(s).phase,'dawn');
 assert.equal(gameTimeView({}).label,'시간 미정');
});
test('only outdoor art receives time tint; explicit rainy-night art and absent art remain intact',()=>{
 assert.equal(timeAtmosphere('night','sunny_village_day'),'night');assert.equal(timeAtmosphere('night','IMG-SHARED-08'),'neutral');assert.equal(timeAtmosphere('night',null),'neutral');assert.equal(timeAtmosphere('unknown','sunny_village_day'),'neutral');
});
test('one phase notification, no initial/load/campaign notice and no state mutation',()=>{
 const h=uiHarness();try{const s={campaign_id:'one',gameState:{date:'1-01-01',time:'14:00'}};h.get('background').dataset.backgroundId='sunny_village_day';const ui=mountGameTime(s);ui.render();assert.equal(h.get('time-notice').hidden,true);
 s.gameState.time='18:40';const before=JSON.stringify(s);ui.render();assert.equal(h.get('time-notice').hidden,false);assert.equal(h.get('time-notice').textContent,'해가 저물었습니다.');assert.equal(h.get('background').dataset.timeAtmosphere,'evening');assert.equal(JSON.stringify(s),before);
 h.get('time-notice').hidden=true;ui.render();assert.equal(h.get('time-notice').hidden,true);
 s.campaign_id='two';s.gameState.time='05:00';ui.render();assert.equal(h.get('time-notice').hidden,true);h.game.dataset.title='active';ui.render();assert.equal(h.get('background').dataset.timeAtmosphere,'neutral');
 }finally{h.close();}
});
