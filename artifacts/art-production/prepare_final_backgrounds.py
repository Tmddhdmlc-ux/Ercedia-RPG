"""Create final canonical batches and reuse only already reviewed same-site towers."""
import shutil
from produce_books import ROOT, ART, read, write, sha, progress

manifest = read('assets/location_image_manifest.json')
factions = [r for r in manifest['assets'] if r['category'] == 'faction_location']
shared = [r for r in manifest['assets'] if r['category'] == 'shared_background']
assert len(factions) == 37 and len(shared) == 12
for name, rows in [('locations-p2-batch-06.json', factions[:25]),
                   ('locations-final-batch-07.json', factions[25:] + shared)]:
    path = ART / name
    assert not path.exists(), 'Preserve existing batch'
    ids = [r['id'] for r in rows]
    write(path, dict(target_ids=ids, completed_ids=[], pending_ids=ids, failures=[], commit_sha=None))

plan = read('assets/art-production/asset_plan.json')
by_id = {r['id']: r for r in plan['assets']}
by_location = {r['id']: r for r in manifest['assets']}
mapping = read('assets/art-production/background-reuse-map.json')
batch_path = ART / 'locations-p2-batch-06.json'
batch = read(str(batch_path.relative_to(ROOT)))
for target_id, source_id, reason in [
    ('IMG-FACTION-MT02', 'IMG-FAC-E2-01-EXTERIOR', '청동뇌명탑의 마법서 교환실이 있는 동일 건물 외관.'),
    ('IMG-FACTION-MT05', 'IMG-FAC-E3-01-EXTERIOR', '회색초석탑의 전술서고가 있는 동일 건물 외관.')]:
    source, target = by_id[source_id], by_id[target_id]
    assert source['status'] == 'verified' and source['visual_verified'] and source['commit_sha']
    assert sha(ROOT / source['path']) == source['file_checks']['sha256']
    dst = ROOT / target['path']
    assert not dst.exists()
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / source['path'], dst)
    assert sha(dst) == sha(ROOT / source['path'])
    target.update(status='verified', visual_verified=True, template=source_id,
                  file_checks=dict(source['file_checks']), reuse_source_id=source_id,
                  reuse_reason='same_physical_magic_tower',
                  visual_verification='Unmodified same-building exterior previously reviewed individually')
    by_location[target_id]['status'] = 'created_visual_verified'
    mapping['mappings'].append(dict(source_id=source_id, target_id=target_id,
        source_path=source['path'], target_path=target['path'], reason=reason,
        canon_source='FACTIONS.md; locations/regional_dungeons_facilities.json', sha256=sha(dst)))
    batch['completed_ids'].append(target_id)
    batch['pending_ids'].remove(target_id)
write(ART / 'asset_plan.json', plan)
write(ROOT / 'assets/location_image_manifest.json', manifest)
write(ART / 'background-reuse-map.json', mapping)
write(batch_path, batch)
progress()
print('Final batches prepared: 25 faction slots and 24 faction/shared slots; two same-site tower exteriors reused.')
