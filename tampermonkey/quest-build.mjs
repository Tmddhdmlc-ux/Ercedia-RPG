import {readFile,writeFile} from 'node:fs/promises';
const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const equipment=await json('equipment/equipment_catalog_300.json'),books=await json('items/book_catalog_70.json'),loot=await json('items/loot_tables_monsters_dungeons.json');
const items=[...equipment.items.map(i=>({id:i.id,name:i.name,category:'equipment',rarity:i.rarity,description:i.lore||'',effect:JSON.stringify(i.stats)})),...books.books.map(i=>({id:i.id,name:i.name,category:'misc',rarity:i.rarity,description:i.effect_summary||'',effect:'학습·자격 확인 뒤 사용 가능'})),...loot.materials.map(i=>({id:i.id,name:i.name,category:'material',rarity:i.value_class,description:i.description,effect:''}))];
await writeFile(new URL('../web/quest-data.js',import.meta.url),'// Generated public reward item registry. Original catalogs remain authoritative.\nexport const questItems = '+JSON.stringify(items)+';\n');
