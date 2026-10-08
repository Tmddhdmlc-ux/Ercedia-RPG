# 에르세디아 RPG 이미지 제작 현황 — 워크 2

기준일: 2026-10-09 (Asia/Seoul). 원본 main: `72f702e`.

실제 파일 생성·알파/크기/ID 검증·시각 검수 완료 기준이며 UI 전체 연결 완료와 구별한다.

| 분야 | 검수 완료 | 전체 슬롯 |
|---|---:|---:|
| 장비 | 300 | 300 |
| 책 | 70 | 70 |
| 전리품 | 1 | 40 |
| 장소 | 1 | 261 |

총 검수 완료: **372/671**.

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

### equipment-batch-01

- 대상/완료 ID: ER-EQ-001, ER-EQ-002, ER-EQ-003, ER-EQ-004, ER-EQ-005, ER-EQ-006, ER-EQ-007, ER-EQ-008, ER-EQ-009, ER-EQ-010, ER-EQ-011, ER-EQ-012, ER-EQ-013, ER-EQ-014, ER-EQ-015, ER-EQ-016, ER-EQ-017, ER-EQ-018, ER-EQ-019, ER-EQ-020, ER-EQ-021, ER-EQ-022, ER-EQ-023, ER-EQ-024, ER-EQ-025
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-01.json](art-production/equipment-batch-01.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `cb7d698175ccc0f44a350a4b5c60633683ad9870`

### equipment-batch-02

- 대상/완료 ID: ER-EQ-026, ER-EQ-027, ER-EQ-028, ER-EQ-029, ER-EQ-030, ER-EQ-031, ER-EQ-032, ER-EQ-033, ER-EQ-034, ER-EQ-035, ER-EQ-036, ER-EQ-037, ER-EQ-038, ER-EQ-039, ER-EQ-040, ER-EQ-041, ER-EQ-042, ER-EQ-043, ER-EQ-044, ER-EQ-045, ER-EQ-046, ER-EQ-047, ER-EQ-048, ER-EQ-049, ER-EQ-050
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-02.json](art-production/equipment-batch-02.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `ab55ca4a735a502b044ee471b9876015f5b854d0`

### equipment-batch-03

- 대상/완료 ID: ER-EQ-051, ER-EQ-052, ER-EQ-053, ER-EQ-054, ER-EQ-055, ER-EQ-056, ER-EQ-057, ER-EQ-058, ER-EQ-059, ER-EQ-060, ER-EQ-061, ER-EQ-062, ER-EQ-063, ER-EQ-064, ER-EQ-065, ER-EQ-066, ER-EQ-067, ER-EQ-068, ER-EQ-069, ER-EQ-070, ER-EQ-071, ER-EQ-072, ER-EQ-073, ER-EQ-074, ER-EQ-075
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-03.json](art-production/equipment-batch-03.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `a4d18efb87285dfe2a447e76ab58057ac7963821`

### equipment-batch-04

- 대상/완료 ID: ER-EQ-076, ER-EQ-077, ER-EQ-078, ER-EQ-079, ER-EQ-080, ER-EQ-081, ER-EQ-082, ER-EQ-083, ER-EQ-084, ER-EQ-085, ER-EQ-086, ER-EQ-087, ER-EQ-088, ER-EQ-089, ER-EQ-090, ER-EQ-091, ER-EQ-092, ER-EQ-093, ER-EQ-094, ER-EQ-095, ER-EQ-096, ER-EQ-097, ER-EQ-098, ER-EQ-099, ER-EQ-100
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-04.json](art-production/equipment-batch-04.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `f72ae0364f6b6cbd86ed8ccd1dc586200bfbf322`

### equipment-batch-05

- 대상/완료 ID: ER-EQ-101, ER-EQ-102, ER-EQ-103, ER-EQ-104, ER-EQ-105, ER-EQ-106, ER-EQ-107, ER-EQ-108, ER-EQ-109, ER-EQ-110, ER-EQ-111, ER-EQ-112, ER-EQ-113, ER-EQ-114, ER-EQ-115, ER-EQ-116, ER-EQ-117, ER-EQ-118, ER-EQ-119, ER-EQ-120, ER-EQ-121, ER-EQ-122, ER-EQ-123, ER-EQ-124, ER-EQ-125
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-05.json](art-production/equipment-batch-05.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `0455bc61e338eba8def29210d7fdea54c2694046`

### equipment-batch-06

- 대상/완료 ID: ER-EQ-126, ER-EQ-127, ER-EQ-128, ER-EQ-129, ER-EQ-130, ER-EQ-131, ER-EQ-132, ER-EQ-133, ER-EQ-134, ER-EQ-135, ER-EQ-136, ER-EQ-137, ER-EQ-138, ER-EQ-139, ER-EQ-140, ER-EQ-141, ER-EQ-142, ER-EQ-143, ER-EQ-144, ER-EQ-145, ER-EQ-146, ER-EQ-147, ER-EQ-148, ER-EQ-149, ER-EQ-150
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-06.json](art-production/equipment-batch-06.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `79c45d16e03530d84ba7516e23f0e89bf85f22a1`

### equipment-batch-07

- 대상/완료 ID: ER-EQ-151, ER-EQ-152, ER-EQ-153, ER-EQ-154, ER-EQ-155, ER-EQ-156, ER-EQ-157, ER-EQ-158, ER-EQ-159, ER-EQ-160, ER-EQ-161, ER-EQ-162, ER-EQ-163, ER-EQ-164, ER-EQ-165, ER-EQ-166, ER-EQ-167, ER-EQ-168, ER-EQ-169, ER-EQ-170, ER-EQ-171, ER-EQ-172, ER-EQ-173, ER-EQ-174, ER-EQ-175
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-07.json](art-production/equipment-batch-07.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `1f535eb5ebef26dda97136e3a77107a77fab5ecb`

### equipment-batch-08

- 대상/완료 ID: ER-EQ-176, ER-EQ-177, ER-EQ-178, ER-EQ-179, ER-EQ-180, ER-EQ-181, ER-EQ-182, ER-EQ-183, ER-EQ-184, ER-EQ-185, ER-EQ-186, ER-EQ-187, ER-EQ-188, ER-EQ-189, ER-EQ-190, ER-EQ-191, ER-EQ-192, ER-EQ-193, ER-EQ-194, ER-EQ-195, ER-EQ-196, ER-EQ-197, ER-EQ-198, ER-EQ-199, ER-EQ-200
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-08.json](art-production/equipment-batch-08.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `722df5c374bd9916d293048c909c2024a6644503`

### equipment-batch-09

- 대상/완료 ID: ER-EQ-201, ER-EQ-202, ER-EQ-203, ER-EQ-204, ER-EQ-205, ER-EQ-206, ER-EQ-207, ER-EQ-208, ER-EQ-209, ER-EQ-210, ER-EQ-211, ER-EQ-212, ER-EQ-213, ER-EQ-214, ER-EQ-215, ER-EQ-216, ER-EQ-217, ER-EQ-218, ER-EQ-219, ER-EQ-220, ER-EQ-221, ER-EQ-222, ER-EQ-223, ER-EQ-224, ER-EQ-225
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-09.json](art-production/equipment-batch-09.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `54577daf31b078c806cf296858465b985669c058`

### equipment-batch-10

- 대상/완료 ID: ER-EQ-226, ER-EQ-227, ER-EQ-228, ER-EQ-229, ER-EQ-230, ER-EQ-231, ER-EQ-232, ER-EQ-233, ER-EQ-234, ER-EQ-235, ER-EQ-236, ER-EQ-237, ER-EQ-238, ER-EQ-239, ER-EQ-240, ER-EQ-241, ER-EQ-242, ER-EQ-243, ER-EQ-244, ER-EQ-245, ER-EQ-246, ER-EQ-247, ER-EQ-248, ER-EQ-249, ER-EQ-250
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-10.json](art-production/equipment-batch-10.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `4d1263374023c257d19e16f422dd99d911a6ee1e`

### equipment-batch-11

- 대상/완료 ID: ER-EQ-251, ER-EQ-252, ER-EQ-253, ER-EQ-254, ER-EQ-255, ER-EQ-256, ER-EQ-257, ER-EQ-258, ER-EQ-259, ER-EQ-260, ER-EQ-261, ER-EQ-262, ER-EQ-263, ER-EQ-264, ER-EQ-265, ER-EQ-266, ER-EQ-267, ER-EQ-268, ER-EQ-269, ER-EQ-270, ER-EQ-271, ER-EQ-272, ER-EQ-273, ER-EQ-274, ER-EQ-275
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-11.json](art-production/equipment-batch-11.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `b68d22fe4724ab575d2d0baec828cea46ac1d04e`

### equipment-batch-12

- 대상/완료 ID: ER-EQ-276, ER-EQ-277, ER-EQ-278, ER-EQ-279, ER-EQ-280, ER-EQ-281, ER-EQ-282, ER-EQ-283, ER-EQ-284, ER-EQ-285, ER-EQ-286, ER-EQ-287, ER-EQ-288, ER-EQ-289, ER-EQ-290, ER-EQ-291, ER-EQ-292, ER-EQ-293, ER-EQ-294, ER-EQ-295, ER-EQ-296, ER-EQ-297, ER-EQ-298, ER-EQ-299, ER-EQ-300
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [equipment-batch-12.json](art-production/equipment-batch-12.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `업로드 전`

### samples-batch-01

- 대상/완료 ID: ER-EQ-001, MAT-001-1, IMG-W1-OVERVIEW
- 미완료 ID: 없음
- 실패 이유: 없음
- 파일 경로/템플릿/검증: [samples-batch-01.json](art-production/samples-batch-01.json) 및 전체 자산 목록 참조.
- 이미지 업로드 커밋: `4a369bf5c59289e5b668636614c9e511911592e6`

