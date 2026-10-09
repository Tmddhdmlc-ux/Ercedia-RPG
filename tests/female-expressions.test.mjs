import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {characterVisual,registeredArt} from '../web/character-art.js';
import {normalizeScene} from '../web/scene.js';
import {castFrame,mountSceneCast} from '../web/scene-cast.js';
import {defaults,normalize} from '../web/state.js';
import {uiHarness} from './ui-harness.mjs';
import {battleFixture} from './battle-fixtures.js';
import {normalizeBattle} from '../web/battle-model.js';
const plan=JSON.parse(readFileSync('assets/characters/expressions/female-plan.json'));
test('battle accepts a woman’s registered expressions and rejects unavailable or borrowed art',()=>{
  const p=plan.characters[0],battle=battleFixture().scene.battle;
  const ally=structuredClone(battle.participants[0]);ally.id=p.id;ally.name=p.name;ally.role='npc';ally.art={id:p.id,outfit:'none',emotion:'angry'};
  battle.participants.push(ally);battle.outcome.resources.push({id:p.id,hp:100,mp:100});
  for(const emotion of plan.expressions){ally.art.emotion=emotion;assert.equal(normalizeBattle(battle).participants[2].art.emotion,emotion);}
  ally.art.emotion='afraid';assert.throws(()=>normalizeBattle(battle),/미등록/);
  ally.art={id:plan.characters[1].id,outfit:'none',emotion:'smile'};assert.throws(()=>normalizeBattle(battle),/다른 인물/);
});
test('all 55 registered female NPCs have five real staged expression images',()=>{
  const staged=JSON.parse(readFileSync('integration/assets.json'));
  assert.equal(plan.characters.length,55);
  for(const p of plan.characters){
    const art=registeredArt[p.id];assert.deepEqual(art.expressions,['base',...plan.expressions]);
    assert.equal(characterVisual(p.id,'none','base').path,art.portrait);
    for(const emotion of plan.expressions){
      const path=art.expression_portraits[emotion];assert.ok(existsSync(path));assert.ok(staged.includes(path));
      assert.notEqual(path,art.portrait);assert.equal(characterVisual(p.id,'none',emotion).path,path);
      const png=readFileSync(path);assert.equal(png.readUInt32BE(16),readFileSync(art.portrait).readUInt32BE(16));assert.equal(png.readUInt32BE(20),readFileSync(art.portrait).readUInt32BE(20));
    }
  }
  assert.equal(characterVisual('ER-NPC-001','none','smile'),null);
});
test('two women switch independent dialogue expressions and reconstruct them when going backward',()=>{
  const people=plan.characters.slice(0,2),cast=people.map(p=>({id:p.id,speaker:p.name,outfit:'none',emotion:'base'}));
  const scene=normalizeScene({schema_version:1,type:'ercedia_scene',scene_id:'female-dialogue',location:'등록 거점',time:'오후',background_id:null,npc:cast[0],cast,dialogue:[{speaker:people[0].name,speaker_id:people[0].id,text:'반가워요.',emotion:'smile'},{speaker:people[1].name,speaker_id:people[1].id,text:'무슨 일이죠?',emotion:'surprised'},{speaker:people[0].name,speaker_id:people[0].id,text:'그건 부당해요.',emotion:'angry'}],choices:[]});
  assert.deepEqual(castFrame(scene,2).map(p=>p.emotion),['angry','surprised']);
  assert.deepEqual(castFrame(scene,0).map(p=>p.emotion),['smile','base']);
  const state=defaults();state.scene=scene;state.sceneIndex=2;assert.deepEqual(normalize(state).scene,scene);
  const h=uiHarness();try{
    state.character=true;const renderer=mountSceneCast(state,{assetBase:'/',onSelect(){}});renderer.render();
    const slots=h.get('scene-cast').children;
    assert.ok(slots[0].children[0].children[0].src.endsWith('/angry.png'));
    assert.ok(slots[1].children[0].children[0].src.endsWith('/surprised.png'));
    state.sceneIndex=0;renderer.render();assert.ok(slots[0].children[0].children[0].src.endsWith('/smile.png'));
    assert.ok(slots[1].children[0].children[0].src.endsWith('/base.png'));
  }finally{h.close();}
});
