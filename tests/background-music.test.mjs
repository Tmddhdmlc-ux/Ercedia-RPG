import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundMusic,sceneMusic,mountBackgroundMusic} from '../web/background-music.js';
test('scene music prioritizes combat and actual places, with game-time night fallback',()=>{
  assert.equal(sceneMusic({battle:true,place:'왕궁',time:'밤'}),'battle');
  assert.equal(sceneMusic({background:'IMG-SHARED-05',time:'밤'}),'border');
  assert.equal(sceneMusic({place:'국왕실'}),'royal');
  assert.equal(sceneMusic({place:'극동 지역'}),'farEast');
  assert.equal(sceneMusic({place:'북중 미개척 원시림'}),'unexplored');
  for(const time of ['밤','심야','새벽','22:30','05:00'])assert.equal(sceneMusic({place:'솔브린 마을',time}),'night');
  assert.equal(sceneMusic({time:'아침 08:30'}),'village');
  assert.equal(sceneMusic({place:'묵은 왕가 납골묘'}),'village');
  assert.equal(sceneMusic({battle:true,title:true,place:'왕궁',time:'밤'}),'title');
});
function fixture(fetchAudio=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
  const sources=[],param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
  const ctx={currentTime:0,state:'suspended',destination:{},resume:async()=>{ctx.state='running';},createGain:()=>({gain:param(),connect(){},disconnect(){}}),decodeAudioData:async()=>({duration:10}),createBufferSource:()=>{const s={connect(){},disconnect(){},start(time){s.time=time;},stop(time){s.stopped=time;}};sources.push(s);return s;}};
  const music=createBackgroundMusic({contextFactory:()=>ctx,fetchAudio});return {music,sources,ctx};
}
test('music needs explicit enable; loops overlap and repeated scene sync keeps loops alive',async()=>{
  const f=fixture();await f.music.select('village');assert.equal(f.sources.length,0);await f.music.enable();assert.equal(f.sources.length,2);assert.equal(f.sources[1].time,8.8);
  await f.music.select('village');f.sources[0].onended();assert.equal(f.sources.length,3);assert.equal(f.sources[2].time,17.6);
  await f.music.select('battle');assert.equal(f.music.status().active,'battle');assert.ok(f.sources[1].stopped>0);const count=f.sources.length;f.music.pause();f.sources.at(-1).onended();assert.equal(f.sources.length,count);assert.equal(f.music.status().enabled,false);
});
test('stale music downloads cannot restart after stop or replace the selected scene',async()=>{
  let finish;const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));const start=f.music.enable();await Promise.resolve();await Promise.resolve();f.music.pause();finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await start;assert.equal(f.sources.length,0);assert.equal(f.music.status().enabled,false);
});
test('music load errors are nonfatal, retry works and volume is capped',async()=>{
  let ok=false;const f=fixture(async()=>({ok,arrayBuffer:async()=>new ArrayBuffer(8)}));assert.equal(await f.music.enable(),false);assert.equal(f.music.status().error,true);ok=true;assert.equal(await f.music.enable(),true);f.music.setVolume(5);assert.equal(f.music.status().volume,.7);
});
test('stopping during audio-context activation cancels the pending start',async()=>{
  const f=fixture();let resume;f.ctx.resume=()=>new Promise(resolve=>{resume=resolve;});const start=f.music.enable();f.music.pause();resume();assert.equal(await start,false);assert.equal(f.music.status().enabled,false);assert.equal(f.sources.length,0);
});

test('music activation survives settings clicks and failed loads, but respects manual mute',()=>{
 const oldDoc=globalThis.document,oldObserver=globalThis.MutationObserver,listeners={};
 globalThis.document={addEventListener:(name,fn)=>listeners[name]=fn};globalThis.MutationObserver=class{observe(){}};
 try{let enabled=false,error=false,calls=0;const root={dataset:{},querySelector:()=>null};
 mountBackgroundMusic(root,{audioFactory:()=>({select(){},status:()=>({enabled,error,loading:false,volume:.22}),enable(){calls++;enabled=true;error=false;}})});
 listeners.pointerdown({isTrusted:true,target:{closest:()=>true}});assert.equal(calls,0);
 const gesture={isTrusted:true,target:{closest:()=>null}};listeners.pointerdown(gesture);assert.equal(calls,1);
 listeners.click(gesture);assert.equal(calls,1);error=true;listeners.click(gesture);assert.equal(calls,2);
 mountBackgroundMusic(root,{storage:{getItem:()=>JSON.stringify({enabled:false})},audioFactory:()=>({select(){},status:()=>({enabled:false,volume:.22}),enable(){throw Error('manual mute');}})});listeners.click(gesture);
 }finally{globalThis.document=oldDoc;globalThis.MutationObserver=oldObserver;}
});
