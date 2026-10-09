import {readFileSync} from 'node:fs';
const convenienceRules=readFileSync(new URL('../GAMEPLAY_CONVENIENCE_RULES.md',import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCampaignSettings,campaignSettingsPrompt,campaignNPCStates,isCampaignSetting} from '../web/campaign-settings.js';
const sha='a'.repeat(40),files={'GAMEPLAY_CONVENIENCE_RULES.md':convenienceRules,'BOOTSTRAP.md':'GM: secrets stay internal','WORLD.md':'test world rules','characters/player_default.json':'{"level":1}','characters/serin.json':'{"id":"serin","name":"세린","rank":"베이직 나이트","level":18,"stats":{"hp":330,"max_hp":330,"mp":136,"max_mp":136,"strength":25,"agility":26,"intelligence":14,"constitution":22,"mana":16}}','LORE_SECRET.md':'synthetic GM secret','RELATIONSHIP_SYSTEM.md':'synthetic relationship rules'};
const mock=(path,body)=>({ok:true,json:async()=>body,text:async()=>body});
test('new campaigns actually download all setting files from one pinned GitHub commit',async()=>{
  const requests=[];const fetcher=async url=>{requests.push(url);if(url.includes('/git/ref/'))return mock('',{object:{sha}});if(url.includes('/git/trees/'))return mock('',{tree:[...Object.keys(files),'assets/characters/image.png','AGENTS.md'].map(path=>({path,type:'blob'}))});const path=url.split(sha+'/')[1];assert.ok(files[path]);return mock(path,files[path]);};
  const snapshot=await loadCampaignSettings({fetcher});assert.equal(snapshot.sha,sha);assert.equal(snapshot.paths.length,7);assert.equal(requests.length,10);
  assert.ok(requests.slice(2).every(p=>p.includes('/'+sha+'/')));const prompt=campaignSettingsPrompt(snapshot);for(const [path,content] of Object.entries(files))assert.ok(prompt.includes(content),path);assert.ok(prompt.includes('GM 판단 전용'));assert.ok(!prompt.includes('<<<GITHUB_SETTING assets/characters/image.png>>>'));assert.ok(snapshot.repository_index.some(p=>p.path==='assets/characters/image.png'&&p.kind==='asset'));assert.deepEqual(campaignNPCStates(snapshot,['serin']).serin,{name:'세린',rank:'베이직 나이트',realm:'basic',level:18,strength:25,dexterity:26,intelligence:14,constitution:22,manaStat:16,hp:330,maxHp:330,mp:136,maxMp:136});
});

test('complete settings pack uses three requests; repeated start only checks latest main and returns an isolated copy',async()=>{
  const requests=[],entries=Object.fromEntries(Object.entries(files).map(([path,content])=>[path,{sha,content}]));
  const fetcher=async(url,options)=>{requests.push({url,cache:options.cache});if(url.includes('/git/ref/'))return mock('',{object:{sha}});if(url.includes('/git/trees/'))return mock('',{tree:Object.keys(files).map(path=>({path,type:'blob',sha}))});if(url.endsWith('/integration/campaign-settings.json'))return mock('',{schema_version:1,entries});throw Error('Unexpected per-file download');};
  const first=await loadCampaignSettings({fetcher});assert.equal(requests.length,3);assert.deepEqual(first.files,files);assert.equal(requests[0].cache,'no-store');assert.equal(requests[2].cache,'force-cache');
  first.files['WORLD.md']='changed by caller';first.paths.pop();
  const second=await loadCampaignSettings({fetcher});assert.equal(requests.length,4);assert.equal(second.files['WORLD.md'],files['WORLD.md']);assert.equal(second.paths.length,7);
});

test('new main commit cannot reuse a previous settings snapshot',async()=>{
  let commit=sha,packReads=0;
  const fetcher=async url=>{if(url.includes('/git/ref/'))return mock('',{object:{sha:commit}});if(url.includes('/git/trees/'))return mock('',{tree:Object.keys(files).map(path=>({path,type:'blob',sha:commit}))});if(url.endsWith('/integration/campaign-settings.json')){packReads++;return mock('',{schema_version:1,entries:Object.fromEntries(Object.entries(files).map(([path,content])=>[path,{sha:commit,content}]))});}throw Error('Unexpected request');};
  await loadCampaignSettings({fetcher});commit='b'.repeat(40);const second=await loadCampaignSettings({fetcher});assert.equal(second.sha,commit);assert.equal(packReads,2);
});

test('stale or incomplete settings packs fall back to all current individual sources',async()=>{
  for(const broken of ['missing','stale']){
    const downloaded=[],entries=Object.fromEntries(Object.entries(files).map(([path,content])=>[path,{sha,content}]));if(broken==='missing')delete entries['LORE_SECRET.md'];else entries['WORLD.md'].sha='b'.repeat(40);
    const fetcher=async url=>{if(url.includes('/git/ref/'))return mock('',{object:{sha}});if(url.includes('/git/trees/'))return mock('',{tree:Object.keys(files).map(path=>({path,type:'blob',sha}))});if(url.endsWith('/integration/campaign-settings.json'))return mock('',{schema_version:1,entries});const path=url.split(sha+'/')[1];downloaded.push(path);return mock('',files[path]);};
    const snapshot=await loadCampaignSettings({fetcher});assert.equal(downloaded.length,7);assert.equal(snapshot.files['LORE_SECRET.md'],files['LORE_SECRET.md']);
  }
});
test('loading fails on incomplete or unreachable sources instead of claiming to have read settings',async()=>{
  await assert.rejects(()=>loadCampaignSettings({fetcher:async()=>({ok:false,status:503})}),/읽기 실패/);
  await assert.rejects(()=>loadCampaignSettings({fetcher:async url=>mock('',url.includes('/git/ref/')?{object:{sha}}:{truncated:true,tree:[]})}),/불완전/);
  assert.equal(isCampaignSetting('../secret.json'),false);assert.equal(isCampaignSetting('assets/art-production/asset_plan.json'),false);assert.equal(isCampaignSetting('characters/relationship_actions.json'),true);
});
