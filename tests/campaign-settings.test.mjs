import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCampaignSettings,campaignSettingsPrompt,campaignNPCStates,isCampaignSetting} from '../web/campaign-settings.js';
const sha='a'.repeat(40),files={'BOOTSTRAP.md':'GM: secrets stay internal','WORLD.md':'test world rules','characters/player_default.json':'{"level":1}','characters/serin.json':'{"id":"serin","name":"세린","rank":"베이직 나이트","level":18,"stats":{"hp":330,"max_hp":330,"mp":136,"max_mp":136,"strength":25,"agility":26,"intelligence":14,"constitution":22,"mana":16}}','LORE_SECRET.md':'synthetic GM secret','RELATIONSHIP_SYSTEM.md':'synthetic relationship rules'};
const mock=(path,body)=>({ok:true,json:async()=>body,text:async()=>body});
test('new campaigns actually download all setting files from one pinned GitHub commit',async()=>{
  const requests=[];const fetcher=async url=>{requests.push(url);if(url.includes('/git/ref/'))return mock('',{object:{sha}});if(url.includes('/git/trees/'))return mock('',{tree:[...Object.keys(files),'assets/characters/image.png','AGENTS.md'].map(path=>({path,type:'blob'}))});const path=url.split(sha+'/')[1];assert.ok(files[path]);return mock(path,files[path]);};
  const snapshot=await loadCampaignSettings({fetcher});assert.equal(snapshot.sha,sha);assert.equal(snapshot.paths.length,6);assert.equal(requests.length,8);
  assert.ok(requests.slice(2).every(p=>p.includes('/'+sha+'/')));const prompt=campaignSettingsPrompt(snapshot);for(const [path,content] of Object.entries(files))assert.ok(prompt.includes(content),path);assert.ok(prompt.includes('GM 판단 전용'));assert.ok(!prompt.includes('image.png'));assert.deepEqual(campaignNPCStates(snapshot,['serin']).serin,{name:'세린',rank:'베이직 나이트',realm:'basic',level:18,strength:25,dexterity:26,intelligence:14,constitution:22,manaStat:16,hp:330,maxHp:330,mp:136,maxMp:136});
});
test('loading fails on incomplete or unreachable sources instead of claiming to have read settings',async()=>{
  await assert.rejects(()=>loadCampaignSettings({fetcher:async()=>({ok:false,status:503})}),/읽기 실패/);
  await assert.rejects(()=>loadCampaignSettings({fetcher:async url=>mock('',url.includes('/git/ref/')?{object:{sha}}:{truncated:true,tree:[]})}),/불완전/);
  assert.equal(isCampaignSetting('../secret.json'),false);assert.equal(isCampaignSetting('assets/art-production/asset_plan.json'),false);assert.equal(isCampaignSetting('characters/relationship_actions.json'),true);
});
