# 캐릭터 설정 시트 — 테오 파르

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-020 / 제작 식별자: er_com_020
- 이름: 테오 파르
- 성별·나이·종족: 남성 · 45 · 인간
- 직업·소속: 재봉사 · 독립 의복 수선·제작 노동자
- 기본 활동 지역: 루메린 · S3 아쿠아렌 백작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 170cm, 가는 체형, 긴 손가락과 가늘고 정돈된 콧수염.
- 머리: 검은 머리에 옅은 회색이 섞임, 단정한 귀 뒤 넘김과 짧은 뒷머리.
- 눈: 어두운 갈색, 부드러운 눈꺼풀과 집중한 시선.
- 복장: 회청색 긴 조끼, 흰빛 아마 셔츠, 허리 앞치마, 곧은 바지와 천 덧댄 신발.
- 팔레트: 회청색 #718998, 아마색 #DCD3BE, 짙은갈색 #574A41
- 소품: 접은 재단용 천, 허리에 단 작은 가위와 실패
- 실루엣: 긴 조끼의 좁은 직선과 허리의 작은 도구 주머니.
- 인물별 제작 제한: 바늘을 얼굴 가까이 들지 않는다. 새 길드 표식을 추가하지 않는다.

## 성격·말투
- 세심하고 인내심이 있다. 실용성과 착용자의 편안함을 우선한다.
- 조용하고 정확한 존댓말, 치수와 수선 범위를 재확인한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-020/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-020/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
