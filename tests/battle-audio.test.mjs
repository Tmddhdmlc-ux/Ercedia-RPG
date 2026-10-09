import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {skillAudioProfiles,skillSamplePaths} from '../web/skill-audio-profiles.js';
import {engineData} from '../web/engine-data.js';
import {uiSamples} from '../web/ui-audio.js';
import {createBattleAudio,impactCue,impactSamples} from '../web/battle-audio.js';
const hit={kind:'attack',result:'hit',damage:18};
function harness(fetchAudio=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
  const sources=[],saved=new Map();let requests=0;
  const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
  const source=()=>{const s={playbackRate:param(),frequency:param(),connect(){},disconnect(){},start(){s.started=true;},stop(){s.stopped=true;}};sources.push(s);return s;};
  const ctx={state:'suspended',currentTime:0,destination:{},resume:async()=>{ctx.state='running';},createGain:()=>({gain:param(),connect(){},disconnect(){}}),createDynamicsCompressor:()=>({threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}}),createBiquadFilter:()=>({frequency:param(),connect(){},disconnect(){}}),createOscillator:source,decodeAudioData:async()=>({duration:.2}),createBufferSource:source};
  const audio=createBattleAudio({contextFactory:()=>ctx,fetchAudio:(...args)=>{requests++;return fetchAudio(...args);},storage:()=>({getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)})});
  return {audio,sources,saved,ctx,requests:()=>requests};
}
test('only adjudicated impacts sound, without modifying the event',()=>{
  assert.equal(impactCue({...hit,kind:'magic'}),'magicHit');assert.equal(impactCue({...hit,kind:'magic',result:'critical'}),'magicCritical');
  const before=JSON.stringify(hit);assert.equal(impactCue(hit),'hit');assert.equal(JSON.stringify(hit),before);
  for(const [event,cue] of [[{...hit,result:'critical'},'critical'],[{...hit,result:'block',damage:0},'block'],[{...hit,result:'dodge',damage:0},'dodge'],[{...hit,damage:0},null],[{kind:'defeat',result:'none',damage:0},null],[{kind:'heal',damage:20},null]])assert.equal(impactCue(event),cue);
});
test('locked, muted and paused-context audio is silent; loading never queues a stale hit',async()=>{
  const h=harness();assert.equal(h.audio.play(hit),false);await h.audio.unlock();assert.equal(h.sources.length,0);assert.equal(h.requests(),new Set([...Object.values(impactSamples).flat(),...skillSamplePaths]).size);
  assert.equal(h.audio.play(hit),true);assert.equal(h.sources.length,4);h.audio.stop();assert.ok(h.sources.every(s=>s.stopped));
  h.audio.setMuted(true);assert.equal(h.audio.play(hit),false);h.audio.setMuted(false);h.audio.setVolume(0);assert.equal(h.audio.play(hit),false);
  h.audio.setVolume(.6);h.ctx.state='suspended';assert.equal(h.audio.play(hit),false);await h.audio.unlock();assert.equal(h.requests(),new Set([...Object.values(impactSamples).flat(),...skillSamplePaths]).size);assert.equal(h.audio.play(hit),true);
});
test('sample failures remain nonfatal and can be retried; voice count is bounded',async()=>{
  let fail=true;const h=harness(async()=>({ok:!fail,arrayBuffer:async()=>new ArrayBuffer(8)}));
  assert.equal(await h.audio.unlock(),false);assert.equal(h.audio.status().error,true);assert.equal(h.audio.play(hit),false);
  fail=false;assert.equal(await h.audio.unlock(),true);for(let i=0;i<12;i++)h.audio.play(hit);assert.equal(h.audio.status().active,4);h.audio.stop();assert.equal(h.audio.status().active,0);
});
test('all registered samples are real Ogg assets and match the bundle audio list',async()=>{
  const paths=[...new Set([...Object.values(impactSamples).flat(),...Object.values(uiSamples).flat()].map(n=>'assets/audio/'+n+'.ogg').concat(skillSamplePaths,['female_laugh','female_gasp','male_attack','male_hurt','male_jump'].map(n=>'assets/audio/voices/'+n+'.wav')))].sort();
  assert.deepEqual(JSON.parse(await readFile(new URL('../integration/audio-assets.json',import.meta.url))).filter(p=>!p.endsWith('.mp3')),paths);
  for(const path of paths){const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(bytes.subarray(0,4).toString(),path.endsWith('.wav')?'RIFF':'OggS');assert.ok(bytes.length>1000);}
});

test('all 70 skills sound at cast and effect phases, including zero-damage support, without changing outcomes',async()=>{
 const h=harness();await h.audio.unlock();assert.equal(Object.keys(skillAudioProfiles).length,70);
 for(const book of engineData.books){const event={kind:book.element?'magic':'attack',skill_id:book.skill_id,result:'hit',damage:0},before=JSON.stringify(event);assert.equal(h.audio.play(event,'cast'),true);assert.equal(h.audio.play(event),true);assert.equal(JSON.stringify(event),before);h.audio.stop();}
 assert.equal(h.audio.play({...hit,skill_id:'spell_001',result:'dodge'}),true);assert.equal(h.audio.status().lastCue,'dodge');
 assert.equal(h.audio.play({...hit,skill_id:'spell_001',result:'block'}),true);assert.equal(h.audio.status().lastCue,'block');
 h.audio.setMuted(true);assert.equal(h.audio.play({...hit,skill_id:'spell_040'},'cast'),false);assert.equal(h.audio.status().active,0);
});
