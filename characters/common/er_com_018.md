# 캐릭터 설정 시트 — 루치오 마렌

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-018 / 제작 식별자: er_com_018
- 이름: 루치오 마렌
- 성별·나이·종족: 남성 · 38 · 인간
- 직업·소속: 상인 · 독립 생활 잡화 상인
- 기본 활동 지역: 루메린 · S2 세르반 공작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 177cm, 날씬한 체형, 둥근 눈썹과 작은 콧수염.
- 머리: 꿀갈색 물결 머리, 귀를 덮지 않는 길이와 단정한 옆가르마.
- 눈: 청록색, 눈빛이 밝고 표정 변화가 크다.
- 복장: 청금색 짧은 조끼, 크림색 셔츠, 통이 넓지 않은 바지, 얇은 천 허리띠.
- 팔레트: 청금색 #477D9B, 크림색 #E8DFC9, 황갈색 #B29261
- 소품: 접은 무늬 없는 천 견본, 작은 목재 가격판
- 실루엣: 짧은 조끼와 넓게 벌리지 않은 팔, 손에 든 천 견본.
- 인물별 제작 제한: 가격판에는 특정 금액이나 읽을 수 있는 상호를 넣지 않는다. 유명 상단 소속으로 표현하지 않는다.

## 성격·말투
- 사교적이고 가격 설명에 능숙하다. 물건의 결함은 거래 전에 말한다.
- 활기 있는 존댓말. 친근하게 권하지만 강매하지 않는다.
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
- 초상화: assets/characters/common/drafts/ER-COM-018/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-018/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
