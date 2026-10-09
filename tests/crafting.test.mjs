import test from 'node:test';
import assert from 'node:assert/strict';
import {craftingData} from '../web/crafting-data.js';
import {validateCraftingService} from '../web/crafting-model.js';
import {catalogItem} from '../web/item-catalog.js';
import {economyState,scene,event,apply} from './economy-fixtures.js';
function setup(rarity='하급'){
  const r=craftingData.recipes.find(r=>r.rarity===rarity),s=economyState();s.wallet_copper=20000;s.gameState.place='FAC-W5-01';
  s.inventory=r.inputs.map(i=>({id:i.id,name:catalogItem(i.id).name,quantity:i.quantity,category:'material'}));
  const service={id:'craft',service:'smithing',recipe_id:r.id,cost:r.cost_copper,inputs:r.inputs,outputs:[r.output],basis:'등록 제작법 견적',craftsman:r.craftsman,craftsman_proof:'현장 장인 숙련 확인',base_stock_proof:'실제 철과 목재 재고 확인',recipe_proof:'제작법 확보',artificer_proof:'마나 세공사 협력 확인'};
  const offer={id:'craft-offer',type:'facility',venue_id:'FAC-W5-01',venue_name:'대장간',region_id:'W5',valid_until:'1-1-30',items:[],services:[service]};
  apply(s,scene(s,[event('offer',{offer})]));return {s,r,service};
}
test('all 300 equipment recipes use registered materials and grade requirements',()=>{
  assert.equal(craftingData.recipes.length,300);assert.equal(new Set(craftingData.recipes.map(r=>r.output.id)).size,300);
  for(const r of craftingData.recipes){assert.equal(catalogItem(r.output.id).rarity,r.rarity);assert.ok(r.inputs.every(i=>catalogItem(i.id)&&i.quantity>0));}
});
test('actual smithing consumes materials and money once and produces the canonical equipment',()=>{
  for(const rarity of ['하급','중급','고급','유니크','에픽']){
    const {s,r}=setup(rarity),raw=scene(s,[event('service',{offer_id:'craft-offer',service_id:'craft',work_minutes:r.minutes,work_proof:'현장 제작과 세공 완료'})]);
    apply(s,raw);assert.equal(s.wallet_copper,20000-r.cost_copper);assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].id,r.output.id);assert.equal(s.inventory[0].quantity,1);
    const after=structuredClone(s);apply(s,raw);assert.deepEqual(s,after);
  }
});
test('missing materials, work time and wrong location reject the entire craft without payment',()=>{
  for(const fault of ['materials','time','place']){const {s,r}=setup();if(fault==='materials')s.inventory=[];if(fault==='place')s.gameState.place='장터';
    const before=structuredClone(s);assert.throws(()=>apply(s,scene(s,[event('service',{offer_id:'craft-offer',service_id:'craft',work_minutes:fault==='time'?0:r.minutes,work_proof:'작업 확인'})])));assert.deepEqual(s,before);
  }
});
test('canonical recipe price and rare recipe proof cannot be replaced by arbitrary offers',()=>{
  const {service}=setup('에픽');for(const field of ['cost','outputs','recipe_proof','craftsman_proof','base_stock_proof']){const bad=structuredClone(service);bad[field]=field==='cost'?0:field==='outputs'?[{id:'ER-EQ-001',quantity:1}]:'';assert.throws(()=>validateCraftingService(bad),/제작 검증/);}
});
