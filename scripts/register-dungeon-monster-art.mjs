import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const plan=read('assets/characters/monsters/dungeon/production-plan.json');
const characters={};
for(const p of plan.entries){
  if(!existsSync(p.path))continue;
  const png=readFileSync(p.path);
  if(png.toString('hex',0,8)!=='89504e470d0a1a0a'||png[25]!==6)throw Error('RGBA PNG required: '+p.id);
  characters[p.id]={name:p.name,base_monster_id:p.base_monster_id,portrait:p.path,width:png.readUInt32BE(16),height:png.readUInt32BE(20),sha256:createHash('sha256').update(png).digest('hex'),source:'assets/characters/monsters/dungeon/production-plan.json'};
}
writeFileSync('characters/dungeon_monster_art.json',JSON.stringify({version:1,characters},null,2)+'\n');
console.log('Registered '+Object.keys(characters).length+'/'+plan.entries.length+' dedicated monster portraits.');
