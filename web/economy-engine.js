import {copper,wallet,addCopper,totalCopper} from './wallet.js';
import {tradeItem,tradeCategory,tradable,priceAt,currencyRules} from './economy.js';
import {findNPC} from './npc-model.js';
import {calendarDay} from './quest-model.js';
const check=(v,m)=>{if(!v)throw Error('경제 검증 · '+m);};
const clone=v=>JSON.parse(JSON.stringify(v));
const id=v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,120}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=1000;
const dateDay=value=>{const n=calendarDay(value);check(n!==null,'360일 날짜');return n;};
const money=(state,delta)=>{state.wallet_copper=addCopper(wallet(state),delta);delete state.currency;};
export const economyKinds=['offer','trade','service','auction','bid','auction_result','market','cash_receipt'];
export function prepareEconomy(w){
  w.merchants??={};w.market_changes??=[];w.npc_owned??={};w.cash_sources??={};
  for(const key of ['merchants','npc_owned','cash_sources'])check(w[key]&&typeof w[key]==='object'&&!Array.isArray(w[key])&&Object.keys(w[key]).every(id),'경제 저장 '+key);
  check(Array.isArray(w.market_changes)&&w.market_changes.length<=1000,'시장 기록 한도');
  for(const m of Object.values(w.merchants))copper(m.wallet_copper);
  for(const balance of Object.values(w.cash_sources))copper(balance);
  for(const o of Object.values(w.offers)){
    o.merchant_id??=o.merchant_npc_id||'merchant:'+o.venue_id;
    w.merchants[o.merchant_id]??={wallet_copper:0,verified:false};
    o.buyable_types??=[...new Set(o.items.map(r=>tradeCategory(tradeItem(r.id)||{})))];
    for(const r of o.items){copper(r.buy_price);copper(r.sell_price);copper(r.stock);}
  }
  for(const a of Object.values(w.auctions)){
    copper(a.reserve);copper(a.bid);copper(a.escrow);
    a.seller_id??='seller:'+a.id;a.instance_id??='lot:'+a.id;a.min_increment??=1;
    a.highest_bid??=a.bid;a.highest_bidder??=a.escrow>0?'player':null;a.highest_escrow??=a.escrow;
    copper(a.highest_bid);copper(a.highest_escrow);check(Number.isSafeInteger(a.min_increment)&&a.min_increment>=1,'저장된 최소 입찰 증가액');
    check(a.escrow===0||a.highest_bidder==='player'&&a.escrow===a.highest_escrow,'저장된 예치금 원장');
    w.merchants[a.seller_id]??={wallet_copper:0,verified:false};
  }
}
function merchant(w,offer){return w.merchants[offer.merchant_id];}
function transfer(w,state,who,delta){if(who==='player')money(state,delta);else{check(w.merchants[who],'해당 NPC의 실제 자금 필요');w.merchants[who].wallet_copper=addCopper(w.merchants[who].wallet_copper,delta);}}
function record(w,e,date,fields){check(w.transactions.length<1000,'거래 기록 보존 한도');w.transactions.push({event_id:e.event_id,kind:e.kind,date,...fields});}
function eligibility(w,o,e,scene,ctx,date){
  ctx.assertOfferLocation(w,o,scene,date);const k=ctx.kingdomOf(o.region_id),rep=w.kingdom_reputation[k];
  check(!w.wanted_flags[k]&&rep>=(o.min_reputation??(w.national_origin&&k!==w.national_origin?0:-100)),'명성·수배 거래 제한');
  if(o.education_required||(k==='east'&&e.item_id&&tradeItem(e.item_id)?.category==='spellbook')||o.type==='facility'&&ctx.facility(o.venue_id)?.exclusive_specialty&&k==='east')check(rep>=20&&text(e.education_approval),'드라켄 명성20·마법 교육 등록 허가');
}
export function applyMarket(next,scene,e,date){
  const w=next.world_engine,now=dateDay(date),start=dateDay(e.starts_at),end=dateDay(e.ends_at);
  check(/^(W[1-5]|E[1-4]|S[1-4])$/.test(e.region_id)&&['war','raid','crop_failure','border','supply','demand'].includes(e.cause)&&start<=now&&end>=now,'실제 지역·원인·적용 기간');
  check(scene.world_events?.some(p=>p.event_id===e.evidence_id&&p.target_id===e.region_id&&['action','clue'].includes(p.kind)&&text(p.proof)),'시장 변화의 실제 사건 증거');
  check(Number.isSafeInteger(e.price_percent)&&e.price_percent>=-90&&e.price_percent<=500&&Array.isArray(e.categories)&&e.categories.every(c=>['equipment','book','material','consumable'].includes(c)),'가격 조정·품목 분류');
  check(w.market_changes.length<1000,'시장 기록 한도');
  w.market_changes.push({event_id:e.event_id,region_id:e.region_id,cause:e.cause,evidence_id:e.evidence_id,starts_at:e.starts_at,ends_at:e.ends_at,starts_day:start,ends_day:end,price_percent:e.price_percent,categories:clone(e.categories),reason:e.reason});
  check(!e.stock_changes||Array.isArray(e.stock_changes)&&e.stock_changes.length<=40,'재고 변화');
  for(const r of e.stock_changes||[]){const o=w.offers[r.offer_id],item=o?.items.find(i=>i.id===r.item_id);check(o?.region_id===e.region_id&&item,'현지 재고');item.stock=addCopper(item.stock,r.delta);check(item.stock<=999999,'재고 한도');}
  if(e.budget_delta!==undefined){check(findNPC(e.merchant_npc_id)&&w.merchants[e.merchant_npc_id],'확인된 현지 상인 예산');const shops=Object.values(w.offers).filter(o=>o.merchant_id===e.merchant_npc_id);check(shops.some(o=>o.region_id===e.region_id),'상인 활동 지역');transfer(w,next,e.merchant_npc_id,e.budget_delta);}
  // Validate even a price change that has no immediate trade.
  for(const o of Object.values(w.offers))for(const r of o.items)for(const direction of ['buy','sell'])priceAt(w,o,r,direction,now);
}
export function applyEconomyEvent(next,scene,e,date,ctx){
  const w=next.world_engine,now=dateDay(date);
  if(e.kind==='offer'){
    const o=clone(e.offer);check(id(o?.id)&&text(o.venue_id)&&text(o.venue_name)&&/^(W[1-5]|E[1-4]|S[1-4])$/.test(o.region_id)&&['shop','facility'].includes(o.type)&&dateDay(o.valid_until)>=now&&!w.offers[o.id],'현지 견적·기한·새 ID');
    check(o.merchant_npc_id===undefined||findNPC(o.merchant_npc_id)?.role!=='monster'&&findNPC(o.merchant_npc_id)?.id===o.merchant_npc_id,'등록 인간 상인 NPC');
    if(o.merchant_npc_id)check(o.merchant_buy_budget!==undefined&&Array.isArray(o.buyable_types),'실제 상인 예산·매입 분류 필요');
    const budget=copper(o.merchant_buy_budget??0);o.merchant_id=o.merchant_npc_id||'merchant:'+o.venue_id;
    w.merchants[o.merchant_id]??={wallet_copper:budget,verified:o.merchant_buy_budget!==undefined};
    check(o.min_reputation===undefined||Number.isInteger(o.min_reputation)&&Math.abs(o.min_reputation)<=100,'명성 제한');check(o.education_required===undefined||typeof o.education_required==='boolean','교육 허가 조건');
    check(Array.isArray(o.items)&&o.items.length<=40&&new Set(o.items.map(r=>r.id)).size===o.items.length,'견적 품목');
    for(const r of o.items){check(tradable(r.id)&&Number.isSafeInteger(r.stock)&&r.stock>=0&&r.stock<=999999&&text(r.price_basis),'판매 가능한 등록 물품·재고·가격 근거');copper(r.buy_price);copper(r.sell_price);const cat=tradeItem(r.id);r.base_buy_price=copper(cat.buy_price_copper??cat.price_copper??r.buy_price);r.base_sell_price=copper(cat.sell_price_copper??r.sell_price);r.buy_price=r.base_buy_price;r.sell_price=r.base_sell_price;}
    o.buyable_types??=[...new Set(o.items.map(r=>tradeCategory(tradeItem(r.id))))];check(o.buyable_types.every(c=>['equipment','book','material','consumable'].includes(c)),'상인 매입 분류');
    if(o.type==='facility')check(ctx.facility(o.venue_id)?.region_id===o.region_id&&Array.isArray(o.services),'등록 전문 시설');
    for(const s of o.services||[]){const f=ctx.facility(o.venue_id);check(id(s.id)&&text(s.basis)&&(o.type==='facility'?f.service.includes(s.service):currencyRules.baseline_prices.some(p=>p.id===s.service)&&['inn_night','nice_inn_night','carriage_short','herbal_treatment'].includes(s.service)),'승인 시설·생활 서비스');copper(s.cost);for(const r of [...(s.inputs||[]),...(s.outputs||[])])check(tradable(r.id)&&Number.isSafeInteger(r.quantity)&&r.quantity>0&&r.quantity<=999999,'재료·산출물');for(const field of ['hp_restore','mp_restore'])if(s[field]!==undefined){copper(s[field]);check(['healing','rest','mana_rest','inn_night','nice_inn_night','herbal_treatment'].includes(s.service),'회복 서비스 제한');}if(s.xp!==undefined){copper(s.xp);check(o.type==='facility'&&/train|training/.test(s.service),'실제 훈련만 XP 지급');}}
    check(Object.keys(w.offers).length<128,'견적 보존 한도');w.offers[o.id]=o;
  }else if(e.kind==='trade'||e.kind==='service'){
    const o=w.offers[e.offer_id];check(o,'실제 발행 견적');eligibility(w,o,e,scene,ctx,date);
    check(!scene.player&&!scene.inventory&&!scene.quest_events?.some(v=>v.kind==='report'),'보상 스냅샷 중복 금지');const before=wallet(next);let amount;
    if(e.kind==='trade'){
      const r=o.items.find(r=>r.id===e.item_id);check(r&&tradable(r.id)&&['buy','sell'].includes(e.direction)&&Number.isSafeInteger(e.quantity)&&e.quantity>=1&&e.quantity<=999999,'거래 품목·방향·수량');
      const unit=priceAt(w,o,r,e.direction,now);amount=totalCopper(unit,e.quantity);
      if(e.direction==='buy'){check(r.stock>=e.quantity,'재고 부족');money(next,-amount);ctx.give(next,r.id,e.quantity);merchant(w,o).wallet_copper=addCopper(merchant(w,o).wallet_copper,amount);r.stock-=e.quantity;}
      else {check(o.buyable_types.includes(tradeCategory(tradeItem(r.id))),'상인이 매입하지 않는 품목');merchant(w,o).wallet_copper=addCopper(merchant(w,o).wallet_copper,-amount);ctx.take(next,r.id,e.quantity,e.instance_id);money(next,amount);r.stock=addCopper(r.stock,e.quantity);check(r.stock<=999999,'재고 한도');}
      record(w,e,date,{offer_id:o.id,merchant_id:o.merchant_id,item_id:r.id,instance_id:e.instance_id||null,direction:e.direction,quantity:e.quantity,unit_price:unit,amount,balance_before:before,balance_after:wallet(next),price_changes:w.market_changes.filter(c=>c.region_id===o.region_id&&c.starts_day<=now&&now<=c.ends_day).map(c=>c.event_id)});
    }else {
      const s=o.services?.find(s=>s.id===e.service_id);check(s,'서비스 견적');amount=copper(s.cost);money(next,-amount);merchant(w,o).wallet_copper=addCopper(merchant(w,o).wallet_copper,amount);
      for(const r of s.inputs||[])ctx.take(next,r.id,r.quantity);for(const r of s.outputs||[])ctx.give(next,r.id,r.quantity);
      if(s.hp_restore){check(next.player.hp>0,'전투불능 소생은 별도 판정 필요');next.player.hp=Math.min(next.player.maxHp,next.player.hp+s.hp_restore);}if(s.mp_restore)next.player.mp=Math.min(next.player.maxMp,next.player.mp+s.mp_restore);
      if(s.xp){check(!scene.engine_events?.some(v=>v.kind==='xp'),'훈련 XP 중복');ctx.awardXP(next,s.xp);}check(w.facility_history.length<1000,'시설 기록 한도');w.facility_history.push({event_id:e.event_id,facility_id:o.venue_id,service:s.service,date});record(w,e,date,{offer_id:o.id,service_id:s.id,amount,balance_before:before,balance_after:wallet(next)});
    }
  }else if(e.kind==='market')applyMarket(next,scene,e,date);
  else if(e.kind==='cash_receipt'){
    if(e.source==='bandit')check(findNPC(e.npc_id||e.source_id)?.role==='human','실제 등록 인간의 소지금만 가능');
    check(['bandit','bounty','dungeon_treasure'].includes(e.source)&&id(e.source_id)&&scene.world_events?.some(p=>p.event_id===e.evidence_id&&p.target_id===e.source_id&&['action','clue'].includes(p.kind)&&text(p.proof)),'실제 인간 소지금·현상금·보물 증거');
    const amount=copper(e.amount),available=copper(e.available_copper);check(amount>0&&amount<=available,'확인한 실제 금액');w.cash_sources[e.source_id]??=available;check(w.cash_sources[e.source_id]>=amount,'이미 받은 출처 자금');w.cash_sources[e.source_id]-=amount;money(next,amount);record(w,e,date,{source:e.source,source_id:e.source_id,amount,balance_after:wallet(next)});
  }else if(e.kind==='auction'){
    const a=clone(e.auction);check(id(a?.id)&&!w.auctions[a.id]&&tradable(a.item_id)&&text(a.venue_id)&&text(a.venue_name)&&/^(W[1-5]|E[1-4]|S[1-4])$/.test(a.region_id)&&dateDay(a.closes_at)>now&&text(a.price_basis)&&a.eligible===true,'실제 경매 공고·참가 자격');copper(a.reserve);
    check(a.seller_id===undefined||a.seller_id==='player'||findNPC(a.seller_id),'등록 판매자');check(a.seller_id===undefined||id(a.instance_id)&&text(a.ownership_proof),'실제 판매 물품 개체·소유 근거');
    a.seller_id??='seller:'+a.id;a.instance_id??='lot:'+a.id;a.min_increment??=1;check(Number.isSafeInteger(a.min_increment)&&a.min_increment>=1,'최소 입찰 증가액');
    check(!Object.values(w.auctions).some(p=>p.instance_id===a.instance_id&&p.status==='open'),'이미 위탁 중인 개체');
    if(a.seller_id==='player'){check(!scene.inventory&&!scene.player,'출품 스냅샷 중복');eligibility(w,{...a,valid_until:a.closes_at},e,scene,ctx,date);ctx.take(next,a.item_id,1,a.instance_id);}else w.merchants[a.seller_id]??={wallet_copper:0,verified:!!a.ownership_proof};
    w.auctions[a.id]={...a,status:'open',bid:0,escrow:0,highest_bid:0,highest_escrow:0,highest_bidder:null,winner_id:null,settlement_record:null};
  }else {
    const a=w.auctions[e.auction_id];check(a?.status==='open','진행 중 경매');
    if(e.kind==='bid'){
      eligibility(w,{...a,valid_until:a.closes_at},e,scene,ctx,date);const who=e.bidder_id||'player';check(who==='player'||findNPC(who),'등록 입찰자');check(who!==a.seller_id&&now<dateDay(a.closes_at),'판매자 자기 입찰·마감 이후 입찰 금지');
      const amount=copper(e.amount),minimum=a.highest_bid?addCopper(a.highest_bid,a.min_increment):a.reserve;check(amount>0&&amount>=minimum,'최저 입찰가·최소 증가액');
      if(who===a.highest_bidder)transfer(w,next,who,-(amount-a.highest_escrow));else {transfer(w,next,who,-amount);if(a.highest_bidder)transfer(w,next,a.highest_bidder,a.highest_escrow);}
      a.highest_bid=amount;a.highest_escrow=amount;a.highest_bidder=who;a.escrow=who==='player'?amount:0;if(who==='player')a.bid=amount;record(w,e,date,{auction_id:a.id,bidder_id:who,amount,escrow:a.highest_escrow});
    }else {
      check(now>=dateDay(a.closes_at)&&['won','lost','cancelled'].includes(e.result)&&!scene.player&&!scene.inventory,'실제 경매 마감·보상 스냅샷 중복 금지');
      if(e.result==='lost'&&!a.seller_id.startsWith('seller:'))check(a.highest_bidder!=='player','패찰은 실제 다른 최고 입찰자 필요');
      let winner=null,price=0;
      if(e.result==='won'||e.result==='lost'&&a.highest_bidder&&a.highest_bidder!=='player'){
        winner=e.winner_id||a.highest_bidder;check(winner&&winner===a.highest_bidder&&(e.result==='won'?winner==='player':winner!=='player')&&e.final_price===a.highest_bid&&text(e.authenticity_proof),'최고 입찰자·낙찰가·진품 확인');price=a.highest_escrow;
        transfer(w,next,a.seller_id,price);if(winner==='player')ctx.give(next,a.item_id,1,a.instance_id);else{w.npc_owned[winner]??=[];w.npc_owned[winner].push({item_id:a.item_id,instance_id:a.instance_id,auction_id:a.id});}
      }else {
        if(a.highest_bidder)transfer(w,next,a.highest_bidder,a.highest_escrow);if(a.seller_id==='player')ctx.give(next,a.item_id,1,a.instance_id);
      }
      a.highest_escrow=0;a.escrow=0;a.status=e.result;a.winner_id=winner;a.settlement_record={event_id:e.event_id,date,winner_id:winner,seller_id:a.seller_id,item_id:a.item_id,instance_id:a.instance_id,price,result:e.result};record(w,e,date,{auction_id:a.id,...a.settlement_record});
    }
  }
}
