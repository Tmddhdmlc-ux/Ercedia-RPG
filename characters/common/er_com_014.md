# 캐릭터 설정 시트 — 라덴 크로스

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: ER-COM-014 / 제작 식별자: er_com_014
- 이름: 라덴 크로스
- 성별·나이·종족: 남성 · 36 · 인간
- 직업·소속: 용병 · 독립 고용 용병
- 기본 활동 지역: 드라켄 · E3 베르크슈타인 후작령; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: 184cm, 탄탄한 체형, 왼쪽 입가의 오래된 흉터와 넓은 턱.
- 머리: 짙은 갈색 짧은 머리, 뒤로 넘긴 앞머리와 짧은 턱수염.
- 눈: 회녹색, 지친 듯하지만 흔들리지 않는 눈매.
- 복장: 가죽 덧댄 회색 외투, 평범한 쇠 팔목 보호대, 짙은 바지와 낡은 장화.
- 팔레트: 철회색 #636B70, 가죽갈색 #72513C, 먹색 #323C43
- 소품: 칼집에 든 평범한 장검, 작은 여행 배낭
- 실루엣: 넓은 어깨와 허리 옆 칼집, 여행 배낭이 만든 두꺼운 옆선.
- 인물별 제작 제한: 기사단 문장·고유능력 효과·경지 표식을 넣지 않는다. 전투 수치는 미지정이다.

## 성격·말투
- 계약 범위를 중시하고 불필요한 싸움을 피한다.
- 낮고 정중한 존댓말. 의뢰 범위와 위험부터 확인한다.
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
- 초상화: assets/characters/common/drafts/ER-COM-014/portrait.png
- 전신: assets/characters/common/drafts/ER-COM-014/standing.png
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과
- CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.
