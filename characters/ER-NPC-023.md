# 캐릭터 설정 시트 — 레베카 노스

제작 기준: CHARACTER_PIPELINE.md · PORTRAIT_RULES.md · STANDING_ART_RULES.md · UI_RULES.md. 이번 사용자 일괄 제작 지시를 우선한다.

## 1. 기본 정보 [확정·roster]
- ID: ER-NPC-023 / 종족: 인간 / 분류: 사회 인물
- 소속: 영시기록원 / 활동 권역: W2 / 계급: 중급 사제
- 원본 roster 버전: 2.1-normalized-starting-hp. 능력치는 원본을 조회하며 이미지 제작 과정에서 변경하지 않는다.
- 출신·관계·주인공 여부·구체적 목표·말투: 미정.

## 2. 외모와 분위기
[확정] 여42 잿빛 땋은머리 갈색 눈 남청 기록복
[확정 seed] 자존심이 강하고 경쟁적
[아트 제안] right30degrees; arms folded below chest. 소속 복식과 연령을 반영하고 세린 얼굴·갑옷은 복제하지 않는다. 미지정한 눈색·장식은 시안이며 정설로 확정하지 않는다.

## 3. 성격과 말투
roster seed를 기본 인상에 반영한다. 대사·말투·추가 성격·숨겨진 설정: 미정.

## 4. 역할·관계
roster의 소속·계급·지역을 유지. 새 권능·가문·관계·비밀을 추가하지 않는다. 마수는 종의 대표 예시이며 유일한 개체라고 확정하지 않는다.

## 5. 표정
base만 제작. smile/angry/surprised/sad/embarrassed/afraid/annoyed/love는 미제작. 반복 등장 인물은 후속 후보이며 추가 표정의 우선순위는 미정.

## 6. 고정 디자인
기준 이미지에서 머리·눈·얼굴·체형·복식·장비를 고정하고 복장·액션은 별도 자산으로 관리한다.

## 7. 금지
세린 복제, 현대 장비, 같은 포즈 반복, 숫자·텍스트·로고, 원본 잘림, 가짜 투명 배경, 미등록 표정 표시, 비밀 누설 금지.

## 8. 규격
세린 standing/base.png와 base_transparent.png의 화풍 참고. 전신 1024×1536 RGBA, 사방 최소5%. 인간 초상화 1086×1448 RGBA. 마수는 투명 초상화 중심이며 인간 전신 형식을 강제하지 않는다. 좌표·여백·해시는 배치 manifest 생성 후 기록한다. 배치값은 임시 검수용.

## 9. 기록
사용자 일괄 제작 요청에 따른 신규 기본형 시안. 최종 디자인 승인 대기. 기존 자산 덮어쓰기 없음.
- standing: `assets/characters/standings/ER-NPC-023/base.png` — 1024×1536 RGBA, 여백 [60, 85, 61, 85], SHA-256 `99e99de35f5703f538521d484bf43d06837237e6bbb7b5916d8b1656b6c6c262`
- portrait: `assets/characters/portraits/dialogue/ER-NPC-023/base.png` — 1086×1448 RGBA, 여백 [0, 0, 0, 0], SHA-256 `9dbb1366daf3cb39dad140a9f1e5f5d8ee00faac0dec6aea74b4ecb1573d4bd5`
- 배치: `batch_03` / 외형·소속 기준: `characters/npc_roster_100.json`

## 10. 제작 요약
위 고유 외형·소속·계급을 2D 카툰 중세 판타지 원화로 번역한다. 부위·무기·망토를 모두 포함하고 투명도를 검증한다.
