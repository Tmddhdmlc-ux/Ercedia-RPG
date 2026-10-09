import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const registry=JSON.parse(await readFile(new URL('assets/audio/voices/voice-banks.json',root),'utf8'));
const roster=JSON.parse(await readFile(new URL('characters/npc_roster_100.json',root),'utf8'));
const banks=Object.fromEntries(registry.banks.map(b=>[b.id,{label:b.label,cues:Object.fromEntries(Object.entries(b.cues).map(([e,c])=>[e,c.path]))}]));
const defaults={...registry.npc_defaults};
for(const p of roster.characters){const m=/^([남여])(\d+)/.exec(p.appearance||'');if(m)defaults[p.id]=(m[1]==='여'?'female':'male')+'_'+(+m[2]<30?'young':'mature');}
await writeFile(new URL('web/voice-data.js',root),'// Generated from voice-banks.json and explicit roster gender/age; audio style cutoff: 30.\nexport const voiceBanks='+JSON.stringify(banks)+';\nexport const npcVoiceDefaults='+JSON.stringify(defaults)+';\n');
