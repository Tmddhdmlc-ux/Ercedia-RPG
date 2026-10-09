# 의뢰 브리지 v1 — UI 1.6.0

## 지역 에픽 확장 — UI 2.1.15

`REGIONAL_EPIC_QUESTS.md`와 `quests/regional_epic_quests.json`의 등록 시드를 사용한다. 검증된 일반 의뢰 5개 완료 또는 독립적인 지역 호감도 30이면 제안 자격이 열린다. 수락·완료·보상은 기존 의뢰 사건 검증을 그대로 거친다. 개인 NPC 호감도와 국가 명성은 지역 호감도가 아니다.

에픽 제안은 `id=epic_id=등록된 에픽 ID`, `rank="EPIC"`, 해당 `region_id`를 포함한다. 솔브린 마을은 `settlement_id="W3-SOLBRIN"`를 사용한다. 일반 의뢰도 실제 마을 실적이면 같은 태그를 포함하며 반복 파밍은 `repeatable=true`로 표시한다. 에픽 자체와 반복 파밍은 일반 의뢰 해금 실적에서 제외한다. 완료 ID와 보상 사건 기록은 기존 `quest_log`와 `quest_event_ids`에 보관한다.

보상은 원본 지역별 후보 중 한 개만 `reward.item_ids`에 지정한다. 마을 시드는 등록된 유니크 이상 장비·기술서 한 개를 사용하며 신물은 제외한다. 원본에 없는 경험치·재화·재료·개인 호감도 보상을 추가하지 않는다. 실제 목표 증거와 발행자 보고가 확인되어야 기존 `claim_event_id`로 한 번 지급한다.

실제 도움·배신 등 공동체 평가 사건은 장면에 `locality_events=[{event_id,scope_id,delta,reason}]`로 기록한다. 최대 16개, delta는 -100..100 정수, reason은 실제 사건의 공개 근거다. scope_id는 13개 영주령 ID 또는 등록된 W3-SOLBRIN이며 실제 장면 지역과 일치해야 한다. 마을 사건은 실제 솔브린 마을 장면만 허용한다. 같은 사건을 반복 적용하지 않으며 변경된 동일 ID는 거절한다. 세이브의 `local_reputation={affection:{},events:{}}`에 별도로 보존한다. 설정 읽기 확인 응답에서는 이를 출력하지 않는다.

기존 ercedia_scene/schema_version=1에 다음 선택 필드를 추가한다. 원본 세계관·템플릿·NPC 조건은 QUEST_SYSTEM.md 및 quests/quest_templates.json을 따른다. 장면의 설명문은 목표 증거가 아니다.

## 제안 및 조건 협상

`quest_updates`는 최대 20개의 전체 의뢰 제안 객체. 고유 id, title, summary, origin(guild_board/personal_npc/dynamic_event), type(hunt/escort/delivery/gather/investigate/dungeon/repair/diplomacy/training), status=offered, rank(F/E/D/C/B 또는 null), region_id(W1~W5/E1~E4/S1~S4), issuer_npc_id/issuer_faction_id/issuer_name, target_location_id, deadline_at, objectives, reward를 사용한다. 수락 전 제안만 협상으로 교체할 수 있다. 수락한 목표·보상은 임의로 덮어쓰지 않는다. 다른 계약은 새 ID로 제시한다.

```json
{
  "id":"personal-serin-001","title":"곡창 입구 조사","summary":"현재 확인된 공개 내용만 기록",
  "origin":"personal_npc","type":"dungeon","status":"offered","rank":"F","region_id":"W3",
  "issuer_npc_id":"serin","issuer_name":"세린","target_location_id":"DUN-W3-01","deadline_at":"1-1-10",
  "objectives":[{"id":"entry","description":"잿빛 곡창 입구 진입 확인","current":0,"target":1,"verification":{"kind":"dungeon_enter","target_id":"DUN-W3-01"}}],
  "reward":{"xp":14,"currency":5,"item_ids":[],"materials":[],"affection_effects":[]}
}
```

위 수치와 계약은 검증용 예시이며 공식 의뢰나 자동 지급 목록이 아니다. 최초 게임에서 빈 의뢰 목록을 표시한다. 발행자는 상황과 관계를 고려해 GM이 정한다. 13영지 게시 창구는 공식 길드 본부·지부 추가를 의미하지 않는다.

## 수락·거절·실패·포기·보고

`quest_events=[{event_id,quest_id,kind,reason}]`. kind는 accept/decline/fail/abandon/report. UI 버튼은 GM에게 행동을 전송할 뿐 로컬 수락이나 완료를 확정하지 않는다. NPC가 실제 수락을 확인해야 accept. accepted는 다음 실제 장면에서 active로 이행하며 목표를 모두 검증하면 ready_to_report. 보고는 실제 발행자 NPC 또는 해당 영지 창구에서만 허용한다.

report 장면은 `player/inventory/npc_updates`를 생략한다. UI가 약속된 보상을 원자적으로 계산하고 지급하기 때문이다. 보상 XP는 기존 PROGRESSION 전투 성장 함수를 사용하며 경지 돌파·능력치 자동 배분·기술 습득을 만들지 않는다. 재화는 save.currency, 단일 호감도는 save.relationships[npc_id].affection(-100~100)에 저장한다. 아이템은 실제 장비·책·전리품 카탈로그 ID만 허용한다. 아이템 수량·인벤토리 여유 공간을 확인하고 지급 실패 시 장면 전체를 반영하지 않는다.

