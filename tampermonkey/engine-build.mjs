import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const [equipment,books]=await Promise.all([read('equipment/equipment_catalog_300.json'),read('items/book_catalog_70.json')]);
// Public mechanical catalogs only. No NPC secrets or draft artwork enter the UI bundle.
const loot=await read('items/loot_tables_monsters_dungeons.json'),manifest=await read('assets/items/item_image_manifest.json');
const records=[...equipment.items,...books.books,...loot.materials];
if(records.length!==410||new Set(records.map(p=>p.id)).size!==410)throw Error('Incomplete item catalog');
const ids=new Set(records.map(p=>p.id));
for(const row of loot.monsters)for(const entry of row.roll_table)if(!ids.has(entry.item_id))throw Error('Unknown loot material');
for(const row of loot.dungeon_rewards){const pool=row.first_clear.optional_reward_pool;for(const id of [...pool.equipment_ids,...pool.book_ids])if(!ids.has(id))throw Error('Unknown dungeon reward');}
for(const record of records){
  const entry=manifest.assets.find(p=>p.id===record.id);
  if(!entry||entry.path!==record.icon_path||!/^assets\/items\/[A-Za-z0-9_/-]+\.png$/.test(entry.path))throw Error('Invalid item art registration');
  const bytes=await readFile(path.join(root,entry.path));if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Item artwork checksum mismatch: '+entry.id);
}
const assets=await read('integration/assets.json');await writeFile(path.join(root,'integration/assets.json'),JSON.stringify([...new Set([...assets,...records.map(p=>p.icon_path)])],null,2)+'\n');
const data={equipment:equipment.items,books:books.books,loot,assetCommit:'149bdf6155dcabf3474271144fd139d129c5e3c5'};
await writeFile(path.join(root,'web/engine-data.js'),'// Generated from approved mechanical catalogs.\nexport const engineData='+JSON.stringify(data)+';\n');
