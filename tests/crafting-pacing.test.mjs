import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize} from '../web/state.js';
import {actionPrompt} from '../web/scene.js';
import {validateCraftingAttempt,isCraftingAttempt} from '../web/crafting-policy.js';
import {mountChatUI} from '../web/chat-ui.js';
import {initialPlayer} from '../web/intro-model.js';
import {ensureEngine,equipItem} from '../web/engine-model.js';
import {uiHarness} from './ui-harness.mjs';
const failure='단독 검 제작 시도 실패. 원인: 제작 재료 미보유, 단조 설비 부재, 검 제작법 및 작업 조건 미충족. 완성품·경험치·기술 습득 없음. HP·MP·소지금 변화 없음.';
const scene=(reply,text,extra={})=>({schema_version:1,type:'ercedia_scene',scene_id:'craft-'+reply,reply_to:reply,location:'마을',time:'09:00',background_id:null,npc:null,dialogue:[{speaker:'시스템',text}],choices:[],...extra});
test('both prompt modes prioritize one-response basic crafting and general game pacing for every ordinary action',()=>{
  const state=defaults();for(const compact of [false,true]){
    for(const action of ['단독으로 하급 검을 제작한다','마을로 이동한다','주변 사람과 인사한다']){
      const prompt=actionPrompt(state,action,'p',{compact});assert.match(prompt,/플레이 속도·게임적 성사 우선/);assert.match(prompt,/하급 검 등 기본 제작은 한 응답에서 완성·획득/);assert.match(prompt,/현실의 플레이 대기시간/);
    }
    assert.match(actionPrompt(state,'단독으로 하급 검을 제작한다','p',{compact}),/전체 inventory에 1개 추가/);
  }
});
test('the reported no-condition, no-action failure is rejected while information questions remain read-only',()=>{
  const state={...defaults(),gameState:{date:'650-07-01',time:'09:00'}};
  assert.throws(()=>validateCraftingAttempt(state,'단독으로 하급 검을 제작한다',scene('one',failure)),/제작 시도를 조건 부족/);
  assert.equal(isCraftingAttempt('검 제작 조건을 알려줘'),false);assert.equal(isCraftingAttempt('재료가 없지만 검을 만들어봐'),true);
  assert.doesNotThrow(()=>validateCraftingAttempt(state,'검 제작 조건을 알려줘',scene('info',failure)));
});
test('the actual transport requests correction without applying the failed turn, then grants one usable registered sword',()=>{
  const h=uiHarness();try{
    const state={...defaults(),player:initialPlayer('시험'),wallet_copper:0,gameState:{date:'650-07-01',time:'09:00'},inventory:[{name:'기존 물건',category:'misc',quantity:1}]};state.player.job='검사';
    let saves=0;const chat=mountChatUI(state,{embedded:true,render(){},persist(){saves++;}});
    chat.submit('재료와 단조 시설이 없어도 단독으로 하급 검을 제작한다');
    const first=h.messages.filter(m=>m.type==='action').at(-1),before=structuredClone(state);
    h.reply('scene',JSON.stringify(scene(first.payload.requestId,failure)));assert.deepEqual(state,before);assert.equal(saves,0);
    const second=h.messages.filter(m=>m.type==='action').at(-1);assert.notEqual(second.payload.requestId,first.payload.requestId);assert.match(second.payload.text,/단독·독학 의도/);
    const result=scene(second.payload.requestId,'주변의 흔한 철 조각과 임시 작업대로 검을 완성했다. 수습의 낡은 철검 획득!',{inventory:[...state.inventory,{id:'ER-EQ-001',name:'수습의 낡은 철검',category:'equipment',quantity:1}],game_state:{date:'650-07-01',time:'10:00'},gm_rulings:[{id:'solo-sword',topic:'단독 기본 제작',decision:'흔한 소재와 임시 도구로 하급 검 제작을 한 장면에서 완료했다.'}]});
    h.reply('scene',JSON.stringify(result));assert.equal(saves,1);assert.equal(state.inventory.length,2);assert.equal(state.inventory.find(i=>i.id==='ER-EQ-001').quantity,1);assert.equal(state.wallet_copper,0);assert.equal(state.gameState.time,'10:00');
    const engine=ensureEngine(state),instance=engine.instances.find(i=>i.catalog_id==='ER-EQ-001');equipItem(state,instance.instance_id);assert.equal(state.engine.bonuses.weapon_attack,2);
    assert.equal(normalize(state).gm_rulings[0].id,'solo-sword');h.reply('scene',JSON.stringify(result));assert.equal(saves,1);assert.equal(state.inventory.find(i=>i.id==='ER-EQ-001').quantity,1);
  }finally{h.close();}
});
