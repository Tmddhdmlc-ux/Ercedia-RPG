import {readFile,writeFile} from 'node:fs/promises';
import {pngBounds} from './png-bounds.mjs';
const root=new URL('../',import.meta.url);
// character-art-build has completed before this module is imported by build.mjs.
const {characterArtData}=await import('../web/character-art-data.js');
const paths=new Set();
for(const art of Object.values(characterArtData.characters))for(const path of [art.portrait,art.standing,...Object.values(art.expression_portraits||{})])if(path)paths.add(path);
for(const outfit of ['armor','casual','nightwear'])paths.add('assets/characters/main/serin/standing/'+(outfit==='armor'?'base.png':`outfits/${outfit}/base.png`));
const assets={};
for(const path of paths)assets[path]=pngBounds(await readFile(new URL(path,root)));
// Shared normalized bounds across expression variants keep their scale/anchor stable.
const groups={};
for(const [id,art] of Object.entries(characterArtData.characters)){
  const portraitPaths=[art.portrait,...Object.values(art.expression_portraits||{})];
  const union=[1,1,0,0];
  for(const path of portraitPaths){const m=assets[path],b=m.bounds.map((v,i)=>v/(i%2?m.height:m.width));union[0]=Math.min(union[0],b[0]);union[1]=Math.min(union[1],b[1]);union[2]=Math.max(union[2],b[2]);union[3]=Math.max(union[3],b[3]);}
  groups[id]={portraitBounds:union};
}
await writeFile(new URL('web/character-layout-data.js',root),'// Generated from registered PNG alpha bounds. Originals remain unchanged.\nexport const characterLayoutData = '+JSON.stringify({assets,groups})+';\n');
console.log(`Measured ${paths.size} registered character images for responsive proportions`);
