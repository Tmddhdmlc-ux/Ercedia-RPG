# 캐릭터 설정 시트 — 멜리사 베크

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-013 / 제작 식별자: er_com_013
- 이름: 멜리사 베크
- 성별·나이·종족: 여성 · 42 · 인간
- 직업·소속: 상인 · 독립 금속 잡화 상인
- 기본 활동 지역: 드라켄 · E2 아이젠크로네 공작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 168cm, 단단한 체형, 높은 광대와 오른쪽 눈 밑 작은 점.
- 머리: 검갈색 머리를 낮은 둥근 쪽머리로 고정, 얇은 은색 머리핀 하나.
- 눈: 차가운 갈색, 눈매가 길고 집중되어 있다.
- 복장: 청록색 긴 조끼, 회백색 셔츠, 짙은 바지, 단순한 허리 주머니와 가죽화.
- 팔레트: 짙은청록 #376C72, 회백색 #D0D6D2, 밤갈색 #5E493D
- 소품: 보통 철제 버클 견본 두 개, 작은 접이식 저울
- 실루엣: 곧은 긴 조끼와 단정한 쪽머리, 양손의 작은 견본.
- 인물별 제작 제한: 유명 상단 문장이나 귀족 보석을 추가하지 않는다. 견본은 일반 잡화로 표현한다.

## 성격·말투
- 계산이 빠르고 품질 문제에는 솔직하지만 흥정에는 단호하다.
- 또렷한 존댓말, 품질·가격·기한을 차례대로 말한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-013/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-013/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
