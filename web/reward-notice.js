import {wallet,formatCopper} from './wallet.js';
export function rewardSnapshot(state){return {player:JSON.parse(JSON.stringify(state.player)),inventory:JSON.parse(JSON.stringify(state.inventory||[])),currency:wallet(state)};}
function items(list){const result=new Map();for(const item of list){const key=item.catalog_id||item.id||item.name;const prior=result.get(key)||{name:item.name||key,quantity:0};prior.quantity+=item.quantity||0;result.set(key,prior);}return result;}
export function rewardMessages(before,state,{battle=false}={}){
 const messages=[],old=before.player,p=state.player;let xp=(p.xp||0)-(old.xp||0);if(Number.isInteger(old.level)&&Number.isInteger(p.level)&&p.level>=old.level){for(let level=old.level;level<p.level;level++)xp+=Math.floor(100*level**1.5);if(xp>0)messages.push('경험치 '+xp+'를 획득했습니다.');if(p.level>old.level)messages.push('레벨 '+p.level+'에 도달했습니다.');}
 const known=new Set((old.skills||[]).map(s=>s.id));for(const skill of p.skills||[])if(!known.has(skill.id))messages.push(skill.name+'을 습득했습니다.');
 if(!battle){const coins=wallet(state)-before.currency;if(coins>0)messages.push(formatCopper(coins)+'를 획득했습니다.');const prior=items(before.inventory);for(const [key,item]of items(state.inventory||[])){const count=item.quantity-(prior.get(key)?.quantity||0);if(count>0)messages.push(item.name+(count>1?' ×'+count:'')+'을 획득했습니다.');}}
 return messages;
}
export function mountRewardNotice(stage){
 const layer=document.createElement('div');layer.className='reward-notice';layer.hidden=true;layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');stage.append(layer);let timer=null;
 function clear(){clearTimeout(timer);timer=null;layer.hidden=true;layer.replaceChildren();}
 function show(messages){clear();if(!messages.length)return;for(const text of messages){const line=document.createElement('p');line.textContent=text;layer.append(line);}layer.hidden=false;timer=setTimeout(clear,Math.min(12000,4500+messages.length*650));}
 return {show,clear};
}
