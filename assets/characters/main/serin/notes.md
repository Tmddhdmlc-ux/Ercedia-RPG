# 베이직 나이트 세린

- 캐릭터: 세린
- 머리카락: 금발 포니테일
- 눈: 푸른 눈
- 의상: 은색 갑옷과 금색 장식, 남색 망토
- 화풍: 카툰풍
- 구도: 입을 다문 부드러운 미소의 단독 초상화
- 현재 기준 이미지: `assets/characters/main/serin/base_transparent.png`
- 형식: PNG, 1086 × 1448, RGBA. 실제 투명 알파 영역 확인.
- 용도: 마을 배경 위에 겹쳐 표시하는 시뮬레이션 채팅 전경 캐릭터.
- 채팅 UI용 CDN 주소: `https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/base_transparent.png`

## 이미지 정리 — 2026-10-08

사용자 요청에 따라 배경이 있는 기본·웃음·화남·놀람 초상화 4장을 저장소의 현재 버전에서 삭제했다. 투명 초상화 `base_transparent.png`만 현재 등록 이미지로 사용한다.

기존 기본 초상화에서 내장 이미지 편집 도구로 배경을 제거한 파일이다. 현재 웃음·화남·놀람의 별도 투명 표정 파일은 미등록 상태다. 해당 표정이 필요하면 기준 투명 초상화를 유지하고 미등록 사실을 알린다.

표시 시 최신 `PORTRAIT_RULES.md`와 `UI_RULES.md`를 적용한다. 투명 PNG의 알파 채널 및 GitHub 등록 확인과 대화 UI에서의 실제 표시 성공은 구분한다.

## 공통 얼굴 표정 — 2026-10-08

사용자 선택 전신 세린 원화를 기준으로 복장과 독립된 얼굴 표정 9종을 `faces/`에 추가했다. base, smile, angry, surprised, sad, embarrassed, afraid, annoyed, love이며 모두 512×512 RGBA PNG다. 목과 의상은 제외하고 얼굴과 앞머리 테두리만 포함한다. 기본 표정은 선택 원화에서 추출하고 나머지 표정은 같은 참조로 생성·정렬했다. 알파 윤곽과 얼굴 배치는 9종 동일하다.

비교 이미지는 [faces/preview.png](faces/preview.png), 상세 기록은 [faces/manifest.json](faces/manifest.json), 사용 범위는 [faces/README.md](faces/README.md)를 확인한다. 기존 반신·전신 기본형은 보존했다. 전신 표정 파일이나 복장별 합성 결과가 아니며 복장 연동은 별도 작업이다. 위의 초상화 표정 미등록 기록은 이전 반신 파일에 대한 기록이다.
