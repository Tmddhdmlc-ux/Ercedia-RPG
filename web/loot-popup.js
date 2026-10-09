import {resolveItemArt,appendItemIcon} from './item-art-ui.js';
import {applyItemRarity} from './item-rarity.js';
import {coinLootLabel} from './loot-model.js';
export function mountLootPopup(state,{persist,render=()=>{},assetBase}={}){
  const stage=document.getElementById('stage'),overlay=document.createElement('div'),panel=document.createElement('section'),title=document.createElement('h2'),list=document.createElement('div'),confirm=document.createElement('button');
  overlay.id='loot-popup';overlay.className='loot-popup-overlay';overlay.hidden=true;panel.className='loot-popup-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','loot-popup-title');title.id='loot-popup-title';title.textContent='전리품 획득';list.className='loot-popup-list';confirm.type='button';confirm.className='primary loot-popup-confirm';confirm.textContent='확인';panel.append(title,list,confirm);overlay.append(panel);stage.append(overlay);
  let shown=null,previousFocus=null;
  function dismiss(){if(!state.lootPopup?.pending)return;state.lootPopup.pending=false;overlay.hidden=true;shown=null;persist?.();previousFocus?.focus?.();render();}
  confirm.onclick=dismiss;
  overlay.addEventListener('click',event=>event.stopPropagation());
  overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();dismiss();}else if(event.key==='Tab'){event.preventDefault();confirm.focus();}});
  function refresh(){
    const receipt=state.lootPopup,visible=receipt?.pending&&state.battleApplied?.includes(receipt.battle_id)&&state.battlePlayback?.done&&state.battlePlayback.scene.battle.battle_id===receipt.battle_id&&!state.battlePlayback.replay&&state.page==='story'&&document.querySelector('.game').dataset.title!=='active';
    overlay.hidden=!visible;if(!visible){shown=null;return;}
    if(shown===receipt.battle_id)return;
    list.replaceChildren();
    if(receipt.copper>0){const row=document.createElement('p');row.className='loot-popup-coins';row.textContent=coinLootLabel(receipt.copper);list.append(row);}
    for(const item of receipt.items){const cat=resolveItemArt(item),row=document.createElement('div'),label=document.createElement('span');row.className='loot-popup-item';label.className='loot-popup-label';appendItemIcon(row,item,assetBase);applyItemRarity(row,cat||item);label.textContent=item.name+(item.quantity>1?' × '+item.quantity:'')+' 획득!';row.append(label);if(cat?.rarity){const badge=document.createElement('small');badge.textContent=cat.rarity;row.append(badge);}list.append(row);}
    if(!receipt.copper&&!receipt.items.length){const row=document.createElement('p');row.textContent='획득한 전리품이 없습니다.';list.append(row);}
    shown=receipt.battle_id;previousFocus=document.activeElement;confirm.focus();
  }
  return {render:refresh,dismiss};
}
