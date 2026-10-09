import test from 'node:test';
import assert from 'node:assert/strict';
import {mountChatUI} from '../web/chat-ui.js';
import {defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {uiHarness} from './ui-harness.mjs';

function setup(){
  const h=uiHarness(),state={...defaults(),player:initialPlayer('여행자')};let saves=0;
  const chat=mountChatUI(state,{embedded:true,render(){},persist(){saves++;}});
  const actions=()=>h.messages.filter(m=>m.type==='action').map(m=>m.payload);
  const scene=(requestId,extra={})=>({schema_version:1,type:'ercedia_scene',scene_id:'scene-'+requestId,reply_to:requestId,location:'솔브린 마을',time:'오후',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'검증된 장면'}],choices:[],...extra});
  const reply=(requestId,extra)=>h.reply('scene',JSON.stringify(scene(requestId,extra)));
  chat.submit('주변을 살핀다');
  return {h,state,chat,actions,scene,reply,saves:()=>saves};
}
test('two automatic repairs repeat the original uncommitted action; success applies once',()=>{
  const t=setup();try{
    const before=structuredClone(t.state),first=t.actions()[0];
    t.reply(first.requestId,{choices:[{id:'bad',text:'하나뿐인 선택지'}]});
    assert.deepEqual(t.state,before);assert.equal(t.saves(),0);
    const second=t.actions()[1];assert.notEqual(second.requestId,first.requestId);
    assert.match(second.text,/응답 수정 요청 1\/2/);assert.ok(second.text.includes(first.requestId));
    assert.ok(second.text.includes('주변을 살핀다'));assert.match(second.text,/choices는/);
    assert.match(t.h.get('connection-status').textContent,/응답 수정 중/);
    t.reply(second.requestId,{choices:[{id:'bad',text:'하나'}]});
    const third=t.actions()[2];assert.match(third.text,/응답 수정 요청 2\/2/);
    t.reply(third.requestId);assert.equal(t.state.scene.reply_to,third.requestId);assert.equal(t.saves(),1);
    t.reply(third.requestId);assert.equal(t.saves(),1);assert.equal(t.actions().length,3);
  }finally{t.h.close();}
});
test('third rejected response stops; explicit retry preserves the chain without another automatic budget',()=>{
  const t=setup();try{
    const before=structuredClone(t.state);
    for(let i=0;i<3;i++)t.reply(t.actions().at(-1).requestId,{choices:[{id:'bad',text:'하나'}]});
    assert.equal(t.actions().length,3);assert.equal(t.chat.isPending(),false);assert.deepEqual(t.state,before);
    assert.equal(t.h.get('retry-response').hidden,false);
    t.h.get('retry-response').onclick();t.h.get('retry-response').onclick();assert.equal(t.actions().length,4);
    t.reply(t.actions().at(-1).requestId,{choices:[{id:'bad',text:'하나'}]});assert.equal(t.actions().length,4);
    t.h.get('retry-response').onclick();t.reply(t.actions().at(-1).requestId);assert.equal(t.saves(),1);
  }finally{t.h.close();}
});
test('obsolete invalid and valid replies cannot repair or commit the current request',()=>{
  const t=setup();try{
    const first=t.actions()[0].requestId;t.reply(first,{choices:[{id:'bad',text:'하나'}]});
    const second=t.actions()[1].requestId;
    t.reply(first);t.reply(first,{choices:[{id:'bad',text:'하나'}]});
    t.reply('unrelated',{choices:[{id:'bad',text:'하나'}]});
    assert.equal(t.actions().length,2);assert.equal(t.saves(),0);assert.equal(t.chat.isPending(),true);
    t.reply(second);assert.equal(t.saves(),1);
  }finally{t.h.close();}
});
test('JSON syntax errors delivered to the frame repair once and stale copies cannot restart it',()=>{
  const t=setup();try{
    const first=t.actions()[0].requestId,bad=`{"type":"ercedia_scene","reply_to":"${first}", broken}`;
    t.h.reply('scene',bad);assert.equal(t.actions().length,2);t.h.reply('scene',bad);
    assert.equal(t.actions().length,2);t.reply(t.actions()[1].requestId);assert.equal(t.saves(),1);
  }finally{t.h.close();}
});
test('transport failures never automatically resend, including failure during repair',()=>{
  const t=setup();try{
    t.h.reply('action-error','GPT 입력 전달 실패');assert.equal(t.actions().length,1);assert.equal(t.chat.isPending(),false);
    t.chat.submit('주변을 살핀다');t.reply(t.actions().at(-1).requestId,{choices:[{id:'bad',text:'하나'}]});
    assert.equal(t.actions().length,3);t.h.reply('action-error','전송 여부를 확인하세요');
    assert.equal(t.actions().length,3);assert.equal(t.chat.isPending(),false);assert.equal(t.h.get('retry-response').hidden,false);
  }finally{t.h.close();}
});
test('missing reply identity is repaired, but malformed manual input does not send a GPT message',()=>{
  const t=setup();try{
    t.reply(t.actions()[0].requestId,{reply_to:undefined});assert.equal(t.actions().length,2);
    t.chat.apply('not JSON',{manual:true});assert.equal(t.actions().length,2);assert.equal(t.chat.isPending(),false);
  }finally{t.h.close();}
});
test('late replies after cancellation or save restore never apply and old retry is discarded',()=>{
  const t=setup();try{
    const id=t.actions()[0].requestId;t.h.get('cancel-wait').onclick();t.reply(id);assert.equal(t.saves(),0);
    t.chat.submit('다른 행동');const id2=t.actions().at(-1).requestId;
    t.reply(id2,{choices:[{id:'bad',text:'하나'}]});const id3=t.actions().at(-1).requestId;
    t.chat.restore({...defaults(),player:initialPlayer('새 여행자')});t.reply(id3);
    assert.equal(t.saves(),0);assert.equal(t.state.player.name,'새 여행자');assert.equal(t.h.get('retry-response').hidden,true);
  }finally{t.h.close();}
});
test('world settlement failure leaves currency, inventory and event ledgers unchanged before repair',()=>{
  const t=setup();try{
    const before=structuredClone(t.state);
    t.reply(t.actions()[0].requestId,{system_events:[{event_id:'rep',kind:'reputation',kingdom:'west',delta:20,reason:'검증 사건'},{event_id:'party',kind:'party',members:['missing'],reason:'잘못된 동료'}]});
    assert.deepEqual(t.state,before);assert.equal(t.saves(),0);assert.equal(t.actions().length,2);
    t.reply(t.actions()[1].requestId);assert.equal(t.saves(),1);
  }finally{t.h.close();}
});


