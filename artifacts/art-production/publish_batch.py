"""Publish only reviewed assets; stop on dirty checkout or Git conflicts."""
import argparse
import subprocess
import sys
from produce_books import ROOT
def run(*args):
    return subprocess.run(args,cwd=ROOT,check=True,capture_output=True,text=True,encoding='utf-8').stdout.strip()
p=argparse.ArgumentParser()
p.add_argument('batch')
p.add_argument('message')
args=p.parse_args()
run(sys.executable,'artifacts/art-production/verify_batch.py',args.batch)
run('node','tampermonkey/build.mjs')
# The builder rewrites these files' line endings on Windows. Discard only proven cosmetic output.
for path in ['tampermonkey/ercedia-rpg.meta.js','tampermonkey/ercedia-rpg.user.js','web/catalog-data.js','web/engine-data.js','web/faction-data.js','web/intro-data.js','web/quest-data.js','web/character-art-data.js','integration/assets.json']:
    run('git','diff','--quiet','--ignore-space-at-eol','--',path)
    run('git','restore','--',path)
run('git','add','artifacts/art-production','assets')
run('git','commit','-m',args.message)
run('git','fetch','origin','main')
run('git','rebase','origin/main')
run('git','push','origin','HEAD:main')
commit=run('git','rev-parse','HEAD')
run(sys.executable,'artifacts/art-production/stamp_batch.py',args.batch,commit)
print('Published '+args.batch+' at '+commit)
