# PATCH 07 — 의뢰

## 사전 확인
최신 main의 BOOTSTRAP.md와 QUEST_SYSTEM.md, quests/quest_templates.json, 현행 web/quest-model.js, web/quest-ui.js 및 기존 검증 기록을 읽는다.

## 구현 목표
기존 의뢰 탭·수락·진행·보고·보상·실패·포기·기한 처리를 유지. 토벌은 종료한 전투, 탐험은 실제 구역/던전, 채집은 실제 인벤토리 증가로 연결. 보상 1회.

## 적용 판정
기존 유지; 새 던전/전리품 사건 연결. 이미 구현되어 검증되는 경로는 그대로 사용하며 누락된 연결만 추가한다.

## 공통 완료 조건
- 기존 VN/Tampermonkey/브리지 v1/장면 v1/세이브 v1 유지.
- 오류가 난 턴은 주인공·인벤토리·재화·사건 원장을 변경하지 않는다.
- 같은 event_id는 단 한 번, 같은 ID의 내용 변경은 거절한다.
- 새 게임은 과거 진행을 명시적 백업 외 현재 상태에 섞지 않는다.
- 실제 상태 변화·저장 복원·중복·실패 경로 자동 검증 후 빌드한다.
- 실제 ChatGPT/설치된 Tampermonkey와 로컬 고정 GM 검증을 구분해서 기록한다.
- GitHub에 커밋하고 업로드 확인. 다음 순번은 선행 단계의 실제 인터페이스를 사용한다.

실행 코드: web/quest-model.js, web/quest-ui.js. 공통 추가 사건 규격은 [WORLD_ENGINE_SCHEMA](../tampermonkey/WORLD_ENGINE_SCHEMA.md). 검증: [순차 패치 기록](../tests/ORDERED_PATCHES_VERIFICATION.md).
