import {readFile,writeFile} from 'node:fs/promises';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const rules=await read('economy/currency_rules.json'),mythic=await read('locations/ancient_mythic_dungeons.json');
const divine=Object.values(mythic).find(v=>Array.isArray(v)&&v.length===11&&v.every(i=>i.item_type==='divine_artifact'));
if(rules.new_game.starting_copper!==500||rules.currency.copper_per_silver!==100||!divine)throw Error('Currency/divine canon mismatch');
await writeFile(new URL('../web/economy-data.js',import.meta.url),'// Generated from economy/currency_rules.json and canonical non-tradeable divine IDs.\nexport const economyData = '+JSON.stringify({rules,divine_ids:divine.map(i=>i.id)},null,2)+';\n');
