// Same complete settings scope as the live loader; generated pack is excluded.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {isCampaignSetting} from '../web/campaign-settings.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(isCampaignSetting).sort();
const hashes=execFileSync('git',['hash-object','--stdin-paths'],{cwd:root,encoding:'utf8',input:paths.map(p=>JSON.stringify(p)).join('\n')+'\n'}).trim().split('\n');
const entries={};let total=0;
for(const [i,p] of paths.entries()){
  const raw=(await readFile(path.join(root,p),'utf8')).replaceAll('\r\n','\n');
  if(raw.length>1500000)throw Error('Campaign setting exceeds file limit: '+p);
  const content=/\.json$/i.test(p)?JSON.stringify(JSON.parse(raw)):raw;
  total+=content.length;if(total>6000000)throw Error('Campaign settings exceed transfer limit');
  entries[p]={sha:hashes[i],content};
}
await writeFile(path.join(root,'integration/campaign-settings.json'),JSON.stringify({schema_version:1,entries})+'\n');
console.log(`Packed ${paths.length} complete settings (${total} characters)`);
