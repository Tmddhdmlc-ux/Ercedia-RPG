// Synthetic, pre-adjudicated animation fixtures. Never loaded by the production game.
import {defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {npcSnapshot} from '../web/npc-model.js';
export function battleFixture(trigger='dialogue'){
  const unique=trigger==='unique';if(unique)trigger='duel';
  const state=defaults();state.player=initialPlayer('관전 데모');state.chosenName='관전 데모';
  const participant=(id,name,side,role)=>({id,name,side,role,level:1,rank:role==='monster'?'하급 · 검증용 수치':'경지 미정 · 검증용 수치',realm:'none',stats:{strength:10,dexterity:10,intelligence:10,constitution:10,manaStat:10},hp:100,maxHp:100,mp:100,maxMp:100,speed:12,level_hp_bonus:0,modifiers:{},skills:[],art:null});
  const player=participant('player','관전 데모','allied','player'),enemy=participant(trigger==='dialogue'||trigger==='duel'?'serin':'demo_enemy',trigger==='dungeon'?'마수 · 연출 데모':trigger==='travel'?'도적 · 연출 데모':'세린 · 연출 데모','enemy',trigger==='dungeon'?'monster':'npc');
  if(unique){player.realm='hyper';player.rank='하이퍼 · 검증용';player.skills=[{id:'demo_unique',name:'검증용 고유능력',kind:'unique',mp_cost:10,power:20,int_coefficient:.5,mana_coefficient:.5,basis:'연출 확인용 합성 데이터. 캐논 고유능력 아님.'}];state.player.realm='hyper';state.player.skills=[{name:'검증용 고유능력',description:'컷인 검증용',formula:'',enabled:true}];}
  if(enemy.id==='serin'){enemy.realm='basic';enemy.rank='베이직 나이트 · 수치 데모';enemy.art={id:'serin',outfit:'armor',emotion:'angry'};state.npcStates={serin:{level:1,realm:'basic',strength:10,dexterity:10,intelligence:10,constitution:10,manaStat:10,hp:100,maxHp:100,mp:100,maxMp:100,speed:12,levelHpBonus:0}};}
  enemy.skills=[{id:'demo_flame',name:'검증용 화염',kind:'magic',mp_cost:7,power:18,int_coefficient:.5,mana_coefficient:.5,basis:'검증 전용 기술. 공식 NPC 기술로 등록하지 않음.'}];
  const resources={player:{hp:100,mp:100},[enemy.id]:{hp:100,mp:100}},events=[];
  function event(actor,target,kind,result,damage,mp_cost=0,calculation=null,skill_id=null,element=null,narration=''){
    resources[actor].mp-=mp_cost;resources[target].hp-=damage;
    events.push({id:'e'+(events.length+1),actor,target,kind,result,damage,mp_cost,actor_hp_after:resources[actor].hp,actor_mp_after:resources[actor].mp,target_hp_after:resources[target].hp,target_mp_after:resources[target].mp,skill_id,element,narration,...(calculation?{calculation}:{})});
  }
  const physical=(roll=10)=>({base_roll:roll,realm_multiplier:1,context_multiplier:1,defense:0});
  event(enemy.id,'player','attack','dodge',0,0,null,null,null,'상대의 공격! 주인공이 옆으로 움직여 회피한다!');
  event(enemy.id,'player','attack','block',0,0,{...physical(),full_block:true,basis:'검증용 방패로 완전 방어한 사전 판정.'},null,null,'상대의 두 번째 공격을 방패로 막았다!');
  event('player',enemy.id,'counter','hit',28,0,physical(20),null,null,'방어 직후 반격! 상대에게 28 피해!');
  event(enemy.id,'player','magic','hit',28,7,{realm_multiplier:1,context_multiplier:1,defense:0},'demo_flame','fire','화염이 번진다! 주인공에게 28 피해, 상대 MP 7 소모!');
  event('player',enemy.id,'attack','critical',56,0,{...physical(20),context_multiplier:2,basis:'검증 전용 치명 판정 계수 2. 공식 치명타 수치가 아님.'},null,null,'결정적인 치명타! 상대에게 56 피해!');
  event(enemy.id,'player','attack','hit',18,0,physical(),null,null,'상대가 마지막 일격을 날린다! 주인공에게 18 피해!');
  event('player',enemy.id,'attack','hit',16,0,physical(),null,null,'주인공의 공격! 상대의 남은 HP 16이 소진되었다!');
  event(enemy.id,enemy.id,'defeat','none',0,0,null,null,null,'상대가 전투불능으로 물러난다!');
  const scene={schema_version:1,type:'ercedia_scene',scene_id:'demo-scene-'+trigger,location:trigger==='travel'?'이동 중 · 도적 습격 데모':trigger==='dungeon'?'던전 입구 · 마수 조우 데모':'써니 빌리지 · 대화/결투 데모',time:'검증용 장면',background_id:['dialogue','duel'].includes(trigger)?'sunny_village_day':null,npc:null,dialogue:[{speaker:'나레이션',text:'전투가 끝났다. 경험치 45와 검증용 동전 2개를 얻고 탐험 장면으로 돌아왔다.'}],choices:[],player:{...state.player,hp:54,xp:45},inventory:[{name:'검증용 동전',quantity:2,category:'misc',description:'데모 결과 확인용. 실제 세이브와 분리.',effect:''}],game_state:{place:'데모 전투 종료 지점',events:['검증용 경상'],quests:[],relationships:[],recent_dialogue:[]},battle:{battle_id:'demo-battle-'+trigger,trigger,participants:[player,enemy],initiative:{actor_id:enemy.id,reason:trigger==='travel'||trigger==='ambush'?'기습 상황의 사전 판정':'속도 동률. 검증에서는 상대가 먼저 움직이는 상황을 고정.'},events,outcome:{winner:'allied',termination:'defeat',reason:'적 HP 0, 주인공 생존',xp_gain:45,items_added:[{name:'검증용 동전',quantity:2}],items_consumed:[],injuries:['검증용 경상'],resources:Object.entries(resources).map(([id,r])=>({id,...r}))}}};
  if(unique){scene.battle.battle_id='demo-unique';scene.scene_id='demo-scene-unique';scene.battle.initiative={actor_id:'player',reason:'검증용 사전 대비'};scene.battle.events=[{id:'u1',actor:'player',target:'serin',kind:'unique',result:'hit',skill_id:'demo_unique',damage:30,mp_cost:10,actor_hp_after:100,actor_mp_after:90,target_hp_after:70,target_mp_after:100,narration:'하이퍼 고유능력! 검증용 컷인과 마나 소모를 재생한다!',calculation:{realm_multiplier:1,context_multiplier:1,defense:0}}];scene.battle.outcome={...scene.battle.outcome,termination:'surrender',reason:'상대가 비무 종료에 동의',resources:[{id:'player',hp:100,mp:90},{id:'serin',hp:70,mp:100}]};scene.player={...state.player,hp:100,mp:90,xp:45};}
  return {state,scene};
}
// Canon stats with a synthetic sparring timeline; no ChatGPT verdict is claimed.
export function serinCanonFixture(){
  const {state,scene}=battleFixture();
  state.npcStates={serin:{level:null,strength:null,dexterity:null,intelligence:null,constitution:null,manaStat:null,hp:null,maxHp:null,mp:null,maxMp:null,speed:null,levelHpBonus:0,interest:41,interestText:'검증용 관계 기록'}};
  const npc={id:'serin',outfit:'armor',emotion:'base',speaker:'세린',profile:{level:null,hp:null,mp:null}};
  state.scene={schema_version:1,type:'ercedia_scene',scene_id:'serin-before',location:'써니 빌리지',time:'검증',background_id:'sunny_village_day',npc,dialogue:[{speaker:'세린',text:'등록 수치와 세이브 보완 검증 · 실제 GPT 판정 아님'}],choices:[]};
  const s=npcSnapshot(state,'serin'),actor={...s,side:'enemy',level_hp_bonus:s.levelHpBonus,modifiers:{},skills:[]};
  scene.scene_id='serin-canon-sparring';scene.npc=npc;scene.dialogue=[{speaker:'세린',text:'검증용 비무 종료. HP 312와 관계 기록을 유지합니다.'}];
  scene.player={...state.player};scene.inventory=[];scene.game_state={events:['검증용 비무 종료'],quests:[],relationships:[],recent_dialogue:[]};
  scene.battle={battle_id:'serin-canon-battle',trigger:'duel',participants:[scene.battle.participants[0],actor],initiative:{actor_id:'player',reason:'검증용 비무에서 세린이 첫 공격을 양보했다.'},events:[{id:'s1',actor:'player',target:'serin',kind:'attack',result:'hit',skill_id:null,damage:18,mp_cost:0,actor_hp_after:100,actor_mp_after:100,target_hp_after:s.hp-18,target_mp_after:s.mp,narration:'검증용 공격 · 세린 HP 330 → 312',calculation:{base_roll:10,realm_multiplier:1,context_multiplier:1,defense:0}}],outcome:{winner:'draw',termination:'draw',reason:'검증용 비무를 양측 합의로 종료',xp_gain:0,items_added:[],items_consumed:[],injuries:[],resources:[{id:'player',hp:100,mp:100},{id:'serin',hp:s.hp-18,mp:s.mp}]}};
  return {state,scene};
}
