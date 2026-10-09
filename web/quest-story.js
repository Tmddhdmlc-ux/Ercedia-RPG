// Approved episode pacing, shared by full and compact GM requests.
export const questStoryInstruction='[의뢰·사건 필수 서사] QUEST_STORY_RULES.md 적용: 모든 의뢰와 사건 에피소드에 실제 전투 또는 평화를 위협하는 예상치 못한 사건을 최소 한 번 반드시 발생시키세요. 단순 운반·인계·보상만으로 끝내거나 새 위협을 자동 후처리로 생략하지 마세요. 구체적인 보호 대상과 위협·단서를 보여주고 전투/조사/협상/구조/철수 등 실제 가능한 대응을 선택하게 하세요. 같은 도적 습격을 반복하지 말고 현지 등록 인물·지역 사정으로 원인과 결과를 달리하세요. 평화적 해결도 실제 조건·증거가 필요하며 자동 승리·강제 희생·비밀 누설을 금지합니다. 대응 뒤 NPC 반응·공개 후일담·실제 기억을 남기고 해결한 위협은 다시 초기화하지 마세요. 이미 수락한 목표·보상과 완료 기록은 유지하며 추가 보상을 중복 지급하지 마세요. 평온한 일상은 매 클릭마다 위협을 강제하지 않습니다. ';
export function hasActiveQuestStory(state){
  return (state.quest_log||[]).some(q=>['accepted','active','ready_to_report'].includes(q.status));
}
