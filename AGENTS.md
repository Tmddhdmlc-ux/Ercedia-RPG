## 새 대화/새 AI 작업 인수인계

사용자가 '에르세디아 RPG'를 시작하거나 이 저장소의 게임 설정을 참조하라고 하면 **BOOTSTRAP.md**부터 읽고 해당 문서의 지식 단계와 우선순위를 따른다. 저장소와 현재 대화가 자동 동기화된다고 가정하지 않는다. 세계관 상위 비밀은 일반 NPC 대사에 노출하지 않는다.

# UI 작업 원칙

- UI는 사용자가 채팅에서 사용할 기능을 기준으로 개발한다.
- UI 변경 작업이 끝나면 GitHub 저장소 `Tmddhdmlc-ux/Ercedia-RPG`에 변경사항을 반영하고 실제 업로드 여부를 확인한다. 사용자 변경사항을 덮어쓰거나 강제 푸시하지 않는다.
- 사용자가 직접 실행·확인하므로 별도 요청이 없으면 브라우저를 조작해 시연하거나 클릭 테스트하지 않는다. 필요한 코드 검증 후 실행 링크를 제공한다.
- 기존 세계관과 이미지 파일을 임의 변경하지 않는다. UI_RULES.md, PORTRAIT_RULES.md, STANDING_ART_RULES.md를 따른다.
- Tampermonkey 런처는 UI와 분리한다. 일반 UI 수정에서 런처 재설치를 요구하지 않는다. integration/game-bridge.js v1, 장면 스키마 v1, 저장 버전 1의 호환성을 유지한다.
- UI 또는 등록 이미지 수정 후 integration/version.json 및 integration/assets.json을 확인하고 빌드 의존성을 `npm ci --ignore-scripts`로 준비한 뒤 node tampermonkey/build.mjs로 integration/game.html과 update-manifest.json을 생성해 GitHub에 함께 반영한다. 런처는 승인된 업데이트 적용 시에만 엔진을 교체하며 대화 중 업데이트를 보류한다.
- 실제 ChatGPT/Tampermonkey 실행, 20턴 플레이 및 업데이트 시나리오를 확인하지 않았다면 성공 검증으로 기록하지 않는다. 사용자가 검증을 생략하도록 요청하면 구현과 배포만 진행하고 미검증 범위를 명시한다.
