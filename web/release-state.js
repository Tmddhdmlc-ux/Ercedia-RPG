// Allow documented additive economy defaults, never replace existing records.
export function sameReleaseState(before,after){
  function canonical(value){
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
    return JSON.stringify(value);
  }
  function ledger(state){
    if(!state||state.version!==1)throw Error('Unsupported save');
    const copy={...state};
    const balance=Object.hasOwn(copy,'wallet_copper')?copy.wallet_copper:Object.hasOwn(copy,'currency')?copy.currency:0;
    if(!Number.isSafeInteger(balance)||balance<0)throw Error('Invalid balance');
    delete copy.currency;copy.wallet_copper=balance;
    return copy;
  }
  try{
    const old=ledger(before),next=ledger(after);
    if(old.world_engine&&next.world_engine){
      next.world_engine=JSON.parse(JSON.stringify(next.world_engine));
      const a=old.world_engine,b=next.world_engine;
      for(const [key,empty]of Object.entries({shops:{},trade_ids:{},market_changes:[],npc_owned:{},cash_sources:{}})){
        if(!Object.hasOwn(a,key)&&canonical(b[key])===canonical(empty))delete b[key];
      }
      const migratedMerchants={};
      for(const [id,offer]of Object.entries(a.offers||{})){
        const restored=b.offers?.[id];if(!restored)continue;
        const merchant=offer.merchant_id??offer.merchant_npc_id??'merchant:'+offer.venue_id;
        migratedMerchants[merchant]={wallet_copper:0,verified:false};
        if(!Object.hasOwn(offer,'merchant_id')&&restored.merchant_id===merchant)delete restored.merchant_id;
        if(!Object.hasOwn(offer,'buyable_types')&&Array.isArray(restored.buyable_types)&&new Set(restored.buyable_types).size===restored.buyable_types.length&&restored.buyable_types.every(v=>['equipment','book','material','consumable','misc'].includes(v)))delete restored.buyable_types;
      }
      for(const [id,auction]of Object.entries(a.auctions||{})){
        const restored=b.auctions?.[id];if(!restored)continue;
        const fields={seller_id:'seller:'+auction.id,instance_id:'lot:'+auction.id,min_increment:1,highest_bid:auction.bid,highest_bidder:auction.escrow>0?'player':null,highest_escrow:auction.escrow};
        migratedMerchants[auction.seller_id??fields.seller_id]={wallet_copper:0,verified:false};
        for(const [key,value]of Object.entries(fields))if(!Object.hasOwn(auction,key)&&canonical(restored[key])===canonical(value))delete restored[key];
      }
      if(b.merchants){
        for(const [id,value]of Object.entries(migratedMerchants))if(!Object.hasOwn(a.merchants||{},id)&&canonical(b.merchants[id])===canonical(value))delete b.merchants[id];
        if(!Object.hasOwn(a,'merchants')&&canonical(b.merchants)==='{}')delete b.merchants;
      }
    }
    return canonical(old)===canonical(next);
  }catch{return false;}
}

// Show field paths only, never secrets or save values, when a migration is refused.
export function releaseStateDifferences(before,after){
  const paths=[];
  function visit(a,b,path){
    if(paths.length>=5)return;
    if(JSON.stringify(a)===JSON.stringify(b))return;
    if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
      for(const key of new Set([...Object.keys(a),...Object.keys(b)]))visit(a[key],b[key],path?path+'.'+key:key);
    }else paths.push(path||'state');
  }
  visit(before,after,'');return paths.join(', ');
}
