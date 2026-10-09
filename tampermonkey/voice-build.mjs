import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const registry=JSON.parse(await readFile(new URL('assets/audio/voices/voice-banks.json',root),'utf8'));
const roster=JSON.parse(await readFile(new URL('characters/npc_roster_100.json',root),'utf8'));
const core=JSON.parse(await readFile(new URL('characters/core_cast_stats_38.json',root),'utf8'));
const common=JSON.parse(await readFile(new URL('characters/common_npc_roster.json',root),'utf8'));
const lords=await readFile(new URL('LORDSHIPS.md',root),'utf8');
const monsters=JSON.parse(await readFile(new URL('assets/audio/monsters/monster-banks.json',root),'utf8'));
const banks=Object.fromEntries(registry.banks.map(b=>[b.id,{label:b.label,cues:Object.fromEntries(Object.entries(b.cues).map(([e,c])=>[e,c.path]))}]));
const defaults={...registry.npc_defaults};
for(const p of [...roster.characters,...core.roster,...common.characters]){
  if(p.species==='마수')continue;
  let m=/(?:^|\()([남여])\s*(\d+)/.exec(p.appearance||'');
  if(!m&&p.gender&&Number.isFinite(p.age))m=[null,p.gender.startsWith('여')?'여':'남',p.age];
  if(!m){const section=lords.split(/^### /m).find(s=>s.includes(`**영주:** ${p.name}`));m=/\*\*성별·나이:\*\*\s*([남여])\s*(\d+)/.exec(section||'');}
  if(!m)throw Error('Missing explicit voice demographic: '+p.id);
  defaults[p.id]=(m[1]==='여'?'female':'male')+'_'+(+m[2]<30?'young':'mature');
}
const families=['canine','horned','boar','small','reptile','winged','insect','insect','horned','winged','reptile','aquatic','aquatic','aquatic','insect','small','spectral','spectral','canine','insect'];
for(let i=0;i<families.length;i++)defaults['ER-NPC-'+String(81+i).padStart(3,'0')]='monster_'+families[i];
for(const [family,b] of Object.entries(monsters.families)){const paths=Object.fromEntries(Object.entries(b.cues).map(([e,c])=>[e,c.path]));banks['monster_'+family]={label:'몬스터 · '+b.label,cues:{base:paths.base,smile:paths.base,angry:paths.attack,surprised:paths.hurt,sad:paths.hurt,embarrassed:paths.base,afraid:paths.hurt,annoyed:paths.attack,love:paths.base},combat:paths};}
const monsterSamplePaths=Object.values(monsters.families).flatMap(b=>Object.values(b.cues).map(c=>c.path));
await writeFile(new URL('web/voice-data.js',root),'// Generated voice banks and allowlisted IDs only. Explicit canon demographics; audio style cutoff: 30.\nexport const voiceBanks='+JSON.stringify(banks)+';\nexport const npcVoiceDefaults='+JSON.stringify(defaults)+';\nexport const monsterSamplePaths='+JSON.stringify(monsterSamplePaths)+';\n');
const audioPath=new URL('integration/audio-assets.json',root),audio=JSON.parse(await readFile(audioPath,'utf8'));
await writeFile(audioPath,JSON.stringify([...new Set([...audio,...monsterSamplePaths])].sort(),null,2)+'\n');
