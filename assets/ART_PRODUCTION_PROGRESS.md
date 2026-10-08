# 에르세디아 RPG 이미지 제작 현황 — 워크 2

기준일: 2026-10-09 (Asia/Seoul). 원본 main: `72f702e`.

실제 파일 생성·알파/크기/ID 검증·시각 검수 완료 기준이며 UI 전체 연결 완료와 구별한다.

| 분야 | 검수 완료 | 전체 슬롯 |
|---|---:|---:|
| 장비 | 1 | 300 |
| 책 | 70 | 70 |
| 전리품 | 1 | 40 |
| 장소 | 1 | 261 |

총 검수 완료: **73/671**.

## 목록과 재개 기준

- [전체 671개 ID·경로·원본·상태](art-production/asset_plan.json)
- [통합 제작 지시서](ART_PRODUCTION_INSTRUCTIONS.md)
- [희귀도 테두리 추가 확정](../ITEM_RARITY_RULES.md): PNG에는 등급 테두리/광륜 없음.
- [책 10템플릿 시각 검수](art-production/book-template-qa.json)
- 생성형 이미지: 내장 imagegen. 책 표지색 변형·ID별 복제: 사용자 지시서에 따른 결정적 자동 처리.
- 책의 여섯 원소 심볼은 선택 사항이며 이번 공통 템플릿에서는 마술서 공통 마법진을 사용한다.
- 전리품 원본에 `rarity`가 없음. `monster_rank`나 `value_class`를 임의로 아이템 희귀도로 바꾸지 않는다.
- 실제 브라우저/VN 플레이·CDN 표시 검수는 미완료. 오프라인 합성 검수는 실제 플레이 성공으로 기록하지 않는다.

## 배치 기록

### books-batch-01

- 대상/완료 ID: BK-SWD-001, BK-SWD-002, BK-SWD-003, BK-SWD-004, BK-SWD-005, BK-SWD-006, BK-SWD-007, BK-SWD-008, BK-SWD-009, BK-SWD-010, BK-SWD-011, BK-SWD-012, BK-SWD-013, BK-SWD-014, BK-SWD-015, BK-SWD-016, BK-SWD-017, BK-SWD-018, BK-SWD-019, BK-SWD-020, BK-SWD-021, BK-SWD-022, BK-SWD-023, BK-SWD-024, BK-SWD-025
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [books-batch-01.json](art-production/books-batch-01.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `88dbc8e72b2836116cc2ecd59fdd3f3f27ba82d4`

### books-batch-02

- 대상/완료 ID: BK-SWD-026, BK-SWD-027, BK-SWD-028, BK-SWD-029, BK-SWD-030, BK-SPL-001, BK-SPL-002, BK-SPL-003, BK-SPL-004, BK-SPL-005, BK-SPL-006, BK-SPL-007, BK-SPL-008, BK-SPL-009, BK-SPL-010, BK-SPL-011, BK-SPL-012, BK-SPL-013, BK-SPL-014, BK-SPL-015, BK-SPL-016, BK-SPL-017, BK-SPL-018, BK-SPL-019, BK-SPL-020
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [books-batch-02.json](art-production/books-batch-02.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `2e72dbd9f3e7628c6f2297b5d87c6280d20713f8`

### books-batch-03

- 대상/완료 ID: BK-SPL-021, BK-SPL-022, BK-SPL-023, BK-SPL-024, BK-SPL-025, BK-SPL-026, BK-SPL-027, BK-SPL-028, BK-SPL-029, BK-SPL-030, BK-SPL-031, BK-SPL-032, BK-SPL-033, BK-SPL-034, BK-SPL-035, BK-SPL-036, BK-SPL-037, BK-SPL-038, BK-SPL-039, BK-SPL-040
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [books-batch-03.json](art-production/books-batch-03.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `9935e0e74f3e37f2bd0448efac950ef62520c01a`

### samples-batch-01

- 대상/완료 ID: ER-EQ-001, MAT-001-1, IMG-W1-OVERVIEW
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [samples-batch-01.json](art-production/samples-batch-01.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `업로드 전`

