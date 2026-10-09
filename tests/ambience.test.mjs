import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sceneAmbience,createAmbience,ambienceTracks,normalizeAmbiencePreferences} from '../web/ambience.js';
import {locationArt} from '../web/location-art.js';
import {normalize} from '../web/state.js';
const state=(background,place='',time='낮')=>({scene:{background_id:background,location:place,time},gameState:{time},region:'E1',mapView:'east'});
test('actual place and canonical game clock drive ambience, never map browsing',()=>{
 assert.equal(sceneAmbience(state('sunny_village_day','솔브린 마을','08:00')),'villageDay');
 assert.equal(sceneAmbience(state('sunny_village_day','솔브린 마을','23:00')),'villageNight');
 const s=state('sunny_village_day','솔브린 마을','낮');s.scene.time='';s.gameState.time='23:00';assert.equal(sceneAmbience(s),'villageNight');
 s.scene.game_state={time:'08:00'};assert.equal(sceneAmbience(s),'villageDay');
 for(const region of ['W1','S1','wild']){s.region=region;assert.equal(sceneAmbience(s),'villageDay');}
 const pairs={'IMG-SHARED-01':'inn','IMG-SHARED-04':'forestDay','IMG-SHARED-05':'border','IMG-SHARED-06':'camp','IMG-SHARED-07':'mountain','IMG-SHARED-08':'rain','IMG-SHARED-09':'royal','IMG-SHARED-10':'city'};
 for(const [id,expected] of Object.entries(pairs))assert.equal(sceneAmbience(state(id)),expected);
 assert.equal(sceneAmbience(state(null,'극동 지역')),'farEast');assert.equal(sceneAmbience(state(null,'미탐색 지역')),'unexplored');
 assert.equal(sceneAmbience(state('IMG-SHARED-04','','밤')),'forestNight');
});
test('all registered usable backgrounds route to shipped ambience, including 13 lordships and dungeon zones',()=>{
 for(const art of locationArt.filter(a=>a.id!=='IMG-SHARED-11'&&!a.optional))for(const time of ['낮','밤'])assert.ok(ambienceTracks[sceneAmbience(state(art.id,art.name,time))],art.id);
 const pairs={W1:'mountain',W2:'city',W3:'villageDay',W4:'border',W5:'city',E1:'mountain',E2:'workshop',E3:'border',E4:'mountain',S1:'coast',S2:'border',S3:'coast',S4:'villageDay'};
 for(const [region,expected] of Object.entries(pairs))assert.equal(sceneAmbience(state('IMG-'+region+'-HUB')),expected);
 for(const art of locationArt.filter(a=>a.category==='dungeon_zone'&&!a.optional))assert.equal(sceneAmbience(state(art.id,art.name)),'dungeon');
});
test('ambience preferences survive whole-save normalization without changing version-1 data',()=>{
 assert.deepEqual(normalizeAmbiencePreferences({enabled:false,volume:99}),{enabled:false,volume:.5});
 const saved=normalize({version:1,gameState:{place:'솔브린 마을'},uiPreferences:{ambience:{enabled:false,volume:.13}}});assert.deepEqual(saved.uiPreferences.ambience,{enabled:false,volume:.13});assert.equal(saved.gameState.place,'솔브린 마을');assert.equal(normalize({version:1}).uiPreferences,undefined);
});
function fixture(fetchAudio=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
 const sources=[],param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
 const ctx={currentTime:0,destination:{},resume:async()=>{},createGain:()=>({gain:param(),connect(){},disconnect(){}}),decodeAudioData:async()=>({duration:32}),createBufferSource:()=>{const s={connect(){},disconnect(){},start(t){s.time=t;},stop(t){s.stopped=t;}};sources.push(s);return s;}};
 return {audio:createAmbience({contextFactory:()=>ctx,fetchAudio}),sources,ctx};
}
test('ambient loops overlap, repeated sync survives and stopping cancels pending loads/activation',async()=>{
 const f=fixture();await f.audio.select('forestNight');assert.equal(f.sources.length,0);await f.audio.enable();assert.equal(f.sources[1].time,30.8);await f.audio.select('forestNight');f.sources[0].onended();assert.equal(f.sources[2].time,61.6);
 await f.audio.select('royal');assert.equal(f.audio.status().active,'royal');assert.ok(f.sources[1].stopped>0);f.audio.pause();const count=f.sources.length;f.sources.at(-1).onended();assert.equal(f.sources.length,count);
 let finish;const pending=fixture(()=>new Promise(r=>finish=r));const enabled=pending.audio.enable();await Promise.resolve();await Promise.resolve();pending.audio.pause();finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await enabled;assert.equal(pending.sources.length,0);
 let resume;const late=fixture();late.ctx.resume=()=>new Promise(r=>resume=r);const start=late.audio.enable();late.audio.pause();resume();await start;assert.equal(late.sources.length,0);
});
test('all 17 loop assets and external source provenance exist',async()=>{
 assert.equal(Object.keys(ambienceTracks).length,17);const manifest=JSON.parse(await readFile(new URL('../integration/audio-assets.json',import.meta.url)));
 for(const t of Object.values(ambienceTracks)){assert.ok(manifest.includes(t.path));const bytes=await readFile(new URL('../'+t.path,import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'OggS');assert.ok(bytes.length>10000);}
 const credits=JSON.parse(await readFile(new URL('../assets/audio/ambience/sources.json',import.meta.url)));assert.equal(credits.sources.length,9);assert.ok(credits.sources.every(s=>s.license==='CC0-1.0'&&s.sha256.length===64));
});
