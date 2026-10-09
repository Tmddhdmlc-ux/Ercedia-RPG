# 던전 정예·보스 전용 원화

26개 기존 던전의 정예 26종과 보스 26종을 각각 투명 PNG로 제작한다. 기존 마수 원화는 스타일·종의 외형 참고용이며 덮어쓰지 않는다. 전투 수치·종 ID·드롭·출현 조건은 기존 등록을 유지한다.

- 제작 도구: 내장 `image_gen`, 각 개체마다 별도 생성 호출.
- 실제 사용 프롬프트·참고 원화·최종 저장 경로: `production-plan.json`.
- 이미지 크기·SHA-256·종 연결: `characters/dungeon_monster_art.json`.
- PNG 디코딩·RGBA·실제 알파·잘림·중복 검사: `verification.json`.
- 52종 원화 모음: `tests/dungeon-monster-gallery.html`.

전투 UI는 검증된 참가자의 `dungeon_foe_id`로 전용 원화를 선택한다. 참가자의 `catalog_id` 및 `art.id`는 원본 종 ID를 유지하며, 일반 마수와 기존 저장 전투는 원본 종의 원화를 사용한다. 다른 종의 보스 원화를 빌려 쓰지 않는다. 실제 ChatGPT/Tampermonkey 플레이 화면 검증과 코드 검증은 구분한다.
