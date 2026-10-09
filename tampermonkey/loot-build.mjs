import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const rules=await read('items/drop_rules.json'),loot=await read('items/loot_tables_monsters_dungeons.json'),gear=await read('equipment/equipment_catalog_300.json'),books=await read('items/book_catalog_70.json');
const rarities=gear.rarity_order,items=[...gear.items,...books.books];
if(rules.categories.reduce((n,c)=>n+c.max-c.min+1,0)!==10000||rules.categories.some((c,i)=>c.min!==(i?rules.categories[i-1].max+1:1)||(c.max-c.min+1)/100!==c.percent))throw Error('전리품 확률 범위 오류');
const regionalPool=(region,rarity,limit)=>items.filter(i=>i.rarity===rarity&&i.required_level<=limit&&(!i.slot||i.slot!=='weapon'||region.startsWith('S')||region.startsWith('W')&&i.subtype==='sword'||region.startsWith('E')&&i.subtype==='staff')&&(!i.skill_id||region.startsWith('S')||region.startsWith('W')&&i.required_class==='검사'||region.startsWith('E')&&i.required_class==='마법사')).map(i=>i.id);
const material=(m,quality)=>m.roll_table.filter(r=>loot.materials.find(i=>i.id===r.item_id)?.quality===quality).map(r=>({id:r.item_id,min_qty:r.min_qty,max_qty:r.max_qty}));
const make=(rank,region,monsters)=>Object.fromEntries(rules.categories.map(c=>{
  const limit=rules.rank_limits[rank]||rules.rank_limits['하급'];
  return [c.id,c.id==='common'||c.id==='special'?monsters.flatMap(m=>material(m,c.id==='common'?'common':'rare')):c.rarity&&rarities.indexOf(c.rarity)<=rarities.indexOf(limit.max_rarity)?regionalPool(region,c.rarity,limit.max_item_level).map(id=>({id,min_qty:1,max_qty:1})):[]];
}));
const monsterPools=Object.fromEntries(loot.monsters.map(m=>[m.monster_id,make(m.rank,m.region_id,[m])]));
const dungeonPools=Object.fromEntries(loot.dungeon_rewards.map(d=>[d.dungeon_id,make(d.danger_rank,d.region_id,loot.monsters.filter(m=>m.region_id===d.region_id))]));
for(const [id,pool]of Object.entries(dungeonPools)){const source=loot.dungeon_rewards.find(d=>d.dungeon_id===id);if(!pool.common.length||!pool.special.length){const materials=source.first_clear.guaranteed.find(r=>r.type==='material_bundle')?.source_material_ids||[];for(const kind of ['common','special'])if(!pool[kind].length)pool[kind]=materials.filter(id=>loot.materials.find(m=>m.id===id)?.quality===(kind==='common'?'common':'rare')).map(id=>({id,min_qty:1,max_qty:1}));}}
await writeFile(new URL('../web/loot-data.js',import.meta.url),`// Generated from drop rules and existing dungeon/item catalogs.\nexport const dropData=${JSON.stringify({rules,monsterPools,dungeonPools})};\n`);
