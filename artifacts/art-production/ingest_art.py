"""Save inspected imagegen output without replacing existing project artwork."""
import argparse
from pathlib import Path
from PIL import Image
from produce_books import ROOT, ART, read, write, sha, fitted, validate, progress

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--path', required=True)
parser.add_argument('--id')
parser.add_argument('--template')
parser.add_argument('--batch', default='samples-batch-01.json')
parser.add_argument('--background', action='store_true')
parser.add_argument('--overlay', action='store_true')
args = parser.parse_args()
target = ROOT / args.path
target.parent.mkdir(parents=True, exist_ok=True)
if target.exists():
    raise RuntimeError(f'Existing art preserved: {target}')
source = Image.open(args.source)
if args.background:
    assert source.width >= 1536 and source.height >= 1024
    if args.overlay:
        assert args.id == 'IMG-SHARED-11' and source.mode == 'RGBA'
        assert source.getchannel('A').getextrema()[0] == 0
        source.save(target)
    else:
        source.convert('RGB').save(target)
    checks = {'size': list(source.size), 'mode': 'RGBA' if args.overlay else 'RGB', 'sha256': sha(target)}
else:
    assert source.mode == 'RGBA' and source.getchannel('A').getextrema()[0] == 0 and source.getchannel('A').getextrema()[1] >= 240
    fitted(source).save(target)
    checks = validate(target)
if args.id:
    data = read('assets/art-production/asset_plan.json')
    row = next(r for r in data['assets'] if r['id'] == args.id)
    assert row['path'] == args.path
    row.update(status='verified', visual_verified=True, template=args.template or 'individual-imagegen', file_checks=checks)
    write(ART / 'asset_plan.json', data)
    path = ART / args.batch
    batch = read(str(path.relative_to(ROOT))) if path.exists() else {
        'target_ids': [], 'completed_ids': [], 'pending_ids': [], 'failures': [], 'commit_sha': None}
    for field in ['target_ids', 'completed_ids']:
        if args.id not in batch[field]: batch[field].append(args.id)
    batch['pending_ids'] = [id for id in batch['target_ids'] if id not in batch['completed_ids']]
    write(path, batch)
    if args.background:
        manifest = read('assets/location_image_manifest.json')
        location = next(r for r in manifest['assets'] if r['id'] == args.id)
        location['status'] = 'created_visual_verified'
        write(ROOT / 'assets/location_image_manifest.json', manifest)
progress()
print(f'Saved {args.path}; checks {checks}')
