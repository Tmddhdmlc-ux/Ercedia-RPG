import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ultimateFrame,ultimateDuration,ultimateImpact} from './serin-ultimate-timeline.js';
test('ultimate timeline orders face, full art, one impact and return with stable seeking',()=>{
 for(const [time,phase] of [[0,'prepare'],[350,'face'],[1099,'face'],[1100,'full'],[2399,'full'],[2400,'impact'],[2750,'return'],[3800,'done']])assert.equal(ultimateFrame(time).phase,phase);
 assert.equal(ultimateImpact,2400);assert.equal(ultimateDuration,3800);
 for(let t=0;t<=3800;t+=20){const a=ultimateFrame(t);assert.deepEqual(a,ultimateFrame(t));for(const k of ['faceOpacity','fullOpacity','flash'])assert.ok(a[k]>=0&&a[k]<=1);assert.ok(Number.isFinite(a.zoom)&&Number.isFinite(a.shake));}
 assert.equal(ultimateFrame(-1).phase,'prepare');assert.equal(ultimateFrame(99999).done,true);
});
test('reduced presentation has no shake or zoom and a subdued flash',()=>{
 for(let t=0;t<=3800;t+=20){const f=ultimateFrame(t,true);assert.equal(f.shake,0);assert.equal(f.zoom,1);assert.ok(f.flash<=.16);}
});
test('preview uses the selected opaque illustration, preserves original art and has no save or bridge side effects',async()=>{
 const path=new URL('../assets/characters/main/serin/cutins/drafts/ultimate-flash-v1.png',import.meta.url),png=await readFile(path);assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.readUInt32BE(16)>1000);assert.ok(png.readUInt32BE(20)>700);
 const script=await readFile(new URL('./serin-ultimate-preview.js',import.meta.url),'utf8');assert.doesNotMatch(script,/localStorage|postMessage|saveGame|fetch\(/);assert.match(script,/elapsed>=ultimateImpact/);assert.match(script,/audio.stop/);assert.match(script,/visibilitychange/);
});
