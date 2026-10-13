import {operatingRules} from './gm-turn-policy.js';
import {lifeEventInstruction} from './npc-life.js';
import {resolveNPC,npcPublicRole} from './npc-model.js';

// A public, read-only scene focus. It never adjudicates dialogue or creates world events.
export const narrativeInstruction=operatingRules;

export function narrativeFocus(state,action='',questId=null){
 const speakers=[state.scene?.npc,...(state.scene?.cast||[])].filter(Boolean),seen=new Set(),voices=[];
 for(const actor of speakers){
  if(seen.has(actor.id))continue;seen.add(actor.id);
  const n=resolveNPC(state,actor.id);if(!n||n.role==='monster')continue;
  const voice={id:n.id,name:n.name};
  const role=npcPublicRole(n.id);if(role)voice.public_role=role;
  for(const k of ['duty','personality','speech_style'])if(typeof n[k]==='string'&&n[k])voice[k]=n[k];
  if(typeof actor.emotion==='string')voice.current_emotion=actor.emotion;
  voices.push(voice);if(voices.length===3)break;
 }
 const present=new Set(speakers.map(n=>n.id));
 const selected=q=>q.id===questId||(!questId&&[q.id,q.title].some(v=>typeof v==='string'&&v.length>=2&&action.includes(v)));
 const quests=(state.quest_log||[]).filter(q=>['accepted','active','ready_to_report'].includes(q.status)||q.status==='completed'&&selected(q));
 // The chosen contract takes precedence over older unrelated entries. Never mutate the ledger order.
 const priority=q=>selected(q)?0:present.has(q.issuer_npc_id||q.issuer_id)?1:2;
 const threads=quests.map((q,index)=>({q,index})).sort((a,b)=>priority(a.q)-priority(b.q)||a.index-b.index).slice(0,3).map(({q})=>{
  const story=q.story||[],resolved=new Set(story.filter(e=>e.kind==='resolve').map(e=>e.threat_id)),pending=story.filter(e=>e.kind==='threat'&&!resolved.has(e.event_id));
  const phase=q.status==='completed'?'completed_aftermath':pending.length?'respond_to_existing_threat':q.status==='ready_to_report'?'report_verified_result':story.some(e=>e.kind==='resolve')?'continue_work_or_aftermath':q.story_required?'introduce_contextual_threat':'continue_work';
  const aftermath=story.filter(e=>e.kind==='resolve').slice(-1).map(e=>({event_id:e.event_id,threat_id:e.threat_id,description:e.description,protected:e.protected}));
  return {quest_id:q.id,title:q.title,scope:selected(q)?'selected':priority(q)===1?'present_issuer':'background',phase,...(pending.length?{completion_gate:'unresolved_threat',pending_threats:pending.slice(-2).map(e=>({event_id:e.event_id,description:e.description,protected:e.protected}))}:{}),...(aftermath.length?{verified_aftermath:aftermath}:{})};
 });
 const consequences=(state.gameState?.events||[]).filter(e=>typeof e==='string').slice(-3);
 const focus={...(voices.length?{voices}:{}),...(threads.length?{threads}:{}),...(consequences.length?{recorded_consequences:consequences}:{})};
 // Anchor ordinary short replies as well as danger responses. This is context,
 // not an inferred promise, accepted contact or new relationship state.
 if(voices.length){
  const dialogue=(state.scene?.dialogue||[]).slice(-6).map(d=>({speaker:d.speaker,...(d.speaker_id?{speaker_id:d.speaker_id}:{}),text:d.text.slice(0,240)}));
  const choices=(state.scene?.choices||[]).slice(0,4).map(c=>c.text);
  if(dialogue.length||choices.length)focus.previous_beat={dialogue,choices};
  const shared=(state.npc_life?.memories||[]).filter(m=>present.has(m.npc_id)&&m.player_witnessed===true);
  const memories=voices.flatMap(v=>shared.filter(m=>m.npc_id===v.id).slice(-2).map(m=>({npc_id:m.npc_id,date:m.date,action:m.action,...(typeof m.result==='string'?{result:m.result.slice(0,180)}:{}),...(typeof m.follow_up==='string'&&m.follow_up?{follow_up:m.follow_up.slice(0,120)}:{})})));
  if(memories.length)focus.shared_memories=memories;
  focus.scene_entry_rule='이번 입력을 첫 지문에서 다시 요약하지 말고 상대의 직접 답이나 달라진 현장 반응부터 잇는다. previous_beat의 몸짓·감각은 태도나 상황 변화에 필요할 때만 이어 쓴다. 단어를 금지하거나 새 몸짓으로 매번 대체하지 않는다. voices의 공개 말투·직무와 실제 제안·거절에 맞춰 반응하며 없는 성격·사정을 만들지 않는다.';
  focus.interaction_rule='직전 제안·질문·접촉 시도에 이번 말·행동으로 반응한다. 이미 이해·동의한 설명은 새 질문·오해·상황 변화가 없으면 다시 가르치지 않는다. 화제를 바꾸거나 작별하면 그 의도를 받되 위험·비용의 필요한 고지는 유지한다. 짧은 답·거절·침묵을 새 의뢰로 바꾸지 않는다. 제안은 수락이 아니며 동의 없는 접촉·감정은 확정하지 않는다. 공유 기억은 해당 인물의 실제 경험이고 매번 설명·칭찬으로 재생하지 않는다.';
 }
 if(Object.keys(focus).length)focus.knowledge_rule='기록·주변 명부가 만남·목격·NPC 지식을 확정하지 않는다. 플레이어가 혼자 한 제작·수련·거래는 NPC가 현장에서 보거나 직접 전해 들은 기록이 없으면 대사에서 아는 사실로 말하지 않는다. selected가 이번 행동의 의뢰이고 background는 참고만 한다. 완료된 의뢰는 다시 수락·지급·위협 발생 단계로 되돌리지 않는다.';
 if(voices.length)focus.role_rule='public_role은 등록된 공개 직무다. 사제·치료사 등에게 상황만으로 경비 지휘권이나 다른 직업을 부여하지 않는다. 임시 도움은 실제 경위와 직무 범위에서 서술한다. 저장의 잘못된 직무 묘사는 설정을 대체하지 않는다.';
 if(voices.length)focus.life_event_rule=lifeEventInstruction;
 if(voices.length)focus.contribution_rule='칭찬·후일담은 확인된 실제 행동의 수행자별로 구분한다. 플레이어의 경고·전달·준비 지원을 다른 인물의 발견·구조·치료·고정 작업으로 바꾸지 않는다. 함께 한 일은 공동 기여로 말하고, 목표·희망만으로 성과나 성공을 보장하지 않는다.';
 if(threads.length||(state.quest_log||[]).some(q=>q.status==='offered'&&(selected(q)||present.has(q.issuer_npc_id||q.issuer_id))))focus.choice_rule='선택지는 행동 방식·보호 대상·감수하는 위험·얻으려는 정보 중 실제 차이가 있어야 한다. 같은 철수·경고·보고를 말만 바꿔 여러 칸으로 늘리지 말고 한 행동으로 묶는다. 선택 수를 채우려고 불필요한 확인이나 같은 일의 중간 단계를 만들지 않는다. 가능한 다른 대응·대화·철수·보류를 제시하되 위험한 행동을 강요하거나 미확인 결과·보상을 보장하지 않는다. 중요한 선택2~4개, 자유 입력만이면0개를 유지한다.';
 if(/일거리|(?:할|맡을)\s*수\s*있는\s*일|새.*(?:일|의뢰|기회)|다른.*(?:일|의뢰|기회)|다음.*(?:일|의뢰|기회)/.test(action)){
  const completed=(state.quest_log||[]).filter(q=>q.status==='completed'&&q.visibility!=='private'&&(!q.region_id||q.region_id===state.gameState?.region)).slice(-12);
  if(completed.length){
   focus.completed_work_history=completed.map(q=>({quest_id:q.id,title:q.title,type:q.type}));
   focus.completed_work=completed.slice(-3).map(q=>({quest_id:q.id,title:q.title,type:q.type,...(q.repeatable===true?{repeatable:true}:{}),...(q.story?.filter(e=>e.kind==='resolve').length?{verified_result:q.story.filter(e=>e.kind==='resolve').at(-1).description}: {})}));
   focus.opportunity_rule='새 기회는 completed_work_history의 이전 작업 방식과 completed_work의 후일담, 현재 부상·장소·시간·현지 인물의 목적을 참고하여 기록 대조·검수 같은 방식만 연속 제안하지 않는다. 연락·동행·관찰·설득·현지 수련·제작 등 실제 가능한 다른 참여 방식을 섞되 부상과 조건을 무시하지 않는다. 이미 완료한 계약·위협·보상은 다시 열지 않는다. 직접 요청한 반복 의뢰는 조건 확인 후 가능하다. 새 의뢰의 실제 전투 또는 평화를 위협하는 돌발 사건 규칙은 유지하되 같은 습격·적재물 사고를 반복하지 않는다. 제안만으로 수락·성과·보상을 확정하지 않는다.';
  }
 }
 if(threads.some(t=>t.phase==='respond_to_existing_threat')){
  const dialogue=(state.scene?.dialogue||[]).slice(-3).map(d=>({speaker:d.speaker,text:d.text.slice(0,240)}));
  const choices=(state.scene?.choices||[]).slice(0,4).map(c=>c.text);
  if(!focus.previous_beat&&(dialogue.length||choices.length))focus.previous_beat={dialogue,choices};
  focus.pacing_rule='명시한 조사·전달·후속 확인은 가능한 범위에서 한 턴에 연결한다. previous_beat의 보고·선택을 표현만 바꿔 반복하지 않는다. 이미 대응·지원한 뒤 게임 시간이 흘렀다면 NPC의 진행 결과나 구체적인 장애·위기 변화·새 결정으로 이어간다. 흔적만 조금 추가하고 같은 대기·추가 진술을 반복하지 않는다. 접근 불가·증거 부족은 구체적 이유와 다른 대응을 제시하며 발견·구조·성공은 보장하지 않는다. 핵심 위험 대응은 플레이어에게 남긴다.';
  focus.handoff_rule='도움 요청 뒤 더 숙련된 사람·추가 확인만 연쇄로 붙이지 않는다. 실제 가능한 처리 방법·담당자의 직무·소요·불가 근거를 구체화하고 근거 없는 전문가·능력을 만들지 않는다. 출처·범인 미확인과 현재 피해 위험을 구별한다. 안전 처리의 실제 증빙 없이 resolve하지 않으며, 미확인 정체를 기존 계약의 새 완료 조건으로 덧붙이지 않는다. 후속 조사는 별도 선택이고 최초 위협·계약 조건은 유지한다.';
  focus.report_rule='completion_gate=unresolved_threat이면 근무 인계·중간 보고와 의뢰 완료를 구분한다. 목표 수행만으로 report/보상·완료 보고 선택지를 내거나 미해결 사건을 별건으로 떼어 완료하지 않는다. 남은 위협에 실제 대응하고 검증된 해결·후일담을 기록한 뒤 완료 보고한다. 검증 통과를 위해 해결을 날조하지 않는다.';
 }
 return focus;
}
