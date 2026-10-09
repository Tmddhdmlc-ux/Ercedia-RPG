import test from 'node:test';
import assert from 'node:assert/strict';
import {sameReleaseState} from '../web/release-state.js';
import {defaults,normalize} from '../web/state.js';
import {readFileSync} from 'node:fs';

test('updating a legacy save permits zero wallet initialization and currency alias migration',()=>{
  const before=defaults();
  assert.equal(sameReleaseState(before,{...before,wallet_copper:0}),true);
  assert.equal(sameReleaseState(before,JSON.parse(JSON.stringify(normalize(before)))),true);
  before.currency=12345;
  assert.notEqual(JSON.stringify(before),JSON.stringify(normalize(before)));
  assert.equal(sameReleaseState(before,JSON.parse(JSON.stringify(normalize(before)))),true);
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
