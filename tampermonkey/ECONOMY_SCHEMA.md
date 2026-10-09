# 경제 사건 · 장면 v1 선택 확장

모든 금액은 동화 단위의 음수가 아닌 안전 정수. 소수·음수·곱셈/합산 오버플로는 턴 전체를 거절한다. GM은 서술·협상·실제 출처를 판정하고 엔진이 원장·재고·소유권을 정산한다. 기존 system_events의 event_id/reason 및 전체 턴 검증 규칙을 유지한다. 일반 대사와 임의 화폐 스냅샷은 지급 근거가 아니다.

- `offer`: 기존 offer 구조 + `merchant_npc_id`(등록 NPC), `merchant_buy_budget`(실제 매입 자금), `buyable_types`(equipment/book/material/consumable), `min_reputation`(-100~100), `education_required`(boolean). 동일 상인의 후속 견적은 기존 자금을 공유하며 예산을 다시 지급하지 않는다. shop_id는 offer.id, kingdom은 region_id에서 결정한다. 품목 base_buy_price/base_sell_price는 기존 buy_price/sell_price; price_basis 필수. 원본 카탈로그의 개별 가격은 기준가보다 우선한다. 없는 가격은 GM의 현지 견적이 필요하다. 구형 견적은 상인 미확인·미확인 예산0으로 이행하고 실제 판매대금이 쌓인 범위에서만 매입한다. 신물11개 매매 금지.
- `trade`: offer_id/item_id/quantity/direction=buy|sell, 선택 instance_id. 실제 방문·기한·입국·명성·교육허가·판매 가능성·소유·예산·재고 검사. 계산한 가격과 지갑·상인 자금·재고·물품 이전을 한 번에 반영한다. 교육허가가 필요한 거래는 education_approval 근거를 제시한다.
- `service`: 기존 등록 시설 service_id 또는 type=shop 견적의 서비스 중 기준표 inn_night/nice_inn_night/carriage_short/herbal_treatment. 일반 여관 rest/inn_night 기준100동화. 개별 실제 견적 cost/basis를 먼저 제시한다. 재료/산출물/회복/XP 제한은 기존 시설 규칙 유지.
- `market`: region_id, cause=war|raid|crop_failure|border|supply|demand, evidence_id(같은 장면 world_events action/clue의 실제 증거), starts_at/ends_at(360일 날짜), price_percent(정수 -90~500;100은 기준가+100%), categories=[equipment/book/material/consumable] 또는 빈 배열(전 품목). 선택 stock_changes=[{offer_id,item_id,delta}], merchant_npc_id/budget_delta. 예산 증감은 실제 납품/발주/손실 출처가 reason과 증거에 있어야 한다. 모든 조정은 기간·원인·증거를 기록한다. 전쟁/습격/흉작/봉쇄를 단순 예정 일정만으로 확정하지 않는다. 월간 calendar_result에 market={...}를 붙이면 같은 검증으로 실제 가격에 연결된다.
- `auction`: 기존 구조 + seller_id(등록NPC 또는 player), instance_id(실제 위탁 물품 식별자), ownership_proof, min_increment(1이상). 플레이어 출품은 실제 소유 instance_id와 미장착을 검사하여 물품을 위탁 보관한다. NPC 출품은 확인된 물품 출처를 기록한다. 구형 공고는 미확인 외부 판매자/공고별 식별자로 보존하며 GM에게 확인을 요청할 수 있다.
- `bid`: auction_id/amount, bidder_id 생략=player. 직전 최고 입찰+min_increment 이상 및 기한/현지 참가 자격 검사. 최고 입찰 자금은 전액 예치, 증액은 차이만. 등록 NPC 입찰은 해당 상인의 확인된 매입 자금으로만 가능. 다른 입찰자가 최고가를 갱신하면 이전 예치금을 즉시 환급한다.
- `auction_result`: 기존 won/lost/cancelled, final_price/authenticity_proof(낙찰 필수), 선택 winner_id. 마감 후 최고 입찰자와 일치해야 함. 플레이어 낙찰은 실제 위탁 개체를 지급, NPC 낙찰은 NPC 소유 원장에 이전. 예치금은 판매자 지갑(플레이어 또는 NPC 판매자 원장)에 이전한다. 취소는 물품 반환+환급. settlement_record와 status로 한 번만 정산한다.
- `cash_receipt`: source=bandit|bounty|dungeon_treasure, amount, evidence_id, source_id, available_copper. bandit의 source_id가 개체/출처 ID이면 npc_id에 등록 인간 원본 ID를 제시한다. 실제 전투/현상금 계약/보물 발견 world_events action/clue 증거가 필요하고 확인된 실제 자금 이하만 지급한다. source_id별 잔여금 기록으로 다른 event_id 반복 지급도 차단한다. 마수 일반 동전 드롭은 지원하지 않는다.

의뢰 reward.currency는 저장v1 호환 명칭이며 동화 단위이다. 선택 reward.budget_copper/budget_basis는 발주자의 확정된 예산과 근거; 보상 이상이어야 한다. 기존 수락 의뢰는 약속 금액을 보존한다. report의 claim_event_id로 지갑에 한 번만 가산한다.

브리지 v1의 getWallet()는 원장과 환산, getEconomy()는 현재 견적/상인/경매/거래/시장 기록의 복사본을 읽는다. updateScene은 기존 실제 파서와 원자적 정산 경로를 유지한다. restoreGameState는 저장 마이그레이션을 사용한다.
