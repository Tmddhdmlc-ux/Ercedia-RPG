"""Create reviewable region-based batches from canonical non-entrance zone IDs."""
from produce_books import ART, read, write
dungeons = read('locations/dungeon_layouts.json')['dungeons']
for suffix, prefix in [('03', 'W'), ('04', 'E'), ('05', 'S')]:
    targets = ['IMG-' + z['id'] for d in dungeons if d['region_id'].startswith(prefix)
               for z in d['zones'] if z['type'] != 'entrance']
    assert 20 <= len(targets) <= 30
    path = ART / ('locations-p2-batch-' + suffix + '.json')
    assert not path.exists(), 'Existing progress preserved'
    write(path, {'target_ids': targets, 'completed_ids': [], 'pending_ids': targets,
                 'failures': [], 'commit_sha': None})
    print(path.name, len(targets))

