// Generated from items/consumable_catalog.json; never changes equipment prices.
export const shopConsumables=[
  {
    "id": "bread",
    "name": "빵",
    "category": "consumable",
    "description": "휴대할 수 있는 빵 한 개.",
    "effect": "식사 효과는 실제 사용 시 GM이 판정합니다.",
    "base_price": 5,
    "tradable": true,
    "allowed_shops": [
      "general",
      "grocery",
      "inn",
      "trading_house"
    ],
    "type": "supply",
    "ui_symbol": "🍞"
  },
  {
    "id": "simple_meal",
    "name": "간단한 식사",
    "category": "consumable",
    "description": "간단한 식사 한 끼.",
    "effect": "먹기 전에는 체력·시간을 변경하지 않습니다.",
    "base_price": 20,
    "tradable": true,
    "allowed_shops": [
      "grocery",
      "inn"
    ],
    "type": "supply",
    "ui_symbol": "🍲"
  },
  {
    "id": "ER-SUP-TORCH",
    "name": "횃불",
    "category": "consumable",
    "type": "supply",
    "description": "어두운 장소에서 사용하는 횃불.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "general",
      "junk"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "🔥"
  },
  {
    "id": "ER-SUP-ROPE",
    "name": "밧줄",
    "category": "misc",
    "type": "supply",
    "description": "등반과 물자 고정에 쓰는 밧줄.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "general",
      "trading_house",
      "junk"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "🪢"
  },
  {
    "id": "ER-SUP-HERB",
    "name": "약초 묶음",
    "category": "material",
    "type": "supply",
    "description": "감정과 조제가 필요한 약초 재료.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "herbalist",
      "alchemy",
      "materials"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "🌿"
  },
  {
    "id": "ER-SUP-HEALING",
    "name": "치료약",
    "category": "consumable",
    "type": "supply",
    "description": "상인의 조제 내역을 확인한 치료약.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "herbalist",
      "alchemy"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "🧪"
  },
  {
    "id": "ER-SUP-MANA",
    "name": "마나 회복약",
    "category": "consumable",
    "type": "supply",
    "description": "마나 회복 용도의 조제약.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "alchemy"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "💧"
  },
  {
    "id": "ER-SUP-REAGENT",
    "name": "연금 시약",
    "category": "material",
    "type": "supply",
    "description": "조제와 마법 연구에 쓰는 시약.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "alchemy",
      "materials"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "⚗"
  },
  {
    "id": "ER-SUP-WHETSTONE",
    "name": "숫돌",
    "category": "consumable",
    "type": "supply",
    "description": "칼날을 관리하는 숫돌.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "weapons",
      "smith",
      "general"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "🪨"
  },
  {
    "id": "ER-SUP-REPAIRKIT",
    "name": "방어구 관리 도구",
    "category": "misc",
    "type": "supply",
    "description": "방어구 관리에 사용하는 도구 묶음.",
    "effect": "효과·소모량·무게는 상인의 명세와 실제 사용 시 GM 판정이 필요합니다.",
    "tradable": true,
    "allowed_shops": [
      "armor",
      "smith",
      "general"
    ],
    "price_policy": "GM의 실제 지역 견적 필요; 고정 가격 없음",
    "ui_symbol": "🛠"
  }
];
