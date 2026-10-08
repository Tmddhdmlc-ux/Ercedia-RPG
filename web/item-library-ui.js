import {itemCatalog,lootCatalog,itemCategory,itemIconURL,itemDescription,itemDetails} from './item-catalog.js';
import {applyItemRarity} from './item-rarity.js';
export function mountItemLibrary(state,{assetBase}={}){
  const root=document.createElement('details');root.className='item-library';
  const title=document.createElement('summary');title.textContent='장비 · 책 · 전리품 도감';root.append(title);
  const note=document.createElement('p');note.textContent='등록된 아이템과 획득 후보입니다. 도감 열람으로 아이템을 지급하지 않습니다.';root.append(note);
  const controls=document.createElement('div'),filter=document.createElement('select'),search=document.createElement('input'),count=document.createElement('p'),list=document.createElement('div'),nav=document.createElement('div');
  controls.className='item-library-controls';list.className='item-library-grid';search.type='search';search.placeholder='이름 · ID · 지역 검색';search.setAttribute('aria-label','아이템 검색');filter.setAttribute('aria-label','도감 분류');
  for(const [value,label]of [['equipment','장비 300'],['book','책 70'],['material','전리품 재료 40'],['loot','마수·던전 보상표']]){const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);}filter.value='equipment';
  controls.append(filter,search);root.append(controls,count,list,nav);document.getElementById('inventory-panel').append(root);
  let page=0,key=null;
  function draw(){
    const query=search.value.trim().toLowerCase(),group=filter.value,rows=group==='loot'?[...lootCatalog.monsters,...lootCatalog.dungeon_rewards]:itemCatalog.filter(p=>itemCategory(p)===group);
    const matches=rows.filter(p=>JSON.stringify(p).toLowerCase().includes(query)),pages=Math.max(1,Math.ceil(matches.length/24));page=Math.min(page,pages-1);
    const next=group+':'+query+':'+page;if(key===next)return;key=next;list.replaceChildren();nav.replaceChildren();count.textContent=matches.length+'건 · '+(page+1)+' / '+pages+'페이지';
    for(const p of matches.slice(page*24,page*24+24)){
      const card=document.createElement('article'),heading=document.createElement('h4'),description=document.createElement('p'),detail=document.createElement('p');card.className='item-library-card';
      heading.textContent=p.name||p.monster_name;
      if(group!=='loot'){
        const image=new Image();image.loading='lazy';image.src=itemIconURL(p,assetBase);image.alt=p.name;image.onerror=()=>{image.hidden=true;};card.append(image);applyItemRarity(card,p);
        description.textContent=p.id+' · '+(p.rarity||'전리품')+' · '+itemDescription(p);detail.textContent=itemDetails(p);
      }else if(p.monster_id){description.textContent=p.monster_id+' · '+p.region_id;detail.textContent=p.roll_table.map(entry=>{const item=itemCatalog.find(i=>i.id===entry.item_id);return item.name+' · 성공 후 상대 가중치 '+entry.weight+' · '+entry.min_qty+'~'+entry.max_qty+'개';}).join('\n')+'\n드롭 성공률은 미확정이며 재료가 나오지 않을 수 있습니다.';}
      else {description.textContent=p.dungeon_id+' · '+p.region_id+' · 권장 Lv.'+p.recommended_levels.join('~');detail.textContent=p.first_clear.guaranteed.map(r=>r.type==='xp'?'첫 클리어 XP '+r.amount:r.type==='material_bundle'?'재료 후보 '+r.source_material_ids.join(', ')+' · '+r.quantity+'개':'최초 클리어 기록 '+r.id).join('\n')+'\n선택 장비 '+p.first_clear.optional_reward_pool.equipment_ids.join(', ')+'\n선택 책 '+p.first_clear.optional_reward_pool.book_ids.join(', ')+'\n추가 보상은 실제 사건에 따라 판정합니다. '+(p.repeatable?'재출현 확인 후 반복 보상 제한 적용.':'반복 클리어 보상 없음.');}
      card.append(heading,description,detail);list.append(card);
    }
    for(const [label,delta]of [['이전',-1],['다음',1]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=page+delta<0||page+delta>=pages;button.onclick=()=>{page+=delta;draw();};nav.append(button);}
  }
  filter.onchange=search.oninput=()=>{page=0;draw();};root.ontoggle=()=>{if(root.open)draw();};
  return {render(){if(root.open)draw();}};
}
