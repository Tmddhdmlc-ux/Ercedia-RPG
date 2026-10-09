import {craftingRecipe} from './crafting-model.js';
import {wallet,formatCopper,totalCopper} from './wallet.js';
import {tradeItem,priceAt} from './economy.js';
import {appendItemIcon} from './item-art-ui.js';
import {calendarDay} from './quest-model.js';
import {findNPC} from './npc-model.js';
export function mountShopUI(state,{submit,isPending,assetBase}){
  let selected=null;
  const line=(p,value)=>{const n=document.createElement('p');n.textContent=value;p.append(n);return n;};
  const button=(p,label,fn,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=isPending()||disabled;b.onclick=fn;p.append(b);return b;};
  const request=action=>submit(action+' 실제 조건을 판정하고 성공한 변경만 ECONOMY_SCHEMA.md의 system_events로 확인하세요. 화폐/물품 스냅샷을 중복 지급하지 마세요.');
  function render(root,w,region,date){
    const tooltip=document.getElementById('item-tooltip');if(tooltip)tooltip.hidden=true;
    const offers=Object.values(w.offers).filter(o=>o.region_id===region),now=calendarDay(date),rows=offers.filter(o=>!o.bilateral_shop_id).flatMap(o=>o.items.map(r=>({o,r,key:o.id+':'+r.id}))),layout=document.createElement('div'),list=document.createElement('div'),detail=document.createElement('article');
    layout.className='shop-layout';list.className='shop-list';detail.className='shop-detail';layout.append(list,detail);root.append(layout);
    const prices=(o,r)=>({buy:priceAt(w,o,r,'buy',now),sell:priceAt(w,o,r,'sell',now)});
    for(const row of rows){const {o,r,key}=row,cat=tradeItem(r.id),p=prices(o,r),b=button(list,cat.name,()=>{selected=key;root.replaceChildren();render(root,w,region,date);});b.textContent='';b.className='shop-product';b.setAttribute('aria-pressed',String(selected===key));appendItemIcon(b,r,assetBase);const name=document.createElement('span'),text=document.createElement('span');name.className='shop-product-name';name.textContent=cat.name;text.textContent=o.venue_name+' · '+formatCopper(p.buy)+' · 재고 '+r.stock;b.append(name,text);}
    const row=rows.find(r=>r.key===selected);
    if(row){layout.dataset.selected='true';const {o,r}=row,cat=tradeItem(r.id),pricesNow=prices(o,r),m=w.merchants?.[o.merchant_id||o.merchant_npc_id||'merchant:'+o.venue_id],owned=state.inventory.filter(i=>(i.catalog_id||i.id)===r.id).reduce((n,i)=>n+i.quantity,0);
      button(detail,'← 상품 목록',()=>{selected=null;root.replaceChildren();render(root,w,region,date);}).className='shop-back';appendItemIcon(detail,r,assetBase);const h=document.createElement('h3');h.textContent=cat.name;detail.append(h);
      line(detail,o.venue_name+' · '+(findNPC(o.merchant_npc_id)?.name||'상인 확인 필요'));line(detail,'구매 '+formatCopper(pricesNow.buy)+' / 매입 '+formatCopper(pricesNow.sell));line(detail,'재고 '+r.stock+' · 보유 '+owned+' · '+o.valid_until+'까지');line(detail,r.price_basis);line(detail,'상인 매입 자금 · '+formatCopper(m?.wallet_copper||0));
      for(const change of w.market_changes||[])if(change.region_id===o.region_id&&change.starts_day<=now&&now<=change.ends_day)line(detail,change.reason+' · '+change.price_percent+'% · '+change.ends_at+'까지');
      const controls=document.createElement('div');controls.className='shop-controls';detail.append(controls);const label=document.createElement('label'),input=document.createElement('input');label.textContent='수량 ';input.type='number';input.min='1';input.max='999999';input.step='1';input.value='1';input.setAttribute('aria-label','거래 수량');label.append(input);controls.append(label);
      const total=line(detail,'');let buy,sell;
      const quantity=()=>{const n=Number(input.value);return Number.isSafeInteger(n)&&n>=1&&n<=999999?n:null;};
      const trade=direction=>{const n=quantity();if(n===null)return;let amount;try{amount=totalCopper(pricesNow[direction],n);}catch{return;}request(`견적 ${o.id}에서 ${r.id} ${n}개를 총 ${amount}동화에 ${direction==='buy'?'구매':'판매'}한다. 현재 지역·장소·명성·허가·재고·소유·상인 자금을 검사한다.`);};
      buy=button(controls,'구매 요청',()=>trade('buy'));sell=button(controls,'판매 요청',()=>trade('sell'));
      const refresh=()=>{const n=quantity();let bp=null,sp=null;try{if(n!==null){bp=totalCopper(pricesNow.buy,n);sp=totalCopper(pricesNow.sell,n);}}catch{}const here=state.gameState.region===o.region_id&&[o.venue_id,o.venue_name].includes(state.gameState.place)&&now!==null&&now<=calendarDay(o.valid_until);buy.disabled=isPending()||!here||bp===null||n>r.stock||bp>wallet(state);sell.disabled=isPending()||!here||sp===null||n>owned||sp>(m?.wallet_copper||0);total.textContent=bp===null?'올바른 정수 수량을 입력하세요.':'합계 · 구매 '+formatCopper(bp)+' / 판매 '+formatCopper(sp);};input.oninput=refresh;refresh();
    }else line(detail,rows.length?'상품을 선택하면 상세 정보와 구매·판매 수량을 확인합니다.':'현지 상인에게 실제 재고와 가격을 문의하세요.');
    for(const o of offers)for(const s of o.services||[]){const p=document.createElement('article');p.className='shop-service';line(p,o.venue_name+' · '+(({inn_night:'여관 1박',nice_inn_night:'좋은 여관 1박',carriage_short:'단거리 마차',herbal_treatment:'약초 치료'})[s.service]||s.service));const recipe=craftingRecipe(s.recipe_id);if(recipe){line(p,recipe.name+' · '+recipe.rarity+' · '+recipe.craftsman);line(p,recipe.inputs.map(i=>tradeItem(i.id).name+' × '+i.quantity).join(' / '));}line(p,formatCopper(s.cost)+' · '+s.basis);button(p,recipe?'제작 요청':'서비스 요청',()=>request(`견적 ${o.id}의 ${s.id} 서비스를 ${s.cost}동화와 승인 입력 재료로 이용한다. 실제 조건과 효과를 검사한다.`),s.cost>wallet(state));root.append(p);}
    for(const a of Object.values(w.auctions).filter(a=>a.region_id===region)){
      const p=document.createElement('article');p.className='shop-auction';appendItemIcon(p,{id:a.item_id},assetBase);line(p,tradeItem(a.item_id)?.name+' · '+a.status);line(p,'최고가 '+formatCopper(a.highest_bid??a.bid)+' · 내 예치 '+formatCopper(a.escrow)+' · 마감 '+a.closes_at);
      if(a.status==='open'){const input=document.createElement('input');input.type='number';input.step='1';input.min=String(Math.max(a.reserve,(a.highest_bid??a.bid)?(a.highest_bid??a.bid)+(a.min_increment||1):a.reserve));input.value=input.min;input.setAttribute('aria-label','경매 입찰액 · 동화');p.append(input);button(p,'입찰 요청',()=>{const n=Number(input.value);if(Number.isSafeInteger(n)&&n>=Number(input.min))request(`${a.id} 경매에 ${n}동화를 입찰한다. 참가 자격·최소 증가액·시간·소지금을 검사하고 bid로 확인한다.`);});button(p,'마감 결과 확인',()=>request(`${a.id} 경매의 실제 최고 입찰자와 마감·진품 판정을 확인하고 auction_result로 물품과 판매자 대금을 한 번만 정산한다.`));}root.append(p);
    }
    button(root,'현지 상점·경매 문의',()=>request(`${region||'현재 지역'}의 실제 상인·경매를 알아본다. 등록 merchant_npc_id·유한 매입 예산·매입 유형·재고·가격 근거·명성/허가 조건과 출품자 소유 개체를 제시한다.`));
    const history=document.createElement('details'),summary=document.createElement('summary');summary.textContent='거래 기록';history.append(summary);for(const t of (w.transactions||[]).slice(-8).reverse())line(history,t.date+' · '+t.kind+' · '+formatCopper(t.amount??t.price??0));root.append(history);
  }
  return {render};
}
