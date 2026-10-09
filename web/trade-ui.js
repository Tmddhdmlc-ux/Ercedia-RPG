import {shopTypes,regionalShops} from './shop-types.js';
import {newTrade,reserveTrade,cancelReservation,cancelTrade,tradeTotals,commitTrade,playerTradeRows,tradeAllowed,tradeQuote,merchantFunds,pricesChanged,marketSignature} from './trade-model.js';
import {catalogItem,itemDetails,itemDescription} from './item-catalog.js';
import {appendItemIcon} from './item-art-ui.js';
import {applyItemRarity} from './item-rarity.js';
import {wallet,coins} from './currency.js';
import {KEY} from './state.js';
export function mountTradeUI(state,{assetBase,isPending=()=>false,submit,render,persistCandidate,returnToStory,onReceipt,parent,host}={}){
  const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  const button=(text,action,cls)=>{const b=element('button',cls,text);b.type='button';b.onclick=action;return b;};
  const menu=element('details','world-system shop-menu'),summary=element('summary',null,'상점 · 양방향 거래'),menuBody=element('div');menu.append(summary,menuBody);(parent||document.getElementById('inventory-panel')).append(menu);
  const screen=element('section','trade-screen');screen.id='trade-screen';screen.hidden=true;screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');screen.setAttribute('aria-labelledby','trade-title');
  (host||document.querySelector('.game')).append(screen);
  let draft=null,selected=null,lastFocus=null,drag=null,feedback='',receipt=null,animationTimer=null,openedPage=null;
  const save=persistCandidate||((candidate)=>localStorage.setItem(KEY,JSON.stringify(candidate)));
  function close(){if(draft&&!draft.confirmed)cancelTrade(draft);draft=null;receipt=null;screen.hidden=true;clearTimeout(animationTimer);lastFocus?.focus?.();}
  function open(id){if(isPending())return;lastFocus=document.activeElement;draft=newTrade(state,id,globalThis.crypto.randomUUID());selected=null;feedback='구매와 판매를 예약하고 차액을 확인하세요.';receipt=null;openedPage=state.page;screen.dataset.mobileSide='buy';screen.hidden=false;draw();screen.querySelector('button')?.focus();}
  function select(direction,row){selected={direction,row};drawDetail();}
  function reserve(direction,rowId,amount=1){try{reserveTrade(state,draft,direction,rowId,amount);feedback='물품을 예약했습니다. 아직 돈과 소지품은 바뀌지 않았습니다.';}catch(e){feedback=e.message;}draw();}
  function selectedReserve(){if(!selected)return;const q=Number(screen.querySelector('#trade-quantity').value);reserve(selected.direction,selected.direction==='buy'?selected.row.stock_id:selected.row.row_id,q);}
  function drawDetail(){
    const detail=screen.querySelector('.trade-item-detail');if(!detail)return;detail.replaceChildren();
    if(!selected){detail.append(element('p',null,'아이템을 선택하면 가격·능력치·설명과 수량 예약이 표시됩니다.'));return;}
    const {direction,row}=selected,item=catalogItem(row.item.catalog_id||row.item.id),shop=state.world_engine.shops[draft.shop_id],quote=tradeQuote(shop,row,direction,state),warning=tradeAllowed(shop,item,{...row.item,...row.instance});
    appendItemIcon(detail,row.item,assetBase);detail.append(element('h3',null,item?.name||row.item.name));
    const kind={weapon:'무기',armor:'방어구',accessory:'악세서리',material:'재료',consumable:'소비품',sword_manual:'검술서',spellbook:'마법서',book:'기술서'}[item?.slot||item?.category||row.item.category]||'재료';
    detail.append(element('p',null,[item?.rarity,kind,`수량 ${row.quantity}`].filter(Boolean).join(' · ')));
    detail.append(element('p',null,item?itemDescription(item):row.item.description),element('p','trade-stats',item?itemDetails(item):row.item.effect));
    detail.append(element('p',null,quote?`구매 ${coins(quote.buy_price)} / 매입 ${coins(quote.sell_price)}`:'상인 매입 견적이 없습니다.'),element('p',null,warning||'거래 가능'));
    const label=element('label',null,'예약 수량 '),input=element('input');input.type='number';input.id='trade-quantity';input.min='1';input.max=String(row.quantity);input.value='1';input.setAttribute('aria-label','예약 수량');label.append(input);detail.append(label);
    const b=button(direction==='buy'?'구매 예약':'판매 예약',selectedReserve,'trade-reserve');b.disabled=!!warning||!quote||isPending()||draft.confirmed;detail.append(b);
    if(row.instance)detail.append(element('small',null,'물품 번호 '+row.instance.instance_id+(row.instance.condition!==undefined?' · 상태 '+row.instance.condition:'')+(row.instance.enhancement!==undefined?' · 강화 +'+row.instance.enhancement:'')+(row.instance.durability!==undefined?' · 내구 '+row.instance.durability:'')));
  }
  function rowsPanel(direction){
    const shop=state.world_engine.shops[draft.shop_id],rows=direction==='buy'?shop.stock:playerTradeRows(state),column=element('section','trade-column');column.dataset.tradeSide=direction;column.id=direction==='buy'?'trade-merchant':'trade-player';
    column.setAttribute('aria-label',direction==='buy'?'상인 물품 · 판매 예약을 이곳으로 끌어 놓으세요':'내 소지품 · 구매 예약을 이곳으로 끌어 놓으세요');
    column.append(element('h3',null,direction==='buy'?'상인 물품':'내 소지품'));
    const grid=element('div','trade-grid');column.append(grid);
    for(const row of rows){const rowId=direction==='buy'?row.stock_id:row.row_id,quantity=draft.confirmed?0:draft[direction].find(l=>l.row_id===rowId)?.quantity||0,item=catalogItem(row.item.catalog_id||row.item.id);
      const card=button('',()=>select(direction,row),'trade-item');card.dataset.rowId=rowId;card.dataset.direction=direction;card.draggable=!draft.confirmed&&!tradeAllowed(shop,item,{...row.item,...row.instance})&&!!tradeQuote(shop,row,direction,state)&&!Object.values(state.engine?.equipped||{}).includes(row.instance?.instance_id);applyItemRarity(card,item||row.item);appendItemIcon(card,row.item,assetBase);
      for(const image of card.querySelectorAll('img'))image.draggable=false;
      card.append(element('span',null,item?.name||row.item.name),element('small',null,`${row.quantity}개${quantity?' · '+quantity+'개 예약':''}`));card.setAttribute('aria-label',`${item?.name||row.item.name}, ${row.quantity}개, ${quantity}개 ${direction==='buy'?'구매':'판매'} 예약`);
      card.addEventListener('dblclick',()=>reserve(direction,rowId));card.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();reserve(direction,rowId);}});
      card.addEventListener('dragstart',e=>{if(!card.draggable){e.preventDefault();return;}drag={direction,rowId,transaction_id:draft.transaction_id};e.dataTransfer.setData('application/x-ercedia-trade',JSON.stringify(drag));e.dataTransfer.effectAllowed='copy';e.dataTransfer.setDragImage(card,32,32);screen.querySelector(`[data-trade-side="${direction==='buy'?'sell':'buy'}"]`).classList.add('trade-valid-target');});
      card.addEventListener('dragend',()=>{drag=null;screen.querySelectorAll('.trade-column').forEach(c=>c.classList.remove('trade-valid-target','trade-over'));});grid.append(card);
    }
    if(!rows.length)grid.append(element('p',null,direction==='buy'?'현재 재고 없음':'소지품 없음'));
    column.addEventListener('dragover',e=>{if(drag&&drag.direction!==direction&&drag.transaction_id===draft.transaction_id){e.preventDefault();e.dataTransfer.dropEffect='copy';column.classList.add('trade-over');}});
    column.addEventListener('dragleave',()=>column.classList.remove('trade-over'));
    column.addEventListener('drop',e=>{e.preventDefault();column.classList.remove('trade-over');let data;try{data=JSON.parse(e.dataTransfer.getData('application/x-ercedia-trade'));}catch{return;}
      if(data?.transaction_id===draft.transaction_id&&data.direction!==direction)reserve(data.direction,data.rowId);drag=null;
    });
    const reservations=element('div','trade-reservations');reservations.append(element('h4',null,direction==='buy'?'구매 예약':'판매 예약'));
    for(const line of draft[direction]){const row=element('div','trade-reservation');row.append(element('span',null,`${catalogItem(line.catalog_id)?.name} ×${line.quantity} · ${coins(line.quantity*line.unit_price)}`));
      const undo=()=>{if(draft.confirmed)return;cancelReservation(draft,direction,line.row_id);feedback='예약 1개를 취소했습니다.';draw();},cancel=button(draft.confirmed?'정산 완료':'1개 취소',undo);cancel.disabled=draft.confirmed;row.addEventListener('dblclick',undo);cancel.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();undo();}});row.append(cancel);reservations.append(row);
    }column.append(reservations);return column;
  }
  function confirm(){
    if(isPending()||draft?.confirmed)return;
    try{receipt=commitTrade(state,draft,{persist:save});feedback='거래 완료 · 물품을 옮기고 차액을 정산했습니다.';onReceipt?.(receipt);render?.();draw();screen.classList.add('trade-item-arrival');
      animationTimer=setTimeout(()=>{screen.classList.remove('trade-item-arrival');screen.classList.add('trade-wallet-settled');},240);
    }catch(e){feedback=e.message;draw();}
  }
  function finish(){const r=receipt,shop=state.world_engine?.shops?.[draft?.shop_id];close();returnToStory?.();if(r&&submit)submit(`상점 ${shop.name}의 거래 ${r.transaction_id}가 엔진에서 이미 정산되었습니다. 구매 ${r.totals.buy}동화·판매 ${r.totals.sell}동화·순차액 ${r.totals.net}동화, 잔액 ${wallet(state)}동화입니다. 재고·인벤토리·화폐를 다시 지급하거나 차감하지 마세요. 상인 ${shop.npc_id}의 성격과 거래에 맞는 짧은 반응 후 기존 장면을 자연스럽게 이어주세요. 시간·장소는 거래만으로 변경하지 마세요.`);}
  function draw(){
    if(!draft)return;screen.replaceChildren();screen.classList.remove('trade-wallet-settled');
    const shop=state.world_engine.shops[draft.shop_id],header=element('header','trade-header'),title=element('h2',null,`${shop.name} · ${shopTypes[shop.type].name}`);title.id='trade-title';header.append(title,button(draft.confirmed?'닫기':'닫기 · 예약 취소',close));screen.append(header);
    screen.append(element('p','trade-help','더블클릭·Enter: 1개 예약 · 물품을 반대쪽으로 드래그 · 모바일: 선택 후 수량 예약'));
    const tabs=element('div','trade-mobile-tabs');for(const [id,name]of [['buy','상인 물품'],['sell','내 소지품']]){const b=button(name,()=>{screen.dataset.mobileSide=id;for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.side===id));});b.dataset.side=id;b.setAttribute('aria-pressed',String(screen.dataset.mobileSide===id));tabs.append(b);}screen.append(tabs);
    const body=element('div','trade-body');body.append(rowsPanel('buy'),rowsPanel('sell'));screen.append(body);screen.append(element('aside','trade-item-detail'));drawDetail();
    const footer=element('footer','trade-footer'),totals=receipt?.totals||tradeTotals(state,draft),numbers=element('div','trade-totals');
    const signed=n=>n<0?'-'+coins(-n):coins(n);
    numbers.append(element('span',null,'구매 '+coins(totals.buy)),element('span',null,'판매 '+coins(totals.sell)),element('strong',null,(totals.net>=0?'지불 차액 ':'받을 차액 ')+coins(Math.abs(totals.net))),element('span',null,'현재 지갑 '+coins(wallet(state))),element('span',null,'거래 후 '+signed(totals.after)),element('span',null,'상인 매입 자금 '+coins(merchantFunds(state,shop))));
    const message=element('p','trade-feedback',feedback);message.id='trade-feedback';message.setAttribute('role','status');footer.append(numbers,message);
    if(draft.confirmed){footer.append(button('상인 반응 · 대화로 돌아가기',finish,'trade-confirm'));}
    else {const clear=button('전체 예약 취소',()=>{cancelTrade(draft);if(pricesChanged(state,draft)){draft.price_version=shop.price_version;draft.market_signature=marketSignature(state,shop);feedback='변경된 시장 가격으로 새 예약을 시작합니다.';}else feedback='모든 예약을 취소했습니다.';draw();});footer.append(clear);const commit=button('거래 확정',confirm,'trade-confirm');commit.id='trade-confirm';commit.disabled=isPending()||!draft.buy.length&&!draft.sell.length||totals.after<0||totals.merchant_after<0||pricesChanged(state,draft);footer.append(commit);}
    screen.append(footer);
    if(pricesChanged(state,draft)&&!draft.confirmed){message.textContent='가격 변경 · 예약을 전체 취소한 뒤 새 가격을 확인하세요.';}
  }
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){const nodes=[...screen.querySelectorAll('button,input')].filter(n=>!n.disabled&&!n.hidden),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
  function refresh(){
    menuBody.replaceChildren();menuBody.append(element('p','shop-wallet','지갑 '+coins(wallet(state))));
    const shops=Object.values(state.world_engine?.shops||{}).filter(s=>s.region_id===state.gameState.region);
    for(const shop of shops){const b=button(`${shop.name} · ${shopTypes[shop.type]?.name} · ${shop.stock.reduce((n,r)=>n+r.quantity,0)}개`,()=>open(shop.id));b.disabled=isPending()||!shop.available||![shop.place,shop.id,shop.name].includes(state.gameState.place);menuBody.append(b);}
    if(!shops.length)menuBody.append(element('p',null,'현재 지역에 확인된 상점이 없습니다. 상인을 만나 영업·재고·가격·매입 자금을 확인하세요.'));
    const country={W:'west',E:'east',S:'south'}[state.gameState.region?.[0]],special=regionalShops[country]||[];
    const types=element('div','shop-types');for(const [id,type]of Object.entries(shopTypes)){const b=button(type.name+(special.includes(id)?' · 지역 특화':''),()=>submit?.(id==='auction'?`현재 지역의 실제 경매 상인·출품자·소유 물품·최소 입찰 증가액·유한 자금·마감과 참가 자격을 확인하고 ECONOMY_SCHEMA.md의 auction으로 공고한다. 일반 구매로 정산하지 않는다.`:`현재 지역에서 ${type.name} 상인을 찾아 ${id} 유형의 실제 취급 품목과 서비스·영업시간·재고·동화 가격·유한 매입 자금을 문의한다. SHOP_TRADE_SCHEMA.md의 shop_open으로 현재 존재하는 상점만 등록하고 상인 NPC ID와 현재 장소를 확인한다. 클릭만으로 시간·이동·구매·판매를 확정하지 않는다.`));b.disabled=isPending();types.append(b);}menuBody.append(types);
    if(draft){const shop=state.world_engine?.shops?.[draft.shop_id];if(!shop||state.page!==openedPage||shop.region_id!==state.gameState.region||![shop.place,shop.id,shop.name].includes(state.gameState.place))close();else draw();}
  }
  refresh();return {render:refresh,open,close,reserve,confirm,getDraft:()=>draft,element:screen};
}
