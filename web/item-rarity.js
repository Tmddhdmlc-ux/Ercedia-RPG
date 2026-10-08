// Shared by every item-icon surface; raw item artwork never carries a rarity frame.
export const rarityStyles=Object.freeze({
  '하급':Object.freeze({color:'#FFFFFF',glow:false}),
  '중급':Object.freeze({color:'#26B75A',glow:false}),
  '고급':Object.freeze({color:'#3489FF',glow:false}),
  '유니크':Object.freeze({color:'#A35CF0',glow:true}),
  '에픽':Object.freeze({color:'#E64444',glow:true})
});
export function normalizeRarity(value){
  return typeof value==='string'&&Object.hasOwn(rarityStyles,value)?value:'';
}
export function applyItemRarity(element,item){
  const rarity=normalizeRarity(item?.rarity),style=rarityStyles[rarity];
  element.classList.toggle('item-rarity',!!style);
  if(!style){
    delete element.dataset.rarity;
    element.style.removeProperty('--item-rarity-color');
    element.style.removeProperty('--item-rarity-glow');
    return;
  }
  element.dataset.rarity=rarity;
  element.style.setProperty('--item-rarity-color',style.color);
  element.style.setProperty('--item-rarity-glow',style.glow?`0 0 6px ${style.color}38`:'none');
}
