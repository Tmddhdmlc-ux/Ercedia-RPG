# 엔진 사건 · v1 선택 확장

화폐 정산은 `wallet_copper` 안전 정수 하나를 사용한다. 화면 환산은 동화100=은화1, 은화100=금화1. 캐릭터 생성 완료 시 500동화를 1회 지급하며 기존 저장에는 재지급하지 않는다. GM의 `wallet_copper`/`currency` 스냅샷은 금지한다. 화폐 변경은 아래 세계 사건과 의뢰 보고 정산만 가능하다.

경제 확장 규격은 [ECONOMY_SCHEMA.md](ECONOMY_SCHEMA.md)를 따른다. 기존 장면/브리지/저장 버전1과 기존 사건 이름을 유지한다.

UI 1.8.3은 장비 300종·책 70권·재료 40종의 기존 아이콘을 표시한다. inventory 항목은 등록된 id 또는 catalog_id와 quantity로 기록한다. 이름·분류·등급·아이콘은 등록 데이터로 조회하며 도감 목록을 소유품으로 지급하지 않는다. getItemCatalog(), getItem(id), getLootTables()는 읽기 전용 조회 기능이다. 마수 20종·던전 26곳의 보상표를 등록했으며 실제 전리품은 GM의 획득 판정 및 기존 인벤토리/전투 정산으로 반영한다. 새 자동 드롭/클리어 보상 사건을 추가한 것은 아니다.

기존 `ercedia_scene`에 `engine_events` 배열(최대 30개)을 추가한다. 각 사건은 영구 고유 `event_id`, `kind`, 실제 판정 `reason`을 포함한다. 중복 ID는 재적용하지 않는다. 엔진은 복사본 전체를 검증한 뒤 원자적으로 반영한다. 일반 `player` 스냅샷과 같은 보상을 이중 지급하지 않는다.

- `xp`: `amount` 정수. 전투/의뢰 보고 보상은 기존 정산을 사용하므로 이 사건과 겹치지 않는다.
- `profession`: 실제 결정된 `job`(검사/마법사). `circle`은 실제 서클이 확인된 경우에만 정수. 학습/경험치만으로 서클을 올리지 않는다.
- `learn_book`: 실제 소유 `catalog_id`. GM은 직업·레벨·서클·선행 기술·연습/연구를 확인한다. reason에 실제 학습 결과를 기록한다. 책은 소모하지 않는다.

`현재 상태.engine`의 instances는 catalog_id와 개별 instance_id를 구분한다. equipped는 weapon/armor/accessory 각 하나. player 수치는 장비가 반영된 실효 능력치이며 engine.bonuses를 다시 더하면 안 된다. 동종 잠재능력은 최대값 하나만 사용한다.

전투 주인공 participant에 `potentials=engine.bonuses.potentials`를 전달한다. 첫 물리 적중/피격, 첫 주문, 첫 MP 소비, 가드 피해는 매 전투 최초 상태에서 검증한다. MP 할인은 % 내림 후 고정 할인 순서, 피해 특수효과는 공격 증가 → 피격 감소 → 가드 감소 순으로 내림한다. 이는 해당 특수효과 수치의 적용 정책이며 미정 방어·주문·깨달음 공식을 새로 정하지 않는다. 종료 시 post_battle_hp_restore가 있으면 살아 있는 참가자만 최대 HP 비율만큼 회복한다. 기술서 기술의 MP 비용과 spell_base_power+장착 스태프 spell_power는 등록 데이터와 일치해야 한다. 주문 INT/MANA 계수와 방어 판정에는 기존 승인 근거가 필요하다.

장비/학습 조건에 필요한 능력치가 미정이면 판정을 요청하고 숫자를 발명하지 않는다. 실패 응답은 기존 장면·인벤토리·엔진·세이브를 유지한다. 전투 장면의 엔진 사건은 관전이 완료/건너뛰기 되었을 때만 반영한다.

## 경지 성장 확장 (UI 2.1.35)
GROWTH_SCHEMA.md를 따른다. breakthrough는 실제 깨달음 서술·최소 레벨·직전 경지를 확인한 순차 승급, learn_realm_ability는 경지 공통능력의 실제 학습 확인. 선택 npc_id로 등록 인간 NPC에도 적용. profession으로 서클을 올리지 않는다. player/npc 스냅샷의 경지·서클·경지 능력 변경은 금지하며 사건이 계산한다. getGrowthRules()와 턴 요청 growth에서 설정·현재 경지·다음 최소 레벨·학습 능력을 조회한다.

## 캠페인 창작 기술과 실제 연습 (UI 2.1.76)

실제 학습 성과가 있을 때 kind=learn_custom_skill 사건에 skill 객체를 넣는다. id는 GM-SKILL- 접두사와 ASCII 고유값, name/description, skill_type=active/passive, usage=battle/dialogue/both를 필수로 사용한다. 생활형 단조·학문 기술은 passive/dialogue가 기본이다. 선택 formula/mp_cost/technique_bonus/spell_base_power/element를 사용할 수 있으며 효과와 한계는 현재 레벨·경지·실제 수련에 맞춘다. book_id와 ultimate 위조는 금지한다. 원문 등록 기술을 바꾸지 않는다. 학습 근거는 사건 reason에 기록하며 저장된 스킬에 source=gm과 learning_reason이 보존된다. 같은 사건 ID는 한 번만 적용하고 이미 배운 ID의 효과는 덮어쓰지 않는다. 스킬 목록 70개와 기존 장착 4칸을 유지한다. 제작 기술의 서술 효과는 GM이 판정하며 등록 제작법·실물·재료·화폐 검증을 우회하지 않는다.

실제 성과를 완료한 단련·학습·제작 연습·탐색에는 kind=practice, activity=physical/mental/craft/exploration, completed=true, xp_gain=GM이 판정한 양의 정수와 실제 학습 reason을 기록한다. game_state.date/time에 실제 경과 시간이 필요하다. 엔진은 회당 현재 레벨의 필요 경험치 20%까지 인정하고 같은 게임 날짜·분야에서 완료한 횟수가 n이면 1/(n+1)을 적용해 내림한다. 반복이 누적되면 경험치가 0일 수도 있다. 새 날짜에 감소 횟수를 초기화한다. 한 장면에는 practice 한 번만 쓰고 xp·전투·의뢰 보고 보상과 중복하지 않는다. 레벨업과 성장 포인트는 기존 규칙대로 계산하며 장면 스냅샷으로 이중 지급하지 않는다. 완료된 연습 이력은 engine.practice_history에 최근 30개를 저장한다.

예: engine_events=[{event_id:"forge_001",kind:"practice",activity:"craft",completed:true,xp_gain:10,reason:"30분 동안 연철 성형을 연습해 실제 자세를 개선했다."},{event_id:"forge_skill_001",kind:"learn_custom_skill",reason:"지도자의 시범 뒤 연철의 가열과 망치 각도를 실제로 익혔다.",skill:{id:"GM-SKILL-forging-01",name:"초급 단조",description:"기본 작업장에서 연철 성형과 가열 상태 구분에 가벼운 이점. 희귀 장비 자동 제작은 불가.",skill_type:"passive",usage:"dialogue"}}].
