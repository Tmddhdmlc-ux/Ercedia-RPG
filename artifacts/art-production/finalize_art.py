"""Publish final audit records without relabeling original image batch commits."""
import subprocess
from produce_books import ROOT
def run(*args):
    return subprocess.run(args,cwd=ROOT,check=True,capture_output=True,text=True,encoding='utf-8').stdout.strip()
cosmetic=['tampermonkey/ercedia-rpg.meta.js','tampermonkey/ercedia-rpg.user.js','web/catalog-data.js','web/engine-data.js','web/faction-data.js','web/intro-data.js','web/quest-data.js','web/character-art-data.js','web/world-data.js','integration/assets.json']
for path in cosmetic:
    run('git','diff','--quiet','--ignore-space-at-eol','--',path)
    run('git','restore','--',path)
run('git','add','artifacts/art-production','assets')
run('git','commit','-m','Record complete 671-slot image audit and actual VN sample constraints')
run('git','fetch','origin','main')
run('git','rebase','origin/main')
run('git','push','origin','HEAD:main')
head=run('git','rev-parse','HEAD')
remote=run('git','ls-remote','origin','refs/heads/main').split()[0]
assert head==remote,(head,remote)
assert not run('git','status','--porcelain')
print('Final audit published and remote main confirmed: '+head)
