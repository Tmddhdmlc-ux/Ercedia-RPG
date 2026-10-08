import argparse
from produce_books import ROOT, ART, read, write, progress

parser = argparse.ArgumentParser()
parser.add_argument('batch')
parser.add_argument('sha')
args = parser.parse_args()
batch_path = ART / args.batch
batch = read(str(batch_path.relative_to(ROOT)))
batch['commit_sha'] = args.sha
write(batch_path, batch)
data = read('assets/art-production/asset_plan.json')
for row in data['assets']:
    if row['id'] in batch['completed_ids']:
        row['commit_sha'] = args.sha
write(ART / 'asset_plan.json', data)
progress()
