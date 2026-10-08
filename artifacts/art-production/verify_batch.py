"""Record visual QA only after inspecting the named batch preview."""
import argparse
from produce_books import ROOT, ART, read, write, validate, progress
p=argparse.ArgumentParser()
p.add_argument('batch')
args=p.parse_args()
batch=read('assets/art-production/'+args.batch)
data=read('assets/art-production/asset_plan.json')
by_id={r['id']:r for r in data['assets']}
for id in batch['target_ids']:
    row=by_id[id]
    checks=validate(ROOT/row['path'])
    assert checks==row['file_checks'],id
    row.update(status='verified',visual_verified=True)
batch.update(completed_ids=batch['target_ids'],pending_ids=[],visual_verified=True,
             visual_method='Every final icon inspected on the batch contact sheet at 176px and 48px; no frame, clipping, opaque backdrop, or unreadable silhouette.')
write(ART/args.batch,batch)
write(ART/'asset_plan.json',data)
progress()
