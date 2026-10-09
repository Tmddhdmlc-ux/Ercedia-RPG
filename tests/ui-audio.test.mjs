import test from 'node:test';
import assert from 'node:assert/strict';
import {createUIAudio,uiSoundTarget,mountUIAudio} from '../web/ui-audio.js';
function fixture(){
  let time=0;const sources=[];
  const ctx={state:'suspended',destination:{},resume:async()=>{ctx.state='running';},decodeAudioData:async()=>({}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),createBufferSource:()=>{const s={playbackRate:{value:1},connect(){},disconnect(){},start(){s.started=true;},stop(){s.stopped=true;}};sources.push(s);return s;}};
  const audio=createUIAudio({contextFactory:()=>ctx,now:()=>time,fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}),storage:()=>({getItem(){},setItem(){}})});
  return {audio,sources,time(value){time=value;}};
}
test('hover waits for a trusted activation, rapid hovers throttle and a click replaces the hover',async()=>{
  const f=fixture();await f.audio.prepare();assert.equal(f.audio.play('hover'),false);await f.audio.unlock();
  assert.equal(f.audio.play('hover'),true);f.time(50);assert.equal(f.audio.play('hover'),false);assert.equal(f.sources.length,1);
  assert.equal(f.audio.play('click'),true);assert.equal(f.sources[0].stopped,true);f.time(60);assert.equal(f.audio.play('click'),false);
  f.audio.setMuted(true);assert.equal(f.sources[1].stopped,true);assert.equal(f.audio.play('hover'),false);assert.equal(await f.audio.unlock(),false);
});
test('child-to-child moves and disabled controls do not create a hover sound',()=>{
  const child={},control={matches:()=>false,closest:()=>null,contains:v=>v===child};
  const target={closest:()=>control};assert.equal(uiSoundTarget(target),control);assert.equal(uiSoundTarget(target,child),null);
  control.matches=()=>true;assert.equal(uiSoundTarget(target),null);assert.equal(uiSoundTarget(null),null);
});
test('failed UI audio remains nonfatal and retryable',async()=>{
  const audio=createUIAudio({contextFactory:()=>{throw Error('Unsupported');},storage:()=>{throw Error('Sandbox');}});
  assert.equal(await audio.prepare(),false);assert.equal(await audio.unlock(),false);assert.equal(audio.play('click'),false);assert.equal(audio.status().error,true);
});

test('legacy mute preferences do not silence the default UI and the title gets no toggle',()=>{
 const audio=createUIAudio({storage:()=>({getItem:()=> 'true'})});assert.equal(audio.status().muted,false);
 const hosts={'.title-menu':{append(){throw Error('title toggle must not be created');}},'.tabs':{append(){}}},root={dataset:{},querySelector:k=>hosts[k],addEventListener(){}};
 const old=globalThis.document;globalThis.document={createElement:()=>({setAttribute(){}}),addEventListener(){}};
 try{mountUIAudio(root,{audioFactory:()=>({status:()=>({muted:false}),prepare:async()=>true})});}finally{globalThis.document=old;}
});
