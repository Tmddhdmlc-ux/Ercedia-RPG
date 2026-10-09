import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {turnDomains} from '../web/scene.js';
import {createTurnSync,incrementalPrompt} from '../web/turn-sync.js';
const start=()=>({...defaults(),campaign_id:'domain-fixture',player:{...initialPlayer('시험'),hp:69},gameState:{region:'W1',place:'검증용 정착지',date:'650-07-01',time:'17:22',events:['확인한 왼팔 교상']},scene:{schema_version:1,type:'ercedia_scene',scene_id:'fixture',location:'검증용 정착지',time:'17:22',background_id:null,npc:null,dialogue:[],choices:[]}});

test('enemy and projectile nouns in aftercare, trade and dialogue do not force combat context',()=>{
 const s=start(),before=JSON.stringify(s);
 for(const action of ['서리갈기 늑대에게 물린 팔을 치료받는다.','어제 본 늑대 이야기를 브란에게 한다.','화살 가격과 재고를 묻는다.','사냥꾼에게 인사한다.','철검의 공격력을 확인한다.','전투 후 여관에서 휴식한다.','늑대에게 공격받은 팔을 치료한다.','응급 처치를 받는다.','방어구 가격을 묻는다.']){
  const p=createTurnSync().prepare(s,action);assert.equal(p.domains.combat,false,action);assert.equal(p.payload.state.turn_facts.combat_actors,undefined);assert.equal(p.payload.state.turn_facts.battle_wire,undefined);assert.equal(p.payload.state.growth,undefined);
 }
 const care=createTurnSync().prepare(s,'늑대에게 물린 팔을 치료받는다.');assert.equal(care.domains.trade,true);assert.ok(care.payload.state.turn_facts.shop_wire);assert.deepEqual(care.payload.state.player,s.player);assert.equal(JSON.stringify(s),before);
});
test('actual attacks, defenses and current dungeon exploration keep their mechanics and canonical resources',()=>{
 const s=start();for(const action of ['서리갈기 늑대를 공격한다.','화살을 쏜다.','화살을 발사한다.','철검을 뽑고 방어 자세를 취한다.','마수를 사냥한다.','사격한다.','적을 견제한다.','공격한다.','방어한다.','적을 처치한다.','궁극기를 사용한다.']){
  const p=createTurnSync().prepare(s,action);assert.equal(p.domains.combat,true,action);assert.ok(p.payload.state.turn_facts.battle_wire);assert.deepEqual(p.payload.state.player,s.player);assert.deepEqual(p.payload.state.inventory,s.inventory);
 }
 for(const action of ['외곽 길목의 흔적을 탐색한다.','근처 숲을 탐험한다.']){const d=turnDomains(s,action);assert.equal(d.adventure,true);assert.equal(d.dungeon,false);assert.equal(d.combat,false);}
 assert.equal(turnDomains(s,'던전을 탐색한다.').dungeon,true);s.world_engine={...s.world_engine,active_dungeon:'DUN-W1-01'};assert.equal(turnDomains(s,'눈앞의 흔적을 본다.').dungeon,true);
});
test('aftercare request omits a battle calculation while preserving treatment and existing consequences',()=>{
 const s=start(),careAction='서리갈기 늑대에게 물린 팔을 치료받는다.',attackAction=careAction+' 적이 오면 공격한다.';
 const care=createTurnSync().prepare(s,careAction),attack=createTurnSync().prepare(s,attackAction),carePrompt=incrementalPrompt(s,careAction,'r',care),attackPrompt=incrementalPrompt(s,attackAction,'r',attack);
 assert.ok(carePrompt.length<attackPrompt.length);assert.deepEqual(care.payload.state.turn_facts.narrative_focus.recorded_consequences,['확인한 왼팔 교상']);assert.ok(!carePrompt.includes('battle_wire'));assert.ok(carePrompt.includes('shop_wire'));assert.equal(s.player.hp,69);
});
