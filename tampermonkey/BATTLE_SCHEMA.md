# 스탠딩 전투 · 장면 스키마 v1 선택 확장

`BATTLE_SYSTEM.md`의 UI 구현 규격. 기존 `ercedia_scene` JSON 한 개와 런처/브리지/저장 버전 1을 유지한다. 전투 발생 때만 최상위 `battle`을 추가한다. 별도 전투 JSON type을 사용하지 않는다. 런처 재설치 없이 UI 업데이트로 적용한다.

**GM은 전투 전체를 먼저 판정한다.** UI의 산술 검사는 판정 증빙의 모순을 찾는 검사이며, 새로운 난수·행동·피해·승패를 만들지 않는다. 미확정 주문/방어/치명타 보정과 고유능력은 기존 기술·장비·사건 근거를 함께 출력한다. 검사 통과가 그 근거의 서사적 진실까지 입증하지는 않는다.

## 장면과 정산

- 장면의 `dialogue/choices/npc/location/time/background_id`는 **전투 종료 후 장면**이다. 재생 중 대사는 `battle.events[].narration`만 한 줄씩 보인다. background_id는 sunny_village_day 또는 null. 장소에 맞는 승인 원화가 없으면 null.
- `player`, `inventory`, `game_state`는 종료 후 전체 스냅샷으로 반드시 포함한다. 전투 중에는 기존 세이브를 덮어쓰지 않고 생성된 전투와 재생 위치만 저장한다.
- `reply_to`는 원래 행동 요청 ID 그대로. `scene_id`와 `battle_id`는 고유 ID.
- 다섯 player 능력치 키는 `strength,dexterity,intelligence,constitution,manaStat`. 선택 항목 `realm`은 none/basic/expert/hyper/master. `levelHpBonus`, `unspentStatPoints`, `battleModifiers`를 지원한다. 기존 저장에는 항목을 자동 추가하지 않는다. 마법사 서클/마수 등급은 공개 rank에 표현하며 기사 배율은 none.
- 경험치 보상으로 레벨이 오르면 PROGRESSION.md의 이월, +3 미사용 포인트와 COMBAT_GROWTH.md의 레벨 HP 보너스를 종료 스냅샷에 반영한다. 능력치 자동 분배/경지 자동 승급은 금지. HP 증가는 기존 피해량을 보존한다.
- 부상 문자열은 `game_state.events`에도 기록. 피해에 따른 현재 HP와 서술 부상을 혼동하지 않는다.

## battle

| 필드 | 규격 |
| --- | --- |
| battle_id | 고유 문자열, 100자 이하 |
| trigger | dialogue / travel / dungeon / duel / ambush |
| participants | 2~8명, 서로 다른 id, player 역할 정확히 하나 |
| initiative | {actor_id,reason}; 첫 사건 행동자와 일치. 속도 동률/역전/기습이면 근거 필수 |
| events | 실제 순서대로 1~120개, 전체 JSON 120KB 이하 |
| outcome | 아래 종료 규격 |

### 참가자

`{id,name,side,role,level,rank,realm,stats,hp,maxHp,mp,maxMp,speed,level_hp_bonus,modifiers,skills,art}`

