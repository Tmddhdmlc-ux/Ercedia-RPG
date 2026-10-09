import {normalizeRarity,applyItemRarity} from './item-rarity.js';
import {catalogItem,itemCategory,itemIconURL,itemDescription,itemDetails} from './item-catalog.js';
export const categories={all:'전체',equipment:'장비',book:'기술서',consumable:'소비',material:'재료',misc:'기타'};
export const capacity=32;
const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
export function normalizeInventory(raw){
  if(!Array.isArray(raw))return [];
  return raw.slice(0,capacity).filter(v=>v&&typeof v==='object').map(v=>{const cat=catalogItem(v.catalog_id||v.id);return ({
    name:text(v.name,60)||'이름 미정',description:text(v.description,1000),
    ...(typeof v.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v.id)?{id:v.id}:{}),
    category:Object.hasOwn(categories,v.category)&&v.category!=='all'?v.category:'misc',
    quantity:typeof v.quantity==='number'&&Number.isFinite(v.quantity)?Math.max(1,Math.min(999999,Math.floor(v.quantity))):1,
    effect:text(v.effect,300),
    ...(Array.isArray(v.instance_ids)?{instance_ids:[...new Set(v.instance_ids.filter(id=>typeof id==='string'&&/^[A-Za-z0-9:_-]{1,120}$/.test(id)))].slice(0,Math.min(999999,Math.max(1,Math.floor(v.quantity||1))))}:{}),
    ...(normalizeRarity(v.rarity)?{rarity:normalizeRarity(v.rarity)}:{}),
    ...(cat?{id:cat.id,...(v.catalog_id?{catalog_id:cat.id}:{}),name:cat.name,category:itemCategory(cat),rarity:cat.rarity||'',description:text(v.description,1000)||itemDescription(cat),effect:text(v.effect,300)||itemDetails(cat).slice(0,300)}:{})
  });});
}
// These examples only appear in preview mode; they are never granted or saved.
const samples=normalizeInventory([
  {name:'장비 예시',category:'equipment',description:'아이템 설명이 표시되는 위치를 확인하기 위한 예시입니다.',effect:'장비 효과가 이곳에 표시됩니다.'},
  {name:'소비 아이템 예시',category:'consumable',quantity:5,description:'커서를 올리거나 슬롯을 누르면 상세 정보를 확인할 수 있습니다.',effect:'사용 효과가 이곳에 표시됩니다.'},
  {name:'재료 예시',category:'material',quantity:12,description:'제작 재료의 설명과 보유 수량을 확인할 수 있습니다.'}
]);
export function mountInventory(state,{assetBase}={}){
  const $=id=>document.getElementById(id),panel=$('inventory-panel'),tip=$('item-tooltip');
  const symbols={equipment:'⚔',book:'▤',consumable:'◈',material:'◇',misc:'✦'};
  const catalog=item=>item?catalogItem(item.id):null;
  let filter='all',preview=false,shown=[],selected=null;
  const slots=[];
  function hide(){tip.hidden=true;selected=null;for(const slot of slots){slot.removeAttribute('aria-describedby');slot.setAttribute('aria-selected','false');}}
  function show(index){
    const item=shown[index];if(!item)return hide();
    hide();const data=catalog(item);$('item-name').textContent=item.name;$('item-category').textContent=[categories[item.category],item.rarity||data?.rarity].filter(Boolean).join(' · ');
    $('item-description').textContent=item.description||(data?itemDescription(data):'')||'설명 미정';
    const stats=data?.stats?Object.entries(data.stats).filter(([,v])=>v).map(([k,v])=>`${({strength:'근력',agility:'민첩',intelligence:'지능',constitution:'체질',mana:'마나',weapon_attack:'무기 공격력'})[k]||k} +${v}`).join(' · '):'';
    const equipped=data?.slot&&state.engine?.instances?.some(i=>i.catalog_id===data.id&&i.instance_id===state.engine?.equipped?.[data.slot]);
    const eligible=data?.slot?equipped?'장착 중':state.player.level<data.required_level?'장착 불가 · 레벨 부족':data.equip_class&&!['공용','all'].includes(data.equip_class)&&!state.player.job.includes(data.equip_class)?'장착 조건 · '+data.equip_class:'장착 요청 가능 · 아래 장비 메뉴에서 확인':data?.skill_id?'학습 조건은 아래 기술서 메뉴에서 확인':null;
    $('item-effect').textContent=[item.effect,stats,data?.required_level?'필요 레벨 '+data.required_level:'',data?.equip_class||data?.required_class,eligible,(data?.potentials||[]).map(p=>p.name+' · '+p.description).join('\n')].filter(Boolean).join('\n');$('item-effect').hidden=!$('item-effect').textContent;
    $('item-quantity').textContent=`보유 수량 ${item.quantity.toLocaleString('ko-KR')}`;
    selected=index;tip.hidden=false;slots[index].setAttribute('aria-describedby','item-tooltip');slots[index].setAttribute('aria-selected','true');
  }
  for(let i=0;i<capacity;i++){
    const slot=document.createElement('button');slot.className='inventory-slot';slot.type='button';
    const icon=document.createElement('span'),count=document.createElement('small');icon.className='item-icon';slot.append(icon,count);
    slot.addEventListener('focus',()=>show(i));
    slot.addEventListener('click',()=>show(i));slots.push(slot);$('inventory-grid').append(slot);
  }
  for(const [key,label] of Object.entries(categories)){
    const button=document.createElement('button');button.textContent=label;button.type='button';button.dataset.category=key;
    button.onclick=()=>{filter=key;render();};$('inventory-categories').append(button);
  }
  function render(){
    const previous=selected;hide();const items=preview?samples:state.inventory;
    shown=items.filter(item=>filter==='all'||item.category===filter);
    $('inventory-count').textContent=`${items.length} / ${capacity}`;
    $('inventory-empty').hidden=shown.length>0;
    $('inventory-empty').textContent=preview?'이 분류의 미리보기 아이템이 없습니다.':items.length?'이 분류에 보유한 아이템이 없습니다.':'아직 보유한 아이템이 없습니다.';
    $('inventory-preview').textContent=preview?'미리보기 종료':'아이템 미리보기';$('inventory-preview').setAttribute('aria-pressed',String(preview));
    $('inventory-note').textContent=preview?'설명 확인용 예시입니다. 실제 보유 아이템이나 저장 데이터에 포함되지 않습니다.':'아이템을 누르면 상세 정보를 확인합니다. 장착과 기술서 학습은 아래 장비 메뉴에서 진행합니다.';
    for(const button of $('inventory-categories').children)button.setAttribute('aria-pressed',String(button.dataset.category===filter));
    slots.forEach((slot,i)=>{const item=shown[i],data=catalog(item);slot.hidden=!item&&i>=Math.max(8,Math.ceil(shown.length/4)*4);slot.classList.toggle('occupied',!!item);applyItemRarity(slot,data||item);slot.dataset.kind=item?.category||'';
      if(data?.icon_path){let img=slot.firstChild.querySelector('img');if(!img){img=document.createElement('img');img.alt='';img.loading='lazy';img.onerror=()=>{slot.firstChild.textContent=symbols[item.category]||'◇';};slot.firstChild.replaceChildren(img);}const url=itemIconURL(data,assetBase);if(img.getAttribute('src')!==url)img.src=url;}else slot.firstChild.textContent=item?symbols[item.category]:'';
      slot.lastChild.textContent=item&&item.quantity>1?item.quantity.toLocaleString('ko-KR'):'';slot.setAttribute('aria-label',item?`${item.name}${item.rarity?`, ${item.rarity}`:''}, ${item.quantity}개`:`빈 슬롯 ${i+1}`);
    });
    if(shown.length)show(previous!==null&&shown[previous]?previous:0);
  }
  $('inventory-preview').onclick=()=>{preview=!preview;render();};
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  render();return {render,hide};
}