test('malformed first-meeting life records repair with exact required evidence and automatic memory guidance',()=>{
 const t=setup();try{
  const npc={id:'ER-COM-007',speaker:'시그나 론',outfit:'none',emotion:'base'},game_state={region:'W1',place:'장터',date:'650-07-03',time:'10:15'},before=structuredClone(t.state),first=t.actions()[0];
  t.reply(first.requestId,{npc,location:'장터',game_state,life_events:[{event_id:'bad-first',date:'650-07-03',npc_id:npc.id,action:'첫 만남',result:'관찰 일을 제안했다',location:'장터',affection_delta:0,player_witnessed:true}]});
  assert.deepEqual(t.state,before);assert.equal(t.saves(),0);const repaired=t.actions()[1];assert.match(repaired.text,/source_id 문자열 형식/);assert.match(repaired.text,/NPC 생활 규격/);assert.match(repaired.text,/엔진이 자동 기억/);assert.match(repaired.text,/kind=experience/);assert.match(repaired.text,/event_id,kind,date,source_id,reason/);
  t.reply(repaired.requestId,{npc,location:'장터',game_state});assert.equal(t.saves(),1);assert.equal(t.state.npc_life.memories.filter(m=>m.npc_id===npc.id&&m.action==='첫 만남').length,1);assert.equal(t.actions().length,2);
 }finally{t.h.close();}
});

test('departure participant and intermediate location errors explain the valid scene boundary without mutating failed saves',()=>{
 for(const extra of [{dialogue:[{speaker:'브란 오크펠',speaker_id:'ER-COM-001',text:'쉬게.'}]},{world_events:[{event_id:'farewell',kind:'action',target_id:'farewell',location:'출발지 장터',proof:'작별했다'}]}]){
  const t=setup();try{const before=structuredClone(t.state);t.reply(t.actions()[0].requestId,extra);assert.deepEqual(t.state,before);assert.equal(t.saves(),0);const repair=t.actions()[1];assert.match(repair.text,/장소 기록 규격/);assert.match(repair.text,/다른 장소에서 한 일을 최종 장소에서 한 것처럼 바꾸지/);assert.match(repair.text,/목표 검증에 필요한 중간 장소 사건은 생략하지/);t.reply(repair.requestId);assert.equal(t.saves(),1);assert.equal(t.actions().length,2);}finally{t.h.close();}
 }
});

test('oversized public ruling repairs identify the exact field and limit without weakening validation',()=>{
 const t=setup();try{const before=structuredClone(t.state);t.reply(t.actions()[0].requestId,{gm_rulings:[{id:'long',topic:'실제 재진',decision:'가'.repeat(801)}]});assert.deepEqual(t.state,before);assert.equal(t.saves(),0);const repair=t.actions()[1];assert.match(repair.text,/decision는 빈 문자열이 아닌 800자 이하/);t.reply(repair.requestId,{gm_rulings:[{id:'short',topic:'실제 재진',decision:'회복 중이며 무거운 활동은 제한한다.'}]});assert.equal(t.saves(),1);assert.equal(t.state.gm_rulings.at(-1).id,'short');}finally{t.h.close();}
});
