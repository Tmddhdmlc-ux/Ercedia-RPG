import {readFileSync} from 'node:fs';
const convenienceRules=readFileSync(new URL('../GAMEPLAY_CONVENIENCE_RULES.md',import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import {uiHarness} from './ui-harness.mjs';
import {mountChatUI} from '../web/chat-ui.js';
import {defaults} from '../web/state.js';
const sha='c'.repeat(40);
const files={'GAMEPLAY_CONVENIENCE_RULES.md':convenienceRules,'BOOTSTRAP.md':'GM only','WORLD.md':'Latest world','characters/player_default.json':'{}','characters/serin.json':'{}','economy/nested/new.json':'{"rule":"approved"}'};
function setup(){
  const h=uiHarness(),oldFetch=globalThis.fetch;window.__ERCEDIA_CONFIG__.features=['settings-attachment'];
  globalThis.fetch=async url=>({ok:true,json:async()=>url.includes('/git/ref/')?{object:{sha}}:{tree:Object.keys(files).map(path=>({type:'blob',path}))},text:async()=>files[decodeURIComponent(url.split(sha+'/')[1])]});
  const state=defaults();state.player.name='청명';state.player.hp=32;state.campaign_id='current-campaign';state.inventory=[];
  const chat=mountChatUI(state,{embedded:true,render(){},persist(){},storage:{}});
  return {h,state,chat,close(){globalThis.fetch=oldFetch;h.close();},actions:()=>h.messages.filter(m=>m.type==='action').map(m=>m.payload)};
}
function ack(id,extra={}){return {schema_version:1,type:'ercedia_scene',scene_id:'settings-ack',reply_to:id,location:'설정 동기화',time:'현재',background_id:null,npc:null,dialogue:[{speaker:'시스템',text:'확인 완료'}],choices:[],settings_loaded:{commit:sha,file_count:6},...extra};}
test('running campaign settings refresh discovers new rules, requires matching confirmation and preserves all progress',async()=>{
  const t=setup();try{
    const before=structuredClone(t.state);await t.chat.refreshSettings();
    const first=t.actions()[0];assert.ok(first.settingsFile.content.includes('economy/nested/new.json'));
    assert.match(first.text,/새 게임이나 다음 턴을 시작하지/);assert.ok(!first.text.includes('이름·성별·직업·시작 지역은 아직 선택 전'));
    t.h.reply('scene',JSON.stringify(ack(first.requestId,{settings_loaded:{commit:'d'.repeat(40),file_count:6}})));
    assert.deepEqual(t.state,before);assert.equal(t.actions().length,2);
    const retry=t.actions()[1];assert.match(retry.text,/새 채팅방 설정 등록/);
    t.h.reply('scene',JSON.stringify(ack(retry.requestId)));
    assert.deepEqual(t.state,before);assert.equal(t.chat.isPending(),false);assert.match(t.h.get('connection-status').textContent,/동기화 완료/);
    t.chat.submit('안부를 묻는다.');
    const continuation=t.actions().at(-1);
    assert.equal(continuation.settingsFile,undefined);
    assert.ok(!continuation.text.includes('"dungeon_pools"'));
    assert.match(continuation.text,/확인한 BOOTSTRAP.md/);
  }finally{t.close();}
});
test('refresh acknowledgement cannot grant items or advance the world, including manually applied JSON',async()=>{
  const t=setup();try{
    const before=structuredClone(t.state);await t.chat.refreshSettings();
    t.chat.apply(JSON.stringify(ack(t.actions()[0].requestId,{inventory:[]})),{manual:true});
    assert.deepEqual(t.state,before);assert.match(t.h.get('connection-status').textContent,/진행 변경/);
  }finally{t.close();}
});
test('failed download and an old download crossing a restored save cannot send a replacement campaign',async()=>{
  const t=setup();try{
    const before=structuredClone(t.state);globalThis.fetch=async()=>({ok:false,status:503});await t.chat.refreshSettings();
    assert.deepEqual(t.state,before);assert.equal(t.actions().length,0);
    let resume;globalThis.fetch=url=>url.includes('/git/ref/')?new Promise(resolve=>{resume=resolve;}):Promise.resolve({ok:true,json:async()=>({tree:Object.keys(files).map(path=>({type:'blob',path}))}),text:async()=>files[decodeURIComponent(url.split(sha+'/')[1])]});
    const loading=t.chat.refreshSettings();const replacement=defaults();replacement.player.name='다른 인물';t.chat.restore(replacement);
    // Complete the pending ref, then supply the rest of the snapshot.
    resume({ok:true,json:async()=>({object:{sha}})});await loading;
    assert.equal(t.state.player.name,'다른 인물');assert.equal(t.actions().length,0);
  }finally{t.close();}
});
