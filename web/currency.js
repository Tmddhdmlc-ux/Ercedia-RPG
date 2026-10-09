import {wallet as canonicalWallet,copper,bindWallet,splitCopper} from './wallet.js';
// Shop display helpers delegate to the existing economy's single wallet.
export function wallet(state){
  return canonicalWallet(state);
}
export function setWallet(state,value){
  state.wallet_copper=copper(value);bindWallet(state);return value;
}
export function coins(value){
  const parts=splitCopper(value);return `금 ${parts.gold.toLocaleString()} · 은 ${parts.silver} · 동 ${parts.copper}`;
}
