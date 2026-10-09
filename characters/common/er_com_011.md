# 캐릭터 설정 시트 — 니카 펠트

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-011 / 제작 식별자: er_com_011
- 이름: 니카 펠트
- 성별·나이·종족: 여성 · 24 · 인간
- 직업·소속: 전령 · 영지 연락 업무를 맡는 민간 전령
- 기본 활동 지역: 드라켄 · E3 베르크슈타인 후작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 170cm, 긴 다리와 날렵한 체형, 얼굴에 옅은 바람 자국.
- 머리: 검청색 짧은 머리, 귀 뒤로 넘긴 앞머리와 짧은 뒷머리.
- 눈: 맑은 회청색, 시선이 또렷하다.
- 복장: 짧은 남색 여행 외투, 밝은 회색 셔츠, 좁은 바지, 종아리 가죽 각반.
- 팔레트: 남색 #344B65, 회백색 #CBD2D3, 가죽색 #77573D
- 소품: 밀봉된 문서 통, 가슴을 가로지르는 작은 가죽 가방
- 실루엣: 짧은 외투와 대각선 가방끈, 길고 가벼운 하체.
- 인물별 제작 제한: 문서의 내용과 군사 기밀은 보이지 않게 한다. 새 군부대 문장을 붙이지 않는다.

## 성격·말투
- 부지런하고 전달 내용을 함부로 덧붙이지 않는다.
- 빠르지만 정확한 존댓말. 전달 내용과 자기 의견을 분리한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-011/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-011/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
