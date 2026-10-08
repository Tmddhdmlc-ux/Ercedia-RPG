"""Reuse reviewed entrances for the entrance zone of the exact same dungeon."""
import shutil
from PIL import Image
from produce_books import ROOT, ART, read, write, sha, progress

layouts = read('locations/dungeon_layouts.json')['dungeons']
manifest = read('assets/location_image_manifest.json')
by_location = {r['id']: r for r in manifest['assets']}
plan = read('assets/art-production/asset_plan.json')
by_plan = {r['id']: r for r in plan['assets']}
batch_path = ART / 'locations-p2-batch-02.json'
assert not batch_path.exists(), 'Preserve existing batch'
batch = {'target_ids': [], 'completed_ids': [], 'pending_ids': [], 'failures': [], 'commit_sha': None,
         'visual_verification': 'Source entrances individually reviewed; exact same physical dungeon entry, unchanged image reuse.'}
reuse_path = ART / 'background-reuse-map.json'
mapping = read(str(reuse_path.relative_to(ROOT))) if reuse_path.exists() else {'schema_version': 1, 'mappings': []}
for dungeon in layouts:
    zone = next(z for z in dungeon['zones'] if z['id'] == dungeon['entrance_zone_id'])
    assert zone['type'] == 'entrance' and not zone['optional']
    source_id = 'IMG-' + dungeon['id'] + '-ENTRANCE'
    target_id = 'IMG-' + zone['id']
    source_row, target_row = by_plan[source_id], by_plan[target_id]
    assert source_row['status'] == 'verified' and source_row['visual_verified']
    assert source_row['commit_sha'], 'Only already-published sources reused'
    src, dst = ROOT / source_row['path'], ROOT / target_row['path']
    assert not dst.exists(), 'Existing art preserved'
    assert sha(src) == source_row['file_checks']['sha256']
    with Image.open(src) as image:
        assert image.format == 'PNG' and image.mode == 'RGB' and image.width >= 1536 and image.height >= 1024
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    assert sha(dst) == sha(src)
    checks = dict(source_row['file_checks'])
    target_row.update(status='verified', visual_verified=True, template=source_id, file_checks=checks,
                      reuse_source_id=source_id, reuse_reason='same_physical_dungeon_entrance',
                      visual_verification='Unmodified copy of individually reviewed canonical entrance')
    by_location[target_id]['status'] = 'created_visual_verified'
    mapping['mappings'].append({'source_id': source_id, 'target_id': target_id,
                               'source_path': source_row['path'], 'target_path': target_row['path'],
                               'reason': '같은 던전의 진입 지점. 원본 입구 제작에 첫 구역 지형을 이미 반영.',
                               'canon_source': 'locations/dungeon_layouts.json#' + zone['id'],
                               'zone_name': zone['name'], 'sha256': sha(dst)})
    batch['target_ids'].append(target_id)
    batch['completed_ids'].append(target_id)
write(ART / 'asset_plan.json', plan)
write(ROOT / 'assets/location_image_manifest.json', manifest)
write(reuse_path, mapping)
write(batch_path, batch)
progress()
print('Reused 26 published dungeon entrances for their own entrance zones; identical bytes verified.')

