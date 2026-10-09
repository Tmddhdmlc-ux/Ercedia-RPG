export const craftingAttemptInstruction="[기본 제작 한 응답 완성] 정식 장인 위탁과 단독·독학 제작을 구분하세요. 단독 하급 검 등 기본 제작은 조건 부족을 나열하지 말고 흔한 재료·임시 도구·작업법을 장면에서 마련해 같은 응답에서 완성·획득까지 처리하세요. 재료 탐색·도구 확보·연습·손잡이 작업을 각각 다음 턴으로 넘기거나 모형만 만들고 끝내지 마세요. 단독 의도를 위탁·구매로 교체하지 마세요. 제작 과정은 1~3문장, 게임 속 시간은 한 번에 정산하고 실제 대기는 요구하지 마세요. 단독 기본 제작의 일반 재료·도구·공정은 GM이 상황에 맞게 구성할 수 있고 정식 위탁의 시설·장인·제작법·전리품 수량을 필수 조건으로 강제하지 않습니다. 완성 결과는 목표에 맞는 등록 하급 장비 ID를 사용해 기존 소지품을 유지한 전체 inventory에 1개 추가하세요. 이는 service 견적 정산과 별개인 독학 제작 결과이며 위탁 비용·소모를 중복 정산하지 않습니다. 실제 수련 성과의 XP는 engine_events practice로 한 번 반영하세요. 임의 능력치는 만들지 말고 실제 학습한 새 기술은 learn_custom_skill로 기록하세요. 실패를 나열하고 모든 변화 없음으로 끝내지 말고 대체 방식으로 성사시키세요. ";
export function isCraftingAttempt(action){
  const text=String(action||'');
  if(!/제작|단조|검.{0,20}만들|무기.{0,20}만들/.test(text))return false;
  if(/시도|제작해|제작한다|제작하겠|제작을 한다|만들어|만든다|만들겠다|단조해|단조한다|진행|해봐/.test(text))return true;
  return !/방법|조건|비용|알려|설명|가능|견적|있나|있어|\?/.test(text);
}
export function validateCraftingAttempt(state,action,scene){
  if(!isCraftingAttempt(action)||scene.battle)return;
  const text=scene.dialogue.map(d=>d.text).join(' ');
  const failed=/실패|불가|할 수 없|만들 수 없/.test(text)&&/미보유|부재|미충족|부족|없/.test(text);
  if(!failed)return;
  const prior=state.gameState||{},timeChanged=['date','time'].some(k=>scene.game_state?.[k]!==undefined&&scene.game_state[k]!==prior[k]);
  const workRecorded=['engine_events','world_events','system_events','life_events','quest_events'].some(k=>scene[k]?.length);
  const changedWork=scene.inventory&&JSON.stringify(scene.inventory)!==JSON.stringify(state.inventory);
  if(!timeChanged&&!workRecorded&&!changedWork)throw Error('제작 시도를 조건 부족만으로 종료했습니다. 단독·독학 의도를 유지해 가능한 준비·임시 작업을 실제 수행하고 경과 시간과 작업 진척을 기록하세요. 정식 위탁 조건으로 시도 자체를 금지하지 마세요.');
}
