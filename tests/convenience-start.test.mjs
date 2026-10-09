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


const drain=()=>new Promise(resolve=>setImmediate(resolve));
test('region question opens before downloads finish and departure creates a local scene without sending setup',async()=>{
 const h=uiHarness(),oldFetch=globalThis.fetch;
 try{
  let release;const gate=new Promise(resolve=>release=resolve);const fetcher=source(base);globalThis.fetch=async url=>{await gate;return fetcher(url);};document.dispatchEvent=()=>true;document.querySelectorAll=()=>[];
  window.__ERCEDIA_CONFIG__.features=['settings-attachment'];let game;
  const state=defaults(),chat=mountChatUI(state,{embedded:true,render(){game?.render();},persist(){},storage:{},getIntro:()=>game});
  game=mountNewGame(state,{embedded:true,render(){game?.render();},persist(){},chat});
  assert.equal(await game.begin(),true);assert.equal(state.introDraft.step,'origin');assert.equal(chat.isPending(),false);assert.ok(!h.messages.some(m=>m.type==='action'));
  h.get('intro-options').children[2].onclick();h.get('intro-next').onclick();assert.equal(state.introDraft.step,'name');
  h.get('intro-input').oninput({target:{value:'새 여행자'}});h.get('intro-next').onclick();
  h.get('intro-options').children[0].onclick();assert.equal(state.introDraft.step,'calling');
  h.get('intro-options').children[0].onclick();h.get('intro-next').onclick();h.get('intro-options').children[0].onclick();h.get('intro-next').onclick();
  assert.equal(state.introDraft.step,'passive');h.get('intro-options').children[0].onclick();h.get('intro-next').onclick();h.get('intro-goal').oninput({target:{value:'최고의 전사가 된다'}});h.get('intro-next').onclick();assert.equal(state.introDraft.step,'departure');
  h.get('intro-next').onclick();assert.equal(state.player.name,'');release();await drain();await drain();
  const actions=h.messages.filter(m=>m.type==='action');assert.equal(actions.length,0);
  assert.equal(state.player.name,'새 여행자');assert.equal(state.starting_kingdom,'루메린');assert.equal(state.player.hp,100);assert.equal(state.background,true);assert.equal(state.introDraft,undefined);assert.equal(chat.isPending(),false);
  h.get('intro-next').onclick();assert.equal(h.messages.filter(m=>m.type==='action').length,0);
 }finally{globalThis.fetch=oldFetch;h.close();}
});
test('failed required rules allow questions but block departure without replacing an existing game',async()=>{
 const h=uiHarness(),oldFetch=globalThis.fetch;
 try{
  const files={...base};delete files[path];globalThis.fetch=source(files);document.dispatchEvent=()=>true;document.querySelectorAll=()=>[];
  const state=defaults();state.player.name='기존 인물';state.player.hp=32;const before=structuredClone(state),sent=[];let game;
  game=mountNewGame(state,{embedded:true,render(){game?.render();},persist(){},chat:{controls(){},reportStatus(){},isPending:()=>false,submit:s=>sent.push(s)}});
  assert.equal(await game.begin(),true);await drain();assert.equal(state.introDraft.step,'origin');
  Object.assign(state.introDraft,{step:'departure',name:'새 인물',kingdom:'south',lordship:'S1',answers:{calling:'guard',response:'protect'},passive:'steadfast',goal:'여행'});game.render();h.get('intro-next').onclick();await drain();
  assert.match(h.get('intro-error').textContent,/필수 설정 누락/);assert.deepEqual(state.player,before.player);assert.deepEqual(state.scene,before.scene);assert.equal(sent.length,0);assert.equal(game.isStarting(),false);
 }finally{globalThis.fetch=oldFetch;h.close();}
});
