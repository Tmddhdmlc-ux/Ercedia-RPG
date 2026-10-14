import test from 'node:test';import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';import {initialPlayer} from '../web/intro-model.js';import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';import {turnDomains,normalizeScene,actionPrompt} from '../web/scene.js';import {mergeRulings} from '../web/gm-rulings.js';import {mountChatUI} from '../web/chat-ui.js';import {uiHarness} from './ui-harness.mjs';
const start=()=>({...defaults(),campaign_id:'sync-test',player:initialPlayer('시험'),gameState:{region:'W1',place:'마을',date:'650-07-01',time:'09:00'},scene:{schema_version:1,type:'ercedia_scene',scene_id:'start',location:'마을',time:'09:00',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'출발'}],choices:[]}});

test('declared 배워보고 and 배울 forms carry learning mechanics and interactive practice without granting progress',()=>{
 const s=start(),before=structuredClone(s);for(const action of ['목공 기초를 배워보고 싶어요.','나뭇결 보는 법을 배워보겠어요.','지금 배울 수 있나요?']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.growth,true,action);assert.deepEqual(p.payload.state.player,s.player);assert.deepEqual(p.payload.state.inventory,s.inventory);assert.ok(p.snapshot.turn_facts.narrative_focus.practice_interaction_rule,action);}assert.deepEqual(s,before);
});
test('remembering 배웠 or thanking someone for 배워준 does not start learning or practice',()=>{
 const s=start();for(const action of ['어제 배웠던 이야기가 기억나요.','배워준 이야기에 고마워요.','어제 배워본 순서가 기억나요.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.growth,false,action);assert.equal(p.snapshot.turn_facts.narrative_focus?.practice_interaction_rule,undefined,action);}
});

test('보고 embedded in looking or trying verbs does not add quest and adventure protocols to ordinary dialogue',()=>{
 const s=start(),before=structuredClone(s);for(const action of ['손목 상태를 살펴보고 싶다고 하셨잖아요.','마야를 바라보고 웃는다.','창밖을 지켜보고 있다.','마야에게 물어보고 싶다.','그분을 보고 싶어요.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.quest,false,action);assert.equal(p.domains.adventure,false,action);assert.equal(p.payload.state.turn_facts.quests,undefined);assert.ok(incrementalPrompt(s,action,'r',p).includes(action));}assert.deepEqual(s,before);
});
test('explicit and compound reports, quest choices and active stories still carry complete quest evidence',()=>{
 const s=start();for(const action of ['보고','마야에게 결과를 보고한다.','완료보고를 한다.','중간보고서를 확인한다.','상황보고 내용이 궁금하다.','한번 물어보고 마야에게 보고한다.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.quest,true,action);assert.equal(p.domains.adventure,true,action);assert.ok(p.payload.state.turn_facts.quests,action);}
 s.scene.choices=[{id:'handoff',kind:'quest',quest_id:'q',text:'결과를 전한다'}];assert.equal(createTurnSync().prepare(s,'결과를 전한다','handoff').domains.quest,true);
 s.quest_log=[{id:'q',status:'active',story_required:true,story:[]}];assert.equal(createTurnSync().prepare(s,'마야에게 물어보고 싶다').domains.quest,true);
});

test('ordinary checkpoints omit terminal audit duplication but retain outcomes, contracts, rewards and memory without mutating saves',()=>{
 const s=start();s.quest_event_ids=['accepted','proof','claim'];s.quest_log=[{id:'done',title:'천 확인',status:'completed',claim_event_id:'claim',reward:{currency:40,xp:10},story:[{kind:'resolve',description:'직원 휴식과 명부 오류 정정'}],objectives:[{id:'cloth',current:1,target:1,verification:{kind:'clue',target_id:'cloth'},evidence_ids:['proof']}],journal:['검증 원장 '.repeat(100)]},{id:'offered',title:'새 제안',status:'offered',objectives:[],journal:['아직 미수락']}];
 const before=structuredClone(s),sync=createTurnSync(),p=sync.prepare(s,'안부를 묻는다');const done=p.payload.state.quest_log[0];
 assert.equal(p.checkpoint,true);assert.equal(done.journal,undefined);assert.equal(done.objectives[0].evidence_ids,undefined);assert.equal(done.claim_event_id,'claim');assert.deepEqual(done.reward,s.quest_log[0].reward);assert.deepEqual(done.story,s.quest_log[0].story);assert.equal(done.objectives[0].current,1);assert.deepEqual(p.payload.state.quest_event_ids,s.quest_event_ids);assert.deepEqual(p.payload.state.quest_log[1],s.quest_log[1]);assert.deepEqual(p.payload.state.game_state,s.gameState);assert.deepEqual(s,before);
 sync.acknowledge(p);const mechanical=sync.prepare(s,'의뢰 결과를 보고한다');assert.deepEqual(mechanical.payload.state.quest_log,s.quest_log);assert.deepEqual(s,before);
});
test('named terminal contracts and mechanical request domains retain complete audit evidence',()=>{
 const s=start();s.quest_log=[{id:'done',title:'천 확인',status:'completed',objectives:[{evidence_ids:['proof']}],journal:['완료 증거']}];
 for(const action of ['천 확인은 어떻게 끝났지?','의뢰 기록을 묻는다','검을 구매한다','훈련한다','공격한다'])assert.deepEqual(createTurnSync().prepare(s,action).payload.state.quest_log,s.quest_log,action);
});

test('remembered learning in thanks or rest is not training; actual practice and training choices keep mechanics',()=>{
 const s=start(),sync=createTurnSync();s.gm_rulings=[{id:'lesson',topic:'수업',decision:'실습한 준비 절차를 기억한다'}];sync.acknowledge(sync.prepare(s,'인사한다'));
 for(const action of ['오늘 배운 준비 방법에 감사하고 한 시간 쉰다','어제 익힌 순서를 이야기하고 휴식한다']){assert.equal(turnDomains(s,action).growth,false);assert.equal(sync.prepare(s,action).domains.growth,false);}
 for(const action of ['오늘 배운 준비 방법을 복습한다','어제 익힌 순서를 다시 연습한다','붕대 준비를 배우고 싶다','지혈 방법을 익히고 실습한다']){const p=sync.prepare(s,action);assert.equal(p.domains.growth,true);assert.deepEqual(p.payload.state.gm_rulings,s.gm_rulings);assert.deepEqual(p.payload.state.player,s.player);}
 s.scene.choices=[{id:'practice',kind:'training',text:'준비 순서를 다시 해본다'}];assert.equal(sync.prepare(s,'준비 순서를 다시 해본다','practice').domains.growth,true);
});

test('acknowledged public rulings append without losing history; resets and mechanical turns carry full records',()=>{
 const s=start(),sync=createTurnSync();s.gm_rulings=Array.from({length:20},(_,i)=>({id:'rule-'+i,topic:'기존 계약 '+i,decision:'보수와 수행 조건을 유지한다. '.repeat(10)}));
 const initial=sync.prepare(s,'안부를 묻는다');assert.deepEqual(initial.payload.state.gm_rulings,s.gm_rulings);sync.acknowledge(initial);
 const next={id:'followup',topic:'후속 확인',decision:'새 증언을 확인했다.'};s.gm_rulings.push(next);const before=JSON.stringify(s),p=sync.prepare(s,'안부를 묻는다');
 assert.equal(p.payload.state.gm_rulings,undefined);assert.deepEqual(p.payload.appended.gm_rulings,[next]);assert.deepEqual([...initial.payload.state.gm_rulings,...p.payload.appended.gm_rulings],s.gm_rulings);assert.equal(JSON.stringify(s),before);
 assert.ok(JSON.stringify(p.payload.appended).length<JSON.stringify(s.gm_rulings).length/10);assert.match(incrementalPrompt(s,'안부를 묻는다','request',p),/appended.gm_rulings/);
 assert.deepEqual(sync.prepare(s,'안부를 묻는다').payload.appended.gm_rulings,[next]);
 const combat=sync.prepare(s,'공격한다');assert.deepEqual(combat.payload.state.gm_rulings,s.gm_rulings);assert.equal(combat.payload.appended,undefined);
 const forced=sync.prepare(s,'안부를 묻는다',null,true);assert.deepEqual(forced.payload.state.gm_rulings,s.gm_rulings);assert.equal(forced.payload.appended,undefined);
 sync.acknowledge(p);s.gm_rulings=s.gm_rulings.slice(1);assert.deepEqual(sync.prepare(s,'안부를 묻는다').payload.state.gm_rulings,s.gm_rulings);sync.reset();assert.deepEqual(sync.prepare(s,'안부를 묻는다').payload.state.gm_rulings,s.gm_rulings);
});
test('only applied turns advance checkpoints; deltas include changes and explicit empty lists',()=>{const s=start(),before=JSON.stringify(s),sync=createTurnSync(),checkpoints=[];let firstSize,secondSize;
 for(let i=1;i<=21;i++){const p=sync.prepare(s,'안부를 묻는다.');if(p.checkpoint)checkpoints.push(i);if(i===1)firstSize=incrementalPrompt(s,'안부를 묻는다.','r',p).length;if(i===2){secondSize=incrementalPrompt(s,'안부를 묻는다.','r',p).length;assert.equal(p.payload.state.player,undefined);assert.equal(p.payload.state.inventory,undefined);}
 assert.equal(sync.acknowledge(p),true);assert.equal(sync.acknowledge(p),false);}
 assert.deepEqual(checkpoints,[1,11,21]);assert.ok(secondSize<firstSize);assert.equal(JSON.stringify(s),before);
 s.inventory=[{name:'재료',quantity:1}];const add=sync.prepare(s,'살펴본다.');assert.deepEqual(add.payload.state.inventory,s.inventory);sync.acknowledge(add);s.inventory=[];assert.deepEqual(sync.prepare(s,'살펴본다.').payload.state.inventory,[]);
});
test('failed requests, restored games and new campaigns cannot advance or reuse an old baseline',()=>{const s=start(),sync=createTurnSync(),one=sync.prepare(s,'대화한다.');assert.equal(sync.prepare(s,'대화한다.').checkpoint,true);sync.acknowledge(one);sync.reset();assert.equal(sync.acknowledge(one),false);assert.equal(sync.prepare(s,'대화한다.').checkpoint,true);s.campaign_id='different';assert.equal(sync.prepare(s,'대화한다.').checkpoint,true);});
test('combat, trade and training always carry current resources and skills even if unchanged',()=>{const s=start(),sync=createTurnSync();sync.acknowledge(sync.prepare(s,'인사한다.'));for(const action of ['공격한다.','물건을 구매한다.','기초 단련을 한다.']){const p=sync.prepare(s,action);assert.deepEqual(p.payload.state.player,s.player);assert.deepEqual(p.payload.state.inventory,s.inventory);}assert.equal(sync.prepare(s,'물건을 구매한다.').payload.state.wallet_copper,0);});
test('chat integration sends periodic summaries, restores a checkpoint and does not attach settings',()=>{const h=uiHarness();try{const s=start(),chat=mountChatUI(s,{embedded:true,render(){},persist(){}}),messages=[];for(let i=1;i<=12;i++){chat.submit('안부를 묻는다.');const request=h.messages.filter(m=>m.type==='action').at(-1).payload;assert.equal(request.settingsFile,undefined);const body=JSON.parse(request.text.split('현재 상태:\n')[1].split('\n\n플레이어')[0]);messages.push(body.mode);h.reply('scene',JSON.stringify({...s.scene,scene_id:'scene-'+i,reply_to:request.requestId}));assert.equal(chat.isPending(),false);}assert.equal(messages[0],'checkpoint');assert.equal(messages[1],'delta');assert.equal(messages[10],'checkpoint');chat.restore(structuredClone(s));chat.submit('안부를 묻는다.');assert.match(h.messages.filter(m=>m.type==='action').at(-1).payload.text,/"mode":"checkpoint"/);}finally{h.close();}});

test('nested clock changes omit repeated logs and removed equipment effects are explicitly cleared',()=>{const s=start(),sync=createTurnSync();s.gameState.events=['지난 사건'];s.engine={version:1,bonuses:{potentials:{guard:5}}};sync.acknowledge(sync.prepare(s,'대화한다.'));s.gameState.time='09:30';s.engine.bonuses.potentials={};const p=sync.prepare(s,'대화한다.');assert.deepEqual(p.payload.state.game_state,{time:'09:30'});assert.ok(p.payload.removed.includes('/engine/bonuses/potentials/guard'));});

test('forging, studying and learning requests carry unchanged current stats as mechanics context',()=>{const s=start(),sync=createTurnSync();sync.acknowledge(sync.prepare(s,'인사한다.'));for(const action of ['광산에서 단조 기술을 배운다.','장인에게 배우고 연습한다.','마법 원리를 공부한다.'])assert.deepEqual(sync.prepare(s,action).payload.state.player,s.player);});

test('an incapacitation guard is not interpreted as a combat request',()=>{const p=createTurnSync().prepare(start(),'기초 단련 1회. 전투불능이면 실행하지 않는다.');assert.equal(p.domains.growth,true);assert.equal(p.domains.combat,false);});


test('misrouted appended rulings normalize to canonical scene records without allowing arbitrary state patches',()=>{
 const raw={schema_version:1,type:'ercedia_scene',scene_id:'ruling-alias',location:'장터',time:'09:05',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'목재 묶음이 흔들린다.'}],choices:[]},prior={id:'prior',topic:'계약',decision:'정해진 보수'},next={id:'next',topic:'현장 위험',decision:'주민 대피가 필요하다.'};
 const s=start();s.gm_rulings=[prior];const before=JSON.stringify(s),scene=normalizeScene({...raw,appended:{gm_rulings:[next]}});assert.deepEqual(scene.gm_rulings,[next]);assert.equal(scene.appended,undefined);assert.deepEqual(mergeRulings(s,scene),[prior,next]);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(normalizeScene({...raw,gm_rulings:[prior],appended:{gm_rulings:[next]}}).gm_rulings,[prior,next]);
 assert.throws(()=>normalizeScene({...raw,gm_rulings:[next],appended:{gm_rulings:[next]}}),/중복/);
 assert.throws(()=>normalizeScene({...raw,appended:{gm_rulings:[{...next,decision:123}]}}),/형식/);
 assert.throws(()=>normalizeScene({...raw,appended:{gm_rulings:[next],player:{hp:999}}}),/정식 필드/);
 assert.throws(()=>normalizeScene({...raw,appended:{gm_rulings:Array.from({length:9},(_,i)=>({...next,id:'n'+i}))}}),/한도/);
 assert.throws(()=>mergeRulings(s,normalizeScene({...raw,appended:{gm_rulings:[{...prior,decision:'마음대로 변경'}]}})),/임의로/);
});

test('medical treatment requests omit combat facts without suppressing a real enemy kill in the same action',()=>{
 const s=start();for(const a of ['진료 공간에서 유료 처치 비용을 묻는다.','마야에게 약초 처치와 의료 처치를 문의한다.','왼팔 치료와 특별한 처치가 필요한지 묻는다.','진료 후 추가 처치를 받기 전에 처치비를 확인한다.']){const p=createTurnSync().prepare(s,a);assert.equal(p.domains.combat,false,a);assert.equal(p.payload.state.turn_facts.battle_wire,undefined,a);assert.equal(p.domains.trade,true,a);assert.ok(p.payload.state.turn_facts.recovery_wire,a);}
 for(const a of ['늑대를 처치한다.','궁극기로 적을 공격한다. 치료는 이후에 받는다.','늑대를 처치한 뒤 마야에게 유료 처치를 받는다.']){const p=createTurnSync().prepare(s,a);assert.equal(p.domains.combat,true,a);assert.ok(p.payload.state.turn_facts.battle_wire,a);}
});

test('incremental requests retain required registered actor fields and never silently invent a missing name',()=>{
 const s=start(),p=createTurnSync().prepare(s,'마야에게 안부를 묻는다');const prompt=incrementalPrompt(s,'마야에게 안부를 묻는다','r',p);assert.match(prompt,/npc\/cast=\{id,speaker,outfit,emotion\}/);assert.throws(()=>normalizeScene({...s.scene,npc:{id:'ER-NPC-057',outfit:'none',emotion:'base'}},s),/npc.speaker/);assert.equal(s.scene.npc,null);
});

test('training choice metadata retains first-method safeguards for keyword-free practice in both request paths',()=>{
 const s=start();s.scene.choices=[{id:'sand',kind:'training',text:'갈라진 끝을 피하고 나머지 모서리를 천천히 둥글게 다듬는다'},{id:'look',kind:'investigate',text:'갈라진 부분을 살펴본다'}];const before=structuredClone(s),action=s.scene.choices[0].text;
 const p=createTurnSync().prepare(s,action,'sand');assert.equal(p.domains.growth,true);assert.ok(p.snapshot.turn_facts.narrative_focus.practice_interaction_rule);assert.deepEqual(p.payload.state.player,s.player);assert.match(actionPrompt(s,action,'r',{choiceId:'sand'}),/practice_interaction_rule/);assert.match(actionPrompt(s,action,'r',{compact:true,choiceId:'sand'}),/practice_interaction_rule/);
 assert.equal(createTurnSync().prepare(s,action).snapshot.turn_facts.narrative_focus?.practice_interaction_rule,undefined);assert.equal(createTurnSync().prepare(s,s.scene.choices[1].text,'look').snapshot.turn_facts.narrative_focus?.practice_interaction_rule,undefined);assert.deepEqual(s,before);
});
test('declining new practice in ordinary dialogue omits learning wire without removing the stated boundary',()=>{
 const s=start(),before=structuredClone(s);for(const action of ['그 얘기는 여기까지 할게요. 새 일이나 수련은 맡지 않는다.','오늘은 훈련을 하지 않겠다.','고마워요. 연습은 하지 않는다.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.growth,false,action);assert.equal(p.snapshot.turn_facts.narrative_focus?.practice_interaction_rule,undefined);assert.equal(p.payload.state.growth,undefined);assert.ok(incrementalPrompt(s,action,'r',p).endsWith(action));}assert.deepEqual(s,before);
});
test('mixed actual practice, condition questions and training choices retain full learning context',()=>{
 const s=start(),before=structuredClone(s);for(const action of ['수련은 맡지 않는다. 하지만 목공 기초를 배워보고 싶다.','훈련은 하지 않겠다. 오늘 배운 것을 복습한다.','수련을 하지 않을 수 있나요?','연습 비용을 먼저 묻는다.']){const p=createTurnSync().prepare(s,action);assert.equal(p.domains.growth,true,action);assert.deepEqual(p.payload.state.player,s.player);}s.scene.choices=[{id:'practice',kind:'training',text:'수련은 맡지 않는다.'}];assert.equal(createTurnSync().prepare(s,s.scene.choices[0].text,'practice').domains.growth,true);s.scene.choices=[];assert.deepEqual(s,before);
});
