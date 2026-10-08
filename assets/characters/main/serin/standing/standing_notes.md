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