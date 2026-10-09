import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const path='assets/characters/monsters/dungeon/production-plan.json';
const plan=JSON.parse(readFileSync(path,'utf8'));
const prompt="Use case: precise-object-edit. Edit target: this exact newly generated Ercedia RPG golden desert fox portrait. Correct ONLY its tail count and the local tail arrangement: the species has EXACTLY FOUR separate fluffy golden tails. Draw four clearly countable complete tails fanning out behind the rump, each with its own distinct tip and transparent gap around the tip; no hidden fourth tail, no merged tails, no fifth tail. Preserve the exact face, ears, amber eyes, golden fur, dark sand markings, body, four paws, pose and polished 2D fantasy painting style. Expand the empty framing or reduce overall creature scale as needed to keep all FOUR tails and paws fully inside the canvas with generous safe transparent margins. Genuine transparent RGBA background; no floor, text, frame, scenery or extra characters.";
for(const id of ['DUN-S2-01-ELITE','DUN-S2-01-BOSS']){
  const p=plan.entries.find(p=>p.id===id),selected=`assets/characters/monsters/dungeon/${id}-v2.png`;
  if(!existsSync(selected))throw Error('Missing corrected portrait '+id);
  p.draft_path??=p.path;p.path=selected;
  p.revisions=[{reason:'Make the canonical four tails separately countable',tool:'built-in image_gen',reference:p.draft_path,path:selected,prompt}];
  if(id.endsWith('ELITE')){
    const finalPath=`assets/characters/monsters/dungeon/${id}-v3.png`;
    if(!existsSync(finalPath))throw Error('Missing fourth-tail correction');
    p.revisions.push({reason:'Add a visible fourth tail below the original three',tool:'built-in image_gen',reference:selected,path:finalPath,prompt:"Use case: precise-object-edit. Edit ONLY the tail area of this exact golden fantasy fox. IMPORTANT: the supplied image currently has THREE tails, all pointing up and left. ADD ONE NEW FOURTH fluffy tail, without removing or merging any of the existing three. The new fourth tail must visibly emerge from the rump and curve DOWNWARD into the empty lower-left area below the existing lowest tail and to the left of the back paws, with a separate white-tipped end pointing left. This should make FOUR clearly countable tails: three original upper tails PLUS one new lower tail. Leave the three original tails and all other fox parts unchanged: same face, ears, markings, amber eyes, golden fur, four paws and pose. Keep generous transparent margins, genuine RGBA transparency, no shadow, text or extra foxes. Do not return the unchanged three-tail image."});
    p.path=finalPath;
  }
}
writeFileSync(path,JSON.stringify(plan,null,2)+'\n');
console.log('Selected two corrected four-tail fox portraits; first drafts retained.');
