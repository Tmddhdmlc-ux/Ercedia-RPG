// Stable per-conversation keys; UI release numbers and commit IDs never enter these keys.
export function validSave(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&value.version===1&&value.player&&typeof value.player==='object';}
export function saveHasProgress(state){return validSave(state)&&!!(state.campaign_id||state.scene||state.introDraft||state.intro_completed||state.player.name?.trim()||state.player.level>0||state.inventory?.length);}
export function preserveSaveSlots(state,...archives){
  const slots=[];
  for(const source of [state?.save_slots,...archives])for(const slot of Array.isArray(source)?source:[]){
    if(slot&&Number.isInteger(slot.id)&&slot.id>=1&&slot.id<=6&&validSave(slot.state)){
      const index=slots.findIndex(s=>s.id===slot.id);
      if(index<0)slots.push(slot);
      else if(Number.isFinite(Date.parse(slot.saved_at))&&Date.parse(slot.saved_at)>(Date.parse(slots[index].saved_at)||0))slots[index]=slot;
    }
  }
  return slots.length?{...state,save_slots:slots.sort((a,b)=>a.id-b.id)}:state;
}
export function recoverSavedGame(key,read,{preferBackup=false}={}){
  const current=read(key),recovery=read(key+':recovery'),backup=read(key+':backup');
  const choices=preferBackup?[backup,recovery,current]:[current,recovery,backup];
  let saved=choices.find(saveHasProgress)||choices.find(validSave)||null;
  const slots=read(key+':slots');
  if(!saved&&Array.isArray(slots))saved=[...slots].filter(s=>validSave(s?.state)).sort((a,b)=>(Date.parse(b.saved_at)||0)-(Date.parse(a.saved_at)||0))[0]?.state||null;
  if(!saved&&[current,recovery,backup].some(s=>s!=null))throw Error('저장 데이터를 읽지 못했습니다. 원본을 보존했습니다.');
  if(saved)saved=preserveSaveSlots(saved,slots,recovery?.save_slots,backup?.save_slots);
  return saved;
}
export function persistSavedGame(key,state,{read,write}){
  if(!validSave(state))throw Error('잘못된 저장값을 기록하지 않았습니다.');
  const existing=read(key),recovery=read(key+':recovery'),bank=read(key+':slots');
  // Older UIs can omit archive fields. A missing archive is never a deletion command.
  const saved=preserveSaveSlots(state,bank,existing?.save_slots,recovery?.save_slots);
  if(!saveHasProgress(saved)&&[existing,recovery].some(saveHasProgress))throw Error('빈 게임으로 기존 진행을 덮어쓰지 않았습니다.');
  // Recovery is written first. If the primary write fails, another durable copy survives.
  write(key+':recovery',saved);
  if(saved.save_slots)write(key+':slots',saved.save_slots);
  write(key,saved);return saved;
}
