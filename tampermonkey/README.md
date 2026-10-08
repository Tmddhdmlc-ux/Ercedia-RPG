# 에르세디아 RPG · Tampermonkey 고정 런처 v1.1.1

기존 `index.html`과 `web/` UI를 ChatGPT 웹페이지에 고정하는 런처입니다. 추가 OpenAI API, 키, 내부 인증정보, 비공식 API를 사용하지 않습니다. GitHub 게임 UI 업데이트는 런처 재설치 없이 받을 수 있습니다.

**현재 상태: 구현본 / 실제 ChatGPT + Tampermonkey 환경 미검증.** 사용자 요청으로 추가 실행 검증을 중단했습니다. 모의 페이지에서 일부 코드 실행을 확인했으나 v1.1 전체 업데이트 시나리오와 실제 20턴 대화는 통과한 것으로 기록하지 않습니다. 페이지 CSP, 확장 설정, ChatGPT DOM 변화에 따라 연결이나 프레임 실행이 실패할 수 있습니다. 실패를 우회하지 않고 수동 화면을 안내합니다.

## 설치

1. Chrome 또는 Edge에 Tampermonkey를 설치하고 확장 사용을 켭니다. 브라우저에서 유저스크립트 실행 권한을 요구하면 Tampermonkey의 공식 안내에 따라 설정합니다. [공식 문서](https://www.tampermonkey.net/documentation.php)
2. [런처 설치 파일](https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/main/tampermonkey/ercedia-rpg.user.js)을 엽니다. 자동 설치 화면이 열리지 않으면 Tampermonkey에서 새 스크립트를 만들고 파일 전체를 붙여넣어 저장합니다.
3. `https://chatgpt.com/`을 새로고침합니다. 처음에는 GitHub의 게임 UI를 다운로드하므로 인터넷 연결이 필요합니다. localhost 서버는 설치형 런처에 필요하지 않습니다.
4. 기본 창 크기는 최대 960×760px입니다. 오른쪽 아래 ◢를 드래그해 크기를 조절하고 제목을 드래그해 이동합니다. 크기·위치는 저장됩니다. `창 기본 크기`로 되돌립니다. 게임 창 상단에 현재 UI 버전과 커밋이 표시됩니다. `게임 종료`를 누르면 원래 ChatGPT 화면을 사용할 수 있고, `에르세디아 열기`로 동일 창을 다시 표시합니다.

독립 수동 게임 화면: 저장소에서 `node server.mjs` 실행 → [게임 모드](http://localhost:4173/?game=1). 일반 UI 미리보기는 [기존 화면](http://localhost:4173/)입니다. 이 링크들은 해당 PC의 서버가 켜져 있을 때만 동작합니다.

## 게임을 시작하는 채팅

게임 창을 여는 데 채팅 조건은 없습니다. 설치된 런처가 게임 UI를 불러옵니다. 로더 주소는 https://tmddhdmlc-ux.github.io/Ercedia-RPG/integration/frame.html 입니다. 로더 준비 실패·게임 실행 오류·이미지 대기 시간을 구분해 표시합니다. 페이지 정책으로 외부 프레임이 차단되면 아래 독립 화면을 사용하세요.

실제 게임 진행은 GPT가 세계관과 출력 규격을 알아야 합니다. 처음 시작하는 채팅에 다음 메시지를 보내세요. 저장소 열람이 안 되면 필요한 공개 설정과 예시 JSON을 직접 붙여넣으세요. 비밀 설정을 읽더라도 NPC가 모든 진실을 아는 것으로 처리하지 않아야 합니다.

> https://github.com/Tmddhdmlc-ux/Ercedia-RPG 를 읽고 에르세디아 RPG의 게임 마스터로 진행해줘. WORLD.md, GODS.md, KINGDOMS.md, UI_RULES.md, tampermonkey/README.md와 example-scene.json을 참고해. 개발자용 비밀은 NPC 지식과 구분하고 일반 대사에 노출하지 마. 결과는 schema_version 1의 ercedia_scene JSON 코드블록으로 출력하고, 행동 요청에 reply_to가 있으면 그대로 포함해. 아직 정하지 않은 주인공 정보·아이템·지명을 임의로 확정하지 마.

## 대화와 수동 연결

자동 연결은 기본적으로 꺼져 있습니다. 게임 화면의 `응답 JSON 수동 적용`에 [예시 JSON](example-scene.json)을 붙여넣어 `장면 적용`을 누를 수 있습니다. 예시는 UI 확인용이며 정설 사건이나 실제 플레이어 소지품을 만들지 않습니다.

장면의 대사가 끝나면 선택지를 누를 수 있습니다. 자유 대화·행동은 선택지와 무관하게 입력할 수 있습니다. 행동을 제출하면 현재 상태 요약을 포함한 요청문이 생성됩니다. `요청 복사` → 원본 ChatGPT 입력창에 직접 붙여넣고 전송 → 완료된 JSON 응답을 수동 적용합니다. 같은 장면 ID는 다시 반영하지 않습니다. 잘못된 응답은 기존 화면과 게임 상태를 보존합니다. 답변이 중단되면 `대기 해제` 후 원본 전송 여부를 확인하세요. 자동 재전송은 없습니다.

`디버그 모드`는 게임 창을 옆으로 줄여 원본 ChatGPT를 함께 볼 수 있게 합니다. 원본 메시지를 삭제하거나 재작성하지 않습니다. `게임 모드`는 큰 고정 창으로 돌아옵니다. 캐릭터 스튜디오·복장/표정 수동 조절·좌표 슬라이더는 게임 모드 UI에서 숨겨지고 기존 배치 및 얼굴 합성 값은 유지됩니다.

## 자동 연결 시험

`자동 연결 시험`을 켜면 선택·자유 행동을 공개 페이지의 입력창에 넣고 전송 버튼 클릭을 시도합니다. 작성 중인 원본 입력은 덮어쓰지 않습니다. 최근 assistant 메시지의 코드블록만 확인하고, 생성 중지 버튼이 사라지고 DOM 변경이 잠잠해진 뒤 JSON을 적용합니다. 전체 채팅을 반복 해석하지 않습니다.

이 기능은 ChatGPT DOM 선택자에 의존하며 **실제 연결 성공은 미검증**입니다. 실패하면 원본 입력창에서 직접 전송하거나 요청 복사를 사용하세요. 자동 감지가 스트리밍 완료를 잘못 판단하면 파싱 오류를 안내하고 기존 장면을 유지합니다. 일반 문장 답변만으로는 장면을 바꾸지 않으며, 완료된 구조화 JSON이 필요합니다.

브라우저 저장 상태가 모델의 기억이 되지는 않습니다. 매 행동의 요청문에는 현재 장면·능력치·소지품·퀘스트·관계·날짜/시간·사건·최근 대사가 포함됩니다. AI를 시작하는 채팅에서는 저장소의 세계관 파일을 별도로 읽도록 지시하세요. 런처는 비밀 세계관 원문을 화면에 표시하거나 모든 NPC의 지식으로 자동 전달하지 않습니다.

## GitHub UI 업데이트

런처는 첫 실행·페이지 새로고침·게임 모드 진입과 실행 중 10분 간격으로 `main` 최신 커밋을 확인합니다. 모드 전환으로 반복 요청하지 않도록 간격을 제한하며 `최신 버전 확인`은 수동 재확인입니다. GitHub의 비인증 요청 제한이나 네트워크 오류가 나면 마지막 실행 UI를 유지합니다. [GitHub 요청 제한 안내](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

새 커밋의 `integration/update-manifest.json`과 `integration/game.html`을 같은 확정 SHA 주소로 다운로드합니다. HTML·CSS·JavaScript는 하나의 번들이며 SHA-256 검증값을 확인합니다. 게임 이미지도 그 SHA로 고정합니다. UI 파일 또는 등록 이미지가 바뀐 경우 `업데이트 적용` 버튼이 표시됩니다. 세계관 문서만 바뀐 커밋은 UI 교체를 요구하지 않습니다.

업데이트를 발견해도 현재 창을 자동 교체하지 않습니다. `업데이트 적용`을 누르면 현재 상태를 백업하고 새 UI를 별도 준비 프레임에서 실행합니다. 브리지 버전·저장 버전·이미지 로딩·상태 복원 결과를 확인한 뒤 같은 고정 컨테이너에서 새 프레임을 표시합니다. 대사 응답 처리는 기존 프레임에서 계속하며 대화 대기 중에는 적용을 보류합니다. 검사 중에도 행동이 시작되면 전환하지 않습니다. 검사가 실패하면 준비 프레임을 제거하고 기존 UI를 남깁니다.

일반 대화·선택지·탭 전환에서는 컨테이너·프레임·이미지 노드를 재생성하지 않습니다. UI 버전 적용 때만 준비한 새 엔진으로 교체합니다. 프레임을 다른 부모로 이동해서 재로딩하지 않습니다. `이전 버전 복구`도 **현재 진행 상태**를 이전 UI로 전달하는 방식이며, 게임 진행을 과거로 되돌리는 기능이 아닙니다. 저장 형식이 호환되지 않으면 적용을 거절합니다. 현재 저장 버전 1은 마이그레이션이 필요하지 않으며 미래 변경 때 명시적인 마이그레이션을 추가해야 합니다.

## 데이터와 브리지 규격

장면 스키마 v1: `schema_version:1`, `type:"ercedia_scene"`, 매 턴 고유 `scene_id`, `location`, `time`, `background_id`, `npc`, `dialogue`, `choices`. 요청에 응답할 때는 요청문의 `reply_to` 값을 그대로 출력합니다. 대사는 1~60개, 선택지는 0개 또는 2~4개입니다. 현재 등록된 NPC는 `serin`, 복장은 armor/casual/nightwear, 얼굴은 기존 9종, 배경은 sunny_village_day입니다. 미등록 자산은 적용하지 않습니다.

`player`와 `inventory`가 생략되면 기존 정보를 유지하며, 포함될 때는 전체 새 스냅샷으로 갱신합니다. `inventory:[]`는 빈 가방입니다. `game_state`에는 date/time/region/place 문자열과 quests/relationships/events/recent_dialogue 문자열 배열(각 30개 이하)을 보낼 수 있습니다. 장면 적용으로 현재 지도 확대·열린 탭을 바꾸지 않습니다.

[game-bridge.js](../integration/game-bridge.js)의 공개 규격 v1:

```js
gameBridge.updateScene(sceneData);
gameBridge.updatePlayer(playerData);
gameBridge.updateInventory(items);
gameBridge.getGameState();
gameBridge.restoreGameState(savedState);
```

프레임 밖의 런처는 UI 내부 클래스명이나 얼굴 좌표를 읽지 않습니다. `postMessage` 규격 `channel:"ercedia"`와 프레임별 난수 token, 송신 프레임, 채팅 식별자를 확인해 데이터를 전달합니다. 게임 로더는 GitHub Pages의 별도 HTTPS 주소에서 실행합니다. 기존 srcdoc 방식은 ChatGPT 페이지 정책에 영향을 받을 수 있어 사용하지 않습니다. sandbox는 allow-scripts만 허용하며 페이지 DOM·저장소와 분리합니다. Tampermonkey의 저장 API로 채팅별 게임 상태·현재 및 이전 UI 번들을 보관합니다. 저장 실패는 안내하고 임의로 초기화하지 않습니다.

## 이후 Work 개발

- UI 수정은 `index.html`, `web/`, 등록 자산에서 진행합니다. 장면·브리지·저장 규격을 유지합니다. 새 NPC는 캐릭터 자산/얼굴 설정과 스키마 허용 목록을 확장하고 `integration/assets.json`에 승인 자산을 추가합니다.
- `integration/version.json`에서 UI 버전을 올리고 `node tampermonkey/build.mjs`로 번들을 생성해 함께 커밋합니다. 이 명령은 외부 빌드 패키지 없이 현재 모듈의 named import/export를 연결하며, 지원하지 않는 구문은 오류로 중단합니다.
- GitHub Actions도 `main`의 UI·등록 자산 변경 시 번들을 생성합니다. 저장소의 Actions 실행 및 쓰기 권한/브랜치 정책이 허용되어야 자동 생성 커밋이 가능합니다. 제한된 저장소에서는 Work가 번들을 함께 커밋합니다. [사용한 공식 checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node)
- 일반 UI 패치는 런처 코드를 변경하거나 유저스크립트를 재설치할 필요가 없습니다. 런처의 전송 방식이나 브리지 규격을 변경하는 별도 버전 업그레이드만 재설치 대상입니다.

## 사용자 확인용 자료

- [모의 ChatGPT 페이지](http://localhost:4173/tampermonkey/test-host.html): 실제 AI가 없는 별도 DOM 시험 화면입니다. 이 모의 페이지에서만 다운로드 응답을 흉내 내고 이미지 주소를 로컬 원본으로 연결합니다. localhost 서버가 필요합니다.
- `browser-test.mjs`: 별도 Playwright 환경에서 모의 20턴·9표정·탭·저장 확인을 시도하는 자료입니다. 실제 ChatGPT 20턴 확인을 대체하지 않으며 이번 작업에서는 전체 통과를 확인하지 않았습니다.
- 사용자 확인 순서: 실제 ChatGPT에서 창 유지 → 수동 장면 적용 → 자유 입력/선택지 → 저장과 새로고침 → 채팅 전환 → 최신 버전 확인/적용/복구 → 자동 연결 시험.
- 원본 이미지 변경 시험은 승인된 새 이미지가 있을 때 진행합니다. 확인 목적으로 기존 세린 원화를 덮어쓰지 않습니다.
