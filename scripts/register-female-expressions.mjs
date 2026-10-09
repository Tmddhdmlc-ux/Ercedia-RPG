import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const plan=await read('assets/characters/expressions/female-plan.json');
const records=await read('assets/characters/expressions/generated-manifest.json');
const registry=await read('characters/art_registry.json');
for(const p of plan.characters){
  const art=registry.characters[p.id],variants={};
  for(const emotion of plan.expressions){
    const r=records.find(r=>r.id===p.id&&r.emotion===emotion);
    if(!r)throw Error('Missing '+p.id+' '+emotion);
    const png=await readFile(r.path),base=await readFile(art.portrait);
    if(png.readUInt32BE(16)!==base.readUInt32BE(16)||png.readUInt32BE(20)!==base.readUInt32BE(20)||png[25]!==6)throw Error('Incorrect canvas/alpha '+r.path);
    variants[emotion]=r.path;
  }
  art.expressions=['base',...plan.expressions];art.expression_portraits=variants;
}
registry.approved_for_engine='User requested all female NPCs five expression variants on 2026-10-09';
await writeFile('characters/art_registry.json',JSON.stringify(registry,null,2)+'\n');
console.log('Registered '+plan.characters.length+' women with '+plan.expressions.length+' expressions each.');
