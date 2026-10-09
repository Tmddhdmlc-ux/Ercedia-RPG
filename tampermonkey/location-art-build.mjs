import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const manifest=await read('assets/location_image_manifest.json'),plan=await read('assets/art-production/asset_plan.json');
if(manifest.assets.length!==261||new Set(manifest.assets.map(a=>a.id)).size!==261)throw Error('Incomplete location art');
const entries=[];
for(const art of manifest.assets){
  const checked=plan.assets.find(a=>a.id===art.id);
  if(!checked?.visual_verified||checked.status!=='verified'||checked.path!==art.path||!/^assets\/backgrounds\/[A-Za-z0-9_./-]+\.png$/.test(art.path)||art.path.includes('..'))throw Error('Unverified background '+art.id);
  const bytes=await readFile(new URL(art.path,root));
  if(createHash('sha256').update(bytes).digest('hex')!==checked.file_checks.sha256)throw Error('Background checksum mismatch '+art.id);
  entries.push(Object.fromEntries(['id','name','path','category','region_id','region_anchor','facility_id','dungeon_id','zone_id','faction_id','optional'].filter(k=>art[k]!==undefined).map(k=>[k,art[k]])));
}
await writeFile(new URL('web/location-art-data.js',root),'// Generated from 261 verified canonical location slots.\nexport const locationArtData='+JSON.stringify({assetCommit:'149bdf6155dcabf3474271144fd139d129c5e3c5',assets:entries})+';\n');
const assets=await read('integration/assets.json');
await writeFile(new URL('integration/assets.json',root),JSON.stringify([...new Set([...assets,...entries.map(a=>a.path)])],null,2)+'\n');
