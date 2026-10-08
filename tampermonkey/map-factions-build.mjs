import {readFile,writeFile} from 'node:fs/promises';
const source=JSON.parse(await readFile(new URL('../assets/maps/world/faction_locations.json',import.meta.url),'utf8'));
const map=JSON.parse(await readFile(new URL('../assets/maps/world/map_locations.json',import.meta.url),'utf8'));
const categories=['knight_order','magic_tower','sanctuary','guild','mercenary','merchant','civic','diplomacy'];
const ids=new Set();
const locations=source.locations.filter(p=>p.visibility==='public').map(p=>{
  const anchor=map.locations.find(a=>a.id===p.anchor_id);
  if(ids.has(p.id)||!anchor||anchor.region!==p.region||!categories.includes(p.type)||![p.x,p.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid public faction location: '+p.id);
  ids.add(p.id);
  // Explicit public-field allowlist; no lore files or confidential fields enter the bundle.
  return Object.fromEntries(['id','type','name','region','anchor_id','x','y','leader','group','detail'].map(k=>[k,p[k]]));
});
await writeFile(new URL('../web/faction-data.js',import.meta.url),'// Generated public-only mirror of faction_locations.json.\nexport const factionLocations = '+JSON.stringify(locations,null,2)+';\n');
