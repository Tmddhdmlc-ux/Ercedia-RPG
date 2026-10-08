# 베이직 나이트 세린

- 캐릭터: 세린
- 머리카락: 금발
- 눈: 푸른 눈
- 의상: 은색 갑옷
- 화풍: 카툰풍
- 구도: 세린의 단독 초상화
- 초상화 파일 경로: `assets/characters/main/serin/base.png`

## 업로드 상태

사용자가 제공한 베이직 나이트 세린의 원본 PNG를 `base.png`로 등록했습니다.

## 표정 이미지 — 2026-10-08 등록

사용자의 업로드·분류 요청에 따라 제공된 이미지 3장을 직접 확인하고 아래와 같이 분류했다. 파일명만 지정했으며 원본 이미지 바이트는 변경하지 않았다.

| 원본 파일명 | 등록 파일 | 표정 및 관찰 근거 |
| --- | --- | --- |
| 세린 표정 | `smile.png` | 밝은 웃음·기쁨. 입을 벌려 웃고 눈매가 부드럽다. |
| 세린 표정2 | `angry.png` | 화남·못마땅함. 눈썹을 찌푸리고 눈매가 날카로우며 입을 다물고 입꼬리를 내렸다. 격노보다는 가벼운 분노·불만에 어울린다. |
| 세린 표정3 | `surprised.png` | 놀람·당황. 눈을 크게 뜨고 입을 벌렸으며 땀방울과 머리 옆 강조선이 있다. |

기존 `base.png`는 입을 다문 부드러운 미소의 기준 초상화로 유지한다. 세 변형 모두 기준 이미지의 금발 포니테일, 푸른 눈, 은색 갑옷, 남색 망토, 자세 및 배경을 육안으로 비교 확인했다. 볼의 홍조만으로 부끄러움 표정으로 분류하지 않는다.

### 채팅 UI용 CDN 주소

- 밝은 웃음: `https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/smile.png`
- 화남·못마땅함: `https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/angry.png`
- 놀람·당황: `https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/surprised.png`

표시할 때는 저장소의 `PORTRAIT_RULES.md`를 먼저 읽고, AppBlock HTML의 `img src`에 위 URL을 직접 지정한다. 검색(query) 호출 및 로드 실패 시 다른 검색 이미지로 대체하는 것은 금지한다. 이번 등록의 로컬 육안 확인과 채팅 UI의 실제 표시 성공 여부는 구분한다.

## 배경 제거 이미지 — 2026-10-08 등록

- 파일: `base_transparent.png`
- 용도: 시뮬레이션 채팅에서 마을 배경 위에 세린을 겹쳐 표시하는 투명 초상화.
- 원본: `base.png`. 내장 이미지 편집 도구로 배경 제거 파생본을 생성했다.
- 형식: PNG, 1086 × 1448, RGBA. 알파 채널의 실제 투명 영역을 확인했다.
- 생성 지시: 마을·성·하늘 배경만 제거하고 얼굴, 표정, 금발, 푸른 눈, 갑옷, 망토, 자세와 구도를 유지하도록 요청했다.
- 채팅 UI용 CDN 주소: `https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/base_transparent.png`