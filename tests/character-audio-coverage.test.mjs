import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {npcCatalog} from '../web/npc-model.js';
import {voiceBanks,npcVoiceDefaults,monsterSamplePaths} from '../web/voice-data.js';
import {dialogueReaction} from '../web/voice-audio.js';
import {monsterBattleReactions,monsterCombatPath} from '../web/monster-audio.js';
import {monsterVoiceFixture} from './monster-voice-fixture.js';
import {normalizeScene} from '../web/scene.js';
import {validateBattleSettlement} from '../web/battle-model.js';
test('the isolated monster sound demonstration passes the production scene and settlement validators',()=>{const f=monsterVoiceFixture();assert.doesNotThrow(()=>validateBattleSettlement(normalizeScene(f.scene),f.state));});
test('every current catalog character has an engine reaction bank, including royalty and residents',()=>{
 assert.equal(npcCatalog.length,163);
 for(const p of npcCatalog){const bank=npcVoiceDefaults[p.id];assert.ok(voiceBanks[bank],p.id);assert.equal(bank.startsWith('monster_'),p.role==='monster',p.id);
  for(const emotion of ['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'])assert.ok(dialogueReaction({scene_id:'coverage-'+p.id,npc:{id:p.id,speaker:p.name,emotion:'base'},dialogue:[{speaker:p.name,emotion,text:'검증'}]},0)?.path,p.id+':'+emotion);
 }
 assert.equal(npcVoiceDefaults['ER-CORE-001'],'male_mature');assert.equal(npcVoiceDefaults['ER-CORE-003'],'female_mature');assert.equal(npcVoiceDefaults['ER-CORE-012'],'male_young');assert.equal(npcVoiceDefaults['ER-COM-004'],'female_young');
});
test('monster instances use catalog IDs; dodge and harmless blocks do not trigger pain or death',()=>{
 const wolf={id:'wolf-2',catalog_id:'ER-NPC-081',role:'monster'},player={id:'player',role:'player'},participants=[wolf,player],hit={kind:'attack',actor:'player',target:'wolf-2',result:'hit',damage:8,target_hp_after:1};
 assert.match(monsterCombatPath(wolf,'attack'),/canine\/attack/);
 assert.equal(monsterBattleReactions({...hit,actor:'wolf-2',target:'player'},participants,'cast')[0].phase,'attack');assert.equal(monsterBattleReactions(hit,participants,'impact')[0].phase,'hurt');assert.equal(monsterBattleReactions({...hit,target_hp_after:0},participants,'impact')[0].phase,'death');
 assert.deepEqual(monsterBattleReactions({...hit,result:'dodge'},participants,'impact'),[]);assert.deepEqual(monsterBattleReactions({...hit,result:'block',damage:0},participants,'impact'),[]);assert.deepEqual(monsterBattleReactions({...hit,kind:'heal',actor:'wolf-2'},participants,'cast'),[]);
});
test('all nine creature styles have short mono clips with fades and retained licensed provenance',async()=>{
 assert.equal(monsterSamplePaths.length,36);const registry=JSON.parse(await readFile(new URL('../assets/audio/monsters/monster-banks.json',import.meta.url)));assert.equal(registry.license,'CC0-1.0');
 for(const path of monsterSamplePaths){const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt16LE(34),16);assert.ok(bytes.length>1000&&bytes.length<=44+44100*2*1.5);assert.equal(bytes.readInt16LE(44),0);assert.equal(bytes.readInt16LE(bytes.length-2),0);}
});
