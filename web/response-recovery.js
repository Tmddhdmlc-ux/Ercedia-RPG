// Repair requests repeat the same uncommitted action, never a new game turn.
export const MAX_AUTO_REPAIRS=2;
export function repairInstruction(request,error){
  const reason=String(error?.message||error).slice(0,2000);
  return `\n\n응답 수정 요청 ${request.repairAttempt}/${MAX_AUTO_REPAIRS} · 원래 행동 ID ${request.rootRequestId}\n직전 응답은 검증 오류로 적용되지 않았습니다: ${reason}\n새 행동이나 추가 턴을 진행하지 말고 위의 원래 행동에 대한 응답만 수정하세요. 현재 상태는 오류 응답을 받기 전 상태입니다. 위 현재 상태의 HP·MP·능력치·장비·기술·보상 원장을 기준으로 오류를 바로잡고, scene_id는 새 값, reply_to="${request.requestId}"로 출력하세요. 유효한 기존 사건 ID는 유지하고 이미 지급된 보상을 다시 지급하지 마세요. 일반 장면은 변경되지 않은 player/inventory/game_state를 생략하고 엔진 보상을 중복 작성하지 마세요. 예외: battle이 있으면 변경 없는 inventory도 포함하여 종료 player/inventory/game_state 세 필드 전체가 반드시 필요합니다. BATTLE_SCHEMA 필수 증빙과 실제 종료 상태를 출력하고 전리품 추첨은 UI에 맡기세요. ercedia_scene JSON 코드블록 하나만 출력하세요.`;
}
