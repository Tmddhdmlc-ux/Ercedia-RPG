# 타격 음향 · 1차 적용

Kenney의 원본 Ogg 9개를 그대로 포함한다. 무료 CC0이며 재배포·상업 사용 가능. 원문 라이선스는 kenney/LICENSE-Impact.txt 및 LICENSE-RPG.txt.

- https://kenney.nl/assets/impact-sounds — 일반 타격 3종, 치명타 2종, 금속 방어 2종
- https://kenney.nl/assets/rpg-audio — knifeSlice, knifeSlice2 회피 2종

web/battle-audio.js가 같은 판정의 샘플을 순환한다. 전투 HP가 바뀌는 impact()에서 한 번 재생하며 판정과 수치를 변경하지 않는다. 마법도 이번 단계에서는 공통 피격음만 사용한다. 원소별 스킬음, 몬스터 울음, 메뉴 UI음은 후속 작업.

전투 제어의 '소리 켜기'를 누르면 브라우저 오디오가 활성화되고 9개 파일을 한 번 디코딩한다. 준비 전 타격은 건너뛰며 나중에 몰아서 재생하지 않는다. 기본 음량 65%, 음소거·음량은 가능한 환경에서 브라우저에 저장한다. sandbox 저장 제한 환경에서는 현재 프레임 동안 유지한다.

일시정지·다음 턴·즉시 종료·숨겨진 탭에서 남은 소리를 정지한다. 재생 속도는 타격 타이밍에만 적용하여 소리 높이를 유지한다. 네트워크 오류는 전투를 막지 않으며 '소리 켜기'로 다시 시도할 수 있다.

확인: node --test tests/battle-audio.test.mjs tests/battle-controls.test.mjs tests/battle.test.mjs

전투 UI: /tests/battle-demo.html → 데모 전투 시작 → 게임 안의 소리 켜기 → 다음 턴.
데모 저장은 실제 채팅 저장과 분리된다. 실제 ChatGPT/Tampermonkey 플레이 검증과는 별개다.
