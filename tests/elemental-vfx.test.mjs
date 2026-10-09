import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {elementalSamples,palettes,createElementalRenderer,sampleTiming} from './elemental-vfx-renderer.js';
const {books}=JSON.parse(await readFile(new URL('../items/book_catalog_70.json',import.meta.url),'utf8'));
test('approval preview contains exactly two canonical skills per element and twelve distinct forms',()=>{
 assert.equal(elementalSamples.length,12);assert.equal(new Set(elementalSamples.map(s=>s.form)).size,12);
 for(const element of Object.keys(palettes))assert.equal(elementalSamples.filter(s=>s.element===element).length,2);
 for(const s of elementalSamples)assert.equal(books.find(b=>b.skill_id===s.id)?.element,s.element);
 for(const id of ['spell_012','spell_017','spell_035'])assert.equal(elementalSamples.find(s=>s.id===id).damage,0);
});
test('revised samples strike quickly; approved electricity and darkness retain their exact rendering',()=>{
 let commands=[];const ctx=Object.fromEntries(['setTransform','clearRect','fillRect','drawImage','beginPath','moveTo','lineTo','stroke','closePath','fill','ellipse','arc'].map(op=>[op,(...args)=>commands.push([op,...args])]));ctx.createRadialGradient=()=>({addColorStop(){}});
 const canvas=()=>({getContext:()=>ctx}),renderer=createElementalRenderer(canvas(),{createCanvas:canvas});renderer.resize(1000,600);
 const frame=(s,t,revised)=>{renderer.draw(s,t,{revised});commands=[];renderer.draw(s,t,{revised});return commands.slice();};
 for(const s of elementalSamples){const old=sampleTiming(s,false),now=sampleTiming(s,true);if(['electricity','darkness'].includes(s.element)){assert.deepEqual(now,old);for(const t of [.25,.5,.8])assert.deepEqual(frame(s,t,true),frame(s,t,false));}else{assert.ok(now.duration*now.impact<old.duration*old.impact);assert.notDeepEqual(frame(s,.5,true),frame(s,.5,false));}}
});
test('all twelve effects render throughout the timeline, reuse bounded textures and clear safely',()=>{
 let drawings=0,created=0;const operations=['setTransform','clearRect','fillRect','drawImage','beginPath','moveTo','lineTo','stroke','closePath','fill','ellipse','arc'];
 const ctx=Object.fromEntries(operations.map(op=>[op,(...args)=>{if(op!=='drawImage')for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),op+' non-finite coordinate');if(op==='drawImage')drawings++;}]));
 ctx.createRadialGradient=()=>({addColorStop(){}});
 const canvas=()=>({getContext:()=>ctx}),renderer=createElementalRenderer(canvas(),{createCanvas:()=>{created++;return canvas();}});
 renderer.resize(1280,700,2);for(let loop=0;loop<2;loop++)for(const s of elementalSamples)for(const t of [0,.12,.2,.35,.42,.5,.65,.8,.99,1])renderer.draw(s,t);
 assert.ok(drawings>1000);assert.equal(renderer.cacheStats().populations,12);assert.ok(created<=21);assert.equal(created,renderer.cacheStats().textures);renderer.clear();
});
