import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const registry=await read('characters/art_registry.json'),placement=await read('characters/npc_placements.json');
const seen=new Set();
for(const p of placement.placements){if(seen.has(p.id)||(p.id!=='serin'&&!registry.characters[p.id])||![p.x,p.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid NPC placement');seen.add(p.id);}
if(seen.size!==139||Object.keys(registry.characters).length!==138)throw Error('Incomplete character registration');
const paths=['assets/characters/main/serin/base_transparent.png'];
for(const art of Object.values(registry.characters))paths.push(art.portrait,...(art.standing?[art.standing]:[]));
for(const group of Object.values(registry.symbols))paths.push(...Object.values(group));
for(const path of new Set(paths)){if(!/^assets\/[A-Za-z0-9_./-]+\.png$/.test(path)||path.includes('..'))throw Error('Invalid registered path');await readFile(new URL(path,root));}
await writeFile(new URL('web/character-art-data.js',root),'// Generated public art and location registry.\nexport const characterArtData = '+JSON.stringify({...registry,placements:placement.placements})+';\n');
const assets=await read('integration/assets.json');
await writeFile(new URL('integration/assets.json',root),JSON.stringify([...new Set([...assets,...paths])],null,2)+'\n');
