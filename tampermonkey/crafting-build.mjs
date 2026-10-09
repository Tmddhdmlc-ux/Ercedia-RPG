import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const rules=await read('items/crafting_rules.json'),gear=await read('equipment/equipment_catalog_300.json'),loot=await read('items/loot_tables_monsters_dungeons.json');
const rankFor=['하급','하급','중급','상급','엘리트'];
const recipes=gear.items.map((item,index)=>{
  const tier=rules.tiers.find(t=>t.rarity===item.rarity),rank=rankFor[item.rarity_tier-1],sources=loot.monsters.filter(m=>m.rank===rank),origin=sources[index%sources.length],common=loot.materials.find(m=>m.origin_monster_id===origin.monster_id&&m.quality==='common'),special=loot.materials.find(m=>m.origin_monster_id===origin.monster_id&&m.quality==='rare');
  if(!tier||!common||!special)throw Error('제작 재료 원본 오류');
  return {id:'RECIPE-'+item.id,name:item.name+' 제작',output:{id:item.id,quantity:1},rarity:item.rarity,inputs:[{id:common.id,quantity:tier.common_quantity},...(tier.special_quantity?[{id:special.id,quantity:tier.special_quantity}]:[])],cost_copper:tier.cost_copper,minutes:tier.minutes,craftsman:tier.craftsman,requires_recipe_proof:tier.requires_recipe_proof===true,requires_mana_artificer:['staff','accessory'].includes(item.subtype)||item.slot==='accessory',service:'smithing'};
});
await writeFile(new URL('../items/crafting_recipes.json',import.meta.url),JSON.stringify({version:1,recipes},null,2)+'\n');
await writeFile(new URL('../web/crafting-data.js',import.meta.url),`// Generated from crafting rules and existing equipment/material catalogs.\nexport const craftingData=${JSON.stringify({rules,recipes})};\n`);
