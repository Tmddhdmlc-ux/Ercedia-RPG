import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCampaignSettings,campaignSettingsAttachment,isCampaignSetting} from '../web/campaign-settings.js';
import {validateChatHandoff} from '../web/chat-handoff.js';
import {defaults} from '../web/state.js';
const sha='b'.repeat(40);
const base={'BOOTSTRAP.md':'GM rules','WORLD.md':'World rules','characters/player_default.json':'{}','characters/serin.json':'{}'};
function source(files,{fail}={}){
  const requests=[];
  const fetcher=async url=>{
    requests.push(url);
    if(url.includes('/git/ref/'))return {ok:true,json:async()=>({object:{sha}})};
    if(url.includes('/git/trees/'))return {ok:true,json:async()=>({tree:[...Object.keys(files),'assets/characters/portrait.png','web/app.js'].map(path=>({path,type:'blob',sha,size:10}))})};
    const path=decodeURIComponent(url.split(sha+'/')[1]);
    assert.ok(Object.hasOwn(files,path),'Only game settings may be downloaded');
    return {ok:path!==fail,status:503,text:async()=>files[path]};
  };
  return {fetcher,requests};
}
test('new nested lore folders and Unicode documents are discovered without treating development or art production as canon',()=>{
  for(const path of ['dungeons/ancient/rules.md','characters/profiles/세린.json','economy/markets/prices.csv','lore/approved/story.yaml','narration/tone.txt'])assert.equal(isCampaignSetting(path),true,path);
  for(const path of ['scripts/data.json','assets/art-production/spec.json','web/package.json','characters/../secret.json','characters/.private/data.json','README.md'])assert.equal(isCampaignSetting(path),false,path);
});
test('more than 200 settings and 1.5 million characters reach the attachment and launcher as one complete pinned snapshot',async()=>{
  const files={...base,'lore/세계 설정.md':'설정'.repeat(400000),'economy/history.md':'x'.repeat(800000)};
  for(let i=0;i<215;i++)files[`lore/nested/rule-${i}.md`]='Approved rule';
  const {fetcher,requests}=source(files),snapshot=await loadCampaignSettings({fetcher});
  assert.equal(snapshot.paths.length,221);
  assert.equal(snapshot.repository_index.length,223);
  assert.ok(requests.some(url=>url.includes(encodeURIComponent('세계 설정.md'))));
  assert.ok(requests.slice(2).every(url=>url.includes(sha)));
  const attachment=campaignSettingsAttachment(snapshot);
  assert.ok(attachment.file.content.length>1500000);
  assert.match(attachment.instruction,/file_count:221/);
  assert.ok(attachment.file.content.includes('<<<GITHUB_SETTING lore/세계 설정.md>>>'));
  assert.ok(!attachment.file.content.includes('<<<GITHUB_SETTING assets/characters/portrait.png>>>'));
  const state=defaults();state.introDraft={step:'name'};
  assert.ok(validateChatHandoff({settings:snapshot,state,stage:'setup',action:'Read the entire snapshot'}));
});
test('one unreachable new nested rule prevents a misleading complete snapshot',async()=>{
  const files={...base,'lore/nested/new-rule.md':'Required rule'},progress=[];
  await assert.rejects(loadCampaignSettings({...source(files,{fail:'lore/nested/new-rule.md'}),onProgress:p=>progress.push(p)}),/읽기 실패/);
  assert.ok(!progress.some(p=>p.includes('읽기 완료')));
});
