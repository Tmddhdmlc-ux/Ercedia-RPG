import {readFile,writeFile} from 'node:fs/promises';
const source=JSON.parse(await readFile(new URL('../items/consumable_catalog.json',import.meta.url),'utf8'));
if(source.schema_version!==1||!Array.isArray(source.items))throw Error('Consumable catalog schema');
await writeFile(new URL('../web/shop-consumables.js',import.meta.url),'// Generated from items/consumable_catalog.json; never changes equipment prices.\nexport const shopConsumables='+JSON.stringify(source.items,null,2)+';\n');
