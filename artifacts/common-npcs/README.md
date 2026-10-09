# 생활형 NPC 24명 기본 원화 검수

`characters/common_npc_roster.json`의 ER-COM-001~024를 기준으로 각 인물의 반신 초상화와 전신 스탠딩을 제작한다. 능력치·소속·지역·공식 설정을 추가하지 않는다.

제작 완료: 24명, 반신 24장 + 전신 24장 = 48장. 파일 규격·RGBA 투명도·전신 안전 여백 검사 48/48 통과. 이미지 커밋 `53782e9a2b37a55c774538697597f23f298c48c0`의 GitHub raw CDN 48/48에서 HTTP 200, PNG 디코딩, 크기·알파·원본 파일 해시 일치를 확인했다. 상세 결과는 `cdn-validation.json`에 보존한다.

## 결과 구조

- `assets/characters/common/drafts/[ID]/portrait.png`: 1086×1448 RGBA 투명 반신.
- `assets/characters/common/drafts/[ID]/standing.png`: 1024×1536 RGBA 투명 전신, 사방 5% 이상 안전 여백.
- `characters/common/er_com_001.md`~`er_com_024.md`: 원본 roster를 반영한 캐릭터 시트.
- `characters/common/art_drafts.json`: 생성 파일과 검수 상태 목록. 엔진 등록 목록과 분리.
- `generation-plan.json`: 실제 사용한 기본 생성·수정 프롬프트, 기준 문서와 경로.
- `validation.json`: 크기·알파·여백·파일 해시 검사.
- `west-preview.jpg`, `east-preview.jpg`, `south-preview.jpg`: 왕국별 8명 비교.
- `prototypes/common_npc_art.html`: 24명 초상화/전신 비교, 왕국 필터와 밝은/어두운 배경 확인.

## 생성 및 정리

내장 image_gen으로 한 파일씩 생성했다. 세린은 화풍 참조로만 사용하고, 각 전신은 해당 인물의 초상화를 참조했다. 사용자가 허용한 일반 이미지 처리로 알파 노이즈를 정리하고, 종횡비를 유지한 축소와 투명 여백을 적용했다. 전신은 임시 발 앵커 `(512,1459)`를 공유하며 roster의 키에 비례해 크기를 정리했다. 이 수치는 게임 엔진의 확정 배치 좌표가 아니다.

원본 생성 파일은 Codex 생성 이미지 폴더에 보존했다. 기존 승인 원화와 엔진 레지스트리는 교체하지 않는다. 표정 추가 제작은 이번 작업에 포함하지 않는다.

## 승인 및 확인 범위

현재 파일은 사용자 최종 검수 대기 초안이다. 파일 검사와 비교 이미지 육안 검수는 정식 원화 승인과 구분한다. 브라우저 클릭 시연, 실제 ChatGPT/Tampermonkey 플레이, 엔진 등록은 이 제작 범위에서 수행하지 않는다. 공개 CDN 파일 검사는 업로드 후 별도 기록한다.

세부 나이 인상·흉터·점·귀·머리 묶음과 손/소품의 자연스러움은 원본 크기에서 최종 검수할 수 있다. 작은 얼굴 식별점은 표시 크기에 따라 읽히는 정도가 달라질 수 있다.
