# 추가 세계 엔진 사건 — ercedia_scene v1 호환

화폐·상인 예산·재고·가격 변동·경매 판매자 정산은 최신 [ECONOMY_SCHEMA.md](ECONOMY_SCHEMA.md)가 아래 구형 경제 설명보다 우선한다. 모든 가격은 동화이며 일반 재화/금화 숫자로 해석하지 않는다.

선택 필드 `system_events`는 최대 32개다. 각 사건은 고유 `event_id`, `kind`, 실제 판정 근거 `reason`을 갖는다. 전투 판정·드롭 성공·가격·NPC 동의·연간 사건의 결과는 ChatGPT GM이 정한다. UI는 검증과 정산만 한다. 사건 오류가 있으면 턴 전체를 변경하지 않는다. 동일 ID의 내용 변경은 거절한다.

저장 `world_engine.version=1`은 기존 저장 v1의 선택 확장이다. 과거 저장에 없으면 첫 관련 사건에서 초기화한다. 새 게임은 별도 빈 세계 엔진을 만든다. 전투 장면에 붙은 사건은 재생 완료/건너뛰기 때만 확정한다. 브리지/런처 재설치는 필요 없다.

## 4. 전리품
`loot`: `battle_id`, `monster_id`, 선택 `participant_id`, `items:[{id,quantity}]`. 원본은 마수 **20종**, 재료 **40종**이다. 같은 종 여러 개체는 battle.participant의 서로 다른 id에 catalog_id=원본 마수 ID를 붙인다. loot는 participant_id로 실제 쓰러진 개체를 지정한다. 원본 종의 저장 HP를 새 개체 부상으로 복사하지 않으며 등록 기본 수치/원화를 검증한다. 현재 장면의 전투 또는 직전에 완료·저장된 전투에서 해당 마수가 적으로 참가해 HP 0이고 플레이어가 이겨야 한다. `items:[]`도 유효한 드롭 실패 판정이며 다시 추첨하지 않는다. 등록된 해당 종 재료와 원본 수량/판정 횟수만 허용한다.

전투 장면에는 outcome.items_added와 inventory에 동일 실제 재료를 함께 기록한다. UI는 이를 검증하고 지급 원장만 남긴다. 완료한 전투 뒤 별도 loot 사건이면 inventory를 넣지 말고 UI가 지급하게 한다. 이미 전투에서 받은 재료를 다시 지급하지 않는다. 가방이 가득 차면 전체 턴이 거절되어 원래 상태를 유지한다.

## 5–6. 던전
- `discover_dungeon`: dungeon_id. 실제 조사·소문 근거를 reason에 기록.
- `enter_dungeon`: dungeon_id, run_id. `game_state.region`은 실제 영주령, `game_state.place`/location은 던전 ID 또는 정식 이름. 첫 입구 진입 시 의뢰용 dungeon_enter 증거를 자동 생성.
- `enter_zone`: dungeon_id, zone_id. 앞선 필수 구역 해결 필요. optional 구역은 같은 장면 world_events clue/action에 zone_id 대상의 실제 증거가 있고 evidence_id가 일치해야 함.
- `resolve_zone`: dungeon_id, zone_id. entrance/event는 world_events clue/action의 evidence_id. combat/miniboss/midboss/boss는 실제 승리 전투 battle_id. 같은 전투를 다른 구역 증거로 재사용 불가.
- `retreat`: dungeon_id. 장면에는 실제 던전 밖 복귀 장소를 기록. 피해·마나·진행 기록 보존, 자동 회복 없음. 재진입 run_id는 동일.
- `respawn`: dungeon_id, evidence_id. repeatable 던전, 이전 클리어 이후 날짜, 같은 장면 world_events action의 실제 재출현 증거가 있어야 새 run을 시작할 수 있음. claimed는 지우지 않음.
- `clear_dungeon`: dungeon_id, 실제 보스 battle_id, material_id. 선택 보상은 optional_item_id, optional_reason. 26개 원본 보상표를 따른다. 필수 구역+보스 증거가 있어야 함. 재료 묶음의 source_material_ids는 후보이며 원본 quantity만 지급.

보스 전투와 clear_dungeon을 같은 장면에 넣을 경우 outcome XP/items_added와 player/inventory는 최초 클리어 패키지와 일치해야 한다. 별도 클리어 턴이면 보스 전투 자체의 XP/items_added는 0/빈 목록이고 clear_dungeon 턴에 player/inventory/추가 xp/report 보상을 넣지 않는다. UI가 패키지를 지급한다. 보스와 같은 전투에 loot를 중복 넣지 않는다. 완료 시 의뢰용 dungeon_clear 증거 자동 생성. 재출현 뒤 반복은 원본 XP 약 35%, 재료 1개, 선택 장비·책·최초 기록 재지급 없음.

## 9. 파티
`party`: members=[실제 NPC ID], 최대 6명. 선행 life_events companion으로 NPC 본인이 동행을 합의하고 현재 지역·장소에 실제로 있어야 하며 HP>0이어야 한다. 그 다음 파티 편성을 확인한다. 클릭 자체로 동행·편성 성공하지 않는다. 전투에는 현지 생존 파티원을 allied 참가자로 포함하고 GitHub/진행 중 수치를 사용한다. 자동전투 행동은 GM이 사전 판정한다. 주인공 이미지는 계속 숨긴다.