- side: allied/enemy. 주인공은 allied. role: player/npc/monster.
- level: 1~100. rank: **공개된 현재** 경지/서클/마수 등급 문자열. 숨겨진 실제 정체를 UI에 포함하지 않는다.
- realm: none/basic/expert/hyper/master. 마수/비기사에게 기사 배율을 주지 않는다.
- stats: `{strength,dexterity,intelligence,constitution,manaStat}`. 현재 플레이어 세이브와 일치해야 한다. 미정인 저장 능력치를 임의로 채우지 말고 먼저 일반 장면에서 확정한다.
- 최대 HP/MP와 speed는 COMBAT_GROWTH.md 공식. level_hp_bonus는 누적 기록, 장비/상태 근거가 없으면 0.
- modifiers: `{weapon_attack,technique_bonus,equipment_hp_bonus,status_hp_bonus,equipment_mp_bonus,status_mp_bonus,equipment_speed_bonus,status_speed_bonus}`. 생략된 값 0. 주인공은 저장의 battleModifiers와 일치. 장비 수치를 새로 발명하지 않는다.
- skills: `{id,name,kind,mp_cost}` 목록. kind는 physical/magic/unique/defend. magic/unique에는 `power,int_coefficient,mana_coefficient,basis`도 필요. 주인공은 저장에 사용 가능 상태로 등록된 기술만 사용한다. 현재 미확정 주문 계수를 세계 공통 공식으로 선언하지 않는다.
- art: 원화 없으면 null. 세린의 승인된 전투 스탠딩은 참가자 id=serin일 때 `{id:"serin",outfit:"armor|casual|nightwear 중 실제 한 값",emotion:"등록된 9종 중 한 값"}`. **세린을 player 원화로 사용하지 않는다.** 추가 등록된 138명은 characters/art_registry.json 기준으로 `{id:"해당 참가자 ID",outfit:"none",emotion:"base"}`를 사용한다. 인간은 전신, 마수는 투명 초상화이며 새 표정이나 복장은 등록하지 않았다. 등록 인물의 art를 생략하면 기본형으로 표시한다. 다른 인물의 원화를 빌려 쓰거나 player에 NPC 원화를 지정하면 거부한다. 좌우 반전을 하지 않아 문장/장비/얼굴 호환을 추정하지 않는다.

### 사건

`{id,actor,target,kind,result,skill_id,damage,mp_cost,actor_hp_after,actor_mp_after,target_hp_after,target_mp_after,narration,element?,calculation?}`

- id: 고유. actor/target: 참가자 ID.
- kind: attack/dodge/defend/counter/magic/unique/defeat.
- result: hit/dodge/block/critical/none.
- skill_id: 보유 기술 ID 또는 평타의 null. mp_cost는 기술의 mp_cost와 일치.
- damage: 실제 감소한 HP(과잉 피해는 남은 HP로 제한). 회피·비공격·none은 0. 치명 피해를 UI가 추가 계산하지 않는다.
- *_after: 이 사건 반영 직후의 **전체 현재 자원**, 이전 사건으로부터 연속. actor MP만 mp_cost만큼 감소. HP 0인 참가자는 추가 행동·피격 금지. defeat 사건만 HP 0인 actor=self target에 0피해/0MP로 퇴장 가능.
- counter는 바로 앞 사건의 block 대상이 공격자에게 반격하는 별도 사건.
- magic element: water/fire/wind/electric/dark/light.
- unique: 하이퍼/마스터가 이미 보유한 고유능력만. 근거/비용/한계를 기록.
- narration: 화면에서 관측 가능한 공격·회피·방어 중계. 피해량과 HP/MP 숫자는 문장에 나열하지 않는다. 수치는 damage와 *_after에 정확히 기록하며 타격 시 피해 숫자·자원바로 표시한다. 기존 응답의 수치 안내 문장은 화면에서만 걸러내고 원본 사건은 보존한다. 실제 보유 skill_id의 기술명은 중앙에 크게 표시한다.

### 피해 증빙 calculation

적중 공격에는 `{base_roll?,realm_multiplier,context_multiplier,defense,basis?,full_block?}`.

