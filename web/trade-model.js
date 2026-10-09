import {itemDescription} from './item-catalog.js';
import {tradeItem as catalogItem,tradeCategory as itemCategory,priceAt,tradable} from './economy.js';
import {bindWallet} from './wallet.js';
import {shopTypes,shopAccepts} from './shop-types.js';
import {ensureEngine,engineItem} from './engine-model.js';
import {findNPC,resolveNPC} from './npc-model.js';
import {calendarDay} from './quest-model.js';
import {wallet,setWallet} from './currency.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const check=(ok,message)=>{if(!ok)throw Error(message);};
const safe=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,120}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const itemId=i=>i.catalog_id||i.id;
export function merchantFunds(state,shop){return state.world_engine?.merchants?.[shop.merchant_id||shop.npc_id]?.wallet_copper??0;}
function putMerchantFunds(state,shop,value){check(safe(value),'상인 동화 원장 한도');state.world_engine.merchants[shop.merchant_id||shop.npc_id].wallet_copper=value;}
export function marketSignature(state,shop){const day=calendarDay(state.gameState.date);return JSON.stringify((state.world_engine.market_changes||[]).filter(c=>c.region_id===shop.region_id&&c.starts_day<=day&&day<=c.ends_day));}
export function pricesChanged(state,draft){const shop=state.world_engine.shops[draft.shop_id];return shop.price_version!==draft.price_version||marketSignature(state,shop)!==draft.market_signature;}
export function tradeQuote(shop,row,direction,state){
  const key=direction==='sell'&&row.instance?.instance_id?'instance:'+row.instance.instance_id:row.stock_id;
  const q=shop.quotes[key]||shop.quotes[itemId(row.item)]||null;if(!q||!state)return q;const source={id:itemId(row.item),base_buy_price:q.buy_price,base_sell_price:q.sell_price};return {...q,buy_price:priceAt(state.world_engine,shop,source,'buy',calendarDay(state.gameState.date)),sell_price:priceAt(state.world_engine,shop,source,'sell',calendarDay(state.gameState.date))};
}
export function marketPrice(base,factors={},direction='buy'){
  check(safe(base),'기준 동화 가격 오류');
  let rate=10000;
  for(const key of ['inflation','scarcity','condition','rarity','reputation','relationship','war']){
    const v=factors[key]??10000;check(safe(v,1000,100000),'가격 요인 오류: '+key);rate=rate*v/10000;
  }
  const result=Math.round(base*rate/10000*(direction==='sell'?.5:1));check(safe(result),'시장 가격 한도');return result;
}
export function tradeAllowed(shop,item,metadata={}){
  if(!item||!tradable(item.id)||item.tradable===false||metadata.tradable===false)return '일반 거래 불가 물품';
  if(metadata.quest_item||metadata.protected||metadata.quest_protected||metadata.divine_artifact||item.divine_artifact||/^(DIV-|DIVINE|GOD-ART|ER-DIVINE)/.test(item.id)||item.type==='divine_artifact')return '의뢰 보호 물품·신물은 거래할 수 없습니다.';
  if(shop.buyable_types&&!shop.buyable_types.includes(itemCategory(item)))return '상인의 매입 허용 품목이 아닙니다.';
  if(!shopAccepts(shop.type,item))return '이 상점의 취급 품목이 아닙니다.';
  if(shop.banned_ids?.includes(item.id))return '이 상점에서 거래가 금지된 물품';
  if(shop.type==='auction')return '경매 물품은 별도 입찰·낙찰 정산을 이용하세요.';
  return '';
}
function stockEntry(shop,row,index){
  const cat=catalogItem(row.catalog_id||row.id||row.item?.catalog_id||row.item?.id);check(cat,'미등록 상점 물품');
  const quantity=row.quantity??row.stock;check(safe(quantity,0,999999),'상점 재고 수량');
  check(!tradeAllowed(shop,cat,row.item||row),'상점 취급/거래 제한: '+cat.name);
  const buy=row.buy_price??marketPrice(row.base_price??cat.base_price,row.factors),sell=row.sell_price??marketPrice(row.base_price??cat.base_price,row.factors,'sell');
  check(safe(buy)&&safe(sell)&&sell<=buy,'구매·판매 가격 오류');
  const item={...(row.item||{}),id:cat.id,name:cat.name,category:itemCategory(cat),description:itemDescription(cat),quantity:1,...(cat.rarity?{rarity:cat.rarity}:{})};
  const base={stock_id:row.stock_id||shop.id+':stock:'+index,item,quantity,buy_price:buy,sell_price:sell,price_basis:row.price_basis||shop.price_basis};
  check(validId(base.stock_id)&&typeof base.price_basis==='string'&&base.price_basis.trim(),'재고 ID·시장 가격 근거');
  if(engineItem(cat.id)){
    check(quantity<=128,'개별 장비·책 재고 한도');
    return Array.from({length:quantity},(_,n)=>({...copy(base),stock_id:base.stock_id+':'+n,quantity:1,instance:{...(row.instance||{}),instance_id:row.instance?.instance_id||base.stock_id+':'+n,catalog_id:cat.id}}));
  }
  return [base];
}
export function registerShop(state,raw){
  const shop=copy(raw);check(validId(shop.id)&&validId(shop.npc_id)&&findNPC(shop.npc_id)&&shopTypes[shop.type],'등록된 상점 종류·NPC ID');
  check(typeof shop.name==='string'&&shop.name.length<=160&&typeof shop.place==='string'&&shop.place.length<=160&&/^(W[1-5]|E[1-4]|S[1-4]|CW|CE|CS)$/.test(shop.region_id),'실제 상점 이름·지역·장소');
  check(safe(shop.funds_copper)&&shop.available===true&&calendarDay(shop.valid_until)!==null,'유한 상인 자금·영업 확인·기한');
  check(validId(shop.price_version)&&Array.isArray(shop.items)&&shop.items.length<=128,'시장 가격 버전·재고');
  if(shop.open_hours)check(Array.isArray(shop.open_hours)&&shop.open_hours.length===2&&shop.open_hours.every(n=>safe(n,0,23)),'영업 시간');
  const w=state.world_engine;check(w&&typeof w==='object','세계 상태 필요');w.shops??={};w.trade_ids??={};w.merchants??={};
  check(!w.shops[shop.id]&&Object.keys(w.shops).length<128,'상점 중복/보존 한도');
  check(!Object.values(w.shops).some(s=>s.npc_id===shop.npc_id&&s.region_id===shop.region_id&&s.place===shop.place),'같은 상점의 재고를 다시 생성하지 마세요. shop_update를 사용하세요.');
  shop.stock=shop.items.flatMap((row,i)=>stockEntry(shop,row,i));delete shop.items;
  check(shop.stock.length<=128&&new Set(shop.stock.map(r=>r.stock_id)).size===shop.stock.length,'재고 슬롯 한도·고유 ID');
  shop.quotes={};for(const r of shop.stock){const quote={buy_price:r.buy_price,sell_price:r.sell_price,price_basis:r.price_basis};shop.quotes[r.stock_id]=quote;shop.quotes[itemId(r.item)]??=copy(quote);}
  for(const quote of shop.buyback_quotes||[]){check(catalogItem(quote.id)&&safe(quote.buy_price)&&safe(quote.sell_price)&&quote.sell_price<=quote.buy_price&&typeof quote.price_basis==='string'&&quote.price_basis.trim(),'실제 매입 견적');shop.quotes[quote.instance_id?'instance:'+quote.instance_id:quote.id]={buy_price:quote.buy_price,sell_price:quote.sell_price,price_basis:quote.price_basis};}
  delete shop.buyback_quotes;
  const instances=shop.stock.filter(r=>r.instance).map(r=>r.instance.instance_id);check(instances.every(validId)&&new Set(instances).size===instances.length,'상점 인스턴스 중복');
  const owned=new Set([...(state.engine?.instances||[]).map(i=>i.instance_id),...Object.values(w.shops).flatMap(s=>s.stock.filter(r=>r.instance).map(r=>r.instance.instance_id))]);check(instances.every(i=>!owned.has(i)),'이미 다른 소유자가 가진 물품 번호');
  shop.merchant_id=shop.npc_id;w.merchants[shop.merchant_id]??={wallet_copper:shop.funds_copper,verified:true};delete shop.funds_copper;
  const existing=Object.values(w.offers||{}).find(o=>o.merchant_id===shop.merchant_id&&o.region_id===shop.region_id&&[o.venue_id,o.venue_name].includes(shop.place));
  if(existing){check(!existing.bilateral_shop_id,'같은 상점의 이중 재고 등록');for(const r of existing.items)check(shop.stock.filter(v=>itemId(v.item)===r.id).reduce((n,v)=>n+v.quantity,0)===r.stock,'기존 상점 재고를 변경하지 않고 연결하세요.');shop.offer_id=existing.id;existing.bilateral_shop_id=shop.id;shop.min_reputation=existing.min_reputation;shop.buyable_types=existing.buyable_types;}
  shop.events=[];shop.serial=0;w.shops[shop.id]=shop;syncOffer(state,shop);return shop;
}
function syncOffer(state,shop){const o=state.world_engine.offers?.[shop.offer_id];if(!o)return;const ids=new Set([...o.items.map(r=>r.id),...shop.stock.map(r=>itemId(r.item))]);for(const id of ids){let row=o.items.find(r=>r.id===id);if(!row){const q=shop.quotes[id]||shop.quotes[shop.stock.find(r=>itemId(r.item)===id)?.stock_id];if(!q)continue;row={id,...q,base_buy_price:q.buy_price,base_sell_price:q.sell_price};o.items.push(row);}row.stock=shop.stock.filter(r=>itemId(r.item)===id).reduce((n,r)=>n+r.quantity,0);}}
// Logistics/production/NPC purchases are explicit world events, never daily resets.
export function updateShop(state,event){
  const shop=state.world_engine?.shops?.[event.shop_id];check(shop&&validId(event.event_id)&&typeof event.reason==='string'&&event.reason.trim(),'실제 상점 경제 사건');
  if(shop.events.includes(event.event_id))return;
  check(shop.events.length<10000&&['market','delivery','npc_purchase','availability'].includes(event.action),'경제 사건 종류/기록 한도');
  if(event.action==='market'){
    check(validId(event.price_version)&&event.price_version!==shop.price_version&&Array.isArray(event.prices),'새 시장 가격 버전');
    for(const p of event.prices){check(catalogItem(p.id)&&safe(p.buy_price)&&safe(p.sell_price)&&p.sell_price<=p.buy_price&&typeof p.price_basis==='string'&&p.price_basis.trim(),'시장 견적 오류');const quote={buy_price:p.buy_price,sell_price:p.sell_price,price_basis:p.price_basis};shop.quotes[p.instance_id?'instance:'+p.instance_id:p.stock_id||p.id]=quote;if(!p.instance_id&&!p.stock_id)for(const r of shop.stock.filter(r=>itemId(r.item)===p.id))shop.quotes[r.stock_id]=copy(quote);}
    shop.price_version=event.price_version;
  }else if(event.action==='delivery'){
    check(typeof event.logistics_proof==='string'&&event.logistics_proof.trim()&&typeof event.elapsed_since==='string'&&calendarDay(event.elapsed_since)!==null&&calendarDay(state.gameState.date)>calendarDay(event.elapsed_since)&&safe(event.cost_copper)&&merchantFunds(state,shop)>=event.cost_copper,'실제 경과 시간·물류/생산 근거·발주 예산');
    check(Array.isArray(event.items)&&event.items.length<=40,'입고 품목');const additions=event.items.flatMap((r,i)=>stockEntry(shop,{...r,stock_id:event.event_id+':'+i},i));check(shop.stock.length+additions.length<=128,'상점 재고 한도');
    const ids=additions.filter(r=>r.instance).map(r=>r.instance.instance_id),owned=new Set([...(state.engine?.instances||[]).map(r=>r.instance_id),...state.inventory.flatMap(i=>i.instance_ids||[]),...Object.values(state.world_engine.shops).flatMap(s=>s.stock.filter(r=>r.instance).map(r=>r.instance.instance_id)),...Object.values(state.world_engine.npc_owned||{}).flatMap(rows=>rows.map(r=>r.instance_id)),...Object.values(state.world_engine.auctions||{}).filter(a=>a.status==='open').map(a=>a.instance_id)]);check(ids.every(validId)&&new Set(ids).size===ids.length&&ids.every(id=>!owned.has(id)),'입고 실물 번호 중복·다른 소유자');
    shop.stock.push(...additions);putMerchantFunds(state,shop,merchantFunds(state,shop)-event.cost_copper);for(const r of additions){const quote={buy_price:r.buy_price,sell_price:r.sell_price,price_basis:r.price_basis};shop.quotes[r.stock_id]=quote;shop.quotes[itemId(r.item)]??=copy(quote);}
  }else if(event.action==='npc_purchase'){
    const r=shop.stock.find(r=>r.stock_id===event.stock_id);check(findNPC(event.buyer_npc_id)&&r&&safe(event.quantity,1)&&r.quantity>=event.quantity&&safe(event.paid_copper)&&event.paid_copper===(tradeQuote(shop,r,'buy',state)?.buy_price??r.buy_price)*event.quantity,'NPC 실제 구입·지급 금액');
    const w=state.world_engine,buyer=w.merchants?.[event.buyer_npc_id];check(event.buyer_npc_id!==shop.npc_id&&buyer&&safe(buyer.wallet_copper)&&buyer.wallet_copper>=event.paid_copper,'NPC 구매자의 실제 유한 자금 필요');
    buyer.wallet_copper-=event.paid_copper;w.npc_owned??={};w.npc_owned[event.buyer_npc_id]??=[];w.npc_owned[event.buyer_npc_id].push({catalog_id:itemId(r.item),quantity:event.quantity,...(r.instance?{...copy(r.instance),owner_id:event.buyer_npc_id}:{}),purchase_event_id:event.event_id});
    r.quantity-=event.quantity;shop.stock=shop.stock.filter(r=>r.quantity);putMerchantFunds(state,shop,merchantFunds(state,shop)+event.paid_copper);
  }else {check(typeof event.available==='boolean','상점 영업 상태');shop.available=event.available;}
  shop.events.push(event.event_id);syncOffer(state,shop);
}
export function playerTradeRows(state){
  const next=copy(state),engine=ensureEngine(next),used=new Set(),rows=[];
  for(const [bag_index,item]of next.inventory.entries()){
    const cat=catalogItem(itemId(item));
    if(engineItem(itemId(item))){
      const instances=engine.instances.filter(i=>i.catalog_id===itemId(item)&&!used.has(i.instance_id)&&(!item.instance_id||i.instance_id===item.instance_id)).slice(0,item.quantity);
      for(const instance of instances){used.add(instance.instance_id);rows.push({row_id:'instance:'+instance.instance_id,bag_index,item:copy(item),quantity:1,instance:copy(instance),instance_id:instance.instance_id});}
    }else {for(const iid of item.instance_ids||[])rows.push({row_id:'instance:'+iid,bag_index,item:copy(item),quantity:1,instance:{instance_id:iid,catalog_id:itemId(item)},instance_id:iid,stack_instance:true});const anonymous=item.quantity-(item.instance_ids?.length||0);if(anonymous>0)rows.push({row_id:'bag:'+bag_index,bag_index,item:copy(item),quantity:anonymous});}
  }return rows;
}
export function newTrade(state,shopId,transactionId){
  const shop=state.world_engine?.shops?.[shopId];check(shop&&validId(transactionId),'실제 상점·거래 ID 필요');
  return {transaction_id:transactionId,shop_id:shopId,npc_id:shop.npc_id,player_id:state.campaign_id||state.chosenName||state.player.name||'player',price_version:shop.price_version,market_signature:marketSignature(state,shop),status:'idle',confirmed:false,buy:[],sell:[]};
}
export function reserveTrade(state,draft,direction,rowId,amount=1){
  check(['idle','drafting'].includes(draft.status)&&['buy','sell'].includes(direction)&&safe(amount,1,999999),'예약 상태·수량 오류');
  const shop=state.world_engine?.shops?.[draft.shop_id];check(shop&&!pricesChanged(state,draft),'가격이 변경되었습니다. 예약을 취소하고 새 견적을 확인하세요.');
  const row=direction==='buy'?shop.stock.find(r=>r.stock_id===rowId):playerTradeRows(state).find(r=>r.row_id===rowId);check(row,'예약할 물품이 없습니다.');
  const cat=catalogItem(itemId(row.item));check(!tradeAllowed(shop,cat,{...row.item,...row.instance}),'거래가 제한된 물품입니다.');
  check(!row.instance_id||!Object.values(state.engine?.equipped||{}).includes(row.instance_id),'장착 중인 장비는 먼저 해제하세요.');
  const quote=tradeQuote(shop,row,direction,state);check(quote,'이 품목의 매입 가격이 없습니다. 상인에게 견적을 요청하세요.');
  const line=draft[direction].find(l=>l.row_id===rowId);check((line?.quantity||0)+amount<=row.quantity,'예약 수량이 재고/소유 수량을 초과했습니다.');
  if(line)line.quantity+=amount;else draft[direction].push({row_id:rowId,catalog_id:cat.id,instance_id:row.instance?.instance_id||null,quantity:amount,unit_price:direction==='buy'?quote.buy_price:quote.sell_price,fingerprint:JSON.stringify(row)});
  draft.status='drafting';draft.error=null;return draft;
}
export function cancelReservation(draft,direction,rowId,amount=1){
  check(!['committed','validating'].includes(draft.status),'확정 중인 거래');
  const line=draft[direction]?.find(l=>l.row_id===rowId);if(!line)return;
  line.quantity-=amount;draft[direction]=draft[direction].filter(l=>l.quantity>0);draft.status=draft.buy.length||draft.sell.length?'drafting':'idle';
}
export function cancelTrade(draft){if(draft.status==='committed')return;draft.buy=[];draft.sell=[];draft.status='idle';draft.confirmed=false;draft.error=null;}
export function tradeTotals(state,draft){
  const sum=lines=>lines.reduce((n,l)=>{const v=n+l.quantity*l.unit_price;check(safe(v),'거래 금액 한도');return v;},0);
  const buy=sum(draft.buy),sell=sum(draft.sell),net=buy-sell,current=wallet(state),shop=state.world_engine?.shops?.[draft.shop_id],merchant=shop?merchantFunds(state,shop):0;
  return {buy,sell,net,current,after:current-net,merchant_after:merchant+net};
}
function assertShop(state,shop){
  check(!state.introDraft&&(!state.battlePlayback||state.battlePlayback.done),'생성·전투 중에는 거래할 수 없습니다.');
  check(shop.available&&state.gameState.region===shop.region_id&&[shop.place,shop.id,shop.name].includes(state.gameState.place),'현재 영업 중인 실제 상점 장소에서만 거래할 수 있습니다.');
  const day=calendarDay(state.gameState.date),expiry=calendarDay(shop.valid_until);check(day!==null&&expiry!==null&&day<=expiry,'견적 기한 만료');
  const npc=resolveNPC(state,shop.npc_id),life=state.npc_life?.npcs?.[shop.npc_id];check(npc&&(npc.hp===null||npc.hp>0),'상인이 거래 가능한 상태가 아닙니다.');
  const present=state.scene?.npc?.id===shop.npc_id||state.scene?.cast?.some(n=>n.id===shop.npc_id);
  check(life?life.region===shop.region_id&&[shop.place,shop.id,shop.name].includes(life.place):present||npc.location_id===shop.region_id,'상인의 실제 위치가 다릅니다.');
  if(shop.open_hours){const match=/^(\d{1,2}):\d{2}/.exec(state.gameState.time||'');check(match,'현재 시각 확인이 필요합니다.');const hour=+match[1],[open,close]=shop.open_hours;check(open<=close?hour>=open&&hour<close:hour>=open||hour<close,'상점 영업 시간이 아닙니다.');}
  const country={W:'west',E:'east',S:'south',CW:'west',CE:'east',CS:'south'}[shop.region_id]||{W:'west',E:'east',S:'south'}[shop.region_id[0]],w=state.world_engine;
  check(!w.wanted_flags?.[country]&&(w.kingdom_reputation?.[country]??0)>=(shop.min_reputation??-20),'국가 수배·거래 접근 제한');
  if(w.national_origin&&w.national_origin!==country)check(w.border_crossing_history?.some(h=>h.to===country&&h.result==='passed'&&calendarDay(h.date)<=day),'타국 상점의 실제 입국 기록 필요');
}
export function validateTrade(state,draft){
  const shop=state.world_engine?.shops?.[draft.shop_id];check(shop&&draft.npc_id===shop.npc_id,'거래 상대가 다릅니다.');
  check(validId(draft.transaction_id)&&!state.world_engine.trade_ids?.[draft.transaction_id],'이미 정산한 거래 ID입니다.');
  check(draft.player_id===(state.campaign_id||state.chosenName||state.player.name||'player'),'다른 플레이어의 거래');assertShop(state,shop);
  check(!pricesChanged(state,draft),'가격이 변경되었습니다. 거래는 실행되지 않았습니다. 예약을 취소하고 새 가격을 확인하세요.');
  check(draft.buy.length+draft.sell.length>0&&draft.buy.length+draft.sell.length<=160,'비어 있거나 과도한 거래 예약');
  const playerRows=playerTradeRows(state),seen=new Set();
  for(const direction of ['buy','sell'])for(const line of draft[direction]){
    check(!seen.has(direction+line.row_id),'중복 예약 행');seen.add(direction+line.row_id);
    const row=direction==='buy'?shop.stock.find(r=>r.stock_id===line.row_id):playerRows.find(r=>r.row_id===line.row_id),cat=catalogItem(line.catalog_id),quote=row?tradeQuote(shop,row,direction,state):null;
    check(row&&safe(line.quantity,1,999999)&&line.quantity<=row.quantity,'재고 또는 소유 수량 부족');check(itemId(row.item)===line.catalog_id&&JSON.stringify(row)===line.fingerprint,'물품 인스턴스·상태가 변경되었습니다.');
    check(quote&&safe(line.unit_price)&&line.unit_price===(direction==='buy'?quote.buy_price:quote.sell_price),'현재 견적과 예약 가격 불일치');
    const restriction=tradeAllowed(shop,cat,{...row.item,...row.instance});check(!restriction,restriction);
    check(!row.instance?.instance_id||!Object.values(state.engine?.equipped||{}).includes(row.instance.instance_id),'장착 중인 장비는 판매할 수 없습니다.');
    if(cat?.category==='spellbook'||cat?.required_circle>0)check(shop.region_id.startsWith('E')&&(state.world_engine.kingdom_reputation?.east??0)>=20&&typeof shop.education_approval==='string'&&shop.education_approval.trim(),'드라켄 공인 마법서 거래 허가·명성이 필요합니다.');
    if(row.item.required_permit)check(shop.permissions?.includes(row.item.required_permit),'국가 제한 물품 거래 허가 필요');
  }
  const totals=tradeTotals(state,draft);check(safe(totals.after),'플레이어 자금 부족');check(safe(totals.merchant_after),'상인 매입 자금 부족');return totals;
}
// Validate and persist a private candidate first. Nothing in the live state changes on failure.
export function commitTrade(state,draft,{persist}={}){
  check(['idle','drafting'].includes(draft.status),'거래가 이미 확정되었거나 처리 중입니다.');draft.status='validating';
  try{
    const totals=validateTrade(state,draft),next=copy(state),shop=next.world_engine.shops[draft.shop_id],engine=ensureEngine(next),rows=playerTradeRows(next);
    for(const line of draft.sell){const row=rows.find(r=>r.row_id===line.row_id),bag=next.inventory[row.bag_index];bag.quantity-=line.quantity;
      if(row.stack_instance)bag.instance_ids=bag.instance_ids.filter(id=>id!==row.instance_id);
      if(row.instance&&!row.stack_instance)engine.instances=engine.instances.filter(i=>i.instance_id!==row.instance.instance_id);
      const saleItem=copy(row.item);delete saleItem.instance_ids;
      shop.serial++;const stock_id=shop.id+':sold:'+shop.serial;shop.stock.push({stock_id,item:{...saleItem,quantity:1},stack_instance:!!row.stack_instance,quantity:line.quantity,instance:row.instance?{...copy(row.instance),owner_id:shop.npc_id}:null});shop.quotes[stock_id]=copy(tradeQuote(shop,row,'sell',next));
    }
    next.inventory=next.inventory.filter(i=>i.quantity>0);
    for(const line of draft.buy){const row=shop.stock.find(r=>r.stock_id===line.row_id),item=copy(row.item);row.quantity-=line.quantity;
      const fingerprint=i=>JSON.stringify({...i,quantity:1});const bag=next.inventory.find(i=>fingerprint(i)===fingerprint(item));if(bag){check(bag.quantity+line.quantity<=999999,'가방 수량 한도');bag.quantity+=line.quantity;}else next.inventory.push({...item,quantity:line.quantity});
      if(row.stack_instance){const acquired=next.inventory.find(i=>fingerprint(i)===fingerprint(item));acquired.instance_ids=[...(acquired.instance_ids||[]),row.instance.instance_id];}
      if(row.instance&&!row.stack_instance){check(!engine.instances.some(i=>i.instance_id===row.instance.instance_id),'인스턴스 ID 중복');engine.instances.push({...copy(row.instance),owner_id:draft.player_id});}
    }
    shop.stock=shop.stock.filter(r=>r.quantity>0);check(shop.stock.length<=128,'상점 보관 공간 부족');
    check(next.inventory.length<=(next.inventory_limits?.slots??32)&&next.inventory.length<=32,'인벤토리 슬롯 부족');
    const weights=next.inventory.map(i=>i.weight??catalogItem(itemId(i))?.weight);
    if(next.inventory_limits?.max_weight!==undefined){check(weights.every(v=>Number.isFinite(v)&&v>=0),'인벤토리 무게 명세를 먼저 확인하세요.');const weight=next.inventory.reduce((n,i,index)=>n+weights[index]*i.quantity,0);check(Number.isFinite(weight)&&weight<=next.inventory_limits.max_weight,'인벤토리 무게 초과');}
    check(engine.instances.length<=128,'아이템 인스턴스 보관 한도');setWallet(next,totals.after);putMerchantFunds(next,shop,totals.merchant_after);
    syncOffer(next,shop);next.world_engine.trade_ids??={};check(Object.keys(next.world_engine.trade_ids).length<10000,'거래 원장 보존 한도');
    const receipt={...copy(draft),status:'committed',confirmed:true,date:next.gameState.date,totals};next.world_engine.trade_ids[draft.transaction_id]=receipt;
    ensureEngine(next);check(JSON.stringify(next.world_engine).length<=2000000,'세계 저장 용량 한도');if(persist)persist(next);
    const existingWorld=state.world_engine;Object.assign(existingWorld,next.world_engine);Object.assign(state,next,{world_engine:existingWorld});bindWallet(state);draft.status='committed';draft.confirmed=true;return receipt;
  }catch(error){draft.status='drafting';draft.confirmed=false;draft.error=error.message;throw error;}
}
