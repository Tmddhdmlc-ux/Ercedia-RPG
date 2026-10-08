# 엔진 사건 · v1 선택 확장

기존 `ercedia_scene`에 `engine_events` 배열(최대 30개)을 추가한다. 각 사건은 영구 고유 `event_id`, `kind`, 실제 판정 `reason`을 포함한다. 중복 ID는 재적용하지 않는다. 엔진은 복사본 전체를 검증한 뒤 원자적으로 반영한다. 일반 `player` 스냅샷과 같은 보상을 이중 지급하지 않는다.

- `xp`: `amount` 정수. 전투/의뢰 보고 보상은 기존 정산을 사용하므로 이 사건과 겹치지 않는다.
- `profession`: 실제 결정된 `job`(검사/마법사). `circle`은 실제 서클이 확인된 경우에만 정수. 학습/경험치만으로 서클을 올리지 않는다.
- `learn_book`: 실제 소유 `catalog_id`. GM은 직업·레벨·서클·선행 기술·연습/연구를 확인한다. reason에 실제 학습 결과를 기록한다. 책은 소모하지 않는다.

`현재 상태.engine`의 instances는 catalog_id와 개별 instance_id를 구분한다. equipped는 weapon/armor/accessory 각 하나. player 수치는 장비가 반영된 실효 능력치이며 engine.bonuses를 다시 더하면 안 된다. 동종 잠재능력은 최대값 하나만 사용한다.

전투 주인공 participant에 `potentials=engine.bonuses.potentials`를 전달한다. 첫 물리 적중/피격, 첫 주문, 첫 MP 소비, 가드 피해는 매 전투 최초 상태에서 검증한다. MP 할인은 % 내림 후 고정 할인 순서, 피해 특수효과는 공격 증가 → 피격 감소 → 가드 감소 순으로 내림한다. 이는 해당 특수효과 수치의 적용 정책이며 미정 방어·주문·깨달음 공식을 새로 정하지 않는다. 종료 시 post_battle_hp_restore가 있으면 살아 있는 참가자만 최대 HP 비율만큼 회복한다. 기술서 기술의 MP 비용과 spell_base_power+장착 스태프 spell_power는 등록 데이터와 일치해야 한다. 주문 INT/MANA 계수와 방어 판정에는 기존 승인 근거가 필요하다.

장비/학습 조건에 필요한 능력치가 미정이면 판정을 요청하고 숫자를 발명하지 않는다. 실패 응답은 기존 장면·인벤토리·엔진·세이브를 유지한다. 전투 장면의 엔진 사건은 관전이 완료/건너뛰기 되었을 때만 반영한다.
