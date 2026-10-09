// Explicit live verification; not part of offline tests. Uses the production new-game
// controller and actual GitHub reads. The GM acknowledgement below is simulated.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {mountNewGame} from '../web/new-game.js';
import {mountChatUI} from '../web/chat-ui.js';
import {defaults} from '../web/state.js';
import {uiHarness} from './ui-harness.mjs';
const realTimeout=globalThis.setTimeout,realClearTimeout=globalThis.clearTimeout;
const h=uiHarness();
globalThis.setTimeout=realTimeout;globalThis.clearTimeout=realClearTimeout;
try{
  window.__ERCEDIA_CONFIG__.features=['settings-attachment'];
  document.dispatchEvent=()=>true;
  const state=defaults(),chat=mountChatUI(state,{embedded:true,render(){},persist(){},storage:{}});
  const game=mountNewGame(state,{embedded:true,render(){},persist(){},chat});
  assert.equal(await game.begin(),true);
  const action=h.messages.find(m=>m.type==='action').payload;
  const content=action.settingsFile.content,path='GAMEPLAY_CONVENIENCE_RULES.md';
  assert.match(content,/운영 규칙 v1\.1/);
  assert.match(content,/포괄적 선제 후처리 원칙/);
  assert.ok(content.includes(`<<<GITHUB_SETTING ${path}>>>`));
  assert.match(action.text,/예시에 없는 상황/);
  assert.match(action.text,/이동·치료·귀환·휴식·반복 절차/);
  assert.equal(state.introDraft.step,'name');assert.equal(state.player.name,'');
  const sha=action.settingsFile.name.match(/[a-f0-9]{40}/)[0];
  const count=(content.match(/<<<GITHUB_SETTING /g)||[]).length;
  assert.ok(chat.isPending());
  h.reply('scene',JSON.stringify({schema_version:1,type:'ercedia_scene',scene_id:'live-settings-verification',reply_to:action.requestId,location:'준비',time:'시작 전',background_id:null,npc:null,dialogue:[{speaker:'시스템',text:'설정 읽기 확인'}],choices:[],settings_loaded:{commit:sha,file_count:count}}));
  assert.equal(chat.isPending(),false);assert.equal(state.player.name,'');
  const result={verified_at:new Date().toISOString(),settings_commit:sha,setting_files:count,attachment_name:action.settingsFile.name,attachment_characters:content.length,required_rule:path,version:'1.1',new_game_stage:state.introDraft.step,proactive_instruction:true,complete_rule_attached:true,matching_ack_accepted:true,gm_acknowledgement:'simulated; actual ChatGPT reading and play not verified'};
  if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}finally{h.close();}
