# 캐릭터 설정 시트 — 오스벤 밀러

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-005 / 제작 식별자: er_com_005
- 이름: 오스벤 밀러
- 성별·나이·종족: 남성 · 51 · 인간
- 직업·소속: 빵집 주인 · 독립 빵집 운영자
- 기본 활동 지역: 벨로아 · W3 엘름베르크 백작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 173cm, 둥근 배와 두꺼운 손, 웃을 때 볼에 깊은 주름.
- 머리: 밝은 갈색 짧은 머리에 흰머리가 섞임, 작은 흰 천 작업 모자.
- 눈: 옅은 청회색, 잘 웃는 반달형 눈.
- 복장: 크림색 셔츠, 갈색 조끼, 밀가루 묻은 긴 앞치마, 편한 작업 바지.
- 팔레트: 크림색 #E6DDC8, 빵갈색 #A7794D, 흰색 #F3EFE4
- 소품: 작은 둥근 빵 두 개, 접은 주방 수건
- 실루엣: 둥근 상체와 넓은 앞치마, 팔꿈치를 벌린 편안한 자세.
- 인물별 제작 제한: 빵과 수건은 허리 높이에 둔다. 실제 상호나 간판을 새로 확정하지 않는다.

## 성격·말투
- 인심이 좋지만 외상 약속은 정확히 기억한다.
- 느긋한 존댓말, 식사 여부를 먼저 묻되 가격은 명확하게 안내한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-005/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-005/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
