# PATCH 5 구현 및 검증

## 선행 상태 (main 3737a63 확인)

- PATCH1: 성장/포인트 투자, 소유 장비 장착, 기술서 학습, 일부 전투 잠재능력 존재. 모든 잠재능력과 직업 등록 법률의 완결판은 아님.
- PATCH2: 의뢰의 던전 진입/클리어 증거와 지역 던전 도감은 존재. 던전 구역 진행/재생성/전리품 엔진은 main에 미완성.
- PATCH3: 의뢰 보상의 단일 호감도는 존재. 일반 관계 사건 처리·국경 검문·통행증 엔진은 미완성.
- PATCH4: 날짜/지역 스냅샷과 공식 행사 데이터 존재. 전세계 월간 시뮬레이션·거래/경매 실정산은 미완성.
- 별도 저장된 PATCH2 작업을 이번 변경으로 덮어쓰지 않음. 새 생활 엔진은 실제 기존 인터페이스에 연결하고 미완성 기능을 완성됐다고 주장하지 않음.

## 구현 범위

이벤트 기반 직업별 통상 활동과 확정 일정, 위치 이동 검증, 조건·동행·관련 의뢰·중요 사건 기록, 구조화 기억·호감도 원자 정산, 첫 만남/전투/의뢰 자동 기억, 지연된 소문, NPC 간 관계 사실, 실제 사건의 지역 변화량, 기존 NPC 정보창 및 의뢰탭 모험 일지, 상황별 주요4개+추가 행동 메뉴, 자유 입력 유지.

지역 변화는 사건의 GM 판정 변경량을 저장하고 누적하여 맥락/브리지에 제공. PATCH4의 전체 월간 경제·전쟁 계산을 구현한 것은 아님. 국경은 명시적인 GM 승인/발급 증명과 개방 관문을 검증; PATCH3의 플레이어 입국 엔진 전체를 대신하지 않음. 새 OpenAI API 및 런처 재설치 없음.

## 검증

- 자동 검사: 기존100개(최신 캐릭터 원화 검사 포함) + 신규13개 통과(빌드 후 총113개). 첫 만남/호감도/재회 맥락, 이전 장소 출현 거절, 날짜 일정 변경, 국경 승인과 유효기간, 소문 지연/비공개 기억 제외, 의뢰 수락·진행 기억, 저장 복원, 지역 변화 증거/중복, NPC 관계, 전투 기억 중복 방지, 채팅 적용 실패 시 주인공·장비 원자 보존 확인.
- 실제 로컬 브라우저: 별도 저장의 고정 GM 응답으로 타이틀 불러오기 → 세린 첫 만남·호감도20/기억2 → 인물 메뉴 주요4개/추가 행동/정보 보기 → 개인 의뢰 수락·경비초소 이동 → 3일 후 재회·의뢰 진행/기억4 → 저장 복원 → 390px iframe에서 인물 상세 및 의뢰탭 모험 일지 확인.
- 모바일 검증은 390px 반응형 화면의 브라우저 클릭/터치 크기 확인이며 실제 휴대전화 하드웨어 터치 시험은 아님.
- 실제 ChatGPT GM의 장기 자연 대화와 사용자 설치 Tampermonkey에서의 PATCH5 송수신은 미검증. 고정 대사는 테스트 fixture에만 있고 제품은 GPT 요청으로 동적 생성한다.
- 화면 증거: artifacts/npc-life-mobile.png, artifacts/npc-life-journal.png. 실행: http://localhost:4173/tests/npc-life-demo.html (서버 필요, 실제 세이브와 분리).

## 변경 파일
핵심 엔진: web/npc-life.js, web/npc-life-ui.js. 통합: web/state.js, web/scene.js, web/chat-ui.js, web/npc-info.js, web/npc-model.js, web/character-art.js, web/app.js, web/campaign-settings.js, web/style.css, integration/game-bridge.js. 공개 성격 데이터: tampermonkey/catalog-build.mjs, web/catalog-data.js. 배포: integration/version.json, integration/game.html, integration/update-manifest.json. 문서: BOOTSTRAP.md, tampermonkey/NPC_LIFE_SCHEMA.md. 검증: tests/npc-life.test.mjs, tests/npc-life-demo.html, 본 문서와 artifacts/npc-life-*.png.
최종 빌드는 캐릭터 원화/배치 연결 main e276cc2를 통합했다. 생활 이동 기록이 지역 NPC 목록 및 전투 스냅샷의 현재 위치보다 우선하며, 원화와 숫자 능력치는 보존한다.

