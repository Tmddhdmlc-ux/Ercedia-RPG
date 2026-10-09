import test from 'node:test';
import assert from 'node:assert/strict';
import {battleCommentary,dialogueVoice} from '../web/battle-presentation.js';
import {mountBattleUI} from '../web/battle-ui.js';
import {battleFixture} from './battle-fixtures.js';
import {uiHarness} from './ui-harness.mjs';

test('presentation removes resource announcements while preserving original actions and numbered skills',()=>{
  assert.equal(battleCommentary('화염이 번진다! 주인공에게 28 피해, 상대 MP 7 소모!'),'화염이 번진다!');
  assert.equal(battleCommentary('제2식! 검을 휘두른다!'),'제2식! 검을 휘두른다!');
  assert.equal(battleCommentary('HP 71/100!'),'공방이 이어진다.');
  assert.equal(dialogueVoice('세린'),'character');
  assert.equal(dialogueVoice('나레이션'),'narration');
});

test('centered skill precedes impact, target damage and MP synchronize, skip and replay settle only once',()=>{
  const h=uiHarness(),f=battleFixture('unique'),original=JSON.stringify(f.scene);let ui,commits=0;
  try{
    ui=mountBattleUI(f.state,{render:()=>ui.render(),persist(){},chat:{controls(){},isPending(){return false;},apply(){commits++;}},assetBase:'/'});
    ui.start(f.scene);
    assert.equal(h.get('battle-cutin').hidden,false);
    assert.equal(h.get('battle-cutin').textContent,'검증용 고유능력');
    const player=h.get('battle-hud').children[0];
    assert.equal(player.children[5].value,100);
    const damage=h.get('battle-right').children.find(n=>n.className==='battle-number');
    assert.equal(damage.textContent,'');
    h.clock(1);h.clock(901);
    assert.equal(damage.textContent,'-30');
    assert.equal(player.children[5].value,90);
    h.get('battle-pause').onclick();h.clock(10001);
    assert.equal(h.get('battle-cutin').hidden,false);
    h.get('battle-pause').onclick();h.clock(10002);h.clock(12002);
    assert.equal(h.get('battle-cutin').hidden,true);
    assert.equal(h.get('battle-next').disabled,false);
    h.get('battle-skip').onclick();h.get('battle-skip').onclick();
    assert.equal(commits,1);
    h.get('battle-replay').onclick();h.get('battle-skip').onclick();
    assert.equal(commits,1);
    assert.equal(JSON.stringify(f.scene),original);
  }finally{h.close();}
});

test('damage to the invisible player appears on the player HUD at impact',()=>{
  const h=uiHarness(),f=battleFixture();let ui;
  try{
    ui=mountBattleUI(f.state,{render:()=>ui.render(),persist(){},chat:{controls(){},isPending(){return false;},apply(){}},assetBase:'/'});
    ui.start(f.scene);
    for(let i=0;i<3;i++){h.clock(i*2000+1);h.clock(i*2000+1501);ui.next();}
    const player=h.get('battle-hud').children[0];
    h.clock(6001);h.clock(6801);
    assert.equal(h.get('battle-left').hidden,true);
    assert.equal(player.children.at(-1).textContent,'-28');
    assert.equal(player.children[3].value,72);
    assert.equal(h.get('battle-hud').children[1].children[5].value,93);
    assert.equal(h.get('line').textContent,'화염이 번진다!');
  }finally{h.close();}
});
