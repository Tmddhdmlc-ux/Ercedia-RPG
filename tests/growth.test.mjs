import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEngineEvent,planEngineScene} from '../web/engine-model.js';
import {growthContext,reflectionChance,manaResistanceRate} from '../web/growth-model.js';
import {growthRules} from '../web/growth-data.js';
import {normalize} from '../web/state.js';
import {normalizeBattle,battleFrame} from '../web/battle-model.js';
import {createGameBridge} from '../integration/game-bridge.js';
import {npcSnapshot,updateNPC} from '../web/npc-model.js';
import {actionPrompt} from '../web/scene.js';
const fixture=()=>({version:1,player:{name:'성장 검증',job:'검사',level:20,hp:80,maxHp:100,mp:90,maxMp:100,xp:0,requiredXp:8944,strength:10,dexterity:10,intelligence:10,constitution:10,manaStat:10,realm:'basic',levelHpBonus:0,unspentStatPoints:0,skills:[]},inventory:[],gameState:{}});
const breakthrough=(id='b1',extra={})=>({event_id:id,kind:'breakthrough',track:'knight',realm:'expert',enlightenment:'지난 패배에서 검을 밀기보다 흐름에 맞추는 방법을 이해했다.',reason:'실제 경험과 운용 변화의 확인',...extra});
test('minimum level, next-stage order and narrative proof are all required',()=>{
  const s=fixture();s.player.level=19;assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough()]}),/최소 레벨 20/);
  s.player.level=100;assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough('skip',{realm:'master'})]}),/순서/);
  assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough('empty',{enlightenment:''})]}),/서술/);
  assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough('numeric',{chance:100})]}),/수치화/);
  assert.equal(s.player.realm,'basic');
});
test('breakthrough grants bonus once, preserves lost HP/MP and survives save',()=>{
  const s=fixture(),next=planEngineScene(s,{engine_events:[breakthrough()]});Object.assign(s,next);
  assert.equal(s.player.realm,'expert');assert.equal(s.player.strength,16);assert.equal(s.player.maxHp,158);assert.equal(s.player.hp,138);assert.equal(s.player.maxMp,118);assert.equal(s.player.mp,108);
  const before=structuredClone(s);assert.equal(applyEngineEvent(s,breakthrough()),false);assert.deepEqual(s,before);
  assert.equal(normalize(s).player.realm,'expert');assert.equal(normalize(s).engine.growth_history.length,1);
});
test('hyper needs a personal ability, and common abilities require actual training',()=>{
  const s=fixture();applyEngineEvent(s,breakthrough());s.player.level=45;
  assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough('h',{realm:'hyper'})]}),/고유능력/);
  const result=planEngineScene(s,{engine_events:[breakthrough('h',{realm:'hyper',unique_ability:{name:'지켜내는 선',description:'앞의 일격을 가로막는다. MP를 소모하며 뒤쪽을 막지 못한다.'}})]});Object.assign(s,result);
  assert.equal(s.player.realm,'hyper');assert.equal(s.player.realmAbilities,undefined);
  applyEngineEvent(s,{event_id:'learn',kind:'learn_realm_ability',ability_id:'knight_mana_guard',reason:'실제 방어 수련 확인'});
  assert.deepEqual(normalize(s).player.realmAbilities,['knight_mana_guard']);assert.equal(normalize(s).player.uniqueAbility.name,'지켜내는 선');
});
test('profession, scene and bridge snapshots cannot bypass breakthrough or unlock hybrids',()=>{
  const s=fixture();assert.throws(()=>planEngineScene(s,{player:{...s.player,realm:'master'}}),/breakthrough/);
  assert.throws(()=>planEngineScene(s,{player:{...s.player,realmAbilities:['knight_mana_guard']}}),/learn_realm_ability/);
  assert.throws(()=>planEngineScene(s,{engine_events:[{event_id:'p',kind:'profession',job:'마법사',circle:7,reason:'시도'}]}),/breakthrough/);
  assert.throws(()=>planEngineScene(s,{engine_events:[{event_id:'hybrid',kind:'profession',job:'하이브리드형 기사',reason:'미정'}]}),/직업/);
  const bridge=createGameBridge(s,{apply(){},restore(){},render(){},persist(){}});
  assert.throws(()=>bridge.updatePlayer({...s.player,realm:'master'}),/breakthrough/);
  const g=bridge.getGrowthRules();g.rules.knights[0].min_level=999;assert.equal(growthRules.knights[0].min_level,1);
});
test('mage stages obey minimums; mythology needs separate transcendent insight',()=>{
  const s=fixture();s.player.job='마법사';s.player.realm='none';s.player.circle=1;s.player.level=10;
  Object.assign(s,planEngineScene(s,{engine_events:[breakthrough('m2',{track:'mage',circle:2})]}));assert.equal(s.player.circle,2);assert.equal(s.engine.registration.circle,2);
  s.player.circle=7;s.engine.registration.circle=7;s.player.level=100;
  assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough('m8',{track:'mage',circle:8})]}),/초월/);
  Object.assign(s,planEngineScene(s,{engine_events:[breakthrough('m8',{track:'mage',circle:8,transcendent_enlightenment:'현상을 유지하는 구조를 새로 이해한 경험'})]}));assert.equal(normalize(s).player.circle,8);
  assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough('m9',{track:'mage',circle:9})]}),/초월/);
});
function battleFixture({reflection=false,success=true,guard=false,lowMP=false}={}){
  const actor=(id,side,role)=>({id,name:id,side,role,level:75,rank:'검증용 공개 경지',realm:'none',stats:{strength:10,dexterity:10,intelligence:10,constitution:10,manaStat:10},hp:100,maxHp:100,mp:100,maxMp:100,speed:12,level_hp_bonus:0,modifiers:{},skills:[],art:null});
  const a=actor('player','allied','player'),b=actor('synthetic_enemy','enemy','npc');
  const events=[];const resources={player:{hp:100,mp:100},synthetic_enemy:{hp:100,mp:100}};
  const calc={realm_multiplier:1,context_multiplier:1,defense:0};
  if(reflection){
    a.circle=3;b.circle=5;b.realmAbilities=['spell_reflection'];if(lowMP)b.mp=4;resources.synthetic_enemy.mp=b.mp;
    a.skills=[{id:'bolt',name:'합성 화염창',kind:'magic',mp_cost:8,power:40,int_coefficient:0,mana_coefficient:0,circle:3,reflectable:true,basis:'검증용 직접 주문'}];
    resources.player.mp-=8;resources.synthetic_enemy.mp-=5;if(!success)resources.synthetic_enemy.hp-=40;
    events.push({id:'incoming',actor:a.id,target:b.id,kind:'magic',result:success?'block':'hit',skill_id:'bolt',element:'fire',mp_cost:8,damage:success?0:40,actor_hp_after:100,actor_mp_after:92,target_hp_after:resources.synthetic_enemy.hp,target_mp_after:resources.synthetic_enemy.mp,narration:'상대가 주문의 흐름에 개입한다.',calculation:{...calc,...(success?{full_block:true,basis:'사전 판정한 반사 성공'}:{})},realm_reaction:{kind:'reflection',chance_percent:30,roll:success?22:90,success,mp_cost:5,basis:'직접 날아오는 하위 주문의 구조 파악'}});
    if(success){resources.player.hp-=40;events.push({id:'returned',actor:b.id,target:a.id,kind:'magic',result:'hit',skill_id:'bolt',element:'fire',mp_cost:0,damage:40,actor_hp_after:100,actor_mp_after:95,target_hp_after:60,target_mp_after:92,narration:'화염창이 원래 시전자에게 돌아간다.',calculation:calc,reflection_source_event:'incoming'});}
  }else{
    a.realm='basic';b.realm='master';b.realmAbilities=['knight_mana_guard'];a.skills=[{id:'slash',name:'합성 마나 참격',kind:'physical',mp_cost:4}];
    resources.player.mp-=4;const damage=18+(guard?8:40);resources.synthetic_enemy.hp-=damage;if(guard)resources.synthetic_enemy.mp-=9;
    events.push({id:'slash',actor:a.id,target:b.id,kind:'attack',result:'hit',skill_id:'slash',mp_cost:4,damage,actor_hp_after:100,actor_mp_after:96,target_hp_after:resources.synthetic_enemy.hp,target_mp_after:resources.synthetic_enemy.mp,narration:'마나는 흩어지지만 검날은 파고든다.',calculation:{...calc,base_roll:10,mana_component:40,basis:'별도 마나 피해를 가진 합성 보유 기술'},...(guard?{realm_reaction:{kind:'mana_guard',reduction_percent:80,mp_cost:9,basis:'검날과 구분하여 추가 마나를 억제'}}:{})});
  }
  return {battle_id:'realm-test',trigger:'duel',participants:[a,b],initiative:{actor_id:a.id,reason:'합성 비무의 첫 공격 양보'},events,outcome:{winner:'draw',termination:'draw',reason:'검증용 비무 종료',xp_gain:0,items_added:[],items_consumed:[],injuries:[],resources:Object.entries(resources).map(([id,r])=>({id,...r}))}};
}
test('mana guard reduces only the separate mana component, charges defender and stays optional',()=>{
  const raw=battleFixture({guard:true}),b=normalizeBattle(raw);assert.equal(b.events[0].damage,26);assert.equal(battleFrame(b,1).synthetic_enemy.mp,91);
  assert.equal(normalizeBattle(battleFixture()).events[0].damage,58);
  raw.events[0].damage=11;assert.throws(()=>normalizeBattle(raw),/피해 공식/);
  assert.equal(manaResistanceRate({realm:'basic'},{realm:'master',realmAbilities:[]}),0);
});
test('successful reflection blocks original and returns exactly once with original caster power',()=>{
  const raw=battleFixture({reflection:true}),b=normalizeBattle(raw);assert.equal(b.events[0].damage,0);assert.equal(b.events[1].damage,40);assert.deepEqual(battleFrame(b,2),{player:{hp:60,mp:92},synthetic_enemy:{hp:100,mp:95}});
  raw.events.pop();assert.throws(()=>normalizeBattle(raw),/반사 성공 뒤/);
});
test('failed reflection still charges MP; altered rolls, costs and chained reflections are refused',()=>{
  const b=normalizeBattle(battleFixture({reflection:true,success:false}));assert.equal(b.events[0].damage,40);assert.equal(b.events[0].target_mp_after,95);
  const raw=battleFixture({reflection:true});raw.events[0].realm_reaction.roll=90;assert.throws(()=>normalizeBattle(raw),/반사 판정/);
  const cost=battleFixture({reflection:true});cost.events[0].realm_reaction.mp_cost=0;assert.throws(()=>normalizeBattle(cost),/MP 비용/);
  const chain=battleFixture({reflection:true});chain.events[1].realm_reaction={kind:'reflection'};assert.throws(()=>normalizeBattle(chain),/재반사/);
  const exhausted=battleFixture({reflection:true});exhausted.participants[1].mp=4;assert.throws(()=>normalizeBattle(exhausted),/방어자 MP/);
});
test('reflection does not consume the defender first-spell attack bonus',()=>{
  const raw=battleFixture({reflection:true}),defender=raw.participants[1];defender.potentials={first_spell_hit_bonus:50};
  defender.skills=[{id:'own-spell',name:'검증용 후속 주문',kind:'magic',mp_cost:2,power:20,int_coefficient:0,mana_coefficient:0,basis:'실제 보유한 합성 후속 주문'}];
  raw.events.push({id:'own-cast',actor:defender.id,target:'player',kind:'magic',result:'hit',skill_id:'own-spell',element:'fire',mp_cost:2,damage:30,actor_hp_after:100,actor_mp_after:93,target_hp_after:30,target_mp_after:92,narration:'반사 뒤 자신의 주문을 시전한다.',calculation:{realm_multiplier:1,context_multiplier:1,defense:0}});
  raw.outcome.resources=[{id:'player',hp:30,mp:92},{id:defender.id,hp:100,mp:93}];
  assert.equal(normalizeBattle(raw).events[2].damage,30);
});
test('reflection requires lower, directly projected spell and actually learned ability',()=>{
  const raw=battleFixture({reflection:true});raw.participants[0].skills[0].reflectable=false;assert.throws(()=>normalizeBattle(raw),/직접/);
  const equal=battleFixture({reflection:true});equal.participants[1].circle=3;assert.throws(()=>normalizeBattle(equal),/반사 확률/);
  assert.equal(reflectionChance({circle:9,realmAbilities:['spell_reflection']},1),60);
  assert.equal(reflectionChance({circle:7,realmAbilities:[]},1),0);
});
test('NPC training persists and cannot be forged through ordinary profile updates',()=>{
  const s=fixture(),npc=npcSnapshot(s,'serin');s.npcStates={serin:{...npc,realm:'expert',level:20}};
  assert.throws(()=>updateNPC(s,'serin',{realm:'master'}),/breakthrough/);
  assert.throws(()=>updateNPC(s,'serin',{rank:'마스터 나이트'}),/breakthrough/);
  Object.assign(s,planEngineScene(s,{engine_events:[{event_id:'npc-learn',kind:'learn_realm_ability',npc_id:'serin',ability_id:'knight_mana_guard',reason:'NPC 실제 방어 수련'}]}));
  assert.deepEqual(npcSnapshot(s,'serin').realmAbilities,['knight_mana_guard']);assert.deepEqual(normalize(s).npcStates.serin.realmAbilities,['knight_mana_guard']);
  const planned=planEngineScene(s,{npc_updates:{serin:{hp:10}}});assert.equal(Object.hasOwn(planned,'npcStates'),false);
});
test('an invalid later growth event rolls back the whole scene; legacy circle registration is retained',()=>{
  const s=fixture(),before=structuredClone(s);
  assert.throws(()=>planEngineScene(s,{engine_events:[breakthrough(),{event_id:'bad',kind:'learn_realm_ability',ability_id:'spell_reflection',reason:'미정 조건'}]}),/직업/);assert.deepEqual(s,before);
  const mage=fixture();mage.player.job='마법사';mage.player.realm='none';mage.engine={version:1,registration:{job:'마법사',circle:5},applied:[],instances:[],equipped:{},learned:[],bonuses:{}};
  assert.equal(growthContext(normalize(mage)).profile.mage.circle,5);
  applyEngineEvent(mage,{event_id:'confirm',kind:'profession',job:'마법사',circle:5,reason:'기존 등록 확인'});assert.equal(growthContext(mage).profile.mage.circle,5);
});
test('distribution totals, everyday descriptions and reserved hybrids reach GM requests',()=>{
  for(const group of [growthRules.knights,growthRules.circles])assert.ok(Math.abs(group.reduce((sum,r)=>sum+r.population_percent,0)-100)<.00001);
  const g=growthContext(fixture());assert.equal(g.next.min_level,20);assert.match(g.rules.circles[1].social_description,/전투에 능하지/);
  assert.ok(g.rules.hidden_classes.every(c=>c.status==='reserved'&&c.unlock_conditions===null));
  assert.match(actionPrompt(fixture(),'마을에서 일을 구한다','growth-request'),/전투 밖에서도/);
});