최종 claim_event_id는 report.event_id. quest_event_ids는 보상과 증거의 중복 방지 기록으로 저장하며 최대 10,000개 도달 시 삭제 대신 새 정산을 중지한다. 완료 의뢰를 다시 보고하거나 같은 사건 ID로 새 스냅샷을 덮어쓰는 것을 거절한다.

## 실제 사건 증거

`world_events=[{event_id,kind,target_id,location,proof,quantity?,recipient_id?,subject_alive?}]`, 최대 50개. scene.game_state.place 또는 scene.location과 일치하는 실제 사건 장소·구체적인 증거가 필요하다. 게임 마스터가 실제 판정·게임 진행에 따라 생성하는 구조화 기록이며 UI 자체가 독립적으로 던전이나 조사를 시뮬레이션하지 않는다.

- battle_win: GPT가 만들지 않는다. 검증된 전투가 완료·건너뛰기로 정산된 뒤, 실제 적 HP=0이고 아군 승리인 경우 UI가 battle_id와 적 ID를 결합한 증거를 만든다. 다시보기는 진행도를 추가하지 않는다.
- dungeon_enter/dungeon_clear: 등록된 실제 던전 ID와 던전 ID/이름으로 저장된 실제 장소 필요. 내러티브만으로 목표가 바뀌지 않는다.
- gather: 등록 재료 ID와 실제 인벤토리 증가 필요. GM이 사건을 누락해도 실제 획득 스냅샷/브리지 갱신에서 자동 확인한다.
- delivery: 실제 인벤토리 감소와 지정 recipient_id 필요. 목표 verification.recipient_id를 사용할 수 있으며 없으면 발행자 NPC가 수령인이다.
- escort: 목적지의 실제 도착 기록과 subject_alive=true 필요.
- clue/action: 실제 획득 단서 또는 수행한 구호·복구·중재·훈련의 고유 target_id와 proof를 기록한다. 자유 대사에서 완료 주장만 한 것은 증거가 아니다.

목표 verification은 `{kind,target_id,recipient_id?}`. current/evidence_ids는 UI가 갱신한다. 이미 수락한 의뢰에만 사건을 반영하고 과거 사건으로 새 의뢰를 소급 완료하지 않는다. 실제 날짜는 CALENDAR_EVENTS의 360일 달력(년-월-일)을 따르며 현재 날짜가 기한 뒤면 expired. 문자열 날짜가 해석되지 않으면 날짜를 발명하지 않고 원문 기한을 표시한다.

## 저장 및 호환

quest_log/quest_event_ids/currency/relationships는 기존 저장 v1의 선택 확장이다. 기존 데이터가 없으면 UI는 빈 목록으로 읽으며 이전 저장 키를 임의 생성해 런처 복원 비교를 깨지 않는다. getQuestLog는 브리지 v1의 추가 읽기 기능. 의뢰 변경은 updateScene의 동일 검증 경로를 따른다. 기존 game_state.quests 문자열 로그는 별도로 보존한다.

이전 런처 1.1.6에서도 일반 요청·의뢰 행동을 전송한다. 새 게임 전체 파일 자동 첨부는 1.1.7 기능이다. 1.1.6에서는 GitHub 고정 SHA 원문 링크와 시작 안내를 자동 전송하며, GPT가 모든 설정을 실제 열람했다고 가정하지 않는다.

## 플레이테스트 수정 — UI 2.1.81
일반 현지 의뢰의 ID·목표·금액은 GM이 실제 상황과 발주자 예산으로 구성할 수 있다. 미리 등록된 의뢰 ID가 없다는 이유로 조회를 거부하지 않는다. 노동 운반·정찰·복구는 실제 작업의 `action` 목표와 증거를 사용한다. 소지 화물의 인계일 때만 `delivery`와 등록 물품 감소를 사용한다. 수락과 작업이 같은 응답에 있으면 수락을 먼저 적용하고 그 이후 수행한 증거를 확인한다.

새 게임 턴에서 제안한 신규 의뢰는 `story_required=true`로 저장한다. `story_events=[{event_id,quest_id,kind:"threat",description,protected}]`는 실제 수락한 의뢰의 돌발 위협과 보호 대상을 공개 기록하고 가능한 대응 선택지를 제시한다. 플레이어 대응 후 별도 장면에 `{event_id,quest_id,kind:"resolve",threat_id,description,protected}`로 해결·후일담을 기록한다. 같은 장면의 신규 위협을 자동 해결할 수 없다. 모든 위협이 해결되어야 report 보상을 정산한다. 실제 전투는 기존 battle 검증을 그대로 거치며 story_events 자체가 피해·승리·성장을 지급하지 않는다. 저장의 quest_log.story와 quest_event_ids에 기록하고 중복 적용을 거절한다. 기존 저장의 수락 계약·완료 보상은 소급 변경하지 않는다.

의뢰 kind 선택지는 이번 quest_updates 또는 현재 quest_log의 quest_id를 연결한다. 단순 일거리 문의는 dialogue/action이다. 대사와 gm_rulings만으로 보상을 지급하지 않는다. 계약과 후속 결과 판정은 서로 다른 gm_rulings.id로 남긴다. 기술서·장비는 경제 기준가 키가 아니라 원본 물품 ID를 사용한다.
