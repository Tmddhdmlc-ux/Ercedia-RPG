"""Read-only PNG transparency, duplicate and edge-cropping verification."""
import hashlib
import json
from pathlib import Path
from PIL import Image

plan = json.loads(Path('assets/characters/monsters/dungeon/production-plan.json').read_text(encoding='utf-8'))
results = []
seen = set()
for entry in plan['entries']:
    path = Path(entry['path'])
    if not path.exists():
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest not in seen, f'Duplicate portrait: {path}'
    seen.add(digest)
    with Image.open(path) as image:
        image.load()
        assert image.mode == 'RGBA', f'RGBA required: {path}'
        alpha = image.getchannel('A')
        assert alpha.getextrema() == (0, 255), f'Actual transparent background required: {path}'
        bbox = alpha.point(lambda v: 255 if v >= 16 else 0).getbbox()
        assert bbox and bbox[0] > 0 and bbox[1] > 0 and bbox[2] < image.width and bbox[3] < image.height, f'Creature touches edge: {path}'
        results.append({'id': entry['id'], 'size': image.size, 'mode': image.mode, 'alpha': alpha.getextrema(), 'bbox': bbox, 'sha256': digest})
report = {'checked': len(results), 'planned': len(plan['entries']), 'results': results}
Path('assets/characters/monsters/dungeon/verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'checked': len(results), 'planned': len(plan['entries'])}))
