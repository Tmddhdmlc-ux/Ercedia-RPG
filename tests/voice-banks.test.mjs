import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const asset=p=>readFile(new URL('../'+p,import.meta.url));
test('approved bright female laugh and gasp remain byte-identical',async()=>{
  for(const [cue,source] of [['smile','female_laugh'],['surprised','female_gasp']])assert.deepEqual(await asset(`assets/audio/voices/female_young/${cue}.wav`),await asset(`assets/audio/voices/${source}.wav`));
});
test('all four audition banks have complete, bounded playable WAV cues and recorded provenance',async()=>{
  const registry=JSON.parse(await asset('assets/audio/voices/voice-banks.json'));
  assert.deepEqual(registry.banks.map(b=>b.id),['female_young','female_mature','male_young','male_mature']);
  for(const bank of registry.banks){assert.equal(Object.keys(bank.cues).length,9);for(const cue of Object.values(bank.cues)){
    const bytes=await asset(cue.path);assert.equal(bytes.toString('ascii',0,4),'RIFF');await asset(cue.source);
    if(cue.processing==='unchanged')continue;
    assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),44100);assert.equal(bytes.readUInt16LE(34),16);
    assert.ok(bytes.length>1000&&bytes.length<=44+44100*2*1.5);assert.equal(bytes.readInt16LE(44),0);assert.equal(bytes.readInt16LE(bytes.length-2),0);
  }}
});
test('young female cues use the approved bright references or separate cute takes, including anger',async()=>{
  const registry=JSON.parse(await asset('assets/audio/voices/voice-banks.json'));
  const young=registry.banks.find(b=>b.id==='female_young'),mature=registry.banks.find(b=>b.id==='female_mature');
  for(const [emotion,cue] of Object.entries(young.cues)){
    assert.notEqual(cue.source,mature.cues[emotion].source);
    if(!['smile','surprised'].includes(emotion))assert.match(cue.source,/source\/cute_/);
  }
  assert.match(young.cues.angry.source,/cute_attack3\.wav$/);
});
