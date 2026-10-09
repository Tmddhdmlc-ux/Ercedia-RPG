import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../web/state.js';
import {actionPrompt,turnContext,turnDomains} from '../web/scene.js';
import {hasActiveQuestStory} from '../web/quest-story.js';
import {isCampaignSetting} from '../web/campaign-settings.js';
import {uiHarness} from './ui-harness.mjs';
import {mountChatUI} from '../web/chat-ui.js';
import {initializeNameOnlyPlayer} from '../web/legacy-player.js';

test('all GM request paths preserve compulsory threat, player response and non-duplicate aftermath',()=>{
  const s=defaults();for(const compact of [false,true])for(const action of ['自分を紹介する','自材を渡す','자재를 넘긴다.','주민에게 말을 건다.','의뢰 완료를 보고한다.']){
    const prompt=actionPrompt(s,action,'story-request',{compact});
    assert.match(prompt,/최소 한 번 반드시/);assert.match(prompt,/단순 운반·인계·보상만으로 끝내/);
    assert.match(prompt,/자동 후처리로 생략하지/);assert.match(prompt,/전투\/조사\/협상\/구조\/철수/);
    assert.match(prompt,/실제 기억/);assert.match(prompt,/이미 수락한 목표·보상과 완료 기록은 유지/);
    assert.match(prompt,/평온한 일상은 매 클릭마다 위협을 강제하지/);
    assert.ok(prompt.endsWith(action));assert.match(prompt,/story-request/);
  }
});
test('accepted quests disable brief dialogue even for actions without quest keywords',()=>{
  const s=defaults();for(const status of ['accepted','active','ready_to_report']){
    s.quest_log=[{id:'delivery-existing',status,issuer_npc_id:'ER-COM-001',reward:{currency:80}}];
    const before=structuredClone(s);assert.ok(hasActiveQuestStory(s));
    const prompt=actionPrompt(s,'자재를 넘긴다.','r',{compact:true});assert.ok(!prompt.includes('[일상 대화 응답]'));
    assert.deepEqual(s,before);
  }
  for(const status of ['offered','completed','failed','abandoned','declined','expired']){
    s.quest_log=[{id:'delivery-existing',status}];assert.equal(hasActiveQuestStory(s),false);
    assert.ok(actionPrompt(s,'안부를 묻는다.','r',{compact:true}).includes('[일상 대화 응답]'));
  }
});
test('actual UI delivery requests include the policy and preserve accepted rewards and state',()=>{
  const h=uiHarness(),s=defaults();try{
    s.player.name='모험가';s.gameState={region:'W1',place:'솔브린 마을'};
    initializeNameOnlyPlayer(s);
    s.quest_log=[{id:'delivery-existing',status:'accepted',reward:{currency:80},issuer_npc_id:'ER-COM-001'}];
    const before=structuredClone(s),chat=mountChatUI(s,{embedded:true,render(){},persist(){}});
    chat.submit('자재를 넘긴다.');const request=h.messages.find(m=>m.type==='action').payload;
    assert.match(request.text,/QUEST_STORY_RULES.md 적용/);assert.ok(!request.text.includes('[일상 대화 응답]'));
    assert.deepEqual(s,before);
    const context=turnContext(s,turnDomains(s,'자재를 넘긴다.'));
    assert.ok(context.npc_catalog.nearby_npcs.some(n=>n.id==='ER-COM-001'));
  }finally{h.close();}
});
test('approved rule is discoverable and the bootstrap, quests and convenience docs link it',()=>{
  assert.ok(isCampaignSetting('QUEST_STORY_RULES.md'));
  for(const name of ['BOOTSTRAP.md','QUEST_SYSTEM.md','RPG_ADVENTURE_LOOP.md','GAMEPLAY_CONVENIENCE_RULES.md'])assert.ok(readFileSync(new URL('../'+name,import.meta.url),'utf8').includes('QUEST_STORY_RULES.md'));
  const rules=readFileSync(new URL('../QUEST_STORY_RULES.md',import.meta.url),'utf8');
  assert.match(rules,/최소 한 번 반드시 발생/);assert.match(rules,/이미 완료된 운송/);
});
