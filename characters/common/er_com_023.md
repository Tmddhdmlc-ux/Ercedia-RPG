# 캐릭터 설정 시트 — 셀다 네트

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-023 / 제작 식별자: er_com_023
- 이름: 셀다 네트
- 성별·나이·종족: 여성 · 34 · 인간
- 직업·소속: 어부 · 영지 주민 · 연안 어업과 그물 수선 종사자
- 기본 활동 지역: 루메린 · S2 세르반 공작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 169cm, 탄탄한 어깨와 팔, 햇볕에 바랜 피부와 짧은 손톱.
- 머리: 검은 곱슬머리를 목덜미의 낮은 묶음으로 정리, 청록색 천 머리띠.
- 눈: 진한 청갈색, 눈매가 길고 집중되어 있다.
- 복장: 아이보리 작업 셔츠, 바랜 청색 허리 앞치마, 튼튼한 갈색 바지와 짧은 장화.
- 팔레트: 바랜청색 #6B91A1, 아이보리 #E3DCC8, 갈색 #80624B
- 소품: 접은 그물, 작은 목재 실 감개
- 실루엣: 탄탄한 상체와 묶은 곱슬머리, 한 팔에 걸친 접힌 그물.
- 인물별 제작 제한: 신체와 그물의 경계를 명확하게 한다. 바다 배경이나 왕실 해군 복장을 넣지 않는다.

## 성격·말투
- 침착하고 손재주가 좋다. 거친 날씨에도 무리한 출항은 막는다.
- 명료한 존댓말, 물때와 그물 상태를 구체적으로 설명한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-023/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-023/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
