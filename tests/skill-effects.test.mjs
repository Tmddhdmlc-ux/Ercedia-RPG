import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {effectProfiles,elementColors,skillEffectSVG} from './skill-effects-profiles.js';
const {books}=JSON.parse(await readFile(new URL('../items/book_catalog_70.json',import.meta.url),'utf8'));
test('all 70 canonical skills have distinct renderable presentations without changing source values',()=>{
 assert.equal(books.length,70);assert.deepEqual(Object.keys(effectProfiles).sort(),books.map(b=>b.skill_id).sort());
 const signatures=new Set();for(const b of books){const p=effectProfiles[b.skill_id],svg=skillEffectSVG(p);assert.match(svg,/<svg/);assert.match(svg,/<(?:path|circle|ellipse) /);assert.doesNotMatch(svg,/undefined|NaN|script|onload|https:/);signatures.add((elementColors[b.element]||'physical')+svg);}
 assert.equal(signatures.size,70,'No skill should repeat the same geometry and element color');
});
test('same-element skills use different shapes; support proposals never show fake damage',()=>{
 assert.equal(effectProfiles.spell_001.shape,'orb');assert.equal(effectProfiles.spell_031.shape,'rain');assert.equal(effectProfiles.spell_025.shape,'wall');
 assert.equal(effectProfiles.skill_swd_008.variant,2);assert.equal(effectProfiles.skill_swd_019.variant,3);
 for(const id of ['skill_swd_003','spell_006','spell_008','spell_018','spell_025','spell_038'])assert.equal(effectProfiles[id].illustrativeDamage,false);
});
