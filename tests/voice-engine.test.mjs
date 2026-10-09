import test from 'node:test';
import assert from 'node:assert/strict';
import {dialogueReaction,createVoiceAudio,normalizeVoicePreferences} from '../web/voice-audio.js';
import {normalize,defaults} from '../web/state.js';
const scene={scene_id:'voice-test',npc:{id:'serin',speaker:'세린',emotion:'base'},dialogue:[{speaker:'나레이션',text:'시작'},{speaker:'세린',emotion:'angry',text:'화났어!'},{speaker:'세린',text:'아직 화났어.'}]};
test('engine resolves the real speaker and inherited expression, leaving narration and battle silent',()=>{
 assert.equal(dialogueReaction(scene,0),null);assert.equal(dialogueReaction(scene,1).bank,'female_young');assert.equal(dialogueReaction(scene,2).emotion,'angry');assert.equal(dialogueReaction({...scene,battle:{}},1),null);
 const cast={...scene,npc:null,cast:[scene.npc,{id:'ER-NPC-001',speaker:'알윈',emotion:'base'}],dialogue:[{speaker:'별칭',speaker_id:'ER-NPC-001',text:'안녕'}]};
 assert.equal(dialogueReaction(cast,0).bank,'male_mature');assert.equal(dialogueReaction(cast,0,{banks:{'ER-NPC-001':'male_young'}}).bank,'male_young');
 assert.equal(dialogueReaction({...scene,npc:{id:'unknown',speaker:'세린'}},1),null);
});
test('voice and music preferences survive whole-game save normalization',()=>{
 const raw={...defaults(),uiPreferences:{textSize:'large',voice:{enabled:false,volume:.3,banks:{serin:'female_mature',unknown:'male_young'}},music:{enabled:false,mode:'night',volume:.2}}};
 const restored=normalize(raw);assert.equal(restored.uiPreferences.textSize,'large');assert.deepEqual(restored.uiPreferences.voice,{enabled:false,volume:.3,banks:{serin:'female_mature'}});assert.deepEqual(restored.uiPreferences.music,raw.uiPreferences.music);assert.deepEqual(normalizeVoicePreferences({volume:100}),{enabled:true,volume:1,banks:{}});
});
test('late audio loads cannot play after advance or mute; repeated renders do not replay',async()=>{
 let finish;let starts=0;const fetched=new Promise(r=>finish=r);
 const node=()=>({gain:{value:0},connect(){},disconnect(){},start(){starts++;},stop(){}});
 const ctx={destination:{},resume:async()=>{},decodeAudioData:async()=>({duration:1}),createBufferSource:node,createGain:node};
 const audio=createVoiceAudio({contextFactory:()=>ctx,fetchAudio:async()=>{await fetched;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};}});await audio.unlock();
 const cue=dialogueReaction(scene,1),first=audio.play(cue);audio.stop();finish();assert.equal(await first,false);assert.equal(starts,0);
 assert.equal(await audio.play({...cue,key:'new-line'}),true);assert.equal(await audio.play({...cue,key:'new-line'}),false);assert.equal(starts,1);
 audio.configure({enabled:false,volume:.5});assert.equal(await audio.play({...cue,key:'muted'}),false);assert.equal(starts,1);
});
