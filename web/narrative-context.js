import {lifeEventInstruction} from './npc-life.js';
import {resolveNPC,npcPublicRole} from './npc-model.js';

// A public, read-only scene focus. It never adjudicates dialogue or creates world events.
export const narrativeInstruction='[장면 서술] NARRATION_RULES.md 적용. 현장 NPC는 직접 대사 중심(대화60%·묘사40% 체감)으로 직무·성격·말투·감정을 보여주세요. 독행·무언의 대치에는 화자를 억지로 만들지 마세요. 직전 결과에서 이어가고 결정한 실행을 준비·조건 확인으로 되돌리지 마세요. 중요한 새 위험·미승인 비용·관계 선택 앞에서는 멈춥니다. HUD의 날짜·시각·지명 대신 바뀐 감각·행동·반응을 보여주세요. 해결한 위협은 재시작하지 말고 보호한 사람의 반응·남은 피해·다음 만남의 이유를 실제 기록 안에서 이어가세요. NPC의 미지 사건·속마음·GM 판정·원장·ID·엔진 설명은 대사에 누설하지 마세요. 일상은 짧게, 감정·갈림길은 충분히. 선택지는 다음 행동. NPC 대사의 speaker_id는 npc 또는 cast에 포함하세요. 장면 위치는 행동 종료 장소입니다. 이동 전 작별은 나레이션의 간접화법으로 남기고 출발지 인물을 npc/cast에 넣지 마세요. 도착지에 실제 화자가 없으면 npc=null, cast 생략. ';

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
  if(dialogue.length||choices.length)focus.previous_beat={dialogue,choices};
  focus.pacing_rule='명시한 조사·전달·후속 확인은 가능한 범위에서 한 턴에 연결한다. previous_beat의 보고·선택을 표현만 바꿔 반복하지 않는다. 이미 대응·지원한 뒤 게임 시간이 흘렀다면 NPC의 진행 결과나 구체적인 장애·위기 변화·새 결정으로 이어간다. 흔적만 조금 추가하고 같은 대기·추가 진술을 반복하지 않는다. 접근 불가·증거 부족은 구체적 이유와 다른 대응을 제시하며 발견·구조·성공은 보장하지 않는다. 핵심 위험 대응은 플레이어에게 남긴다.';
  focus.report_rule='completion_gate=unresolved_threat이면 근무 인계·중간 보고와 의뢰 완료를 구분한다. 목표 수행만으로 report/보상·완료 보고 선택지를 내거나 미해결 사건을 별건으로 떼어 완료하지 않는다. 남은 위협에 실제 대응하고 검증된 해결·후일담을 기록한 뒤 완료 보고한다. 검증 통과를 위해 해결을 날조하지 않는다.';
 }
 return focus;
}
