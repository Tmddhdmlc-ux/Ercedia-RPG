import {engineItem} from './engine-model.js';
import {appendItemIcon} from './item-art-ui.js';
import {applyItemRarity} from './item-rarity.js';
import {itemDescription,itemDetails} from './item-catalog.js';
export function mountEquipmentSlots({assetBase,unequip,isBusy}){
  const $=id=>document.getElementById(id),detail=$('equipment-detail'),views=[];let selected=null,pinned=false;
  function hide(){selected=null;pinned=false;detail.hidden=true;for(const v of views)v.button.removeAttribute('aria-describedby');}
  function show(view){
    if(!view.item)return hide();selected=view;detail.hidden=false;
    for(const v of views)v.button.removeAttribute('aria-describedby');view.button.setAttribute('aria-describedby','equipment-detail');
    $('equipment-detail-name').textContent=view.item.name;$('equipment-detail-rarity').textContent=view.label+' · '+view.item.rarity;
    $('equipment-detail-description').textContent=itemDescription(view.item);$('equipment-detail-stats').textContent=itemDetails(view.item);
    $('equipment-unequip').disabled=isBusy();
  }
  for(const [slot,label,symbol]of [['weapon','무기','⚔'],['armor','방어구','♜'],['accessory','악세서리','◇']]){
    const root=document.createElement('div'),heading=document.createElement('span'),button=document.createElement('button'),name=document.createElement('small');
    root.className='equipment-slot-wrap';heading.textContent=label;button.type='button';button.className='inventory-slot equipment-slot';button.dataset.slot=slot;name.textContent='미장착';
    root.append(heading,button,name);$('equipment-slots').append(root);const view={slot,label,symbol,button,name,item:null,id:null};views.push(view);
    button.onpointerenter=button.onfocus=()=>{if(!pinned)show(view);};button.onpointerleave=event=>{if(!pinned&&!detail.contains(event.relatedTarget))hide();};
    button.onblur=event=>{if(!pinned&&!detail.contains(event.relatedTarget))hide();};button.onclick=()=>{if(pinned&&selected===view)return hide();show(view);pinned=!!view.item;};
  }
  $('equipment-unequip').onclick=()=>{if(selected&&!isBusy())unequip(selected.slot);};$('equipment-detail-close').onclick=hide;
  $('status-equipment').addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  detail.onpointerleave=()=>{if(!pinned)hide();};
  return {render(engine){
    for(const view of views){const owned=engine.instances.find(i=>i.instance_id===engine.equipped[view.slot]),item=engineItem(owned?.catalog_id);view.item=item;
      const id=item?.id||'';if(view.id!==id){view.id=id;view.button.replaceChildren();if(item)appendItemIcon(view.button,item,assetBase);else{const empty=document.createElement('span');empty.className='equipment-empty-symbol';empty.textContent=view.symbol;view.button.append(empty);}}
      applyItemRarity(view.button,item);view.button.classList.toggle('occupied',!!item);view.button.setAttribute('aria-label',view.label+' · '+(item?item.name+' · '+item.rarity:'미장착'));view.name.textContent=item?.name||'미장착';
    }
    if(selected){if(selected.item)show(selected);else hide();}
  }};
}
