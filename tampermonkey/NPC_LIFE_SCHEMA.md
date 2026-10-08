# PATCH 5 — NPC 생활·기억 장면 규격 (v1 확장)

기존 ercedia_scene/schema_version=1의 선택 필드 `life_events`(최대 32개)를 사용한다. 저장/브리지 버전은 1. 장면 검증·전투 종료·의뢰 정산과 함께 원자적으로 적용한다. 잘못된 생활 사건은 주인공·인벤토리·장면도 변경하지 않는다. API 연결을 추가하지 않는다.

모든 사건의 공통 필드: `event_id`(영문/숫자/:/_/- 최대100자), `kind`, `date`(360일 달력 YYYY-M-D), `source_id`, `reason`. source_id는 현재 `scene:<scene_id>`, 확정 전투 `battle:<battle_id>`, 실제 의뢰 사건 ID, world_events ID 또는 이미 적용한 생활 사건 ID다. 미래 사건·시간 역행·동일 ID 내용 변경은 거절한다. 같은 원인 사건으로 한 NPC의 호감도를 두 번 지급할 수 없다.

## 사건 종류

- `schedule`: npc_id, entries=[{start,end,region,place,activity}]. 날짜가 겹치지 않는 최대16개 일정. 외국 일정 자체는 통행 허가가 아니다. 먼저 move 사건으로 실제 통과해야 한다.
- `move`: npc_id, region, place, activity. region은 W1~W5/E1~E4/S1~S4/CW/CE/CS. 외국 이동에는 border={route,open:true,approved:true,permit_id,issuer_id,authority,purpose,valid_until} 필요. route는 BORDER-WE-01/WS-01/ES-01이고 왕국 쌍이 일치해야 한다. GM은 실제 발급 권한·명성·신원·임무·폐쇄 여부를 BORDER_REPUTATION.md에 따라 확인해야 한다. 엔진은 명시적 증빙과 유효기간을 검사하며 미완성 PATCH3의 법률 판정 전체를 대체하지 않는다.
- `condition`: npc_id, injuries=[공개 부상 문자열 최대10개], fatigue=rested/tired/exhausted, major_event=사건ID 또는 null. 능력치·HP는 기존 npc_updates/전투 정산 사용. 전투 outcome.injuries는 플레이어 부상이므로 전체 NPC에 복제하지 않는다.
- `companion`: npc_id, accompanying=true/false. 시작은 실제 대면 중인 NPC만 가능. GM이 일정·계약·본인 의사를 판정하며 높은 호감도만으로 허용하지 않는다.
- `experience`: npc_id, action, result, location, affection_delta(-200~200 정수; 최종 -100~100 제한), follow_up, player_witnessed(boolean), participants=[실제 NPC 목격자 ID 최대16개]. 직접 만남/전투/동행 근거가 없는 플레이어 경험이나 다른 권역의 즉시 목격은 거절한다. participants는 같은 사건을 기억하며 별도의 호감도 보상은 받지 않는다. 의뢰 보상 호감도와 중복 지급 금지.
- `rumor`: memory_id, from_npc, to_npc, channel=witness/merchant/guild/priest/military/resident, arrives_at, message, distorted(boolean). 발신자의 기억 또는 이미 받은 소문이 있어야 한다. 도착일은 발신일 이후다. 정확한 이동 날짜는 GM이 경로·전쟁 상황으로 판정하고 엔진이 임의 고정 속도를 만들지 않는다. 수신 전에는 수신자의 대화 맥락에 들어가지 않는다.
- `relay`: rumor_id, player_heard(boolean). 소문이 도착한 수신자와 실제 대화할 때만 플레이어 전달 기록 가능.
- `npc_relation`: from_npc, to_npc, relation(우정/경쟁/사사/상하/협력 등 서사 문자열), player_known(boolean). 플레이어 관계 수치와 별개인 사건 사실이며 추가 수치 게이지를 만들지 않는다.
- `region_effect`: region, effect, changes={security/tradeRisk/morale/food/treasury/warRisk/monsterRisk/prices:유한 변경량}, player_known(boolean). source_id는 승리한 실제 전투, 완료·실패·포기한 의뢰 또는 증거가 있는 world_events만 허용한다. 대사만으로 지역을 변경하지 않는다. PATCH4의 미정 초기 수치나 경제 배율을 발명하지 않고 사건별 변화량과 누적 변경량을 보존한다.

## 일정과 기억 운영

날짜 변경 또는 확정 사건 때만 현재 장면·동행·활성 의뢰 발행자·중요 사건 NPC를 갱신한다. 나머지는 실제 접근할 때 지연 계산한다. 첫 만남, 전투 참여, 의뢰 상태 변경은 엔진이 자동 기억한다. 확정 일정이 없는 인물에게 직업별 통상 활동의 엔진 기본 순환을 사용하며 장소·소속·전력·전쟁 명령을 자동 발명하지 않는다. 출병/이주/특별 의뢰/중요 정치 행동은 GM 사건/일정으로 확정한다. 이 통상 활동은 신규 세계관 정설이 아니다.

현재 날짜를 모르더라도 기존 게임의 첫 만남·전투 기억은 저장 가능하지만 명시적 life_events와 날짜 시뮬레이션에는 실제 날짜가 필요하다. 읽기·애니메이션·다시보기는 시간을 소비하지 않는다.

현재 NPC/동행/의뢰 관련 인물에 대한 제한된 맥락만 GPT 요청에 포함한다. 첫 만남은 장기 맥락에서도 유지한다. `personality`, `duty`는 공개 원본에서 가져온다. NPC는 자기 기억·도착한 소문만 알며, 다른 NPC 기록·플레이어 일지·국가 기밀을 공유 지식으로 사용하지 않는다. 높은 호감도도 국가 의무를 지우지 않는다. 자유 입력 및 GM 선택지 2~4개는 유지한다.

## 저장과 UI

선택 필드 `npc_life`는 snapshots(npcs), 요약 memories, 중복 방지 applied, 전달 중 rumors, NPC 관계 links, 지역 traces로 나뉜다. 구세이브에 없으면 기존 키를 그대로 유지한다. 새 게임은 이 기록을 초기화하고 기존 진행은 previousGame에만 보존한다. 이벤트 10,000/기억2,000/소문128/관계256/지역사건512/문자열2MB 상한을 두고 한도 초과는 명시적 복구 안내와 함께 거절한다. 중복 방지 기록을 자동 삭제하지 않는다.

정보창/모험 일지는 player_witnessed/player_known인 사건만 표시한다. UI의 개인 관계는 `relationships[id].affection` 하나만 사용하고 옛 interest/trust/familiarity를 합산하지 않는다. 추가 인물 행동 버튼은 실제 GPT 요청이며 성공을 자동 처리하지 않는다.

브리지 v1에 읽기 전용 getNPCLife(id), getAdventureJournal(), getRegionImpact(region) 추가. getRegionImpact는 공개 사건의 누적 변경량이며 절대 초기 치안·재정 값이 아니다.
