# 양방향 상점 거래 — UI 2.1.12

장면·브리지·저장 버전은 1을 유지한다. ECONOMY_SCHEMA.md의 기존 offer/service/auction/bid/market/cash_receipt도 계속 유효하다. 양방향 UI에서 이미 정산한 거래를 GM이 다시 trade 또는 inventory 스냅샷으로 지급하지 않는다. 거래 후 GM은 상인 반응과 협상·거절을 서술한다.

## 상점 등록

실제 방문·영업·재고·가격·유한 자금을 확인한 뒤 system_events에 다음 형식을 추가한다. 아래 값은 구조 예시이며 공식 상점·가격·세계관 설정이 아니다.

```json
{
  "kind": "shop_open", "event_id": "shop-open-unique", "reason": "현지 상인과 영업·물품·매입 자금을 확인했다",
  "shop": {
    "id": "actual-shop-id", "npc_id": "ER-NPC-042", "type": "junk",
    "name": "실제 상점 이름", "region_id": "S1", "place": "실제 상점 장소",
    "available": true, "funds_copper": 2000, "valid_until": "1-1-30",
    "price_version": "quote-unique", "price_basis": "실제 현지 견적 근거",
    "open_hours": [8, 22],
    "items": [{"id": "ER-EQ-001", "stock": 1, "buy_price": 100, "sell_price": 40}],
    "buyback_quotes": [{"id": "ER-EQ-002", "buy_price": 180, "sell_price": 75, "price_basis": "상인이 제시한 매입 견적"}]
  }
}
```

type은 general/weapons/armor/smith/herbalist/alchemy/magic_books/sword_books/jewelry/materials/grocery/inn/trading_house/junk/auction 중 하나다. 기존 catalog ID 410종과 items/consumable_catalog.json의 공급품을 사용한다. 공급품의 미확정 가격·효과·무게는 실제 견적으로 확인하며 개점만으로 생성·회복하지 않는다. 신규 공급품은 원화가 아직 없어 UI 기호를 사용한다.

상인 잔액은 world_engine.merchants[npc_id].wallet_copper를 공유한다. 재등록이나 다른 견적으로 자금을 리셋하지 않는다. 같은 NPC·장소의 기존 offer가 있으면 재고 수량을 그대로 유지하여 연결하고, 이후 물품 거래는 양방향 실물 재고를 사용한다. 기존 서비스·경매는 유지된다. 연결된 offer의 기존 trade도 같은 개별 인스턴스 거래 엔진으로 처리한다. 이미 등록한 상점은 새 shop_open 대신 shop_update를 사용한다.

장비·책은 개별 instance_id를 가진다. 중고 물품은 condition/enhancement/durability와 실물 번호가 유지된다. 개별 매입 견적은 buyback_quotes의 instance_id로 지정할 수 있다. 금지·의뢰 보호·신물은 일반 매매 대상이 아니며 드라켄 정식 마법서는 명성 20과 education_approval이 필요하다. 국가 제한 물품의 required_permit은 permissions로 검사한다.

## 사건 기반 갱신

shop_update는 shop_id, event_id, reason, action을 포함한다. event_id는 재사용하지 않는다.

- market: 새 price_version과 prices=[{id,buy_price,sell_price,price_basis,stock_id?,instance_id?}]. 실제 협상·가격 변화에만 사용한다. 예약 중 변경되면 정산을 거절하고 새 견적을 요구한다.
- delivery: elapsed_since, logistics_proof, cost_copper, items. 시간이 실제 경과하고 상인 발주 자금이 있어야 입고한다. 날짜 변경만으로 재고를 초기화하지 않는다.
- npc_purchase: buyer_npc_id, stock_id, quantity, paid_copper. 실제 등록 NPC의 유한 자금에서 차감하고 npc_owned에 소유권을 기록한다.
- availability: available=true/false. 실제 영업 상태 갱신.

ECONOMY_SCHEMA.md의 증거를 가진 지역 market 사건도 양방향 견적에 적용된다. 적용 시작·종료 및 가격 버전이 달라진 예약은 정산할 수 없다. 개별 재고로 연결된 상점의 입고·감소는 shop_update를 사용하며 offer.stock_changes로 별도 재고를 만들지 않는다.

대장간 수리·강화, 여관 숙박 등은 기존 승인된 시설 service를 사용한다. 경매는 기존 auction/bid/auction_result 흐름을 사용하며 일반 구매 확정으로 처리하지 않는다.

## 예약·정산·저장

예약은 화면 메모리에만 있으며 소유권·지갑을 바꾸지 않는다. 닫기·페이지 이동은 미확정 예약을 취소한다. 확정 시 실제 위치/NPC/영업/기한/명성/입국/허가/가격/재고/소유/장착/보호/상인과 플레이어 자금/최종 슬롯·설정된 무게 한도를 재검사한다.

지갑은 wallet_copper 하나이며 순차액=구매총액−판매총액이다. 비공개 후보 상태를 완성·검증·저장한 뒤 적용하므로 실패 시 모두 유지된다. world_engine.trade_ids[transaction_id]의 confirmed 영수증이 중복 정산을 차단한다. 팔린 실물은 상점 재고에 보존되어 재구매할 수 있다.

브리지 v1의 기존 메서드를 유지하며 getShopTypes/getShops/getTradeReceipts를 추가했다. 상인 반응 요청에는 정산 영수증과 현재 상태가 포함된다. 일반 UI 업데이트로 런처 재설치를 요구하지 않는다.
