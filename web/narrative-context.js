import {operatingRules} from './gm-turn-policy.js';
import {lifeEventInstruction} from './npc-life.js';
import {resolveNPC,npcPublicRole,npcCatalog} from './npc-model.js';

// A public, read-only scene focus. It never adjudicates dialogue or creates world events.
export const narrativeInstruction=operatingRules;

// Retrieval hints from recorded action labels, never inferred dialogue facts.
function conversationMemories(memories){
 const introduction=m=>/자기소개|이름.*소개|호칭/.test(m.action||'');
 const boundary=m=>/악수.*거절|접촉.*경계|인사.*선호|참여.*보류|선호|약속/.test(m.action||'')||Boolean(m.follow_up&&m.action!=='첫 만남');
 const correction=m=>/공유 사실 정정|수행 판단 정정/.test(m.action||'');
 const anchors=[memories.filter(introduction).at(-1),memories.filter(boundary).at(-1),memories.filter(correction).at(-1)].filter(Boolean);
 const selected=new Set([...anchors,...memories.slice(-2)]);
 return memories.filter(m=>selected.has(m)).map(m=>({npc_id:m.npc_id,date:m.date,action:m.action,...(typeof m.result==='string'?{result:m.result.slice(0,180)}:{}),...(typeof m.follow_up==='string'&&m.follow_up?{follow_up:m.follow_up.slice(0,120)}:{})}));
}

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
 // A named reunion target is context, not an actor already present at the destination.
 const requested=npcCatalog.filter(n=>!present.has(n.id)&&n.role!=='monster'&&resolveNPC(state,n.id)?.location_id===state.gameState?.region&&[n.id,n.name,n.name?.split(' ')[0]].some(name=>typeof name==='string'&&name.length>=2&&action.includes(name))).slice(0,3);
 if(requested.length){
  const ids=new Set(requested.map(n=>n.id));
  const shared=(state.npc_life?.memories||[]).filter(m=>ids.has(m.npc_id)&&m.player_witnessed===true);
  focus.requested_people={voices:requested.map(n=>({id:n.id,name:n.name,...(npcPublicRole(n.id)?{public_role:npcPublicRole(n.id)}:{}),...Object.fromEntries(['duty','personality','speech_style'].filter(k=>typeof n[k]==='string'&&n[k]).map(k=>[k,n[k]]))})),shared_memories:requested.flatMap(n=>conversationMemories(shared.filter(m=>m.npc_id===n.id))),knowledge_rule:'requested_people는 이번 입력에서 찾거나 언급한 현지 등록 인물 후보다. 현장 존재·만남·동행·현재 표정은 확정하지 않는다. 실제 만나면 해당 공개 말투와 공유 기억을 잇는다. 플레이어가 따로 한 수선·거래·수련의 과정·가격·성능은 직접 보여주거나 전달한 범위만 안다. 이전 점검을 권했다는 이유로 나중에 확인한 손상을 전에 직접 보았다고 말하지 않는다. 목격·공유되지 않은 기억과 다른 인물의 결과는 공개하지 않는다.'};
 }
 // Anchor ordinary short replies as well as danger responses. This is context,
 // not an inferred promise, accepted contact or new relationship state.
 if(voices.length){
  const dialogue=(state.scene?.dialogue||[]).slice(-6).map(d=>({speaker:d.speaker,...(d.speaker_id?{speaker_id:d.speaker_id}:{}),text:d.text.slice(0,240)}));
  const choices=(state.scene?.choices||[]).slice(0,4).map(c=>c.text);
  if(dialogue.length||choices.length)focus.previous_beat={dialogue,choices};
  const shared=(state.npc_life?.memories||[]).filter(m=>present.has(m.npc_id)&&m.player_witnessed===true);
  const memories=voices.flatMap(v=>conversationMemories(shared.filter(m=>m.npc_id===v.id)));
  if(memories.length)focus.shared_memories=memories;
  const reported=(state.quest_log||[]).filter(q=>q.status==='completed'&&q.claim_event_id&&q.visibility!=='private'&&present.has(q.issuer_npc_id)).slice(-2).flatMap(q=>(q.story||[]).filter(e=>e.kind==='resolve').slice(-1).map(e=>({npc_id:q.issuer_npc_id,quest_id:q.id,title:q.title,knowledge_basis:'final_report_to_issuer',event_id:e.event_id,result:e.description.slice(0,600)})));
  if(reported.length){focus.reported_outcomes=reported;focus.recall_rule='reported_outcomes는 해당 발행자에게 최종 보고된 공개 결과다. 직접 목격·타인의 지식으로 바꾸지 않고 실제 기여와 남은 제한을 유지한다. 매번 칭찬·완료 요약으로 재생하지 않는다.';}
  focus.interaction_rule='직전 제안·질문·접촉 시도에 이번 말·행동으로 반응한다. 이미 이해·동의한 설명은 새 질문·오해·상황 변화가 없으면 다시 가르치지 않는다. 화제를 바꾸거나 작별하면 그 의도를 받되 위험·비용의 필요한 고지는 유지한다. 인물이 턴 중 퇴장해 최종 현장에 없으면 인사는 간접 서술로 남기고 직접 화자·npc/cast에서 제외한다. 직접 본 이동과 확인된 목적지는 life_events move의 region/place/activity와 현재 scene 출처·날짜로 함께 기록해 위치를 갱신한다. 행방 미확인은 추정하지 않는다. 짧은 답·거절·침묵을 새 의뢰로 바꾸지 않는다. 제안은 수락이 아니며 동의 없는 접촉·감정은 확정하지 않는다. 공유 기억은 해당 인물의 실제 경험이고 매번 설명·칭찬으로 재생하지 않는다.';
  focus.reply_choices_rule='보류·거절한 활동은 본문과 choices 모두에서 존중한다. 준비·연습·조건 확인으로 말만 바꿔 다시 권하지 않는다. 플레이어가 다시 요청하거나 실제 새 사정이 생겼을 때만 재논의한다. previous_beat.choices는 지난 제안이지 반드시 이어갈 메뉴가 아니다. 중요한 새 갈림길이 없고 대화만 이어가는 턴은 choices=[]로 자유 입력을 남길 수 있다. 현재 위험·기존 계약 의무를 숨기거나 실제로 요청한 활동을 막지는 않는다.';

  focus.heard_information_rule='플레이어가 다른 인물에게 이름을 소개받았다고만 말하면 그와 나눈 구체적인 안내·조건·가격까지 이 화자에게 전한 것은 아니다. 현재 화자는 이번에 직접 전한 내용과 자신의 목격·수신 기록만 이어받는다. 스스로 할 수 있는 조언은 자기 판단으로 말하고, 전하지 않은 조언을 다른 인물이 말했다고 귀속하지 않는다. 중요한 사건의 안전·피해 결과를 직접 전해 들었다면 처음에는 몰랐고 이번에 알게 된 범위를 유지한다. 다음 만남에도 필요한 새 결과는 기존 experience/affection_delta=0으로 기록하되 전하지 않은 경위·타인의 속마음은 덧붙이지 않는다.';
 }
 if(voices.length||requested.length){
  focus.prose_knowledge_rule='지식 제한은 인물이 실제로 아는 만큼 묻고 답하는 방식으로 지킨다. 선택권·거절·접촉 경계도 실제 말과 행동으로 지킨다. 지문에 강요·의례·접촉·수락·추가 일이 없었다고 규칙 준수 여부를 검수하는 해설을 덧붙이지 않는다. 제안에 대한 플레이어의 응답은 비워 두고 NPC가 실제로 한 행동만 쓴다. 직접 질문받은 조건·지식 한계와 인물 자신의 거절·의도는 자연스러운 대사로 답할 수 있다. 실제 압박이나 거절로 달라진 행동은 묘사하며 단어를 금지하거나 경계·위험 정보를 숨기지 않는다. 해설을 생략해도 동의 없는 행동·감정·계약이나 미전달 지식은 확정하지 않는다.';

  focus.scene_entry_rule='입력은 도착 뒤에도 다시 요약하지 말고 상대의 직접 답이나 달라진 현장 반응부터 잇는다. previous_beat의 몸짓·감각은 태도나 상황 변화에 필요할 때만 이어 쓴다. 단어를 금지하거나 새 몸짓으로 매번 대체하지 않는다. voices의 공개 말투·직무와 실제 제안·거절에 맞춰 반응하며 없는 성격·사정을 만들지 않는다.';
  focus.reply_pacing_rule='농담·맞장구와 실제 설명 요청을 문맥으로 구별한다. 작별·감사·안부에는 인물 자신의 답과 현재 사정으로 반응한다. 끝낸 활동의 기억이 있어도 평가를 요청하거나 새 문제가 드러나지 않으면 성과·태도 평가와 교훈으로 대화를 마감하지 않는다. 이미 답한 가격·지식 한계를 복습해 농담을 설명으로 바꾸지 않는다. 같은 생각의 답과 받아치기는 한 호흡의 발화로 잇는다. 지문은 말과 다른 의미의 망설임·행동 전환에 쓰며 시선·손·잔 위치만 바꿔 발화를 끊지 않는다. 이미 웃음이나 장난스러움이 드러났으면 입술·어깨·시선으로 같은 태도를 다시 증명하지 않는다. 말을 이어가기 위해 동작을 덧붙이지 않으며 반응의 새 국면일 때 지문을 쓴다. previous_beat의 교대 구조를 복제하지 않는다. 새 질문·오해·변화에는 설명하고 감정·대치·상세 요청은 펼친다. 발화 수는 고정하지 않는다.';
 }
 if(voices.length||requested.length||/여관|개인실|객실|침실|진료소|기도실|작업장|시설|실내/.test(action+' '+(state.scene?.location||'')))focus.scene_image_rule='실제 세부 장소의 내부·외부에 맞는 등록 원화만 사용하고 없으면 null. IMG-SHARED-01의 공용 여관 내부를 개인실·객실·침실로 쓰거나 거리 외관을 실내로 쓰지 않는다. 같은 시설·지역·등록 ID만으로 구역 원화를 대신하지 않는다.';
 if((voices.length||requested.length)&&/서운|속상|실망|불쾌|화가|마음.{0,6}상/.test(action))focus.emotional_response_rule='직접 전한 서운함·불만에는 인물 자신의 구체적인 책임과 들은 감정으로 반응한다. 이미 바로잡은 사실은 필요한 만큼 확인하되 같은 사과·잘못을 여러 발화로 되풀이하거나 일반 교훈으로 대신하지 않는다. 실제 방어·갈등·새 입장은 펼치며 변명·용서·납득을 자동 보장하지 않는다. 플레이어가 받아들였는지는 다음 대응에 남긴다.';
 if(Object.keys(focus).length)focus.knowledge_rule='기록·주변 명부가 만남·목격·NPC 지식을 확정하지 않는다. 플레이어가 혼자 한 제작·수련·거래는 NPC가 현장에서 보거나 직접 전해 들은 기록이 없으면 대사에서 아는 사실로 말하지 않는다. selected가 이번 행동의 의뢰이고 background는 참고만 한다. 완료된 의뢰는 다시 수락·지급·위협 발생 단계로 되돌리지 않는다.';
 if(voices.length)focus.role_rule='public_role은 등록된 공개 직무다. 사제·치료사 등에게 상황만으로 경비 지휘권이나 다른 직업을 부여하지 않는다. 임시 도움은 실제 경위와 직무 범위에서 서술한다. 저장의 잘못된 직무 묘사는 설정을 대체하지 않는다.';
 if(voices.length)focus.life_event_rule=lifeEventInstruction;
 if(voices.length)focus.contribution_rule='칭찬·회상은 실제 화자·수행자별로 구분한다. NPC 설명을 플레이어의 첫 답으로 옮기지 않는다. 경고·전달·준비 지원을 발견·구조·치료·고정 작업으로 바꾸지 않는다. 공동 기여를 유지하며 목표·희망만으로 성공을 보장하지 않는다.';
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
  focus.resolution_rule='resolve는 기록된 보호 대상의 실제 피해 위험이 해소됐는지 판정한다. 해체·범인 규명만 유일한 해결로 삼지 않는다. 접촉·피해 경로의 물리적 차단, 담당자의 지속 관리 인계, 보호 대상의 노출 해소가 실제 확인되면 그 범위의 해결 근거와 남은 제한을 기록할 수 있다. 표지·임시 상자·막연한 인계만으로 해결하지 않는다. 통제 실패·피해 경로가 남으면 구체적으로 밝히고 위험을 유지한다. 원래 계약이 장치 해체·범인 규명을 요구했다면 그 목표를 생략하지 않는다.';
  focus.report_rule='completion_gate=unresolved_threat이면 근무 인계·중간 보고와 의뢰 완료를 구분한다. 목표 수행만으로 report/보상·완료 보고 선택지를 내거나 미해결 사건을 별건으로 떼어 완료하지 않는다. 남은 위협에 실제 대응하고 검증된 해결·후일담을 기록한 뒤 완료 보고한다. 검증 통과를 위해 해결을 날조하지 않는다.';
 }
 if(voices.length||requested.length)focus.memory_recording_rule='실제 대화에서 새로 공유한 이름·호칭·접촉 경계·지속될 약속·선호가 다음 만남의 반응에 필요하면 기존 life_events kind=experience로 그 인물의 직접 들은 내용과 실제 응답을 기록한다. source_id=scene:<이번 scene_id>, npc_id=실제 현장 등록 인물, date/location=이번 실제 시공간, action/result와 reason은 실제 화자·발언별 관측 내용만, player_witnessed=true. 호감 변화의 별도 사건 근거가 없으면 affection_delta=0, participants=[]이며 다른 인물에게 자동 공유하지 않는다. 질문·제안·희망을 수락·계약·능력·성공으로 기록하지 않고 모호한 말의 진의나 사적 속마음을 추측하지 않는다. 이전 공유 사실·수행 판단의 오류를 실제 목격·기록과 대조해 함께 바로잡았다면 action=공유 사실 정정으로 잘못된 회상과 확인된 사실을 result에 남긴다. 플레이어의 주장만으로 사실을 확정하지 않고 확인되지 않은 부분은 미확인으로 둔다. 현재 작업 진행이나 일상 설명만 확인한 대화는 지속될 새 약속·경계·자기소개가 아니므로 별도 experience를 만들지 않는다. 이미 저장한 같은 내용·일반 맞장구·반복 설명은 매 턴 새 기억으로 쌓지 않는다. 첫 만남은 자동 기록되지만 새 자기소개나 경계를 보존하는 기록을 대신하지 않는다.';
 if(requested.length)focus.arrival_memory_rule='이번 응답에서 실제로 새 인물을 만나 자기소개를 직접 주고받았다면, 이동 전 voices에 없던 도착지 인물도 그 대화를 직접 들은 현장 인물이다. 첫 만남 자동 기록은 만났다는 사실만 남기므로 직접 공유한 이름·호칭은 그 인물의 experience/action/result에 기록한다. 실제 만남과 발화가 성립한 뒤에만 memory_recording_rule의 현재 장면 출처·날짜·장소·호감0 원칙을 적용한다. 찾기 요청·명부·이동 계획만으로 만남이나 지식을 만들지 않는다. 플레이어 프로필의 이름을 읽었거나 NPC가 이름을 부른 것만으로 자기소개를 추정하지 않는다.';
 if(/재료상|상점|점원|가게|접수대|배급소|대장간|서점|여관|시설/.test(action+' '+(state.scene?.location||'')))focus.speaker_registration_rule='이번 행동 종료 장소에서 실제 만난 등록 인물만 직접 대사의 speaker/speaker_id와 npc/cast로 사용한다. 출발지 인물을 도착지 화자로 옮기지 않는다. 시설 담당자의 등록 신원이 확인되지 않으면 npc=null로 두고 업무 안내·견적은 나레이션의 간접화법으로 전달한다. 점원·담당자 같은 임의 화자 이름이나 그 인물의 ID·원화·표정·능력치를 만들지 않는다. 실제 등록 생활형 인물을 만나면 그 인물의 말투로 대화하며 일반 대화를 무조건 간접화법으로 바꾸지 않는다.';
 if(/연습|실습|수련|훈련|지도|배우/.test(action))focus.practice_interaction_rule='연습 시작은 아직 플레이어가 관찰 문제에 답하거나 새로운 방법을 선택한 것이 아니다. 처음 배우는 판단을 NPC가 시범 보인 뒤에는 실제 보이는 단서와 해볼 과제를 제시하고 플레이어의 첫 판단·방법 선택을 남긴다. 플레이어가 했을 오답·정답·생각을 대신 쓰며 수업 완료와 성과까지 넘기지 않는다. 이전 발화로 이미 구별한 원리를 새로 틀린 생각으로 되돌려 교정 장면을 만들지 않는다. 실패는 이번 실제 수행의 구체적 근거로 판정하며 과거 오답을 발명하지 않는다. 이미 답한 문제·확인한 방법을 다시 묻거나 준비 허락을 반복하지 않는다. 시간·횟수를 정해 끝까지 반복하겠다는 명시 요청이나 이미 선택한 단순 반복은 압축 진행할 수 있다. 모든 동작을 퀴즈로 나누지 않으며 완료 경험치는 실제 수행과 완료가 확인된 뒤 정산한다.';
 return focus;
}




