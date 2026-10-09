# 캐릭터 설정 시트 — 이레나 비올

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-019 / 제작 식별자: er_com_019
- 이름: 이레나 비올
- 성별·나이·종족: 여성 · 26 · 인간
- 직업·소속: 악사 · 독립 거리 악사
- 기본 활동 지역: 루메린 · S4 솔메리아 백작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 166cm, 유연하고 가벼운 체형, 오른쪽 볼의 작은 보조개.
- 머리: 구리빛 붉은 머리, 어깨 아래 물결을 반쯤 묶고 짧은 옆머리를 남긴다.
- 눈: 맑은 녹색, 눈꼬리가 부드럽게 올라간다.
- 복장: 산호색 짧은 겉옷, 아이보리 블라우스, 청록색 긴 치마와 낮은 가죽화.
- 팔레트: 산호색 #BF7764, 아이보리 #E9E0CF, 청록색 #4E7D7C
- 소품: 소형 목재 류트, 허리의 무늬 없는 천 주머니
- 실루엣: 길게 흐르는 치마와 가슴 아래로 비스듬한 류트.
- 인물별 제작 제한: 악기는 얼굴 아래에 둔다. 마법 음표·왕실 음악가 휘장을 추가하지 않는다.

## 성격·말투
- 낙천적이고 청중의 반응을 잘 읽는다. 사적인 이야기는 캐묻지 않는다.
- 부드럽고 리듬감 있는 존댓말. 과장된 노랫말과 실제 소식을 구별한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-019/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-019/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
