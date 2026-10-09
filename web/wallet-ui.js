import {wallet,formatCopper} from './wallet.js';
export function mountWalletUI(state){
  const nodes=[];
  const details=document.createElement('details'),summary=document.createElement('summary'),full=document.createElement('p'),feedback=document.createElement('span');
  details.className='wallet-hud';details.id='wallet-hud';summary.setAttribute('aria-label','소지금 상세 보기');details.append(summary,full);feedback.className='wallet-change';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  document.getElementById('play-hud').append(details,feedback);
  for(const id of ['status-panel','inventory-panel']){const p=document.createElement('p');p.className='wallet-balance';p.dataset.walletView=id;document.getElementById(id).prepend(p);nodes.push(p);}
  let previous=wallet(state),timer;
  function render(){
    const balance=wallet(state),label=formatCopper(balance);summary.textContent='◉ '+formatCopper(balance,{compact:true});full.textContent=label+' · '+balance.toLocaleString('ko-KR')+'동화';summary.title=label;
    for(const node of nodes){node.textContent='소지금 · '+label;node.dataset.walletCopper=String(balance);}
    details.dataset.walletCopper=String(balance);
    if(balance!==previous){const delta=balance-previous;feedback.textContent=(delta>0?'+':'−')+formatCopper(Math.abs(delta));feedback.dataset.direction=delta>0?'gain':'spend';clearTimeout(timer);timer=setTimeout(()=>{feedback.textContent='';},3500);previous=balance;}
  }
  render();return {render};
}
