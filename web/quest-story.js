// Approved episode pacing, shared by full and compact GM requests.
export const questStoryInstruction='[의뢰·사건 필수 서사] QUEST_STORY_RULES.md 적용: 모든 의뢰와 사건 에피소드에 실제 전투 또는 평화를 위협하는 예상치 못한 사건을 최소 한 번 반드시 발생시키세요. 단순 운반·인계·보상만으로 끝내거나 새 위협을 자동 후처리로 생략하지 마세요. 구체적인 보호 대상과 위협·단서를 보여주고 전투/조사/협상/구조/철수 등 실제 가능한 대응을 선택하게 하세요. 같은 도적 습격을 반복하지 말고 현지 등록 인물·지역 사정으로 원인과 결과를 달리하세요. 평화적 해결도 실제 조건·증거가 필요하며 자동 승리·강제 희생·비밀 누설을 금지합니다. 대응 뒤 NPC 반응·공개 후일담·실제 기억을 남기고 해결한 위협은 다시 초기화하지 마세요. 이미 수락한 목표·보상과 완료 기록은 유지하며 추가 보상을 중복 지급하지 마세요. 평온한 일상은 매 클릭마다 위협을 강제하지 않습니다. ';
export function hasActiveQuestStory(state){
  return (state.quest_log||[]).some(q=>['accepted','active','ready_to_report'].includes(q.status));
}
export function normalizeStoryEvents(raw){
 if(!Array.isArray(raw)||raw.length>20)throw Error('의뢰 위협 사건은 최대20개');
 const ids=new Set();return raw.map(e=>{
  if(!e||!['threat','resolve'].includes(e.kind)||![e.event_id,e.quest_id].every(v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,100}$/.test(v))||![e.description,e.protected].every(v=>typeof v==='string'&&v.trim()&&v.length<=1000)||ids.has(e.event_id)||e.kind==='resolve'&&(typeof e.threat_id!=='string'||!/^[A-Za-z0-9:_-]{1,100}$/.test(e.threat_id)))throw Error('의뢰 위협 사건의 ID·보호 대상·공개 근거를 확인하세요');
  ids.add(e.event_id);return {event_id:e.event_id,quest_id:e.quest_id,kind:e.kind,description:e.description,protected:e.protected,...(e.kind==='resolve'?{threat_id:e.threat_id}:{})};
 });
}
export function applyQuestStory(quests,scene,ledger){
 for(const e of scene.story_events||[]){
  if(ledger.includes(e.event_id))throw Error('이미 적용한 의뢰 위협 사건입니다');
  const q=quests.find(q=>q.id===e.quest_id);
  if(!q||!['accepted','active','ready_to_report'].includes(q.status))throw Error('수락한 의뢰의 위협만 진행할 수 있습니다');
  const story=q.story||[],prior=story.find(p=>p.event_id===e.threat_id&&p.kind==='threat');
  if(e.kind==='resolve'&&(!prior||prior.scene_id===scene.scene_id||story.some(p=>p.kind==='resolve'&&p.threat_id===e.threat_id)))throw Error('새 위협을 같은 응답에서 자동 해결하지 마세요. 앞 장면의 위협에 플레이어가 대응한 뒤 해결을 기록하세요');
  if(e.kind==='threat'&&!scene.choices.length)throw Error('새 위협에는 가능한 대응 선택지를 제시하세요');
  q.story=[...story,{...e,scene_id:scene.scene_id}];if(q.story.length>100)throw Error('의뢰 위협 기록 한도');ledger.push(e.event_id);
 }
}
export function assertQuestStory(q){
 if(!q.story_required)return;
 const threats=(q.story||[]).filter(e=>e.kind==='threat');
 if(!threats.length||threats.some(t=>!q.story.some(e=>e.kind==='resolve'&&e.threat_id===t.event_id)))throw Error('의뢰 완료 전에 실제 돌발 위협과 플레이어 대응·후일담을 story_events로 기록하세요');
}
