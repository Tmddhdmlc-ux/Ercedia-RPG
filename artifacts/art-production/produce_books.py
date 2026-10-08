"""Deterministic book variants authorized by the v2.0 production brief.

Run from repository root. Does not change game rules or add rarity frames.
"""
from pathlib import Path
import argparse
import hashlib
import json
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'assets/art-production'
TEMPLATES = ROOT / 'assets/items/templates/books'
COLORS = {'하급': (126, 89, 57), '중급': (41, 117, 68), '고급': (48, 94, 160), '유니크': (119, 67, 160), '에픽': (195, 150, 51)}

def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def recolor(image, color):
    rgba = np.asarray(image.convert('RGBA')).copy()
    rgb = rgba[:, :, :3].astype(float) / 255
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    # Gray leather is dark and neutral; bright silver fittings and warm pages retain their color.
    neutral = np.clip(1 - (hi - lo) / .12, 0, 1)
    dark = np.clip((.72 - hi) / .22, 0, 1)
    weight = neutral * dark * (rgba[:, :, 3] > 0)
    target = np.array(color) / 255
    luminance = rgb.mean(axis=2)
    tinted = target[None, None, :] * (luminance[:, :, None] / .42)
    tinted = np.clip(tinted, 0, 1)
    rgba[:, :, :3] = np.rint(np.clip(rgb * (1-weight[:, :, None]) + tinted * weight[:, :, None], 0, 1) * 255).astype('uint8')
    return Image.fromarray(rgba)

