import {economyData} from './economy-data.js';
import {catalogItem,itemCategory} from './item-catalog.js';
import {copper} from './wallet.js';
export const currencyRules=economyData.rules;
export const provisions=currencyRules.baseline_prices.filter(i=>['bread','simple_meal'].includes(i.id)).map(i=>({...i,name:i.name,category:'consumable',tradable:true,base_price_copper:i.copper}));
export function tradeItem(id){return catalogItem(id)||provisions.find(i=>i.id===id)||null;}
export function tradeCategory(item){return item.category==='consumable'?'consumable':itemCategory(item);}
export function tradable(id){const item=tradeItem(id);return !!item&&item.tradable!==false&&!economyData.divine_ids.includes(id);}
export function priceAt(world,offer,row,direction,dateDay){
  const base=copper(direction==='buy'?row.base_buy_price??row.buy_price:row.base_sell_price??row.sell_price);
  let percent=100;
  for(const change of world.market_changes||[])if(change.region_id===offer.region_id&&change.starts_day<=dateDay&&dateDay<=change.ends_day&&(!change.categories.length||change.categories.includes(tradeCategory(tradeItem(row.id)))))percent+=change.price_percent;
  if(!Number.isSafeInteger(percent)||percent<0)throw Error('경제 검증 · 가격 조정 범위');
  return copper(Number(BigInt(base)*BigInt(percent)/100n));
}
