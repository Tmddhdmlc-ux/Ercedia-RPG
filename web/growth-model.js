import {growthRules} from './growth-data.js';
export const realmOrder=['none','basic','expert','hyper','master'];
const requireGrowth=(ok,message)=>{if(!ok)throw Error('성장 검증: '+message);};
export function currentCircle(state){return state.player.circle??state.engine?.registration?.circle??0;}
export function growthProfile(actor){
  const knight=growthRules.knights.find(r=>r.id===actor.realm),mage=growthRules.circles.find(r=>r.circle===actor.circle);
  return {knight:knight||null,mage:mage||null};
}
export function growthContext(state){
  const player={...state.player,circle:currentCircle(state)},profile=growthProfile(player);
  const next=player.job==='검사'?growthRules.knights[realmOrder.indexOf(player.realm||'none')]:player.job==='마법사'?growthRules.circles.find(r=>r.circle===player.circle+1):null;
  return {rules:growthRules,profile,next:next?{...next,minimum_level_met:player.level>=next.min_level,enlightenment_required:true}:null,learned_abilities:player.realmAbilities||[]};
}
export function abilityAvailable(actor,id){
  const ability=growthRules.abilities.find(a=>a.id===id);if(!ability)return false;
  return ability.track==='knight'?realmOrder.indexOf(actor.realm)>=realmOrder.indexOf(ability.realm):(actor.circle||0)>=ability.circle;
}
export function hasRealmAbility(actor,id){return abilityAvailable(actor,id)&&(actor.realmAbilities||[]).includes(id);}
export function assertGrowthSnapshot(state,player){
  if(!player)return;
  if(Object.hasOwn(player,'realm'))requireGrowth((player.realm||'none')===(state.player.realm||'none'),'경지 변경은 breakthrough 사건으로 기록하세요.');
  if(Object.hasOwn(player,'circle'))requireGrowth(player.circle===currentCircle(state),'서클 변경은 breakthrough 사건으로 기록하세요.');
  if(Object.hasOwn(player,'realmAbilities'))requireGrowth(JSON.stringify(player.realmAbilities)===JSON.stringify(state.player.realmAbilities||[]),'경지 능력 학습은 learn_realm_ability 사건으로 기록하세요.');
  if(Object.hasOwn(player,'uniqueAbility'))requireGrowth(JSON.stringify(player.uniqueAbility)===JSON.stringify(state.player.uniqueAbility),'고유능력 변경은 깨달음 사건으로 기록하세요.');
  if(state.player.job&&player.job)requireGrowth(player.job===state.player.job,'직업 변경은 profession 사건으로 기록하세요.');
  if(!state.player.job&&player.job)requireGrowth(['검사','마법사'].includes(player.job),'기본 직업은 검사·마법사이며 히든클래스는 보류입니다.');
}
export function applyGrowthEvent(state,event){
  const p=state.player,e=state.engine;
  requireGrowth(typeof event.reason==='string'&&event.reason.trim().length>0,'실제 경험·판정 사유가 필요합니다.');
  requireGrowth(!Object.keys(event).some(k=>/enlightenment.*(progress|chance|percent|score|probability)|breakthrough.*(chance|probability|progress)|깨달음.*(확률|진척|수치|점수)/i.test(k)),'깨달음 수치화 금지');
  if(event.kind==='learn_realm_ability'){
    const actor={...p,circle:currentCircle(state)};
    const ability=growthRules.abilities.find(a=>a.id===event.ability_id);
    requireGrowth(ability&&(ability.track==='knight'?p.job==='검사':p.job==='마법사'),'능력 계열의 직업이 필요합니다.');
    requireGrowth(abilityAvailable(actor,event.ability_id),'현재 경지에서 배울 수 없는 능력입니다.');
    p.realmAbilities=[...new Set([...(p.realmAbilities||[]),event.ability_id])];return;
  }
  requireGrowth(typeof event.enlightenment==='string'&&event.enlightenment.trim().length>0&&event.enlightenment.length<=4000,'플레이어의 깨달음 서술이 필요합니다.');
  requireGrowth(!['progress','chance','score','probability','percent'].some(k=>Object.hasOwn(event,k)),'깨달음 수치화 금지');
  if(event.track==='knight'){
    requireGrowth(p.job==='검사','기사 돌파는 검사 직업이 필요합니다.');
    const old=realmOrder.indexOf(p.realm||'none'),idx=realmOrder.indexOf(event.realm),rule=growthRules.knights.find(r=>r.id===event.realm);
    requireGrowth(old>=0&&idx===old+1&&!!rule,'기사 경지는 순서대로 돌파합니다.');
    requireGrowth(Number.isInteger(p.level)&&p.level>=rule.min_level,'최소 레벨 '+rule.min_level);
    if(event.realm==='hyper')requireGrowth(event.unique_ability&&typeof event.unique_ability.name==='string'&&event.unique_ability.name.trim()&&typeof event.unique_ability.description==='string'&&event.unique_ability.description.trim(),'하이퍼 개화의 고유능력 이름·작동·대가·한계를 기록하세요.');
    for(const [key,value]of Object.entries(rule.stat_bonus))requireGrowth(Number.isFinite(p[key]),'돌파 능력치가 미정입니다: '+key);
    for(const [key,value]of Object.entries(rule.stat_bonus))p[key]+=value;
    p.realm=event.realm;
    if(event.realm==='hyper')p.uniqueAbility={name:event.unique_ability.name.slice(0,60),description:event.unique_ability.description.slice(0,2000)};
  }else{
    requireGrowth(event.track==='mage'&&p.job==='마법사','마법사 돌파 직업·계열 오류');
    const circle=currentCircle(state),rule=growthRules.circles.find(r=>r.circle===event.circle);
    requireGrowth(!!rule&&event.circle===circle+1,'서클은 순서대로 돌파합니다.');
    requireGrowth(Number.isInteger(p.level)&&p.level>=rule.min_level,'최소 레벨 '+rule.min_level);
    if(event.circle>=8)requireGrowth(typeof event.transcendent_enlightenment==='string'&&event.transcendent_enlightenment.trim().length>0,'신화·신의 영역에는 별도의 초월적 깨달음 서술이 필요합니다.');
    p.circle=event.circle;e.registration={...(e.registration||{}),job:p.job,circle:p.circle};
  }
  e.growth_history=[...(e.growth_history||[]),{event_id:event.event_id,track:event.track,realm:p.realm||'none',circle:currentCircle(state),enlightenment:event.enlightenment,reason:event.reason}];
}
export function manaResistanceRate(actor,target){
  const gap=realmOrder.indexOf(target.realm)-realmOrder.indexOf(actor.realm);
  return actor.realm!=='none'&&realmOrder.includes(actor.realm)&&gap>0&&hasRealmAbility(target,'knight_mana_guard')?(growthRules.mana_guard.reduction_percent[Math.min(gap,3)]||0):0;
}
export function reflectionChance(defender,spellCircle){
  if(!Number.isInteger(spellCircle)||spellCircle<1||!hasRealmAbility(defender,'spell_reflection'))return 0;
  const gap=defender.circle-spellCircle;
  return gap>0?growthRules.reflection.chance_percent[Math.min(gap,4)]:0;
}
// GM supplies the roll and outcome; this engine only checks their consistency.
export function validateRealmReaction(actor,target,event,calculation,skill){
  const reaction=event.realm_reaction;
  if(!reaction)return {manaReduction:0,defenderCost:0,reflected:false};
  requireGrowth(typeof reaction.basis==='string'&&reaction.basis.trim().length>0,'방어·반사의 실제 근거가 필요합니다.');
  requireGrowth(event.actor!==event.target,'자기 자신에 대한 경지 반응 금지');
  if(reaction.kind==='mana_guard'){
    requireGrowth(['attack','counter'].includes(event.kind)&&['hit','block','critical'].includes(event.result),'마나 방어는 기사 물리 공격의 적중에만 적용합니다.');
    requireGrowth(Number.isInteger(calculation?.mana_component)&&calculation.mana_component>0,'별도 마나 피해를 기록하세요.');
    const rate=manaResistanceRate(actor,target);requireGrowth(rate>0,'습득한 마나 방어와 상위 경지가 필요합니다.');
    const cost=growthRules.mana_guard.base_mp_cost+Math.ceil(calculation.mana_component/10);
    requireGrowth(reaction.mp_cost===cost&&reaction.reduction_percent===rate,'마나 방어 비용·감소율 불일치');
    return {manaReduction:rate,defenderCost:cost,reflected:false};
  }
  requireGrowth(reaction.kind==='reflection'&&event.kind==='magic'&&!event.reflection_source_event&&['hit','block','critical'].includes(event.result),'반사 대상은 아직 반사되지 않은 직접 주문이어야 합니다.');
  requireGrowth(skill?.reflectable===true,'직접 날아오는 반사 가능한 주문만 되돌릴 수 있습니다.');
  const chance=reflectionChance(target,skill.circle),cost=Math.max(growthRules.reflection.min_mp_cost,Math.ceil(skill.mp_cost/2));
  requireGrowth(chance>0&&Number.isInteger(reaction.chance_percent)&&reaction.chance_percent>0&&reaction.chance_percent<=chance,'반사 확률은 경지 차이의 상한 이하여야 합니다.');
  requireGrowth(Number.isInteger(reaction.roll)&&reaction.roll>=1&&reaction.roll<=100,'GM의 1~100 반사 판정값 필요');
  const success=reaction.roll<=reaction.chance_percent;
  requireGrowth(reaction.success===success&&reaction.mp_cost===cost,'반사 판정·MP 비용 불일치');
  requireGrowth(!success||(event.result==='block'&&calculation?.full_block===true),'반사 성공은 원래 주문을 완전히 막아야 합니다.');
  requireGrowth(success||calculation?.full_block!==true,'반사 실패를 완전 방어로 처리할 수 없습니다.');
  return {manaReduction:0,defenderCost:cost,reflected:success};
}
