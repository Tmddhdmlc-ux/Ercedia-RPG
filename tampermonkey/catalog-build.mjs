import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const sources=['characters/npc_roster_100.json','characters/core_cast_stats_38.json'];
const roster=await read(sources[0]),core=await read(sources[1]);
let serin;try{serin=await read('characters/serin.json');sources.push('characters/serin.json');}catch(e){if(e.code!=='ENOENT')throw e;}
const realm=rank=>rank.includes('마스터 나이트')?'master':rank.includes('하이퍼 나이트')?'hyper':rank.includes('익스퍼트 나이트')?'expert':rank.includes('베이직 나이트')?'basic':'none';
const entries=[...roster.characters.map(r=>[r,sources[0]]),...core.roster.map(r=>[r,sources[1]]),[serin||{id:'serin',name:'세린',affiliation:'써니 빌리지 순찰',rank:'베이직 나이트',stats:{}},'characters/serin.json']];
const npcs=entries.map(([r,source])=>({id:r.id,name:r.name,affiliation:r.affiliation,personality:r.personality_seed||r.personality||null,duty:r.duty||null,rank:r.rank,location_id:r.location_id||null,role:r.species==='마수'?'monster':'npc',realm:realm(r.rank),level:r.level??null,strength:r.stats.strength??null,dexterity:r.stats.agility??null,intelligence:r.stats.intelligence??null,constitution:r.stats.constitution??null,manaStat:r.stats.mana??null,hp:r.stats.hp??null,maxHp:r.stats.max_hp??null,mp:r.stats.mp??null,maxMp:r.stats.max_mp??null,speed:r.combat?.speed??null,attackMin:r.combat?.base_attack_min??null,attackMax:r.combat?.base_attack_max??null,levelHpBonus:r.level_hp_bonus??0,statStatus:r.stat_status||'unassigned',source}));
const commonSource='characters/common_npc_roster.json',common=await read(commonSource);sources.push(commonSource);
if(common.characters.length!==24||common.character_count!==24)throw Error('Invalid common NPC roster');
for(const r of common.characters){const secret=r.job==='도적';npcs.push({id:r.id,name:secret?'신원 미상의 행인':r.name,affiliation:secret?'소속 미확인':r.affiliation,personality:secret?null:r.personality,duty:secret?'활동 미확인':r.job,speech_style:secret?null:r.speech_style,appearance:r.appearance,rank:'미정',location_id:r.location_id,role:'npc',realm:'none',level:null,strength:null,dexterity:null,intelligence:null,constitution:null,manaStat:null,hp:null,maxHp:null,mp:null,maxMp:null,speed:null,attackMin:null,attackMax:null,levelHpBonus:0,statStatus:'unassigned',source:commonSource});}
if(new Set(npcs.map(p=>p.id)).size!==npcs.length||roster.characters.length!==roster.character_count||core.roster.length!==core.count)throw Error('Invalid public NPC catalog');
const region=await read('locations/regional_dungeons_facilities.json');
const regional={specializations:region.national_specializations,facilities:region.facilities.map(p=>({id:p.id,name:p.name,region_id:p.region_id,kingdom:p.kingdom,description:p.description,type:p.type})),dungeons:region.dungeons.map(p=>({id:p.id,name:p.name,region_id:p.region_id,kingdom:p.kingdom,danger_rank:p.danger_rank,min:p.recommended_level_min,max:p.recommended_level_max,unlock:p.unlock}))};
for(const p of npcs){if(p.role==='monster'){const raw=entries.find(([r])=>r.id===p.id)[0];p.creatureMultiplier=raw.creature_damage_multiplier??1;}}
const digest=createHash('sha256').update(JSON.stringify({npcs,regional})).digest('hex');
await writeFile(new URL('../web/catalog-data.js',import.meta.url),'// Generated allowlisted public fields only. Do not edit; edit source JSON.\nexport const catalogData = '+JSON.stringify({digest,sources,npcs,regional})+';\n');
