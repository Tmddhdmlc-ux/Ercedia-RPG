import test from 'node:test';import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';import {initialPlayer} from '../web/intro-model.js';import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';import {turnDomains,normalizeScene} from '../web/scene.js';import {mergeRulings} from '../web/gm-rulings.js';import {mountChatUI} from '../web/chat-ui.js';import {uiHarness} from './ui-harness.mjs';
const start=()=>({...defaults(),campaign_id:'sync-test',player:initialPlayer('시험'),gameState:{region:'W1',place:'마을',date:'650-07-01',time:'09:00'},scene:{schema_version:1,type:'ercedia_scene',scene_id:'start',location:'마을',time:'09:00',background_id:null,npc:null,dialogue:[{speaker:'나레이션',text:'출발'}],choices:[]}});

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
