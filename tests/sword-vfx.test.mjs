import test from 'node:test';
import assert from 'node:assert/strict';
import {swordProfiles,swordTiming,swordFrame,swordFallbackSVG,createSwordRenderer} from '../web/sword-vfx.js';
import {engineData} from '../web/engine-data.js';
test('30 canonical sword skills have named blade presentations, no arrowheads, and no changed mechanics',()=>{
 const books=engineData.books.filter(b=>b.category==='sword_manual');assert.equal(books.length,30);assert.deepEqual(books.map(b=>b.skill_id).sort(),Object.keys(swordProfiles).sort());
 assert.equal(swordProfiles.skill_swd_002.form,'pierce');assert.equal(swordProfiles.skill_swd_008.count,2);assert.equal(swordProfiles.skill_swd_022.form,'meteor');assert.equal(swordProfiles.skill_swd_026.form,'flash');assert.equal(swordProfiles.skill_swd_030.count,1);
 for(const p of Object.values(swordProfiles)){const before=JSON.stringify(p),svg=swordFallbackSVG(p);assert.doesNotMatch(svg,/marker|arrow|NaN|undefined|V\d+L/);assert.equal(swordFrame(p,0).flash,0);assert.equal(swordFrame(p,1).trails.length,0);assert.equal(JSON.stringify(p),before);}
});
test('double blade trails stagger; preparation and guarding never pretend to cause impacts',()=>{
 const p=swordProfiles.skill_swd_008,hit=swordTiming(p).impact;
 assert.equal(swordFrame(p,hit+.02).trails.length,1);assert.equal(swordFrame(p,hit+.18).trails.length,2);
 for(const id of ['003','004','006','009','010','016','021','023','024','029']){const f=swordFrame(swordProfiles['skill_swd_'+id],.5);assert.equal(f.support,true);assert.equal(f.flash,0);}
});
test('every sword form renders finite coordinates at target anchors with bounded work and safe clearing',()=>{
 let draws=0;const ctx=Object.fromEntries(['setTransform','clearRect','beginPath','moveTo','lineTo','closePath','fill','stroke','ellipse'].map(op=>[op,(...args)=>{for(const n of args)assert.ok(Number.isFinite(n));if(op==='fill'||op==='stroke')draws++;}]));
 const r=createSwordRenderer({getContext:()=>ctx});r.resize(1200,720,2);
 for(const p of Object.values(swordProfiles))for(const t of [0,.2,.32,.4,.5,.7,.9,1])r.draw(p,t,{targetX:750,targetY:250});
 assert.ok(draws>100);assert.ok(draws<10000);r.clear();assert.equal(ctx.globalAlpha,1);assert.equal(ctx.globalCompositeOperation,'source-over');
});