## 10. 국가·국경
- `reputation`: kingdom=west/east/south, delta 정수(-200~200), reason 실제 국가 공헌/범죄. 저장은 -100~100. 출신 국가만 초기 +10, 외국 0. 개인 호감도와 별도.
- `wanted`: kingdom, wanted boolean.
- `permit`: permit={id,kingdom,issuer_id,authority,purpose,valid_from,valid_until,guarantor? 또는 contract?}. 등록 NPC의 **실제 발급 권한을 GM이 확인**. 개인 친분만으로 권한을 발명하지 않음. 같은 증서 ID 재작성 불가.
- `border`: route_id=BORDER-WE-01/WS-01/ES-01, to=왕국, result=passed/inspection/refused/detained, open boolean, permit_id. 기본 합법 통과는 개방된 실제 연결 관문, 날짜에 유효한 증서, 수배 없음, 명성 -20 이상. 외국 초행·명성20 미만은 보증/공인계약 필요. 자국 귀환도 수배/봉쇄 확인. 성공 때만 game_state를 실제 목적지로 옮김. 불법 경로를 GM이 실제 성공 판정했다면 method=illegal, illegal_basis를 명시하고 후속 위험/명성은 별도로 기록. 이것은 자동 성공 옵션이 아님.

국가 공인 직함·실력·서클은 별개. 이 사건이 깨달음이나 공인 등록을 자동 부여하지 않는다. 동료/NPC의 국경 통행은 기존 NPC_LIFE_SCHEMA의 개별 move 증빙도 필요하다.

## 11–12. 현지 견적·시설·상점
고정 가격·제작법은 미확정이므로 **GM이 상황에 맞춰 실제 견적을 먼저 발행**한다. quote 버튼만으로 지급하지 않는다.

`offer`: offer={id,type:shop/facility,venue_id,venue_name,region_id,valid_until,items:[{id,stock,buy_price,sell_price,price_basis}],services?}. 1견적 최대40개 등록 품목, 가격/재고는 0 이상 정수, 근거 필수. 시설은 등록된 26개 ID만 사용. services=[{id,service,cost,basis,inputs:[{id,quantity}],outputs:[{id,quantity}],xp?,hp_restore?,mp_restore?}]. service는 해당 시설 원본 service 값이어야 한다. XP는 실제 훈련 서비스에서만. healing/rest/mana_rest는 견적의 hp_restore/mp_restore를 현재 최대치까지 회복하며, HP0 소생을 자동 허용하지 않는다. 원본에 없는 상급 효과·유니크 장비를 값싼 견적에 자동 공급하지 않는다.

`trade`: offer_id, item_id, quantity, direction=buy/sell. 해당 실제 지역/장소·견적 기한·입국·소유권·잔액·재고 확인. 장착 물품은 먼저 해제. 지급은 UI가 하므로 이 턴에 player/inventory/report 보상 스냅샷을 넣지 않음.

`service`: offer_id, service_id. 실제 시설에 방문 후 견적 재화/재료 차감 및 산출물/훈련 XP 지급. 드라켄 공인 서고의 전문 서비스와 거래는 명성20 및 education_approval의 실제 교육/등록 허가 근거 필요. 깨달음 자동 상승 없음. 기술서 학습은 기존 engine_events learn_book의 실제 연습 확인을 별도로 사용.

`auction`: auction={id,item_id,venue_id,venue_name,region_id,reserve,closes_at,price_basis,eligible:true}. 원본 등록 아이템, 현지 참가 자격과 실제 공고를 GM이 확인. `bid`: auction_id, amount. 마감 전 최저가 이상·이전 내 입찰보다 높은 금액. 증액 차이만 예치하며 자금 부족 거절. 입찰 중 물품 미지급.

`auction_result`: auction_id, result=won/lost/cancelled. 실제 마감 이후. won은 final_price=내 입찰액, authenticity_proof 필수, 예치금으로 결제하고 아이템 1개 지급. lost/cancelled는 예치금 환급. player/inventory 중복 스냅샷 금지. 같은 사건과 다른 사건 ID의 같은 경매 재정산 모두 차단.

## 13. 연간 사건
게임 날짜가 바뀌면 12×30 달력의 월간 후보를 원본 annual_events에서 준비한다. 예정은 개최·재난 성공이 아니다. 원거리 비밀/조건부 전쟁을 자동 확정하지 않는다. `calendar_result`: ref_id='연도:원본행사ID', status=active/resolved/cancelled, effects={security/food/treasury/morale/tradeRisk/warRisk/monsterRisk/prices:확인된 변화량}, known_to_player boolean, public_summary 공개된 경우 필수. 실제 조건·인과관계는 reason에 기록한다. 미래 사건 실행, 완료 사건의 재정산, 같은 효과 중복 적용 금지. 월간 변화는 누적 기록하며 절대 수치가 미정인 초기 세계 수치를 발명하지 않는다. 시간 경과는 주요 NPC 일정/소문 엔진에도 기존 방식으로 전달된다.

## 실행 한계
로컬 검증용 고정 GM 견적/전투는 실제 ChatGPT 운영 성공을 의미하지 않는다. GM이 올바른 구조화 판정을 보내야 실제 게임 진행에 적용된다. 기존 자유 입력·숫자 선택·수동 JSON 복구를 유지한다.
