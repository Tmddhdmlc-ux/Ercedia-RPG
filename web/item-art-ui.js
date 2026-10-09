import {itemCatalog,catalogItem,itemIconURL} from './item-catalog.js';
import {applyItemRarity} from './item-rarity.js';
export function resolveItemArt(item){
  const registered=catalogItem(item?.catalog_id||item?.id||item?.item_id);if(registered)return registered;
  const matches=itemCatalog.filter(p=>p.name===item?.name);return matches.length===1?matches[0]:null;
}
export function appendItemIcon(parent,item,assetBase){
  const registered=resolveItemArt(item);if(!registered)return null;
  if(!registered.icon_path){const frame=document.createElement('span');frame.className='registered-item-icon';frame.textContent=registered.ui_symbol||'◈';frame.setAttribute('aria-label',registered.name);parent.append(frame);return frame;}
  const frame=document.createElement('span'),image=document.createElement('img');frame.className='registered-item-icon';
  image.loading='lazy';image.alt=registered.name;image.src=itemIconURL(registered,assetBase);image.onerror=()=>{image.hidden=true;frame.textContent='◇';frame.setAttribute('aria-label',registered.name+' · 이미지 로드 실패');};
  frame.append(image);applyItemRarity(frame,registered);parent.append(frame);return frame;
}
