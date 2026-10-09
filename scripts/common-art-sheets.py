from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
plan=json.loads((root/'artifacts/common-npcs/generation-plan.json').read_text(encoding='utf-8'))
for job in plan['jobs']:
    c=job['specification']; slug=c['id'].lower().replace('-','_')
    text=f'''# 캐릭터 설정 시트 — {c['name']}

제작 기준: [공식 생활형 roster](../common_npc_roster.json), [초상화 규칙](../../PORTRAIT_RULES.md), [스탠딩 규칙](../../STANDING_ART_RULES.md), [제작 파이프라인](../../CHARACTER_PIPELINE.md).

## 기본 정보
- [확정: roster] ID: {c['id']} / 제작 식별자: {slug}
- 이름: {c['name']}
- 성별·나이·종족: {c['gender']} · {c['age']} · {c['species']}
- 직업·소속: {c['job']} · {c['affiliation']}
- 기본 활동 지역: {c['kingdom']} · {c['location_id']} {c['region']}; 현재 장소·시간은 미정
- 능력치·경지·스킬·재산·관계: 미정, 이 제작에서 부여하지 않음

## 고정 외형
- 체형·얼굴: {c['appearance']}
- 머리: {c['hair']}
- 눈: {c['eyes']}
- 복장: {c['outfit']}
- 팔레트: {', '.join(c['colors'])}
- 소품: {', '.join(c['props'])}
- 실루엣: {c['silhouette']}
- 인물별 제작 제한: {c['image_notes']}

## 성격·말투
- {c['personality']}
- {c['speech_style']}
- 표정: 기본 인상만 제작. 추가 8표정은 이번 범위 밖.
- 목표·인물 관계·비밀: 미정. 새 조직·문장·마왕 연관을 만들지 않음.

## 제작 및 승인
- 사용자 요청: 생활형 24명 초상화·전신 모두 제작, 2026-10-09
- 참조 커밋: {plan['source_commit']}
- 화풍 참조: {plan['style_reference']} (세린은 화풍만 참조, 외모는 복제하지 않음)
- 초상화 목표: 1086×1448 RGBA 투명 PNG, 반신
- 스탠딩 목표: 1024×1536 RGBA 투명 PNG, 전신·발끝·소품 포함, 사방 약 5% 여백
- 생성 방식: built-in image_gen. 최종 프롬프트: artifacts/common-npcs/generation-plan.json
- 기준 원화 승인: 사용자 최종 검수 대기. 정식 엔진 레지스트리와 분리된 초안 경로에 저장.
- 초상화: {job['portrait_path']}
- 전신: {job['standing_path']}
- 수치·투명도·파일 검수: artifacts/common-npcs/validation.json에 기록 예정
- CDN/UI 확인: 제작 완료 후 기록. 코드 작성만으로 성공으로 표시하지 않음.
'''
    path=root/'characters/common'/f'{slug}.md';path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():raise RuntimeError(f'Existing sheet: {path}')
    path.write_text(text,encoding='utf-8')
print('Created 24 source-grounded art sheets before image production.')
