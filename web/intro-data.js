// Generated from approved public character creation data.
export const introData = {
  "schema_version": 1,
  "flow": [
    "black_intro",
    "identity_questions",
    "passive_result",
    "kingdom_selection",
    "lordship_selection",
    "confirmation",
    "first_scene"
  ],
  "visual": {
    "background": "#000000",
    "transition": "fade",
    "no_world_secrets": true
  },
  "questions": [
    {
      "id": "name",
      "text": "아르세디아 대륙에 어서 오거라! 너의 이름은 무엇이냐?",
      "type": "text",
      "required": true
    },
    {
      "id": "gender",
      "text": "그래, 너의 성별도 알려주겠느냐?",
      "type": "choice",
      "required": false,
      "options": [
        {
          "id": "male",
          "label": "남성이다",
          "value": "남성"
        },
        {
          "id": "female",
          "label": "여성이다",
          "value": "여성"
        },
        {
          "id": "private",
          "label": "밝히지 않겠다",
          "value": "밝히지 않음"
        }
      ]
    },
    {
      "id": "calling",
      "text": "너는 스스로 어떤 성격이라 생각하느냐?",
      "type": "choice",
      "options": [
        {
          "id": "guard",
          "label": "소중한 사람을 쉽게 외면하지 않는다",
          "passive": "steadfast"
        },
        {
          "id": "wanderer",
          "label": "낯선 길을 보면 먼저 걸어보고 싶다",
          "passive": "traveler"
        },
        {
          "id": "scholar",
          "label": "작은 변화도 유심히 살펴보는 편이다",
          "passive": "observant"
        },
        {
          "id": "artisan",
          "label": "손으로 해결할 방법을 찾는 편이다",
          "passive": "craftsman"
        }
      ]
    },
    {
      "id": "response",
      "text": "그렇다면 낯선 위험을 만났을 때, 무엇을 먼저 하겠느냐?",
      "type": "choice",
      "options": [
        {
          "id": "protect",
          "label": "주변 사람의 안전을 확인한다",
          "passive": "steadfast"
        },
        {
          "id": "escape",
          "label": "먼저 지형과 퇴로를 파악한다",
          "passive": "traveler"
        },
        {
          "id": "observe",
          "label": "상대의 의도를 관찰한다",
          "passive": "observant"
        },
        {
          "id": "prepare",
          "label": "도구와 준비물을 확인한다",
          "passive": "craftsman"
        }
      ]
    }
  ],
  "passives": [
    {
      "id": "steadfast",
      "name": "굳센 마음",
      "description": "전투당 첫 번째 공포·위협 판정에 한해 침착한 대응의 서사적 이점을 얻는다.",
      "scope": "first_fear_response_per_combat",
      "combat_stat_bonus": 0
    },
    {
      "id": "traveler",
      "name": "길눈",
      "description": "처음 방문한 일반 길에서 길찾기와 안전한 우회로 발견에 가벼운 이점을 얻는다.",
      "scope": "ordinary_roads_only",
      "combat_stat_bonus": 0
    },
    {
      "id": "observant",
      "name": "세심한 관찰",
      "description": "낯선 사람·물건의 눈에 띄는 단서를 놓칠 가능성을 소폭 낮춘다. 숨겨진 진실을 자동으로 알지는 못한다.",
      "scope": "ordinary_visible_clues",
      "combat_stat_bonus": 0
    },
    {
      "id": "craftsman",
      "name": "손재주",
      "description": "일상적인 장비 수선·도구 사용에서 가벼운 이점을 얻는다. 희귀 장비 제작은 불가하다.",
      "scope": "mundane_repairs",
      "combat_stat_bonus": 0
    }
  ],
  "passive_resolution": {
    "algorithm": "majority_of_two_answers",
    "tie_break": "let_player_choose_between_tied_results",
    "limit": 1,
    "overrides_base_stats": false,
    "no_unlock_from_rank": true
  },
  "start_regions": [
    {
      "kingdom": "벨로아",
      "id": "west",
      "lordship_ids": [
        "W1",
        "W2",
        "W3",
        "W4",
        "W5"
      ]
    },
    {
      "kingdom": "드라켄",
      "id": "east",
      "lordship_ids": [
        "E1",
        "E2",
        "E3",
        "E4"
      ]
    },
    {
      "kingdom": "루메린",
      "id": "south",
      "lordship_ids": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    }
  ],
  "start_location_policy": "Select kingdom and lordship from existing world map markers. Actual precise spawn settlements are not canonized, and can be resolved by local safe settlement; wilderness/warfront cannot be forced as safe starts.",
  "default_character": "characters/player_default.json",
  "state_fields": [
    "character_name",
    "gender_or_appearance",
    "chosen_answers",
    "starting_passive_id",
    "starting_kingdom",
    "starting_lordship_id",
    "intro_completed"
  ],
  "strict_rules": [
    "No enlightenment, knight rank or magic circle awarded during character creation.",
    "Start at Lv1 HP100 MP100 five stats 10.",
    "No random passive rolls or hidden percentages.",
    "Only show publicly knowable map locations; no secret god/demon lore.",
    "New Game opens prologue. Continue existing saves bypasses prologue."
  ],
  "start_calendar": {
    "era": "에르세디아력",
    "date": "650-07-01",
    "time": "09:00"
  }
};
export const playerTemplate = {
  "schema_version": 1,
  "id": "player_default",
  "level": 1,
  "xp": 0,
  "xp_to_next": 100,
  "unspent_stat_points": 0,
  "stats": {
    "strength": 10,
    "agility": 10,
    "intelligence": 10,
    "constitution": 10,
    "mana": 10,
    "hp": 100,
    "max_hp": 100,
    "mp": 100,
    "max_mp": 100
  },
  "level_hp_bonus": 0,
  "realm": null,
  "identity": {
    "name": null,
    "gender": null,
    "origin": null,
    "profession": null
  },
  "combat": {
    "speed": 12,
    "base_attack_min": 18,
    "base_attack_max": 28
  },
  "state": "template_not_active_save",
  "rules_reference": "COMBAT_GROWTH.md",
  "starting_wallet_copper": 500,
  "currency_rules_reference": "CURRENCY_ECONOMY.md"
};
