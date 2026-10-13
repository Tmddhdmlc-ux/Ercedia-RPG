import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {narrativeFocus} from '../web/narrative-context.js';
import {actionPrompt} from '../web/scene.js';
import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';

function state(){const s=defaults();s.campaign_id='dialogue-continuity';s.gameState={region:'W1',place:'작업장',date:'650-07-01',time:'10:58'};s.scene={location:'작업장',npc:{id:'ER-COM-001',speaker:'브란 오크펠',outfit:'none',emotion:'base'},dialogue:[{speaker:'나레이션',text:'브란이 손을 내밀었다.'},...Array.from({length:4},(_,i)=>({speaker:'브란 오크펠',speaker_id:'ER-COM-001',text:'대화 '+i}))],choices:[{id:'hand',text:'악수한다',kind:'action'},{id:'decline',text:'정중히 악수를 거절한다',kind:'dialogue'}]};s.quest_log=[];return s;}
test('ordinary replies retain earlier offers without adjudicating acceptance',()=>{
 const s=state(),before=structuredClone(s),f=narrativeFocus(s,'지금은 괜찮아요');
 assert.equal(f.previous_beat.dialogue[0].text,'브란이 손을 내밀었다.');assert.equal(f.previous_beat.dialogue.length,5);
 assert.deepEqual(f.previous_beat.choices,['악수한다','정중히 악수를 거절한다']);assert.match(f.interaction_rule,/제안은 수락이 아니며/);assert.equal(f.threads,undefined);assert.deepEqual(s,before);
});
test('shared memory is bounded by present actors and explicit player visibility',()=>{
 const s=state();s.npc_life={npcs:{},memories:[...Array.from({length:8},(_,i)=>({npc_id:'ER-COM-001',player_witnessed:true,date:'650-07-01',action:'행동 '+i,result:'공개 '+i+'x'.repeat(600),follow_up:'y'.repeat(600)})),{npc_id:'ER-COM-001',player_witnessed:false,result:'PRIVATE_SENTINEL'},{npc_id:'ER-COM-002',player_witnessed:true,result:'ABSENT_SENTINEL'},{npc_id:'ER-COM-001',result:'UNKNOWN_VISIBILITY_SENTINEL'}]};
 const before=structuredClone(s),f=narrativeFocus(s,'기억나요?');assert.equal(f.shared_memories.length,2);assert.equal(f.shared_memories[0].action,'행동 6');assert.equal(f.shared_memories[1].action,'행동 7');assert.equal(f.shared_memories[0].result.length,180);assert.equal(f.shared_memories[0].follow_up.length,120);assert.ok(!JSON.stringify(f).includes('SENTINEL'));assert.deepEqual(s,before);
});
test('full, compact and delta requests keep the same public conversational anchor',()=>{
 const s=state(),sync=createTurnSync();sync.acknowledge(sync.prepare(s,'인사한다'));const p=sync.prepare(s,'정중히 거절한다');
 const head=p=>JSON.parse(p.split('[현재 장면과 행동]\n')[1].split('\n\n')[0]);
 const prompts=[actionPrompt(s,'정중히 거절한다','r'),actionPrompt(s,'정중히 거절한다','r',{compact:true}),incrementalPrompt(s,'정중히 거절한다','r',p)];
 for(const prompt of prompts){const f=head(prompt);assert.deepEqual(f.previous_beat,narrativeFocus(s).previous_beat);assert.equal(f.last_dialogue,undefined);assert.equal(f.scene_entry_rule,narrativeFocus(s).scene_entry_rule);assert.match(prompt,/직전 제안·질문·접촉 시도/);}
 const wire=JSON.parse(prompts[2].split('현재 상태:\n')[1].split('\n\n플레이어')[0]);assert.equal(wire.state.turn_facts.narrative_focus,undefined);assert.equal(p.payload.state.turn_facts.narrative_focus.previous_beat.dialogue.length,5);
});
test('solo scenes do not manufacture interlocutors or shared memories',()=>{
 const s=state();s.scene.npc=null;const f=narrativeFocus(s,'잠시 쉰다');assert.equal(f.voices,undefined);assert.equal(f.shared_memories,undefined);assert.equal(f.interaction_rule,undefined);assert.equal(f.scene_entry_rule,undefined);
});
