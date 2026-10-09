import {readFile,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../quests/regional_epic_quests.json',import.meta.url),'utf8'));
if(data.lordship_quests.length!==13||new Set(data.lordship_quests.map(q=>q.region_id)).size!==13)throw Error('Incomplete epic seeds');
await writeFile(new URL('../web/epic-data.js',import.meta.url),'// Generated approved regional epic seeds.\nexport const epicData = '+JSON.stringify(data)+';\n');
