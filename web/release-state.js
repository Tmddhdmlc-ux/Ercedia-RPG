// Only the documented currency alias migration is allowed. All other saved data
// must match exactly before a replacement frame becomes visible.
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
  try{return canonical(ledger(before))===canonical(ledger(after));}catch{return false;}
}
