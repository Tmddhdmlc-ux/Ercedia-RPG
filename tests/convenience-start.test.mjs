import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCampaignSettings,campaignSettingsAttachment,legacyCampaignPrompt} from '../web/campaign-settings.js';
import {mountNewGame} from '../web/new-game.js';
import {mountChatUI} from '../web/chat-ui.js';
import {defaults} from '../web/state.js';
import {uiHarness} from './ui-harness.mjs';
const path='GAMEPLAY_CONVENIENCE_RULES.md',sha='e'.repeat(40);
const rules=readFileSync(new URL('../GAMEPLAY_CONVENIENCE_RULES.md',import.meta.url),'utf8');
const base={'BOOTSTRAP.md':'Start rules','WORLD.md':'World','characters/player_default.json':'{}','characters/serin.json':'{}',[path]:rules};
const source=files=>async url=>({ok:true,json:async()=>url.includes('/git/ref/')?{object:{sha}}:{tree:Object.keys(files).map(path=>({path,type:'blob'}))},text:async()=>files[decodeURIComponent(url.split(sha+'/')[1])]});

test('missing, old or incomplete convenience rules block loading and prompt generation',async()=>{
  for(const content of [undefined,rules.replace('v1.1','v1.0'),'# 에르세디아 RPG — 게임적 허용·자동 후처리 운영 규칙 v1.1']){
    const files={...base,[path]:content};if(content===undefined)delete files[path];
    const progress=[];
    await assert.rejects(loadCampaignSettings({fetcher:source(files),onProgress:p=>progress.push(p)}),/GAMEPLAY_CONVENIENCE_RULES.md/);
    assert.ok(!progress.some(p=>p.includes('읽기 완료')));
    const snapshot={sha,files,paths:Object.keys(files)};
    assert.throws(()=>campaignSettingsAttachment(snapshot),/v1.1/);
    assert.throws(()=>legacyCampaignPrompt(snapshot),/v1.1/);
  }
});

test('new-game start downloads full v1.1 rules and sends them before character creation',async()=>{
  const h=uiHarness(),oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=source(base);document.dispatchEvent=()=>true;
    window.__ERCEDIA_CONFIG__.features=['settings-attachment'];
    const state=defaults(),chat=mountChatUI(state,{embedded:true,render(){},persist(){},storage:{}});
    const game=mountNewGame(state,{embedded:true,render(){},persist(){},chat});
    assert.equal(await game.begin(),true);
    const action=h.messages.find(m=>m.type==='action').payload;
    const content=action.settingsFile.content;
    assert.ok(content.includes(`<<<GITHUB_SETTING ${path}>>>\n${rules}\n<<<END_GITHUB_SETTING>>>`));
    assert.ok(content.indexOf('<<<GITHUB_SETTING BOOTSTRAP.md>>>')<content.indexOf(`<<<GITHUB_SETTING ${path}>>>`));
    assert.ok(content.indexOf(`<<<GITHUB_SETTING ${path}>>>`)<content.indexOf('<<<GITHUB_SETTING WORLD.md>>>'));
    for(const text of ['v1.1','예시에 없는 상황','선제적으로','이동·치료·귀환·휴식·반복 절차','중요한 선택','한 번만'])assert.ok(action.text.includes(text),text);
    assert.equal(state.introDraft.step,'name');assert.equal(state.player.name,'');
    assert.equal(chat.isPending(),true);
    h.reply('scene',JSON.stringify({schema_version:1,type:'ercedia_scene',scene_id:'ready',reply_to:action.requestId,location:'준비',time:'시작 전',background_id:null,npc:null,dialogue:[{speaker:'시스템',text:'설정 읽기 완료'}],choices:[],settings_loaded:{commit:sha,file_count:Object.keys(base).length}}));
    assert.equal(chat.isPending(),false);assert.equal(state.player.name,'');
  }finally{globalThis.fetch=oldFetch;h.close();}
});

test('failed required rules preserve an existing game and never send a setup request',async()=>{
  const h=uiHarness(),oldFetch=globalThis.fetch;
  try{
    const files={...base};delete files[path];globalThis.fetch=source(files);
    const state=defaults();state.player.name='기존 인물';state.player.hp=32;
    const before=structuredClone(state),sent=[];
    const game=mountNewGame(state,{embedded:true,render(){},persist(){},chat:{controls(){},reportStatus(){},isPending:()=>false,sendSettings:s=>sent.push(s)}});
    await assert.rejects(game.begin(),/필수 설정 누락/);
    assert.deepEqual(state,before);assert.equal(sent.length,0);
  }finally{globalThis.fetch=oldFetch;h.close();}
});
