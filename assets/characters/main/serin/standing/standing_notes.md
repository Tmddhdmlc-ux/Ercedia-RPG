# 세린 스탠딩 복장 초안 — 2026-10-08

사용자가 첨부한 전신을 가장 선호한다고 지정하여 복장 제작 기준으로 보관했다.

| 파일 | 역할 | 상태 |
| --- | --- | --- |
| drafts/armor_reference.png | 사용자가 선택한 갑옷 전신 참고 | 첨부 원본 보존 |
| drafts/nightwear.png | 아이보리 긴 잠옷, 남색 리본, 실내화 | 새 복장 초안 |
| drafts/casual.png | 크림 블라우스, 남색 조끼·치마, 검정 스타킹, 갈색 부츠 | 새 복장 초안 |

내장 이미지 편집 도구를 사용했다. 생성 지시는 선택한 전신의 금발 포니테일, 푸른 눈, 얼굴, 평온한 표정과 화풍을 유지하고 복장만 변경하는 것이었다. 각 PNG는 1024 × 1536 RGBA이며 실제 알파 범위는 0–254다. 주변의 반투명한 빛 번짐이 남아 완전히 정리된 게임용 투명 컷아웃은 아니다. 생성 결과의 얼굴 위치·크기 및 몸체 구도가 서로 달라 직접 공유 가능한 표정 레이어 정렬 상태도 아니다. 정식 standing/base.png나 기존 반신 원화를 덮어쓰지 않는다.

## 복장 간 표정 공유 설계

복장별 몸체와 공통 얼굴 표정을 독립된 투명 이미지 레이어로 분리한다. 같은 캔버스, 얼굴 크기·각도·좌표, 목 접합 위치, 앞머리 가림 순서와 발 앵커를 맞춘 후 복장 몸체 위에 같은 얼굴 표정 레이어를 합성할 수 있다. 얼굴 크기·위치가 다른 현재 초안은 먼저 정렬해야 한다. 표정 공유는 설계 제안이며 아직 레이어 추출·실제 UI 구현·검증은 수행하지 않았다. 이번에는 복장 기본형 두 장만 제작했다.

## CDN 주소

- 잠옷: https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/standing/drafts/nightwear.png
- 평상복: https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/standing/drafts/casual.png
## 복장 비율 보정본 — 2026-10-08

사용자의 명시적 허용에 따라 일반 이미지 처리로 PNG 파일 자체의 크기·위치를 정렬했다. 화면 CSS만 조정한 결과가 아니다. 표정 9종 제작은 사용자 요청으로 잠시 중지했으며 아직 생성하지 않았다.

### 현재 사용할 파일

- 갑옷 기준: `base.png` (기존 파일이 없어 신규 생성; 첨부 갑옷 원본 및 반신 원화는 보존)
- 잠옷: `outfits/nightwear/base.png`
- 평상복: `outfits/casual/base.png`

세 파일은 모두 1024 × 1536 RGBA PNG이며, 알파 0–255를 확인했다. 원본의 미세한 비인물 알파 잔여값을 제거하고 투명 픽셀의 RGB도 0으로 정리했다. 이전 미리보기의 빛 번짐 판정은 투명 픽셀의 RGB까지 보이는 미리보기에 영향을 받았으며 실제 배경 합성에서는 같은 현상이 나타나지 않았다.

갑옷을 기준으로 머리 특징점을 정렬했다. 잠옷 머리 배율 약 87.9%, 평상복 약 90.6%; 정합 특징점의 중앙 오차는 각각 약 0.78px, 0.57px다. 머리 영역을 고정하고 목 아래 몸체의 세로 길이를 연속 보정해 발 하단을 y=1404px에 맞췄다. 머리 상단은 갑옷·잠옷 y=193px, 평상복 y=194px로 1px 차이다. 모든 방향에 최소 8.53% 안전 여백이 있다. 상세 변환과 검수 수치는 `outfit_alignment.json`에 기록했다.

복장별 옷의 폭·길이와 발 모양은 디자인 차이로 보존했다. 얼굴 그림 자체는 각각 생성된 결과이므로 같은 크기·위치로 정렬되었어도 픽셀 단위로 동일하지 않다. 공통 얼굴 표정 레이어 제작 시 이 보정본을 기준으로 얼굴 패치와 가림 마스크를 고정해야 한다.

`prototypes/serin_outfit_alignment.html`에서 같은 이미지 요소 크기와 앵커로 갑옷·잠옷·평상복 전환을 확인했다. UI 크기 보정 없이 세 파일을 동일 크기로 표시하며 마을 배경과 실제 합성했다.

### 보정본 CDN 주소

- 갑옷: https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/standing/base.png
- 잠옷: https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/standing/outfits/nightwear/base.png
- 평상복: https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/standing/outfits/casual/base.png

`drafts/` 파일들은 이전 생성 원본 보관용이며 화면용으로 사용하지 않는다.