export function copper(value){
  if(!Number.isSafeInteger(value)||value<0)throw Error('화폐 검증 · 음수·소수·안전 정수 범위를 벗어난 금액');
  return value;
}
export function wallet(state){return Object.hasOwn(state,'wallet_copper')?copper(state.wallet_copper):Object.hasOwn(state,'currency')?copper(state.currency):0;}
export function addCopper(balance,delta){
  copper(balance);if(!Number.isSafeInteger(delta))throw Error('화폐 검증 · 정수 변화량 필요');
  const next=balance+delta;if(next<0)throw Error('재화 부족 · 소지금이 부족합니다.');return copper(next);
}
export function totalCopper(price,quantity){copper(price);if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('화폐 검증 · 구매 수량');return copper(price*quantity);}
// Legacy API alias is deliberately absent from JSON/spread: one persisted ledger.
export function bindWallet(state){
  const value=wallet(state);delete state.currency;state.wallet_copper=value;
  Object.defineProperty(state,'currency',{configurable:true,enumerable:false,get(){return this.wallet_copper;},set(v){this.wallet_copper=copper(v);}});return state;
}
export function splitCopper(value){copper(value);return {gold:Math.floor(value/10000),silver:Math.floor(value%10000/100),copper:value%100};}
export function formatCopper(value,{compact=false}={}){
  const parts=splitCopper(value),labels=compact?{gold:'금',silver:'은',copper:'동'}:{gold:'금화',silver:'은화',copper:'동화'};
  return Object.entries(parts).filter(([,n])=>n>0).map(([key,n])=>labels[key]+' '+n.toLocaleString('ko-KR')).join(' · ')||(compact?'동 0':'동화 0');
}
