import {readFile,writeFile} from 'node:fs/promises';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const layouts=await read('locations/dungeon_layouts.json');
const regional=await read('locations/regional_dungeons_facilities.json');
const annual=await read('assets/events/annual_events.json');
if(layouts.dungeons.length!==26||layouts.dungeons.reduce((n,d)=>n+d.zones.length,0)!==108||regional.facilities.length!==26)throw Error('World catalog count mismatch');
await writeFile(new URL('../web/world-data.js',import.meta.url),'// Approved public catalogs; no invented prices or coordinates.\nexport const worldData='+JSON.stringify({dungeons:layouts.dungeons,facilities:regional.facilities,annual})+';\n');
