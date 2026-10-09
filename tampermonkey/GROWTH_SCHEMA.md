# 경지·서클 엔진 규격 — v1 선택 확장

설정 원본은 CLASS_GROWTH.md와 progression/growth_rules.json. 기존 장면·브리지·저장 v1 유지. GM이 실제 깨달음과 전투를 판정하고 UI는 검증·재생한다.

## 돌파·학습

engine_events의 공통 event_id와 reason은 실제 사건의 고유 ID·사유다. 같은 ID는 1회만 반영. 복사본 전체가 통과할 때 정산한다.

```json
{"event_id":"growth-001","kind":"breakthrough","track":"knight","realm":"expert","enlightenment":"플레이어가 실제로 서술한 경험·이해와 운용 변화","reason":"축적된 실전과 서술에 대한 GM 판정"}
```

마법사 돌파는 track=mage, circle=다음 정수. knight는 realm=다음 경지. 현재 경지가 none/0이면 basic/1부터. 최소 레벨 미달·건너뛰기·깨달음 누락은 거절한다. hyper에는 unique_ability={name,description} 필수, description에 작동·대가·한계를 기록. 8/9서클에는 transcendent_enlightenment 문자열도 필수. 수치 게이지·돌파 확률은 금지. 마스터 고유능력의 추가 응용은 기존 능력 정체성을 유지하는 보유 기술로 기록한다.

```json
{"event_id":"training-001","kind":"learn_realm_ability","ability_id":"knight_mana_guard","reason":"실제 수련으로 간파와 마나 방어를 안정화한 확인"}
```

능력 ID와 요구 경지는 growth_rules.json의 abilities를 따른다. 경지 자동 학습 없음. player의 선택 필드는 circle(0~9), realmAbilities(ID 배열), uniqueAbility({name,description}). 기존 player 스냅샷에는 **돌파 전 경지와 기존 경지 능력**을 유지하거나 해당 선택 필드를 생략한다. 사건이 경지·보너스·HP/MP·기사 속도 변화를 계산한다. profession은 기본 직업 확인 전용이며 서클을 올리는 우회 경로로 쓰지 않는다.

NPC 돌파·학습은 같은 사건에 npc_id=등록된 인간 ID를 추가한다. 실제 NPC 경험·깨달음을 enlightenment와 reason에 기록한다. NPC의 현재 공개 수치를 기준으로 검사하고 npcStates에 반영한다. 기존 npc_updates나 npc.profile로 경지·서클·경지 능력을 바꾸지 않는다. 새 수치가 미정인 NPC의 돌파 수치를 발명하지 않는다. 기존 경지는 소급 강등하지 않는다.

## 전투 참가자·주문

participant 선택 필드: circle, realmAbilities. 실제 현재 저장과 일치해야 한다. 마법사의 공개 rank가 n서클이고 circle이 생략되면 해당 공개값을 읽는다. 마수는 인간 서클·경지 능력 사용 불가.

magic skill 선택 필드: circle=실제 주문 서클, reflectable=true/false. 직접 투사 주문만 true. 하위 주문 강화는 서클을 임의로 부풀리는 대신 calculation의 근거와 실제 위력으로 기록한다. 주인공의 주문 메타데이터는 보유 기술과 일치해야 한다. 반사를 사용할 경우 공격 주문에 circle과 reflectable을 반드시 기록한다.

## 기사 마나 방어

기사 physical 기술의 calculation에 mana_component=별도 마나 추가 피해(양의 정수), basis=기술·운용 근거를 넣는다. 물리 공식 피해와 별도 마나 피해를 합치며 기사 배율은 추가 마나에 다시 곱하지 않는다. 방어 없으면 마나 피해 전부 적용한다.

```json
{"kind":"mana_guard","reduction_percent":30,"mp_cost":9,"basis":"상위 기사가 공격을 인지하고 학습한 마나 방어를 전개"}
```

위 객체를 공격 사건의 realm_reaction에 기록한다. 예시 mana_component=40이면 비용=5+ceil(40/10)=9. 경지 차이 1/2/3에 감소 30/60/80%. 학습한 knight_mana_guard, 상위 경지, 충분한 대상 MP 필요. 대상 MP도 같은 사건에서 감소하므로 target_mp_after에 반영한다. 순수 물리·마법·고유능력 피해는 감소하지 않는다. 기습·붕괴·고갈에서는 출력하지 않는다.

## 마법 되돌리기

원래 magic 공격 사건의 realm_reaction:

```json
{"kind":"reflection","chance_percent":30,"roll":22,"success":true,"mp_cost":5,"basis":"5서클 방어자가 직접 날아오는 3서클 주문을 읽고 대응"}
```

차이 1/2/3/4 이상이면 확률 상한 15/30/45/60. GM은 조건에 따라 1~상한 정수의 낮은 확률을 사용하거나 시도를 불허한다. roll은 GM이 이미 판정한 1~100. roll<=chance_percent가 success. 비용=max(5,ceil(원래 주문 MP/2))는 실패도 동일. 학습한 spell_reflection과 직접 반사 가능한 주문이 필요하다.

성공이면 원래 사건 result=block, damage=0, calculation.full_block=true와 basis를 기록한다. 바로 다음 사건은 actor/target을 뒤집고 kind=magic, 원래 skill_id와 element, mp_cost=0, reflection_source_event=원래 사건 ID를 넣는다. 반사자에게 원래 주문을 보유 기술로 지급하지 않는다. 반사자의 주문 보너스 없이 원래 시전자의 주문 위력·INT/MANA, 돌아가는 대상에 맞는 상황·방어를 검산한다. 대상 회피도 허용한다. 다시 반사하거나 대응 없이 피해를 생략하지 않는다. 실패하면 원래 사건은 hit/critical/block의 정상 피해로 처리하며 반사에 의한 완전 가드는 금지한다.

재생은 기존 magic/block 연출과 narration을 사용한다. 반사·마나 방어의 관측 가능한 마나 흩어짐·궤도 반전·피로는 narration으로 표현하고 자원 숫자는 별도 필드로 표시한다.
