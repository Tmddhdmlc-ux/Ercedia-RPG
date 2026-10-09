// Product eligibility, not a promise that every shop has these products in stock.
export const shopTypes={
  general:{name:'잡화점',categories:['consumable','misc','material']},
  weapons:{name:'무기점',slots:['weapon'],categories:['consumable']},
  armor:{name:'방어구점',slots:['armor']},
  smith:{name:'대장간',slots:['weapon','armor'],categories:['material'],services:['repair','enhance']},
  herbalist:{name:'약초점',categories:['consumable','material'],suppliesOnly:true},
  alchemy:{name:'연금술점',categories:['consumable','material'],subtypes:['staff']},
  magic_books:{name:'마법서점',book:'spell'},
  sword_books:{name:'검술서점',book:'sword'},
  jewelry:{name:'보석상',slots:['accessory'],categories:['material']},
  materials:{name:'재료상',categories:['material']},
  grocery:{name:'식료품점',categories:['consumable']},
  inn:{name:'여관',categories:['consumable'],services:['rest','meal']},
  trading_house:{name:'상단 거래소',categories:['material','consumable','misc']},
  junk:{name:'고물상',categories:['equipment','material','misc']},
  auction:{name:'경매장',categories:['equipment','book','material','misc'],auction:true}
};
export const regionalShops={west:['smith','weapons','sword_books'],east:['magic_books','alchemy'],south:['trading_house','grocery','inn']};
export function shopAccepts(type,item){
  const rule=shopTypes[type];if(!rule||!item)return false;
  if(item.allowed_shops&&!item.allowed_shops.includes(type))return false;
  if(rule.suppliesOnly&&!item.allowed_shops)return false;
  const category=item.slot?'equipment':item.skill_id?'book':item.type==='crafting_material'?'material':item.category||'material';
  if(rule.book)return !!item.skill_id&&(rule.book==='spell'?item.category==='spellbook'||item.required_circle>0:item.category==='sword_manual');
  return rule.categories?.includes(category)||rule.slots?.includes(item.slot)||rule.subtypes?.includes(item.subtype)||false;
}
