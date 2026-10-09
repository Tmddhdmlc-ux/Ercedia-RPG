# 캐릭터 설정 시트 — 마레나 펜

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-002 / 제작 식별자: er_com_002
- 이름: 마레나 펜
- 성별·나이·종족: 여성 · 39 · 인간
- 직업·소속: 농부 · 영지 주민 · 곡물 재배 농가
- 기본 활동 지역: 벨로아 · W3 엘름베르크 백작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 165cm, 튼튼한 체형, 햇볕에 그을린 피부와 양 볼의 옅은 주근깨.
- 머리: 밀빛 갈색 머리를 낮은 두 갈래 땋기로 묶고 바랜 천 두건을 쓴다.
- 눈: 맑은 회녹색, 둥근 눈과 웃을 때 깊어지는 눈가 주름.
- 복장: 두꺼운 아마 블라우스, 무릎 아래 갈색 치마, 넓은 작업 앞치마, 흙 묻은 가죽화.
- 팔레트: 밀색 #C8AA68, 흙갈색 #7C6245, 크림색 #E7DDC5
- 소품: 작은 밀 이삭 묶음, 왼손의 씨앗 주머니
- 실루엣: 넓은 앞치마와 두 갈래 땋은 머리, 안정적인 삼각형 하체.
- 인물별 제작 제한: 밀 이삭은 가슴 아래에 둔다. 귀족 드레스나 과도한 장식을 피한다.

## 성격·말투
- 실용적이고 이웃을 잘 챙긴다. 날씨와 식량 낭비에 민감하다.
- 편안한 존댓말, 작황과 날씨를 구체적으로 이야기한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-002/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-002/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
