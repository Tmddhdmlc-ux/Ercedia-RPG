import {growthContext} from './growth-model.js';
import {engineItem,ensureEngine,copyEngine,investStat,equipItem,unequipItem,combatPreview,statKeys,statLabels,bookEligibility} from './engine-model.js';
import {applyItemRarity} from './item-rarity.js';
import {appendItemIcon} from './item-art-ui.js';
import {mountItemLibrary} from './item-library-ui.js';
import {mountEquipmentSlots} from './equipment-slots.js';
export function mountEngineUI(state,{render,persist,submit,isPending,assetBase}){
  const status=document.getElementById('status-panel'),bag=document.getElementById('inventory-panel');
  const growth=document.createElement('section'),gear=document.createElement('section');growth.className=gear.className='engine-card';growth.id='engine-growth';gear.id='engine-gear';status.append(growth);bag.append(gear);
  let preview=null,gearPreview=null,message='';
  const library=mountItemLibrary(state,{assetBase});
  const icon=(parent,item)=>appendItemIcon(parent,item,assetBase);
  const button=(label,action,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=()=>{try{action();}catch(e){message=e.message;refresh();}};return b;};
  const line=(parent,text)=>{const p=document.createElement('p');p.textContent=text;parent.append(p);return p;};
  const busy=()=>isPending?.()||!!state.introDraft||!!state.battlePlayback&&!state.battlePlayback.done;
  const commit=action=>{if(busy())throw Error('현재 응답 또는 전투가 끝난 뒤 변경하세요.');const next=copyEngine(state);action(next);state.player=next.player;state.engine=next.engine;message='변경을 저장했습니다.';preview=null;gearPreview=null;render();persist();refresh();};
  const equipment=mountEquipmentSlots({assetBase,isBusy:busy,unequip:slot=>commit(s=>unequipItem(s,slot))});
  function refresh(){
    library.render();
    growth.replaceChildren();gear.replaceChildren();
    const g=growthContext(state),current=g.profile.knight||g.profile.mage;line(growth,'현재 경지 · '+(current?.name||'미정'));if(current)line(growth,current.social_description);if(g.next)line(growth,'다음 경지 · '+g.next.name+' · 최소 Lv.'+g.next.min_level+' · '+(g.next.minimum_level_met?'레벨 충족 · 깨달음 필요':'레벨 미달'));line(growth,'경지 능력 · '+(g.learned_abilities.map(id=>g.rules.abilities.find(a=>a.id===id)?.name||id).join(' / ')||'습득한 능력 없음'));if(state.player.uniqueAbility)line(growth,'고유능력 · '+state.player.uniqueAbility.name+' · '+state.player.uniqueAbility.description);
    line(growth,'능력치 투자 · 미사용 포인트 '+(state.player.unspentStatPoints||0));
    for(const key of statKeys){const row=document.createElement('div');row.className='engine-row';line(row,statLabels[key]+' '+(state.player[key]??'미정'));row.append(button('+',()=>{const next=copyEngine(state);investStat(next,key);preview={key,before:combatPreview(state),after:combatPreview(next),cost:(state.player.unspentStatPoints||0)-next.player.unspentStatPoints,remaining:next.player.unspentStatPoints};refresh();},busy()||!state.player.unspentStatPoints));growth.append(row);}
    if(preview){const {before:a,after:b}=preview;line(growth,`${statLabels[preview.key]} +1 · 비용 ${preview.cost} · 남은 포인트 ${preview.remaining}`);line(growth,`최대 HP ${a.hp} → ${b.hp} / MP ${a.mp} → ${b.mp} / 물리 공격 ${a.attack.join('~')} → ${b.attack.join('~')} / 속도 ${a.speed} → ${b.speed}`);growth.append(button('투자 확정',()=>commit(s=>investStat(s,preview.key)),busy()),button('취소',()=>{preview=null;refresh();}));}
    line(gear,'장비 · 기술서');const next=copyEngine(state),e=ensureEngine(next),p=combatPreview(state);line(gear,`물리 공격 ${p.attack.join('~')} · 속도 ${p.speed} · 방어 ${p.defense} · 저항 ${p.resistance} · 주문 보정 ${p.spell_power}`);
    if(gearPreview){const a=gearPreview.before,b=gearPreview.after;line(gear,`${gearPreview.name} · ${gearPreview.equipped?'해제':'장착'} 미리보기: HP ${a.hp} → ${b.hp} · MP ${a.mp} → ${b.mp} · 공격 ${a.attack.join('~')} → ${b.attack.join('~')} · 속도 ${a.speed} → ${b.speed} · 방어 ${a.defense} → ${b.defense}`);}
    equipment.render(e);
    for(const owned of e.instances){const cat=engineItem(owned.catalog_id),row=document.createElement('article');row.className='engine-owned';icon(row,cat);applyItemRarity(row,cat);line(row,cat.name+' · '+cat.rarity+' · Lv.'+cat.required_level);line(row,cat.slot?Object.entries(cat.stats).filter(([,v])=>v).map(([k,v])=>k+' +'+v).join(' / '):cat.effect_summary);if(cat.slot){row.append(button('능력치 비교',()=>{const next=copyEngine(state),equipped=e.equipped[cat.slot]===owned.instance_id;const before=combatPreview(state);if(equipped)unequipItem(next,cat.slot);else equipItem(next,owned.instance_id);gearPreview={name:cat.name,equipped,before,after:combatPreview(next)};refresh();}));for(const potential of cat.potentials)line(row,potential.name+' · '+potential.description);row.append(button(e.equipped[cat.slot]===owned.instance_id?'장착 중':'장착',()=>commit(s=>equipItem(s,owned.instance_id)),busy()||e.equipped[cat.slot]===owned.instance_id));}else{const why=bookEligibility(state,cat.id);if(why)line(row,why);row.append(button(e.learned.includes(cat.id)?'학습 완료':'읽기·학습 요청',()=>submit?.(`${cat.id} ${cat.name}을 읽고 학습한다. 소유·직업·레벨·선행 기술·연습 및 연구 조건을 검사하고 실제 학습이 끝났을 때만 engine_events learn_book으로 확인해 주세요.`),busy()||!!why||e.learned.includes(cat.id)));}gear.append(row);}
    if(!e.instances.length)line(gear,'소유한 등록 장비와 기술서가 없습니다. 거래나 의뢰에서 획득하면 이곳에 표시됩니다.');if(message){line(growth,message);line(gear,message);}
  }
  refresh();return {render:refresh};
}
