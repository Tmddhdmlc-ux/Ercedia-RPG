// Validation only. This module never rolls, chooses an action or adjudicates a battle.
import {characterVisual,registeredNPCArt} from './character-art.js';
import {equippedSkills} from './skill-loadout.js';
import {resolveNPC,findNPC} from './npc-model.js';
import {validateRealmReaction,currentCircle} from './growth-model.js';
import {potentialMP,potentialDamage} from './combat-potentials.js';
export const battleRealms={none:1,basic:1,expert:1.25,hyper:1.65,master:2.2};
export const battleKinds=['attack','dodge','defend','counter','magic','unique','defeat'];
export const battleElements=['water','fire','wind','electric','dark','light'];
const fail=message=>{throw Error('전투 검증: '+message);};
const str=(v,label,max=500)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail(label+' 문자열');return v;};
const num=(v,label,min=0,max=999999)=>{if(!Number.isInteger(v)||v<min||v>max)fail(label+' 수치');return v;};
const decimal=(v,label,min=0,max=100)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(label+' 계수');return v;};
const equal=(a,b,label)=>{if(a!==b)fail(label+` 불일치 (${a} / ${b})`);};
export function battleIsActive(state){return !!state.battlePlayback&&!state.battlePlayback.done;}
export function battleSpeed(p){return p.stats.dexterity+Math.floor(p.stats.strength/5)+p.modifiers.equipment_speed_bonus+p.modifiers.status_speed_bonus;}
export function battleMaximums(p){const s=p.stats,m=p.modifiers;return {hp:Math.max(1,100+10*(s.constitution-10)+3*(s.strength-10)+p.level_hp_bonus+m.equipment_hp_bonus+m.status_hp_bonus),mp:Math.max(0,100+6*(s.manaStat-10)+m.equipment_mp_bonus+m.status_mp_bonus)};}
function noEnlightenmentNumbers(value){
  if(!value||typeof value!=='object')return;
  for(const [key,v] of Object.entries(value)){if(/enlightenment.*(progress|chance|percent|score|probability)|breakthrough.*(chance|probability|progress)|깨달음.*(확률|진척|수치|점수)/i.test(key))fail('깨달음 수치화 금지');noEnlightenmentNumbers(v);}
}
function participant(raw){
  if(!raw||!['allied','enemy'].includes(raw.side)||!['player','npc','monster'].includes(raw.role))fail('참가자 소속/종류');
  const p={id:str(raw.id,'참가자 ID',80),name:str(raw.name,'이름',60),side:raw.side,role:raw.role,level:num(raw.level,'레벨',1,100),rank:str(raw.rank,'공개 경지',80),realm:raw.realm,stats:{},modifiers:{},skills:[],level_hp_bonus:num(raw.level_hp_bonus,'레벨 HP 기록'),hp:num(raw.hp,'HP'),maxHp:num(raw.maxHp,'최대 HP',1),mp:num(raw.mp,'MP'),maxMp:num(raw.maxMp,'최대 MP'),speed:num(raw.speed,'속도'),art:null};
  if(raw.circle!==undefined)p.circle=num(raw.circle,'마법사 서클',0,9);
  else {const circle=p.rank.match(/([1-9])\s*서클/);if(circle)p.circle=Number(circle[1]);}
  if(raw.realmAbilities!==undefined){if(!Array.isArray(raw.realmAbilities)||raw.realmAbilities.length>30||raw.realmAbilities.some(id=>typeof id!=='string'||id.length>80))fail('경지 능력 목록');p.realmAbilities=[...new Set(raw.realmAbilities)];}
  if(p.role==='monster'&&((p.circle||0)>0||p.realmAbilities?.length))fail('마수에 인간 경지 능력 부여 금지');
  if(raw.catalog_id!==undefined){if(p.role!=='monster'||findNPC(raw.catalog_id)?.role!=='monster')fail('등록 마수 개체 원본');p.catalog_id=raw.catalog_id;}
  if(!Object.hasOwn(battleRealms,p.realm))fail('기사 경지 코드');
  if(p.role==='monster'&&p.realm!=='none')fail('마수에 기사 배율 적용 금지');
  if(p.role==='monster'&&(findNPC(p.catalog_id||p.id)?.creatureMultiplier!==undefined||raw.creature_multiplier!==undefined)){p.creature_multiplier=decimal(raw.creature_multiplier??findNPC(p.id)?.creatureMultiplier,'마수 배율',.01,10);if(findNPC(p.catalog_id||p.id))equal(p.creature_multiplier,findNPC(p.catalog_id||p.id).creatureMultiplier,'등록 마수 배율');}
  for(const key of ['strength','dexterity','intelligence','constitution','manaStat'])p.stats[key]=num(raw.stats?.[key],key,1);
  for(const key of ['weapon_attack','technique_bonus','equipment_hp_bonus','status_hp_bonus','equipment_mp_bonus','status_mp_bonus','equipment_speed_bonus','status_speed_bonus'])p.modifiers[key]=num(raw.modifiers?.[key]??0,key,-999999);
  const maximum=battleMaximums(p);equal(p.maxHp,maximum.hp,'최대 HP 공식');equal(p.maxMp,maximum.mp,'최대 MP 공식');equal(p.speed,battleSpeed(p),'행동 속도');
  if(p.hp>p.maxHp||p.mp>p.maxMp)fail('현재 자원이 최대값 초과');
  if(raw.potentials){p.potentials={};for(const [key,value]of Object.entries(raw.potentials))p.potentials[key]=num(value,'잠재능력',0,100);}
  if(!Array.isArray(raw.skills)||raw.skills.length>70)fail('기술 목록');
  const ids=new Set();p.skills=raw.skills.map(s=>{
    const skill={id:str(s.id,'기술 ID',80),name:str(s.name,'기술명',60),kind:s.kind,mp_cost:num(s.mp_cost,'기술 MP 비용')};
    if(ids.has(skill.id)||!['physical','magic','unique','defend'].includes(skill.kind))fail('기술 ID/종류');ids.add(skill.id);
    if(skill.kind==='physical'&&s.technique_bonus!==undefined)skill.technique_bonus=num(s.technique_bonus,'검술 기술 보정');
    if(skill.kind==='magic'||skill.kind==='unique'){skill.power=num(s.power,'기술 기본 위력');skill.int_coefficient=decimal(s.int_coefficient,'INT');skill.mana_coefficient=decimal(s.mana_coefficient,'MANA');skill.basis=str(s.basis,'승인 기술/고유능력 근거',1000);}
    if(s.circle!==undefined)skill.circle=num(s.circle,'주문 서클',1,9);
    if(s.reflectable!==undefined){if(typeof s.reflectable!=='boolean')fail('주문 반사 가능 여부');skill.reflectable=s.reflectable;}
    if(skill.kind==='magic'&&skill.circle!==undefined&&p.circle!==undefined&&skill.circle>p.circle)fail('시전자보다 높은 서클 주문');
    return skill;
  });
  if(raw.art!==null&&raw.art!==undefined){
    if(p.role==='player'||raw.art.id!==(p.catalog_id||p.id)||!characterVisual(p.catalog_id||p.id,raw.art.outfit,raw.art.emotion)||(p.id==='serin'?!['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'].includes(raw.art.emotion):raw.art.emotion!=='base'))fail('미등록/다른 인물 원화');
    p.art={id:p.catalog_id||p.id,outfit:raw.art.outfit,emotion:raw.art.emotion};
  }
  if(!p.art&&p.role!=='player')p.art=registeredNPCArt(p.catalog_id||p.id);
  return p;
}
export function normalizeBattle(raw){
  if(!raw||typeof raw!=='object')fail('battle 객체');noEnlightenmentNumbers(raw);
  const b={battle_id:str(raw.battle_id,'전투 ID',100),trigger:raw.trigger,participants:[],events:[],initiative:null,outcome:null};
  if(!['dialogue','travel','dungeon','duel','ambush'].includes(b.trigger))fail('진입 상황');
  if(!Array.isArray(raw.participants)||raw.participants.length<2||raw.participants.length>8)fail('참가자 2~8명');
  b.participants=raw.participants.map(participant);const byId=new Map(b.participants.map(p=>[p.id,p]));
  if(byId.size!==b.participants.length||b.participants.filter(p=>p.role==='player').length!==1||b.participants.find(p=>p.role==='player').side!=='allied'||!b.participants.some(p=>p.side==='enemy'))fail('참가자 중복/주인공/적 소속');
  if(!Array.isArray(raw.events)||!raw.events.length||raw.events.length>120)fail('사건 1~120개');
  const live=Object.fromEntries(b.participants.map(p=>[p.id,{hp:p.hp,mp:p.mp}])),ids=new Set(),potentialUses={};
  b.events=raw.events.map((rawEvent,index)=>{
    const e={id:str(rawEvent.id,'사건 ID',80),actor:rawEvent.actor,target:rawEvent.target,kind:rawEvent.kind,result:rawEvent.result,skill_id:rawEvent.skill_id??null,damage:num(rawEvent.damage,'피해'),mp_cost:num(rawEvent.mp_cost,'MP 소비'),actor_hp_after:num(rawEvent.actor_hp_after,'행동자 HP'),actor_mp_after:num(rawEvent.actor_mp_after,'행동자 MP'),target_hp_after:num(rawEvent.target_hp_after,'대상 HP'),target_mp_after:num(rawEvent.target_mp_after,'대상 MP'),narration:str(rawEvent.narration,'전투 중계',1000),element:rawEvent.element??null};
    const actor=byId.get(e.actor),target=byId.get(e.target);if(!actor||!target||ids.has(e.id)||!battleKinds.includes(e.kind)||!['hit','dodge','block','critical','none'].includes(e.result))fail('사건 참조/종류');ids.add(e.id);
    if((live[e.actor].hp===0&&e.kind!=='defeat')||(live[e.target].hp===0&&e.kind!=='defeat'))fail('전투불능 인물의 추가 행동/타격');
    if(e.actor===e.target&&!['defend','defeat','dodge'].includes(e.kind))fail('자기 자신 공격');
    let sourceActor=actor,reflected=false;
    if(rawEvent.reflection_source_event!==undefined){
      const prev=raw.events[index-1],caster=prev?byId.get(prev.actor):null;
      if(!prev||prev.id!==rawEvent.reflection_source_event||prev.realm_reaction?.kind!=='reflection'||prev.realm_reaction.success!==true||prev.actor!==e.target||prev.target!==e.actor||e.kind!=='magic'||prev.skill_id!==e.skill_id||prev.element!==e.element||rawEvent.realm_reaction)fail('반사 주문의 원본·순서·재반사 금지');
      sourceActor=caster;reflected=true;e.reflection_source_event=rawEvent.reflection_source_event;
    }
    const skill=e.skill_id===null?null:sourceActor.skills.find(s=>s.id===e.skill_id);
    if(e.skill_id!==null&&!skill)fail('보유하지 않은 기술');equal(e.mp_cost,reflected?0:potentialMP(actor,skill,potentialUses),'기술 MP 소비');
    if(['attack','counter'].includes(e.kind)&&skill&&skill.kind!=='physical')fail('물리 기술 종류');
    if(e.mp_cost>live[e.actor].mp)fail('MP 부족');
    if(e.kind==='magic'&&(skill?.kind!=='magic'||!battleElements.includes(e.element)))fail('마법 기술/원소');
    if(e.kind==='unique'&&(skill?.kind!=='unique'||!['hyper','master'].includes(actor.realm)))fail('고유능력/하이퍼 경지');
    if(e.kind==='defeat'&&(live[e.actor].hp!==0||e.actor!==e.target))fail('전투불능 퇴장 시점');
    const reaction=validateRealmReaction(actor,target,rawEvent,rawEvent.calculation,skill);
    if(reaction.defenderCost>live[e.target].mp)fail('방어자 MP 부족');
    if(rawEvent.realm_reaction)e.realm_reaction={...rawEvent.realm_reaction};
    const damaging=['attack','counter','magic','unique'].includes(e.kind);
    if(!damaging||e.result==='dodge'||e.result==='none'){equal(e.damage,0,'회피/비공격 피해');}
    else{
      const c=rawEvent.calculation;if(!c)fail('피해 공식 증빙');
      const context=decimal(c.context_multiplier,'상황 보정',0,20),defense=num(c.defense,'실효 방어력');
      if(context!==1||defense||e.result==='critical'||e.result==='block')str(c.basis,'방어/상성/치명 판정 근거',1000);
      let expected;
      if(['attack','counter'].includes(e.kind)){
        if(skill&&skill.kind!=='physical')fail('물리 기술 종류');
        const roll=num(c.base_roll,'GM 평타 판정값',10,20);equal(c.realm_multiplier,battleRealms[actor.realm],'기사 피해 배율');
        const mana=c.mana_component===undefined?0:num(c.mana_component,'별도 마나 피해');
        if(mana&&(!skill||actor.realm==='none'||actor.role==='monster'))fail('기사 마나 추가 피해의 보유 기술 근거');
        if(mana)str(c.basis,'마나 추가 피해 근거',1000);
        expected=Math.max(1,Math.floor((roll+Math.floor(.65*actor.stats.strength+.2*actor.stats.dexterity)+actor.modifiers.weapon_attack+actor.modifiers.technique_bonus+(skill?.technique_bonus||0))*c.realm_multiplier*(actor.creature_multiplier??1)*context-defense))+Math.floor(mana*(100-reaction.manaReduction)/100);
      }else{
        equal(c.realm_multiplier,1,'마법/고유능력에 기사 물리 배율 금지');
        if(c.mana_component!==undefined)fail('기사 마나 추가 피해는 물리 기술에만 사용');
        expected=Math.max(1,Math.floor((skill.power+skill.int_coefficient*sourceActor.stats.intelligence+skill.mana_coefficient*sourceActor.stats.manaStat)*context-defense));
      }
      if(e.result==='block'&&c.full_block===true){str(c.basis,'완전 방어 근거');expected=0;}
      expected=potentialDamage(actor,target,reflected?'reflection':e.kind,e.result,expected,potentialUses);
      equal(e.damage,Math.min(live[e.target].hp,expected),'피해 공식');e.calculation={...c};
    }
    const nextActor={hp:live[e.actor].hp,mp:live[e.actor].mp-e.mp_cost},nextTarget=e.actor===e.target?nextActor:{hp:live[e.target].hp-e.damage,mp:live[e.target].mp-reaction.defenderCost};
    equal(e.actor_hp_after,nextActor.hp,'행동자 HP 변화');equal(e.actor_mp_after,nextActor.mp,'행동자 MP 변화');equal(e.target_hp_after,nextTarget.hp,'대상 HP 변화');equal(e.target_mp_after,nextTarget.mp,'대상 MP 변화');
    live[e.actor]=nextActor;live[e.target]=nextTarget;return e;
  });
  // Counter validation needs preceding normalized events; validate once the list exists.
  for(let i=0;i<b.events.length;i++)if(b.events[i].realm_reaction?.kind==='reflection'&&b.events[i].realm_reaction.success){const e=b.events[i],next=b.events[i+1];if(!next||next.reflection_source_event!==e.id)fail('반사 성공 뒤 되돌아가는 주문 사건 누락');}
  for(let i=0;i<b.events.length;i++)if(b.events[i].kind==='counter'){const e=b.events[i],p=b.events[i-1];if(!p||p.target!==e.actor||p.actor!==e.target||p.result!=='block')fail('방어 직후 반격 순서');}
  b.initiative={actor_id:str(raw.initiative?.actor_id,'선공 ID',80),reason:typeof raw.initiative?.reason==='string'?raw.initiative.reason.slice(0,1000):''};
  equal(b.initiative.actor_id,b.events[0].actor,'선공/첫 행동');const first=byId.get(b.initiative.actor_id),opponents=b.participants.filter(p=>p.side!==first.side);
  if(opponents.some(p=>p.speed>=first.speed)&&!b.initiative.reason.trim())fail('동시 대응/기습/속도 역전 근거 필요');
  const o=raw.outcome;if(!o||!['allied','enemy','draw','escape'].includes(o.winner)||!['defeat','surrender','draw','escape'].includes(o.termination))fail('최종 승패');
  b.outcome={winner:o.winner,termination:o.termination,reason:str(o.reason,'결과 근거',1000),xp_gain:num(o.xp_gain,'경험치 보상'),items_added:[],items_consumed:[],injuries:[],resources:[]};
  for(const key of ['items_added','items_consumed']){if(!Array.isArray(o[key])||o[key].length>32)fail('아이템 보상/소비');b.outcome[key]=o[key].map(item=>({name:str(item.name,'아이템 이름',60),quantity:num(item.quantity,'아이템 수량',1)}));}
  if(!Array.isArray(o.injuries)||o.injuries.length>20)fail('부상 목록');b.outcome.injuries=o.injuries.map(s=>str(s,'부상',500));
  if(!Array.isArray(o.resources)||o.resources.length!==byId.size||new Set(o.resources.map(p=>p.id)).size!==byId.size)fail('최종 자원 목록');
  b.outcome.resources=o.resources.map(r=>{if(!live[r.id])fail('최종 자원 ID');equal(r.hp,live[r.id].hp,'최종 HP');equal(r.mp,live[r.id].mp,'최종 MP');return {id:r.id,hp:r.hp,mp:r.mp};});
  if(o.termination==='defeat'){if(!['allied','enemy'].includes(o.winner))fail('전멸 승패');const losers=b.participants.filter(p=>p.side!==o.winner),winners=b.participants.filter(p=>p.side===o.winner);if(losers.some(p=>live[p.id].hp>0)||!winners.some(p=>live[p.id].hp>0))fail('전멸 결과/생존자');}
  if((o.termination==='draw')!==(o.winner==='draw')||(o.termination==='escape')!==(o.winner==='escape'))fail('종료 방식/승패');
  return b;
}
export function battleFrame(battle,count){const resources=Object.fromEntries(battle.participants.map(p=>[p.id,{hp:p.hp,mp:p.mp}]));for(const e of battle.events.slice(0,count)){resources[e.actor]={hp:e.actor_hp_after,mp:e.actor_mp_after};resources[e.target]={hp:e.target_hp_after,mp:e.target_mp_after};}return resources;}
export function validateBattleSettlement(scene,state){
  const b=scene.battle,p=b.participants.find(p=>p.role==='player'),current=state.player;
  for(const actor of b.participants.filter(a=>a.role!=='player')){const saved=resolveNPC(actor.catalog_id?{...state,npcStates:{}}:state,actor.catalog_id||actor.id,state.scene?.npc?.id===actor.id?state.scene.npc.profile||{}:{});if(saved&&saved.level!==null){for(const key of ['level','hp','maxHp','mp','maxMp','speed'])equal(actor[key],saved[key],'GitHub/현재 NPC '+actor.name+' '+key);for(const key of ['strength','dexterity','intelligence','constitution','manaStat'])equal(actor.stats[key],saved[key],'GitHub/현재 NPC '+actor.name+' '+key);equal(actor.realm,saved.realm,'NPC 기사 경지');if(actor.circle!==undefined)equal(actor.circle,saved.circle||0,'NPC 서클');if(actor.realmAbilities?.length)equal(JSON.stringify(actor.realmAbilities),JSON.stringify(saved.realmAbilities||[]),'NPC 경지 능력');equal(actor.level_hp_bonus,saved.levelHpBonus,'NPC 레벨 HP 기록');}}
  for(const key of ['level','hp','maxHp','mp','maxMp'])equal(p[key],current[key],'현재 주인공 '+key);
  for(const key of ['strength','dexterity','intelligence','constitution','manaStat'])equal(p.stats[key],current[key],'현재 능력치 '+key);
  equal(p.realm,current.realm??'none','현재 기사 경지');
  if(p.circle!==undefined)equal(p.circle,currentCircle(state),'현재 주인공 서클');
  if(p.realmAbilities?.length)equal(JSON.stringify(p.realmAbilities),JSON.stringify(current.realmAbilities||[]),'현재 주인공 경지 능력');equal(p.level_hp_bonus,current.levelHpBonus??0,'현재 레벨 HP 기록');
  const legacyInProgress=!state.skill_loadout&&state.battlePlayback?.scene?.battle?.battle_id===b.battle_id;
  const selectedSkills=legacyInProgress?current.skills.filter(s=>s.enabled!==false).map(s=>({...s,id:s.id||'legacy:'+s.name})):equippedSkills(state,'battle').filter(s=>s.skill_type!=='passive');
  for(const skill of p.skills)if(!selectedSkills.some(s=>s.id===skill.id||s.id.startsWith('legacy:')&&s.name===skill.name)&&!current.skills.some(s=>s.ultimate&&s.enabled!==false&&(s.id===skill.id||s.name===skill.name)))fail('현재 주인공 장착 기술 목록');
  for(const skill of p.skills){const saved=current.skills.find(s=>s.id===skill.id||s.name===skill.name);if(skill.circle!==undefined)equal(skill.circle,saved?.circle,'저장된 주문 서클');if(skill.reflectable!==undefined)equal(skill.reflectable,saved?.reflectable,'저장된 반사 가능 여부');}
  if(state.engine){equal(JSON.stringify(p.potentials||{}),JSON.stringify(state.engine.bonuses.potentials||{}),'장착 잠재능력');for(const skill of p.skills){const learned=current.skills.find(s=>s.id===skill.id);if(learned){if(skill.circle!==undefined)equal(skill.circle,learned.circle,'저장된 주문 서클');if(skill.reflectable!==undefined)equal(skill.reflectable,learned.reflectable,'저장된 반사 가능 여부');}if(learned?.book_id){equal(skill.mp_cost,learned.mp_cost,'기술서 MP 비용');if(skill.kind==='physical')equal(skill.technique_bonus||0,learned.technique_bonus||0,'검술서 위력');if(skill.kind==='magic')equal(skill.power,learned.spell_base_power+(state.engine.bonuses.spell_power||0),'기술서·스태프 위력');}}}
  if(!scene.player||!scene.inventory||!scene.game_state)fail('종료 player/inventory/game_state 전체 스냅샷 필요');
  const final=b.outcome.resources.find(r=>r.id===p.id),growth=battleGrowth(current,b.outcome.xp_gain);
  const restored=final.hp>0?Math.floor(current.maxHp*(p.potentials?.post_battle_hp_restore||0)/100):0;
  equal(scene.player.hp,Math.min(growth.maxHp,final.hp+growth.hpIncrease+restored),'종료 주인공 HP/레벨 보너스');equal(scene.player.mp,final.mp,'종료 주인공 MP');
  for(const key of ['maxMp','strength','dexterity','intelligence','constitution','manaStat'])equal(scene.player[key],current[key],'무단 능력치 배분 금지 '+key);
  for(const key of ['level','maxHp','xp','requiredXp'])equal(scene.player[key],growth[key],'성장/보상 '+key);
  equal(scene.player.levelHpBonus??0,growth.levelHpBonus,'누적 레벨 HP');equal(scene.player.unspentStatPoints??0,growth.unspentStatPoints,'미사용 성장 포인트');equal(scene.player.realm??'none',current.realm??'none','전투 보상으로 자동 돌파 금지');
  for(const key of Object.keys(p.modifiers))equal(p.modifiers[key],current.battleModifiers?.[key]??0,'현재 장비/상태 보정 '+key);
  equal(JSON.stringify(scene.player.skills),JSON.stringify(current.skills),'전투 보상에 없는 기술 변경');
  for(const key of Object.keys(p.modifiers))equal(scene.player.battleModifiers?.[key]??0,current.battleModifiers?.[key]??0,'전투 보상에 없는 장비/상태 변경 '+key);
  const bag=items=>{const map=new Map();for(const i of items)map.set(i.name,(map.get(i.name)||0)+i.quantity);return map;};const before=bag(state.inventory),after=bag(scene.inventory),delta=new Map();
  for(const item of b.outcome.items_added)delta.set(item.name,(delta.get(item.name)||0)+item.quantity);
  for(const item of b.outcome.items_consumed)delta.set(item.name,(delta.get(item.name)||0)-item.quantity);
  for(const id of new Set([...before.keys(),...after.keys(),...delta.keys()]))equal(after.get(id)||0,(before.get(id)||0)+(delta.get(id)||0),'아이템 정산 '+id);
  for(const injury of b.outcome.injuries)if(!scene.game_state.events?.includes(injury))fail('부상 상태 반영 누락');
  return true;
}
export function battleGrowth(player,xpGain){
  let level=player.level,xp=player.xp+xpGain,levelHpBonus=player.levelHpBonus??0,unspentStatPoints=player.unspentStatPoints??0,hpIncrease=0;
  while(level<100&&xp>=Math.floor(100*level**1.5)){xp-=Math.floor(100*level**1.5);level++;const bonus=2+Math.floor(player.strength/10);levelHpBonus+=bonus;hpIncrease+=bonus;unspentStatPoints+=3;}
  return {level,xp,requiredXp:level<100?Math.floor(100*level**1.5):0,levelHpBonus,unspentStatPoints,maxHp:player.maxHp+hpIncrease,hpIncrease};
}