def fitted(image):
    # Preserve alpha and give every final icon identical canvas dimensions and safe margins.
    bbox = image.getchannel('A').getbbox()
    if not bbox:
        raise ValueError('Empty template')
    item = image.crop(bbox)
    item.thumbnail((436, 436), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (512, 512))
    canvas.alpha_composite(item, ((512-item.width)//2, (512-item.height)//2))
    return canvas

def validate(path):
    with Image.open(path) as image:
        image.load()
        assert image.format == 'PNG' and image.mode == 'RGBA' and image.size == (512, 512), path
        alpha = image.getchannel('A')
        assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] >= 240, path
        bounds = alpha.getbbox()
        assert bounds[0] >= 24 and bounds[1] >= 24 and bounds[2] <= 488 and bounds[3] <= 488, (path, bounds)
        return {'size': [512, 512], 'mode': 'RGBA', 'alpha_extrema': list(alpha.getextrema()), 'content_bounds': list(bounds), 'sha256': sha(path)}

def plan():
    equipment = read('equipment/equipment_catalog_300.json')['items']
    books = read('items/book_catalog_70.json')['books']
    materials = read('items/loot_tables_monsters_dungeons.json')['materials']
    locations = read('assets/location_image_manifest.json')['assets']
    rows = []
    for group, records, source in [
        ('equipment', equipment, 'equipment/equipment_catalog_300.json'),
        ('books', books, 'items/book_catalog_70.json'),
        ('materials', materials, 'items/loot_tables_monsters_dungeons.json'),
        ('locations', locations, 'assets/location_image_manifest.json')]:
        for item in records:
            path = item['path'] if group == 'locations' else f"assets/items/{group}/{item['id']}.png"
            rows.append({'id': item['id'], 'name': item['name'], 'group': group, 'path': path,
                         'source': source, 'rarity': item.get('rarity'), 'priority': item.get('priority'),
                         'source_sha256': sha(ROOT / source), 'status': 'pending', 'template': None,
                         'visual_verified': False, 'file_checks': None, 'commit_sha': None})
    assert len(rows) == 671 and len({r['id'] for r in rows}) == 671
    write(ART / 'asset_plan.json', {'schema_version': 1, 'source_main_sha': '72f702eecc347cdfed6e4309a6431ee11fe2ba85', 'assets': rows})

def templates(sword, spell):
    TEMPLATES.mkdir(parents=True, exist_ok=True)
    for kind, source in [('sword_manual', sword), ('spellbook', spell)]:
        origin = Image.open(source).convert('RGBA')
        origin.save(TEMPLATES / f'{kind}-source.png')
        for tier, (rarity, color) in enumerate(COLORS.items(), 1):
            fitted(recolor(origin, color)).save(TEMPLATES / f'{kind}-tier-{tier}.png')
    sheet = Image.new('RGB', (1280, 590), '#192530')
    draw = ImageDraw.Draw(sheet)
    for row, kind in enumerate(['sword_manual', 'spellbook']):
        for col in range(5):
            icon = Image.open(TEMPLATES / f'{kind}-tier-{col+1}.png')
            icon.thumbnail((238, 238), Image.Resampling.LANCZOS)
            sheet.paste(icon, (col*256+9, row*295+12), icon)
            draw.text((col*256+20, row*295+265), f'{kind} / tier {col+1}', fill='white')
    sheet.save(ART / 'book-template-preview.png')

def batch(start, count):
    catalog = read('items/book_catalog_70.json')['books']
    data = read('assets/art-production/asset_plan.json')
    by_id = {r['id']: r for r in data['assets']}
    done = []
    for item in catalog[start:start+count]:
        tier = list(COLORS).index(item['rarity']) + 1
        template = TEMPLATES / f"{item['category']}-tier-{tier}.png"
        target = ROOT / by_id[item['id']]['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.write_bytes(template.read_bytes())
        checks = validate(target)
        assert checks['sha256'] == sha(template), item['id']
        row = by_id[item['id']]
        qa = read('assets/art-production/book-template-qa.json')
        assert sha(template) in qa['verified_template_sha256'], template
        row.update(status='verified', visual_verified=True, template=str(template.relative_to(ROOT)).replace('\\', '/'), file_checks=checks)
        done.append(item['id'])
    write(ART / 'asset_plan.json', data)
    write(ART / f'books-batch-{start//25+1:02d}.json', {'target_ids': done, 'completed_ids': done, 'file_verified_ids': done,
          'pending_ids': [], 'failures': [], 'commit_sha': None,
          'note': 'Final file hash matches visually verified template. GitHub upload must be recorded after push.'})
    print(f'Created and file-verified {len(done)} books: {done[0]} .. {done[-1]}')

def progress():
    data = read('assets/art-production/asset_plan.json')
    counts = Counter(r['group'] for r in data['assets'] if r['status'] == 'verified')
    totals = Counter(r['group'] for r in data['assets'])
    lines = ['# 에르세디아 RPG 이미지 제작 현황 — 워크 2', '',
             '기준일: 2026-10-09 (Asia/Seoul). 원본 main: `72f702e`.', '',
             '실제 파일 생성·알파/크기/ID 검증·시각 검수 완료 기준이며 UI 전체 연결 완료와 구별한다.', '',
             '| 분야 | 검수 완료 | 전체 슬롯 |', '|---|---:|---:|']
    names = {'equipment': '장비', 'books': '책', 'materials': '전리품', 'locations': '장소'}
    for group in names:
        lines.append(f'| {names[group]} | {counts[group]} | {totals[group]} |')
    lines += ['', f"총 검수 완료: **{sum(counts.values())}/671**.", '',
              '## 목록과 재개 기준', '',
              '- [전체 671개 ID·경로·원본·상태](art-production/asset_plan.json)',
              '- [통합 제작 지시서](ART_PRODUCTION_INSTRUCTIONS.md)',
              '- [희귀도 테두리 추가 확정](../ITEM_RARITY_RULES.md): PNG에는 등급 테두리/광륜 없음.',
              '- [책 10템플릿 시각 검수](art-production/book-template-qa.json)',
              '- 생성형 이미지: 내장 imagegen. 책 표지색 변형·ID별 복제: 사용자 지시서에 따른 결정적 자동 처리.',
              '- 책의 여섯 원소 심볼은 선택 사항이며 이번 공통 템플릿에서는 마술서 공통 마법진을 사용한다.',
              '- 전리품 원본에 `rarity`가 없음. `monster_rank`나 `value_class`를 임의로 아이템 희귀도로 바꾸지 않는다.',
              '- 실제 VN 구성요소 샘플과 GitHub 원본 HTTP 참조를 최종 확인했다. 상세 범위·표시 제약은 [최종 검수](art-production/FINAL_QA.md) 참조. ChatGPT/Tampermonkey 20턴 플레이는 미검증.', '',
              '## 배치 기록', '']
    for path in sorted(ART.glob('*-batch-*.json')):
        batch = json.loads(path.read_text(encoding='utf-8'))
        lines += [f'### {path.stem}', '',
                  f"- 대상/완료 ID: {', '.join(batch['target_ids'])}",
                  f"- 미완료 ID: {', '.join(batch['pending_ids']) or '없음'}",
                  f"- 실패 이유: {batch['failures'] or '없음'}",
                  f"- 파일 경로/템플릿/검증: [{path.name}](art-production/{path.name}) 및 전체 자산 목록 참조.",
                  f"- 이미지 업로드 커밋: `{batch['commit_sha'] or '업로드 전'}`", '']
    (ROOT / 'assets/ART_PRODUCTION_PROGRESS.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['plan', 'templates', 'batch', 'progress'])
    parser.add_argument('--sword')
    parser.add_argument('--spell')
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--count', type=int, default=25)
    args = parser.parse_args()
    ART.mkdir(parents=True, exist_ok=True)
    if args.mode == 'plan': plan()
    elif args.mode == 'templates': templates(args.sword, args.spell)
    elif args.mode == 'batch': batch(args.start, args.count)
    else: progress()
