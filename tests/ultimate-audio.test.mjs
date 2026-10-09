import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createUltimateAudio,ultimateAudioCues,ultimateSamplePaths} from '../web/ultimate-audio.js';
import {ultimateDuration,ultimateImpact} from './serin-ultimate-timeline.js';
function fixture(fetchAudio=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
 const sources=[],param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
 const ctx={state:'suspended',currentTime:0,destination:{},resume:async()=>{ctx.state='running';},createGain:()=>({gain:param(),connect(){},disconnect(){}}),createDynamicsCompressor:()=>({threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}}),decodeAudioData:async()=>({duration:1.5}),createBufferSource:()=>{const s={connect(){},disconnect(){},start(...args){s.args=args;},stop(){s.stopped=true;}};sources.push(s);return s;}};
 return {audio:createUltimateAudio({contextFactory:()=>ctx,fetchAudio}),sources,ctx};
}
test('seven cinematic cues align to the approved phases and exactly one adjudication-free strike',async()=>{
 assert.equal(ultimateAudioCues.find(c=>c.id==='strike').at,ultimateImpact);assert.equal(ultimateAudioCues.at(-1).end,ultimateDuration);assert.equal(ultimateAudioCues.filter(c=>c.id==='strike').length,1);
 const f=fixture();await f.audio.unlock();f.audio.reset();for(let t=0;t<5000;t+=10){f.audio.advance(t);f.audio.advance(t);}
 assert.equal(f.audio.status().played,7);assert.equal(f.audio.status().lastCue,'afterglow');assert.ok(f.audio.status().active<=4);f.audio.advance(5000);assert.equal(f.audio.status().active,0);assert.ok(f.sources.every(s=>s.stopped));
});
test('pause cancels all layers; resume restores sustained light without repeating the attack',async()=>{
 const f=fixture();await f.audio.unlock();f.audio.advance(0);f.audio.advance(1800);f.audio.stop();const before=f.audio.status().played;f.audio.resume(1900);assert.ok(f.audio.status().played>before);assert.ok(f.sources.at(-1).args[1]>0);
 f.audio.advance(3450);f.audio.stop();const struck=f.audio.status().played;f.audio.resume(3500);assert.equal(f.audio.status().played,struck);f.audio.advance(3500);assert.equal(f.audio.status().played,struck);
 f.audio.reset();f.audio.advance(0);assert.equal(f.audio.status().played,1);
});
test('speed clips cue tails to the phase boundary while keeping natural playback pitch',async()=>{
 const f=fixture();await f.audio.unlock();f.audio.advance(0,{speed:2});assert.equal(f.sources[0].args[2],.225);assert.equal(f.sources[0].playbackRate,undefined);
 f.audio.stop();f.audio.advance(5000);assert.equal(f.audio.status().active,0);
});
test('muted, zero-volume and late loading never queue an abandoned cinematic',async()=>{
 const ready=fixture();await ready.audio.unlock();ready.audio.reset();ready.audio.setMuted(true);ready.audio.advance(0);ready.audio.setMuted(false);ready.audio.advance(0);assert.equal(ready.sources.length,0);ready.audio.setVolume(0);ready.audio.advance(450);assert.equal(ready.sources.length,0);ready.audio.setVolume(.7);ready.audio.advance(450);assert.equal(ready.sources.length,0);
 const resolves=[];const pending=fixture(()=>new Promise(r=>resolves.push(r)));const start=pending.audio.unlock();await Promise.resolve();await Promise.resolve();pending.audio.stop();for(const resolve of resolves)resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await start;assert.equal(pending.sources.length,0);
});
test('failed cinematic loads are retryable and cannot stop visual playback',async()=>{
 let ok=false;const f=fixture(async()=>({ok,arrayBuffer:async()=>new ArrayBuffer(8)}));assert.equal(await f.audio.unlock(),false);assert.equal(f.audio.status().error,true);ok=true;assert.equal(await f.audio.unlock(),true);f.audio.reset();f.audio.advance(0);assert.equal(f.audio.status().played,1);
});
test('cutscene cues are registered real Ogg files with CC0 provenance',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../integration/audio-assets.json',import.meta.url)));for(const path of ultimateSamplePaths){assert.ok(manifest.includes(path));const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'OggS');assert.ok(bytes.length>3000);}
 const credits=JSON.parse(await readFile(new URL('../assets/audio/ultimate/recipes.json',import.meta.url)));assert.equal(credits.license,'CC0-1.0');assert.equal(credits.sources.length,5);
 const script=await readFile(new URL('./serin-ultimate-preview.js',import.meta.url),'utf8');assert.match(script,/ticket!==runRevision/);assert.match(script,/audio\.advance\(elapsed/);assert.doesNotMatch(script,/audio\.play\(/);
});
