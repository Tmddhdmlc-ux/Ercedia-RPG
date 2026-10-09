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
      "text": "사람들은 너를 무엇이라 부르는가?",
      "type": "text",
      "required": true
    },
    {
      "id": "gender",
      "text": "어떤 모습으로 살아갈 것인가?",
      "type": "free_or_selection",
      "required": false
    },
    {
      "id": "calling",
      "text": "어떤 삶을 살아왔는가?",
      "type": "choice",
      "options": [
        {
          "id": "guard",
          "label": "누군가를 지키며 살았다",
          "passive": "steadfast"
        },
        {
          "id": "wanderer",
          "label": "길 위에서 배웠다",
          "passive": "traveler"
        },
        {
          "id": "scholar",
          "label": "책과 관찰로 세상을 알았다",
          "passive": "observant"
        },
        {
          "id": "artisan",
          "label": "손으로 무언가를 만들어 왔다",
          "passive": "craftsman"
        }
      ]
    },
    {
      "id": "response",
      "text": "낯선 위험 앞에서 너는 무엇을 먼저 하는가?",
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
  ]
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
