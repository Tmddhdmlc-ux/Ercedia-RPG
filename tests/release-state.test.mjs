import test from 'node:test';
import assert from 'node:assert/strict';
import {sameReleaseState,releaseStateDifferences} from '../web/release-state.js';
import {defaults,normalize} from '../web/state.js';
import {emptyWorld} from '../web/world-engine.js';
import {readFileSync} from 'node:fs';

test('updating a legacy save permits zero wallet initialization and currency alias migration',()=>{
  const before=defaults();
  assert.equal(sameReleaseState(before,{...before,wallet_copper:0}),true);
  assert.equal(sameReleaseState(before,JSON.parse(JSON.stringify(normalize(before)))),true);
  before.currency=12345;
  assert.notEqual(JSON.stringify(before),JSON.stringify(normalize(before)));
  assert.equal(sameReleaseState(before,JSON.parse(JSON.stringify(normalize(before)))),true);
});
test('2.1.8 world save migrates empty economic records and retains real reputation, party and calendar',()=>{
  const before={...defaults(),currency:450,world_engine:emptyWorld()};
  delete before.world_engine.shops;delete before.world_engine.trade_ids;
  before.world_engine.calendar.date='1-1-2';before.world_engine.kingdom_reputation.west=25;
  const after=JSON.parse(JSON.stringify(normalize(before)));
  assert.equal(sameReleaseState(before,after),true);
  for(const mutate of [s=>s.world_engine.kingdom_reputation.west++,s=>s.world_engine.shops.shop={stock:1},s=>s.world_engine.cash_sources.extra=500,s=>s.world_engine.market_changes.push({id:'extra'})]){
    const changed=structuredClone(after);mutate(changed);assert.equal(sameReleaseState(before,changed),false);
  }
});
test('legacy offer and escrow migrations preserve stocks, prices, funds and auction ownership',()=>{
  const before={...defaults(),currency:450,world_engine:emptyWorld()};
  delete before.world_engine.shops;delete before.world_engine.trade_ids;
  before.world_engine.offers.old={id:'old',venue_id:'village',items:[{id:'ER-EQ-001',stock:2,buy_price:100,sell_price:20}]};
  before.world_engine.auctions.old={id:'old',reserve:10,bid:30,escrow:30,status:'open'};
  const after=JSON.parse(JSON.stringify(normalize(before)));
  assert.equal(sameReleaseState(before,after),true);
  for(const mutate of [s=>s.world_engine.offers.old.items[0].stock--,s=>s.world_engine.auctions.old.highest_escrow++,s=>s.world_engine.merchants['merchant:village'].wallet_copper=1]){
    const changed=structuredClone(after);mutate(changed);assert.equal(sameReleaseState(before,changed),false);
  }
});
test('migration errors expose paths without save values',()=>{
  assert.equal(releaseStateDifferences({player:{hp:100,name:'비밀'}},{player:{hp:30,name:'숨김'}}),'player.hp, player.name');
});
test('launcher distinguishes downloaded and active releases without synchronizing an unapplied release',()=>{
  const source=readFileSync(new URL('../tampermonkey/host.template.js',import.meta.url),'utf8');
  const prepared=source.slice(source.indexOf('if(commit.sha===prepared?.sha)'),source.indexOf('if(commit.sha===active?.release.sha)'));
  assert.match(prepared,/update.hidden=false/);
  assert.match(prepared,/다운로드 완료/);
  assert.doesNotMatch(prepared,/send\('sync-settings'/);
  assert.match(source,/snapshot&&!sameReleaseState\(snapshot,restored.state\)/);
});
test('release migration rejects changed balances, player records, scenes, inventory and unknown fields',()=>{
  const before={...defaults(),currency:321,campaign_id:'preserved',scene:null,inventory:[{name:'검',quantity:1}]};
  const after={...before,wallet_copper:321};delete after.currency;
  assert.equal(sameReleaseState(before,after),true);
  for(const modify of [s=>s.wallet_copper++,s=>s.player.hp=32,s=>s.scene={scene_id:'different'},s=>s.inventory[0].quantity++,s=>delete s.campaign_id,s=>s.unexpected='extra']){
    const changed=structuredClone(after);modify(changed);assert.equal(sameReleaseState(before,changed),false);
  }
  assert.equal(sameReleaseState({...before,currency:-1},after),false);
  assert.equal(sameReleaseState(before,{...after,version:2}),false);
});


test('launcher update, rollback and latest-version checks never initiate settings registration',()=>{
 const source=readFileSync(new URL('../tampermonkey/host.template.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/send\('sync-settings'/);
});
