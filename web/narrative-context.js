import {resolveNPC} from './npc-model.js';

// A public, read-only scene focus. It never adjudicates dialogue or creates world events.
export const narrativeInstruction='[장면 서술] NARRATION_RULES.md 적용. 현장 NPC가 있으면 직접 대사 중심(대화60%·묘사40%는 체감 기준)으로 직업·성격·말투와 이번 감정이 드러나게 쓰세요. 혼자 탐색하거나 무언의 적과 대치할 때는 억지 화자를 만들지 않습니다. 직전 행동의 결과에서 이어가고 이미 결정한 실행을 다시 준비·조건 확인 선택으로 돌리지 마세요. 중요한 새 위험·미승인 비용·관계 선택 앞에서는 멈춥니다. HUD의 날짜·정밀 시각·지명을 반복하지 말고 바뀐 감각·행동·반응부터 보여주세요. 해결한 위협은 재시작하지 말고 보호한 사람의 반응·남은 피해·다음 만남의 이유를 실제 기록 안에서 이어가세요. NPC가 보지 못한 사건을 아는 척하거나 속마음·GM 판정·원장·ID·엔진 설명을 대사로 공개하지 마세요. 일반 장면은 짧게, 감정·갈림길은 필요한 만큼. 선택지는 현재 가능한 다음 행동으로 만드세요. ';

export function narrativeFocus(state){
 const speakers=[state.scene?.npc,...(state.scene?.cast||[])].filter(Boolean),seen=new Set(),voices=[];
 for(const actor of speakers){
  if(seen.has(actor.id))continue;seen.add(actor.id);
  const n=resolveNPC(state,actor.id);if(!n||n.role==='monster')continue;
  const voice={id:n.id,name:n.name};
  for(const k of ['duty','personality','speech_style'])if(typeof n[k]==='string'&&n[k])voice[k]=n[k];
  if(typeof actor.emotion==='string')voice.current_emotion=actor.emotion;
  voices.push(voice);if(voices.length===3)break;
 }
 const threads=(state.quest_log||[]).filter(q=>['accepted','active','ready_to_report'].includes(q.status)).slice(0,3).map(q=>{
  const story=q.story||[],resolved=new Set(story.filter(e=>e.kind==='resolve').map(e=>e.threat_id)),pending=story.filter(e=>e.kind==='threat'&&!resolved.has(e.event_id));
  const phase=pending.length?'respond_to_existing_threat':q.status==='ready_to_report'?'report_verified_result':story.some(e=>e.kind==='resolve')?'continue_work_or_aftermath':q.story_required?'introduce_contextual_threat':'continue_work';
  return {quest_id:q.id,title:q.title,phase,...(pending.length?{pending_threats:pending.slice(-2).map(e=>({event_id:e.event_id,description:e.description,protected:e.protected}))}:{})};
 });
 const consequences=(state.gameState?.events||[]).filter(e=>typeof e==='string').slice(-3);
 const focus={...(voices.length?{voices}:{}),...(threads.length?{threads}:{}),...(consequences.length?{recorded_consequences:consequences}:{})};
 if(Object.keys(focus).length)focus.knowledge_rule='기록·주변 명부가 만남·목격·NPC 지식을 확정하지 않는다.';
 return focus;
}
