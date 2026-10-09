import test from 'node:test';
import assert from 'node:assert/strict';
import {engineData} from '../web/engine-data.js';
import {battleEffectProfile,battleEffectTiming,mountBattleVFX} from '../web/battle-vfx.js';
import {uiHarness} from './ui-harness.mjs';
test('all canonical skills route through shared production effects without changing combat data',()=>{
 for(const b of engineData.books){const e={kind:b.category==='spellbook'?'magic':'attack',skill_id:b.skill_id,element:b.element,damage:24},before=JSON.stringify(e),p=battleEffectProfile(e),t=battleEffectTiming(e);assert.ok(p.shape);assert.ok(t.duration*t.impact>0);if(b.category==='spellbook'){assert.ok(p.form);assert.equal(p.magic,true);}assert.equal(JSON.stringify(e),before);}
 assert.equal(battleEffectProfile({kind:'magic',element:'electric'}).element,'electricity');
 assert.equal(battleEffectProfile({kind:'magic',element:'dark'}).element,'darkness');
 assert.ok(battleEffectTiming({kind:'magic',element:'electric'}).duration<2600);
});
test('misses suppress hit contours and clear removes both layers without canvas support',()=>{
 const h=uiHarness();try{const stage=h.get('stage'),fx=mountBattleVFX(stage),[canvas,vector]=stage.children;fx.start({kind:'magic',element:'fire',result:'dodge',damage:0},null);fx.draw(.6);assert.equal(vector.style.opacity,0);fx.clear();assert.equal(canvas.hidden,true);assert.equal(vector.hidden,true);}finally{h.close();}
});
