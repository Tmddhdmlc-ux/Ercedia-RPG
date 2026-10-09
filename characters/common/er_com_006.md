# 캐릭터 설정 시트 — 리네트 모어

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-006 / 제작 식별자: er_com_006
- 이름: 리네트 모어
- 성별·나이·종족: 여성 · 28 · 인간
- 직업·소속: 양치기 · 영지 주민 · 소규모 양 사육 농가
- 기본 활동 지역: 벨로아 · W5 아르덴슈타인 백작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 162cm, 작고 날렵한 체형, 코 위의 옅은 주근깨.
- 머리: 모래빛 금발을 한 갈래로 땋아 어깨 앞으로 넘김, 잔머리가 많다.
- 눈: 밝은 올리브색, 눈매가 길고 부드럽다.
- 복장: 짧은 양모 어깨 망토, 풀색 튜닉, 무릎까지 오는 치마 바지, 낡은 장화.
- 팔레트: 풀색 #70815A, 양모색 #D8D0BC, 모래색 #BFA06B
- 소품: 구부러진 목재 양치기 지팡이, 작은 목제 호루라기
- 실루엣: 짧은 망토와 긴 지팡이가 만드는 비대칭 실루엣.
- 인물별 제작 제한: 양과 목초지는 배경에 넣지 않는다. 지팡이 끝은 얼굴과 겹치지 않게 한다.

## 성격·말투
- 느긋해 보이지만 동물의 이상 행동을 세심하게 살핀다.
- 차분한 짧은 존댓말. 동물의 행동을 빗대어 설명한다.
- 표정: 기본 인상만 제작. 추가 8표정은 이번 범위 밖.
- 목표·인물 관계·비밀: 미정. 새 조직·문장·마왕 연관을 만들지 않음.

## 제작 및 승인
- 사용자 요청: 생활형 24명 초상화·전신 모두 제작, 2026-10-09
- 참조 커밋: 82de876da2378777bd59a6608cc1789a5327a255
- 화풍 참조: assets/characters/main/serin/base_transparent.png (세린은 화풍만 참조, 외모는 복제하지 않음)
- 초상화 목표: 1086×1448 RGBA 투명 PNG, 반신
- 스탠딩 목표: 1024×1536 RGBA 투명 PNG, 전신·발끝·소품 포함, 사방 약 5% 여백
- 생성 방식: built-in image_gen. 최종 프롬프트: artifacts/common-npcs/generation-plan.json
- 기준 원화 승인: 사용자 최종 검수 대기. 정식 엔진 레지스트리와 분리된 초안 경로에 저장.
- 초상화: assets/characters/common/drafts/ER-COM-006/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-006/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
