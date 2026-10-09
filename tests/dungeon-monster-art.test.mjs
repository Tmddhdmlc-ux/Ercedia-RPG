import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dungeonMonsterArt} from '../web/dungeon-monster-art-data.js';
import {dungeonEncounters} from '../web/dungeon-encounter-data.js';
import {battleCharacterVisual} from '../web/dungeon-monster-art.js';
import {characterVisual} from '../web/character-art.js';
import {mountBattleUI} from '../web/battle-ui.js';
import {battleFixture} from './battle-fixtures.js';
import {uiHarness} from './ui-harness.mjs';
import {characterMetrics,fitCharacter} from '../web/character-layout.js';
const actor=p=>({role:'monster',catalog_id:p.base_monster_id,dungeon_foe_id:p.id,art:{id:p.base_monster_id,outfit:'none',emotion:'base'}});
test('all 52 dungeon foes have separate staged RGBA portraits tied to their original species',()=>{
  const assets=JSON.parse(readFileSync('integration/assets.json'));
  assert.equal(Object.keys(dungeonMonsterArt.characters).length,52);
  const hashes=new Set();
  for(const p of dungeonEncounters.profiles){
    const a=dungeonMonsterArt.characters[p.id];assert.equal(a.base_monster_id,p.base_monster_id);assert.ok(assets.includes(a.portrait));
    const png=readFileSync(a.portrait);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6);
    assert.equal(png.readUInt32BE(16),a.width);assert.equal(png.readUInt32BE(20),a.height);
    assert.equal(createHash('sha256').update(png).digest('hex'),a.sha256);hashes.add(a.sha256);
    assert.equal(battleCharacterVisual(actor(p)).path,a.portrait);
    assert.notEqual(a.portrait,characterVisual(p.base_monster_id).path);
    const metrics=characterMetrics(p.base_monster_id,battleCharacterVisual(actor(p)));
    assert.equal(metrics.width,a.width);assert.equal(metrics.height,a.height);
    for(const [width,height] of [[1367,794],[390,560],[844,240]]){
      const fit=fitCharacter(metrics,width,height,{mode:'battle'}),[x0,y0,x1,y1]=metrics.bounds;
      assert.ok(fit.left+x0*fit.scale>=width*.05-1e-6,p.id);
      assert.ok(fit.left+x1*fit.scale<=width*.95+1e-6,p.id);
      assert.ok(fit.top+y0*fit.scale>=height*.04-1e-6,p.id);
      assert.ok(fit.top+y1*fit.scale<=height+1e-6,p.id);
    }
  }
  assert.equal(hashes.size,52);
});
test('ordinary monsters and legacy battles retain species art; another species cannot borrow boss art',()=>{
  const p=dungeonEncounters.profiles[0],a=actor(p),base=characterVisual(p.base_monster_id);
  delete a.dungeon_foe_id;assert.deepEqual(battleCharacterVisual(a),base);
  a.dungeon_foe_id='unregistered';assert.deepEqual(battleCharacterVisual(a),base);
  a.dungeon_foe_id=p.id;a.catalog_id='ER-NPC-082';a.art.id=a.catalog_id;assert.deepEqual(battleCharacterVisual(a),characterVisual(a.catalog_id));
  a.catalog_id=p.base_monster_id;a.art.id=p.base_monster_id;a.role='npc';assert.deepEqual(battleCharacterVisual(a),base);
  a.art=null;assert.equal(battleCharacterVisual(a),null);
});
test('the actual battle renderer loads dedicated portraits without a Serin face layer',()=>{
  for(const p of dungeonEncounters.profiles){
    const h=uiHarness();try{
      const {state,scene}=battleFixture('dungeon');
      Object.assign(scene.battle.participants[1],actor(p),{name:p.name});
      state.battlePlayback={scene,index:0,speed:1,paused:false,done:false,replay:false,manual:true};
      const ui=mountBattleUI(state,{render(){},persist(){},chat:{isPending:()=>false,controls(){}},assetBase:'/'});ui.render();
      const [body,face]=h.get('battle-right').children[0].children;
      assert.equal(body.src,'/'+dungeonMonsterArt.characters[p.id].portrait);assert.equal(face.hidden,true);
      body.onerror();assert.equal(h.get('battle-right').children[1].hidden,false);
    }finally{h.close();}
  }
});
