import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadCampaignSettings,isCampaignSetting} from '../web/campaign-settings.js';
test('published settings pack covers every tracked setting and loads actual current originals in three requests',async()=>{
  const root=new URL('../',import.meta.url),pack=JSON.parse(readFileSync(new URL('../integration/campaign-settings.json',import.meta.url),'utf8'));
  const paths=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(isCampaignSetting).sort();
  assert.deepEqual(Object.keys(pack.entries).sort(),paths);
  const hashes=execFileSync('git',['hash-object','--stdin-paths'],{cwd:root,encoding:'utf8',input:paths.map(p=>JSON.stringify(p)).join('\n')+'\n'}).trim().split('\n');
  const sha='e'.repeat(40),requests=[];
  const fetcher=async url=>{requests.push(url);let value;if(url.includes('/git/ref/'))value={object:{sha}};else if(url.includes('/git/trees/'))value={tree:paths.map((path,i)=>({path,type:'blob',sha:hashes[i]}))};else if(url.endsWith('/integration/campaign-settings.json'))value=pack;else throw Error('Unexpected fallback: '+url);return {ok:true,json:async()=>value};};
  const snapshot=await loadCampaignSettings({fetcher});assert.equal(requests.length,3);
  for(const path of paths){const raw=readFileSync(new URL('../'+path,import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(snapshot.files[path],/\.json$/i.test(path)?JSON.stringify(JSON.parse(raw)):raw,path);}
});
