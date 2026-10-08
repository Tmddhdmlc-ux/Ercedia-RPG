import {normalizeRarity,applyItemRarity} from './item-rarity.js';
export const categories={all:'전체',equipment:'장비',consumable:'소비',material:'재료',misc:'기타'};
export const capacity=32;
const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
export function normalizeInventory(raw){
  if(!Array.isArray(raw))return [];
  return raw.slice(0,capacity).filter(v=>v&&typeof v==='object').map(v=>({
    name:text(v.name,60)||'이름 미정',description:text(v.description,1000),
    ...(typeof v.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v.id)?{id:v.id}:{}),
    category:Object.hasOwn(categories,v.category)&&v.category!=='all'?v.category:'misc',
    quantity:typeof v.quantity==='number'&&Number.isFinite(v.quantity)?Math.max(1,Math.min(999999,Math.floor(v.quantity))):1,
    effect:text(v.effect,300),
    ...(normalizeRarity(v.rarity)?{rarity:normalizeRarity(v.rarity)}:{})
  }));
}
// These examples only appear in preview mode; they are never granted or saved.
const samples=normalizeInventory([
  {name:'장비 예시',category:'equipment',description:'아이템 설명이 표시되는 위치를 확인하기 위한 예시입니다.',effect:'장비 효과가 이곳에 표시됩니다.'},
  {name:'소비 아이템 예시',category:'consumable',quantity:5,description:'커서를 올리거나 슬롯을 누르면 상세 정보를 확인할 수 있습니다.',effect:'사용 효과가 이곳에 표시됩니다.'},
  {name:'재료 예시',category:'material',quantity:12,description:'제작 재료의 설명과 보유 수량을 확인할 수 있습니다.'}
]);
export function mountInventory(state){
  const $=id=>document.getElementById(id),panel=$('inventory-panel'),tip=$('item-tooltip');
  const symbols={equipment:'⚔',consumable:'◈',material:'◇',misc:'✦'};
  let filter='all',preview=false,shown=[];
  const slots=[];
  function hide(){tip.hidden=true;for(const slot of slots)slot.removeAttribute('aria-describedby');}
  function show(index){
    const item=shown[index];if(!item)return hide();
    hide();$('item-name').textContent=item.name;$('item-category').textContent=[categories[item.category],item.rarity].filter(Boolean).join(' · ');
    $('item-description').textContent=item.description||'설명 미정';$('item-effect').textContent=item.effect;$('item-effect').hidden=!item.effect;
    $('item-quantity').textContent=`보유 수량 ${item.quantity.toLocaleString('ko-KR')}`;
    tip.hidden=false;slots[index].setAttribute('aria-describedby','item-tooltip');
    const bounds=panel.getBoundingClientRect(),anchor=slots[index].getBoundingClientRect();
    const left=Math.max(8,Math.min(anchor.left-bounds.left+anchor.width/2, panel.clientWidth-tip.offsetWidth-8));
    const top=Math.max(8,Math.min(anchor.bottom-bounds.top+8,panel.clientHeight-tip.offsetHeight-8));
    tip.style.left=`${left}px`;tip.style.top=`${top}px`;
  }
  for(let i=0;i<capacity;i++){
    const slot=document.createElement('button');slot.className='inventory-slot';slot.type='button';
    const icon=document.createElement('span'),count=document.createElement('small');icon.className='item-icon';slot.append(icon,count);
    slot.addEventListener('pointerenter',()=>show(i));slot.addEventListener('pointerleave',event=>{if(!tip.contains(event.relatedTarget))hide();});
    slot.addEventListener('focus',()=>show(i));slot.addEventListener('blur',hide);
    slot.addEventListener('click',()=>show(i));slots.push(slot);$('inventory-grid').append(slot);
  }
  for(const [key,label] of Object.entries(categories)){
    const button=document.createElement('button');button.textContent=label;button.type='button';button.dataset.category=key;
    button.onclick=()=>{filter=key;render();};$('inventory-categories').append(button);
  }
  function render(){
    hide();const items=preview?samples:state.inventory;
    shown=items.filter(item=>filter==='all'||item.category===filter);
    $('inventory-count').textContent=`${items.length} / ${capacity}`;
    $('inventory-empty').hidden=shown.length>0;
    $('inventory-empty').textContent=preview?'이 분류의 미리보기 아이템이 없습니다.':items.length?'이 분류에 보유한 아이템이 없습니다.':'아직 보유한 아이템이 없습니다.';
    $('inventory-preview').textContent=preview?'미리보기 종료':'아이템 미리보기';$('inventory-preview').setAttribute('aria-pressed',String(preview));
    $('inventory-note').textContent=preview?'설명 확인용 예시입니다. 실제 보유 아이템이나 저장 데이터에 포함되지 않습니다.':'슬롯에 커서를 올리거나 눌러 아이템 설명을 확인하세요.';
    for(const button of $('inventory-categories').children)button.setAttribute('aria-pressed',String(button.dataset.category===filter));
    slots.forEach((slot,i)=>{const item=shown[i];slot.classList.toggle('occupied',!!item);applyItemRarity(slot,item);slot.dataset.kind=item?.category||'';slot.firstChild.textContent=item?symbols[item.category]:'';slot.lastChild.textContent=item&&item.quantity>1?item.quantity.toLocaleString('ko-KR'):'';slot.setAttribute('aria-label',item?`${item.name}${item.rarity?`, ${item.rarity}`:''}, ${item.quantity}개`:`빈 슬롯 ${i+1}`);});
  }
  tip.addEventListener('pointerleave',hide);
  $('inventory-preview').onclick=()=>{preview=!preview;render();};
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  $('inventory-scroll').addEventListener('scroll',hide);window.addEventListener('resize',hide);
  render();return {render,hide};
}
