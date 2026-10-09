// Slots travel inside the existing version-1 save, including the Tampermonkey adapter.
export const SLOT_COUNT=6;
const copy=value=>JSON.parse(JSON.stringify(value));
export function saveSnapshot(state){
  // Exclude archives BEFORE copying: a current snapshot must not traverse six saves.
  const {save_slots,...current}=state;
  if(current.previousGame){const {save_slots:previousSlots,...previous}=current.previousGame;current.previousGame=previous;}
  return copy(current);
}
// Read-only index: listing slots never traverses or copies their game histories.
export function slotRecords(slots){
  if(!Array.isArray(slots))return [];
  const result=[];
  for(const item of slots){
    if(!item||!Number.isInteger(item.id)||item.id<1||item.id>SLOT_COUNT||result.some(s=>s.id===item.id)||item.state?.version!==1)continue;
    result.push({id:item.id,saved_at:typeof item.saved_at==='string'?item.saved_at.slice(0,40):'',state:item.state});
  }
  return result;
}
export function normalizeSlots(slots){return slotRecords(slots).map(item=>({...item,state:saveSnapshot(item.state)}));}
export function writeSlot(state,storage,key,id,now=new Date().toISOString()){
  if(!Number.isInteger(id)||id<1||id>SLOT_COUNT)throw Error('저장 슬롯을 확인해주세요.');
  const slot={id,saved_at:now,state:saveSnapshot(state)},slots=slotRecords(state.save_slots).filter(s=>s.id!==id);
  slots.push(slot);slots.sort((a,b)=>a.id-b.id);
  // Do not change the current game or replace a slot if the storage write fails.
  storage.setItem(key,JSON.stringify({...state,save_slots:slots}));
  state.save_slots=slots;return slot;
}
export function slotCandidate(state,id,normalize){
  const slots=slotRecords(state.save_slots),slot=slots.find(s=>s.id===id);
  if(!slot)throw Error('비어 있는 슬롯입니다.');
  const restored=normalize(saveSnapshot(slot.state));
  if(slot.state.scene&&!restored.scene)throw Error('장면 데이터를 읽지 못했습니다. 현재 게임은 유지됩니다.');
  restored.save_slots=slots;return restored;
}
export function saveSummary(state){
  const p=state.player||{};
  return {name:p.name||state.character_name||'이름 미정',level:p.level??'—',place:state.gameState?.place||state.scene?.location||'여정의 문답',date:state.gameState?.date||'',hp:p.hp??'—',mp:p.mp??'—',quests:(state.quest_log||[]).filter(q=>['accepted','active','ready_to_report'].includes(q.status)).length,campaign:state.campaign_id||'',intro:!!state.introDraft};
}
