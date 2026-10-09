# 화폐·경제 엔진 검증

UI 2.1.10. 장면·브리지·저장 버전1 유지. 원본 이미지671개 및 세계관/장비 능력치는 수정하지 않았다.

## 구현
- 동화 안전 정수 `wallet_copper` 한 개로 지급·차감·곱셈·저장. 금화/은화/동화는 화면 환산이다. currency는 비직렬화 호환 접근자이며 독립 잔액을 저장하지 않는다.
- 캐릭터 생성 완료 시 시작500동화+initial_currency_granted. 이전 캐릭터 저장, 재시작, 장면 이동, 불러오기에는 지급하지 않는다.
- VN 상단 압축 지갑, 상태/가방 공통 잔액, 모바일 상세 펼침, 일시적인 증감 피드백.
- 실제 견적·등록NPC·매입 예산·매입 유형·수량·재고·소유권·명성/교육허가·기한 검증 후 원자적 구매/판매/시설 서비스. 상인 예산은 견적을 새로 발급해도 재충전하지 않는다.
- 40마수 재료 판매, 마수 일반 화폐 드롭 금지, 확인된 인간/현상금/보물 출처의 유한 화폐 수령, 신물11개 일반 거래 차단.
- 의뢰 보고가 동일 지갑에 지급하며 영구 claim_event_id를 유지. 확정 예산/근거 필드를 보존하고 지급액보다 부족한 예산을 거절한다.
- 최고 입찰액·최소 증가액·기한·예치·판매자/개체 확인. 입찰금은 재사용할 수 없고 다른 참가자가 최고가를 갱신하면 이전 예치금을 즉시 반환. 낙찰품과 대금은 실제 소유 원장으로 이전. 플레이어 출품/등록NPC의 유한 자금 입찰/취소 반환 지원.
- 실제 전쟁/습격/흉작/봉쇄/공급/수요 증거와 적용 기간을 기록하여 가격/재고/예산에 반영. 월간 calendar_result.market과 연결. 매 프레임 전체 NPC를 계산하지 않는다.
- 벨로아 제작·군수, 드라켄 정식 마술서 명성20/교육허가, 루메린 기존 항구/훈련 시설을 유지. 임의의 일률 가격이나 훈련 경지 상승을 추가하지 않는다.

## 필수 시나리오
최신 main의 동시 작업(설정 동기화·화면 배치)을 합친 뒤 전체204개 검사, 실패0. `node --test tests/*.test.mjs`로 확인했다. 경제 전용21개 검사에는 필수01~15와 실패/호환성 추가 검사가 포함된다.

`tests/economy.test.mjs`의 번호01~15가 지시서 항목에 대응한다. 추가 검사: 플레이어 출품 판매자 정산, 신물11개, 견적 재발급 예산, 가방 가득 참/합산 오버플로, 책·재료 개체 저장/식별자 충돌, 유한 보물 지급/마수 화폐 거절. 전체 회귀에는 기존 전투·성장·자동전투·NPC·국경·장비·의뢰·런처 검사도 포함한다.

실제 브라우저에서 배포용 integration/game.html을 불러와 공개 gameBridge.updateScene/getWallet/getEconomy/getGameState/restoreGameState와 실제 파서·정산·UI·메모리 저장을 사용했다. 합성 GM 사건 흐름 결과:

| 단계 | 실제 동화 잔액 |
|---|---:|
| 캐릭터 생성 | 500 |
| 일반 여관1박 | 400 |
| 빵3개 구매 | 385 |
| 빵1개 판매 | 387 |
| 실제 목표·보고 후 약속 보수 | 887 |
| 경매80동화 예치·낙찰 | 807 |
| 저장·복원 | 807 |

PC1280×900과 모바일390×844에서 상품 상세, 수량2 입력, 소유량/자금 부족 버튼 상태, 모바일 지갑 펼침을 확인했다. 화면: [PC](../artifacts/economy/pc-shop.jpg), [모바일](../artifacts/economy/mobile-shop.jpg), [모바일 지갑](../artifacts/economy/mobile-wallet.jpg).

재현: `node tampermonkey/build.mjs`, `node tests/build-economy-preview.mjs`, `node server.mjs` 실행 후 `/artifacts/economy/preview-host.html`. 검증 페이지는 실제 배포 번들에 합성 시작 상태와 메모리 저장만 제공하며 사용자 실제 세이브에 쓰지 않는다. 생성한 대형 HTML 두 개는 Git 추적에서 제외한다.

GitHub 배포 확인: 엔진 커밋 `4b768b08edf6870c9be6c003175002625992ced9`, 고정 커밋의 원격 game.html은 update-manifest.json의 SHA-256과 일치하며 UI버전2.1.10을 확인했다.

## 기존 저장 호환성
기존 currency의 유효한 정수는 같은 숫자의 동화로 보존한다. wallet_copper가 이미 있으면 그 값(0 포함)이 우선. 잔액이 없는 구형 저장은 추가 시작금을 받지 않는다. 잘못된 금액은 거절하며 음수·소수·범위 밖 값을 반올림하지 않는다. 구형 견적의 미확인 매입 예산은0, 상인 판매대금 범위에서 매입. 구형 경매는 공고별 외부판매자 원장을 사용하고 신규 공고는 실제 판매자·소유 개체·증가액을 요구한다.

## 변경 파일
- 원장/경제: web/wallet.js, web/economy.js, web/economy-data.js, web/economy-engine.js, web/world-engine.js, web/state.js, web/new-game-state.js, web/quest-model.js, web/engine-model.js, web/inventory.js.
- UI/요청: web/wallet-ui.js, web/shop-ui.js, web/world-ui.js, web/quest-ui.js, web/app.js, web/style.css, web/scene.js, web/chat-ui.js, index.html.
- 연동/빌드: integration/game-bridge.js, integration/version.json, integration/game.html, integration/update-manifest.json, tampermonkey/build.mjs, tampermonkey/economy-build.mjs.
- 규격/검사: CURRENCY_ECONOMY.md, tampermonkey/ENGINE_SCHEMA.md, tampermonkey/WORLD_ENGINE_SCHEMA.md, tampermonkey/ECONOMY_SCHEMA.md, tests/economy-fixtures.js, tests/economy.test.mjs, tests/build-economy-preview.mjs, tests/location-art.test.mjs, tests/quests.test.mjs, tests/vn-usability.test.mjs, 이 문서, 캡처3개, .gitignore.

## 남은 검증과 한계
실제 ChatGPT 웹사이트 및 설치된 Tampermonkey의 로그인 세션은 이번 도구 환경에 노출되지 않았다. 실제 서비스에서 AI가 작성한 경제 응답의 자동 송수신, 장기 플레이, 업데이트 적용은 미검증이다. 위15번은 배포용 실제 브리지와 ChatGPT 메시지 채널을 합성 호스트/응답으로 검증한 결과이며 실제 ChatGPT 서비스 플레이 성공을 뜻하지 않는다. 매월 사건·소식·가격 인과관계는 GM이 실제 조건을 판정해야 하며 예정 달력이나 클릭만으로 재난/보상을 자동 생성하지 않는다.
