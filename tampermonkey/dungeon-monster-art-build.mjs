import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const art=await read('characters/dungeon_monster_art.json');
const profiles=(await read('locations/dungeon_encounters.json')).profiles;
const paths=[];
for(const [id,p] of Object.entries(art.characters)){
  const foe=profiles.find(f=>f.id===id);
  if(!foe||foe.base_monster_id!==p.base_monster_id||!new RegExp(`^assets/characters/monsters/dungeon/${id}(?:-v[0-9]+)?\\.png$`).test(p.portrait))throw Error('Invalid dungeon monster art '+id);
  const png=await readFile(new URL('../'+p.portrait,import.meta.url));
  if(png.toString('hex',0,8)!=='89504e470d0a1a0a'||png[25]!==6)throw Error('Dungeon monster needs RGBA PNG '+id);
  paths.push(p.portrait);
}
await writeFile(new URL('../web/dungeon-monster-art-data.js',import.meta.url),'// Generated dedicated dungeon monster portraits; no combat stats.\nexport const dungeonMonsterArt='+JSON.stringify(art)+';\n');
const assets=await read('integration/assets.json');
await writeFile(new URL('../integration/assets.json',import.meta.url),JSON.stringify([...new Set([...assets,...paths])],null,2)+'\n');
