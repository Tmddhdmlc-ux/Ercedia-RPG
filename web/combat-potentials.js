// Deterministic validation helpers. A fresh tracker is used for each precomputed battle.
export function potentialMP(actor,skill,used){
  let cost=skill?.mp_cost||0;const p=actor.potentials||{},set=used[actor.id]||(used[actor.id]=new Set());
  if(cost&&skill.kind==='magic'&&!set.has('spell')){cost=Math.floor(cost*(1-(p.first_spell_mp_discount||0)/100));set.add('spell');}
  if(cost&&!set.has('mp')){cost=Math.max(0,cost-(p.first_mp_flat_discount||0));set.add('mp');}return cost;
}
export function potentialDamage(actor,target,kind,result,damage,used){
  const a=used[actor.id]||(used[actor.id]=new Set()),t=used[target.id]||(used[target.id]=new Set()),p=actor.potentials||{},q=target.potentials||{};
  if(!damage||result==='dodge')return damage;
  if(['attack','counter'].includes(kind)){if(!a.has('physical_hit')){damage=Math.floor(damage*(1+(p.first_physical_hit_bonus||0)/100));a.add('physical_hit');}if(!t.has('physical_taken')){damage=Math.floor(damage*(1-(q.first_hit_physical_reduce||0)/100));t.add('physical_taken');}}
  if(kind==='magic'&&!a.has('spell_hit')){damage=Math.floor(damage*(1+(p.first_spell_hit_bonus||0)/100));a.add('spell_hit');}
  if(result==='block')damage=Math.floor(damage*(1-(q.guard_damage_reduce||0)/100));return damage;
}