- 물리: `raw = base_roll(10~20, GM이 이미 선택한 값) + floor(.65*STR+.20*DEX) + weapon_attack + technique_bonus`.
- `uncapped = max(1,floor(raw*realm_multiplier*context_multiplier-defense))`; 실제 damage는 min(대상 남은 HP, uncapped).
- 기사 realm_multiplier: none/basic=1, expert=1.25, hyper=1.65, master=2.20. 누적 곱 금지.
- 마법/고유능력: `raw = skill.power + skill.int_coefficient*INT + skill.mana_coefficient*MANA`; 위 context/defense 적용, realm_multiplier=1. 이것은 **명시된 개별 기술을 검산하는 전달 규격**, 세계 공통 주문 공식 추가가 아니다.
- 상황 배율 기본 1, 방어력 기본 0. 다른 값/critical/block이면 basis에 승인된 장비/기술/실제 상황의 사전 판정 근거 필수. 완전 가드는 full_block=true와 근거가 있을 때 damage=0.

### outcome

`{winner,termination,reason,resources,xp_gain,items_added,items_consumed,injuries}`

- winner: allied/enemy/draw/escape. termination: defeat/surrender/draw/escape.
- defeat는 패배 측 전원 HP0, 승리 측 생존자 존재. surrender는 HP0을 강요하지 않고 reason에 실제 항복/비무 종료 근거. draw/escape는 각각 같은 winner.
- resources: 모든 참가자의 최종 `{id,hp,mp}`; 마지막 사건까지 재생한 자원과 일치. 레벨업 HP 증가는 종료 player 정산에 따로 반영.
- xp_gain: 음이 아닌 정수. items_added/items_consumed: `{name,quantity}` 배열. 최종 인벤토리 수량 차이와 일치. 기존 인벤토리 v1은 ID 없이 name을 사용하므로 같은 이름은 수량을 합쳐 검사.
- injuries: 부상 문자열 목록(없으면 []). 보상/소비/부상 없음도 빈 배열로 명시.

## 재생·저장·복구

선택 필드 `battlePlayback:{scene,index,speed,paused,done,replay}`와 `battleApplied`(최근 100개 ID)를 사용한다. 정상 종료/즉시 종료는 같은 종료 스냅샷을 한 번만 정산한다. 다시보기는 원본 사건만 재생하고 보상을 추가하지 않는다. 사건 경계마다 저장하고, 재접속하면 진행 중 사건부터 재개한다. 전투 중 updatePlayer/updateInventory/새 행동/후속 장면은 적용하지 않는다. 런처 snapshot은 pending=true로 응답해 UI 교체를 보류한다.

잘못된 전투는 첫 사건 이전에 거절한다. 기존 세이브/장면을 유지하고 ‘수정 요청 보내기’ 또는 ‘기존 장면 유지’를 제공한다. 미등록 이미지나 로드 실패는 명확히 알리고 다른 얼굴로 대체하지 않는다.

검증 데모: `tests/battle-demo.html`, 사건 원본: `tests/battle-fixtures.js`. 데모 판정은 실제 ChatGPT가 생성한 판정이 아니다.

## UI 1.4.0의 NPC 원본 수치
- `gameBridge.getNPC(id)` 또는 GPT 요청의 `npc_catalog.current_npc`는 GitHub 원본의 5스탯/레벨/HP/MP/속도/레벨 HP 기록에 해당 채팅의 NPC 변화값을 합친다. 등록 인물의 battle 시작 스냅샷이 이 값과 다르면 재생을 거절한다. 이름 대신 고유 ID를 사용한다.
- 마수의 원본 `creature_damage_multiplier`는 `creature_multiplier`로 선언한다. 미기재 시 등록된 마수는 원본 배율을 읽는다. 이는 REBALANCE_V2의 잠정 마수 배율이며 기사 경지 배율과 별개다. 물리 피해 식에서 원시피해 × 기사 배율(마수는1) × 마수 배율 × 상황 보정 후 방어를 적용한다. 마법의 위력은 선언한 기술 공식을 따른다.
- NPC 숫자 원본이 미등록인 경우 캐릭터 정보를 먼저 확정한다. 숫자를 임의 생성하지 않는다. NPC의 종료 자원은 전투 종료 정산 시 npcStates에 기록되어 정보창과 다음 턴에 공유된다.
