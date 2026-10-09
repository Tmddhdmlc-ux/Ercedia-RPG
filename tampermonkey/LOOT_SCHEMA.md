# 처치별 전리품 — 스키마 v1 선택 확장

원칙은 [LOOT_ACQUISITION.md](../LOOT_ACQUISITION.md), 제작은 [CRAFTING_SYSTEM.md](../CRAFTING_SYSTEM.md)를 따른다. 기존 bridge/state/scene 버전은 1을 유지한다.

GM의 새 마수 전투 `battle.outcome`에 `loot_mode: "per_kill_v1"`을 넣는다. `items_added: []`, `inventory`는 무작위 전리품을 제외한 전체 종료 소유품이다. 기존 전투 수치·종료 플레이어·사건 검증은 그대로 수행한다. UI가 생성할 `loot_rolls`를 응답에 넣지 않는다. 기존 `system_events.kind: loot`를 함께 넣지 않는다.

UI 생성 `loot_rolls` 영수증은 `participant_id`, `monster_id`, 실제 `dungeon_id` 또는 null, 1~10000의 `roll`, 분류 `category`, `item_id` 또는 null, `quantity`, `recoverable`을 포함한다. 전투 관전 시작 전 저장된 결과를 만들고 최종 종료 시 `world_engine.loot_claims[battle_id+":"+participant_id]`를 기록한다. 실제 처치 개체와 원본 풀·범위·수량·종료 인벤토리를 검증한다.

UI 저장의 선택 항목 `lootPopup`은 `{battle_id,copper,items:[{id,name,quantity,rarity?}],pending}`이다. `copper`는 실제 전투 정산 지갑 증가액이다. 지급 완료 원장과 끝난 원본 전투가 확인될 때만 팝업을 표시한다. 팝업 표시·닫기·다시보기는 지급 연산을 하지 않는다.

`clear_dungeon`은 처치별 모드에서 `material_id`, `optional_item_id`를 넣지 않는다. 기존 던전 증거·보스 확인·클리어 XP와 최초/반복 기록은 유지한다. 화폐는 기존 실제 출처 `cash_receipt`를 사용한다.
