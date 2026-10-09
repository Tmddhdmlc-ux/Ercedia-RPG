import {craftingData} from './crafting-data.js';
const check=(ok,message)=>{if(!ok)throw Error('제작 검증: '+message);};
export function craftingRecipe(id){return craftingData.recipes.find(r=>r.id===id)||null;}
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=1000;
export function validateCraftingService(service){
  if(!service.recipe_id)return;
  const r=craftingRecipe(service.recipe_id);check(r&&service.service==='smithing','등록된 대장간 제작법');
  const rows=values=>JSON.stringify((values||[]).map(i=>({id:i.id,quantity:i.quantity})).sort((a,b)=>a.id.localeCompare(b.id)));
  check(service.cost===r.cost_copper&&rows(service.inputs)===rows(r.inputs)&&rows(service.outputs)===rows([r.output]),'제작비·재료·산출물은 등록 제작법과 일치해야 합니다.');
  check(service.craftsman===r.craftsman&&text(service.craftsman_proof),'실제 장인의 요구 숙련·근거 필요');
  check(text(service.base_stock_proof),'장인이 공급할 기본 소재의 실제 재고 근거 필요');
  if(r.requires_recipe_proof)check(text(service.recipe_proof),'희귀 제작법의 실제 확보 근거 필요');
  if(r.requires_mana_artificer)check(text(service.artificer_proof),'마나 세공 협력 근거 필요');
  check(service.xp===undefined&&service.hp_restore===undefined&&service.mp_restore===undefined,'제작은 훈련·회복 보상이 아닙니다.');
}
export function validateCraftingCompletion(service,event){
  if(!service.recipe_id)return;
  validateCraftingService(service);const r=craftingRecipe(service.recipe_id);
  check(Number.isSafeInteger(event.work_minutes)&&event.work_minutes>=r.minutes&&text(event.work_proof),'실제 제작 작업 시간·완료 근거 필요');
}
export function craftingContext(){return {source:'items/crafting_recipes.json',rules:craftingData.rules,recipe_count:craftingData.recipes.length};}
