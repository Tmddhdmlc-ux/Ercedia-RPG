import {readFile,writeFile} from 'node:fs/promises';
const intro=JSON.parse(await readFile(new URL('../characters/new_game_intro.json',import.meta.url),'utf8'));
const player=JSON.parse(await readFile(new URL('../characters/player_default.json',import.meta.url),'utf8'));
if(intro.schema_version!==1||intro.passives.length!==4||intro.start_regions.flatMap(r=>r.lordship_ids).length!==13)throw Error('Unsupported new game intro data');
await writeFile(new URL('../web/intro-data.js',import.meta.url),'// Generated from approved public character creation data.\nexport const introData = '+JSON.stringify(intro,null,2)+';\nexport const playerTemplate = '+JSON.stringify(player,null,2)+';\n');
