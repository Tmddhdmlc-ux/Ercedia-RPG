"""Final canonical ID, PNG, Git object, reuse and remote URL audit."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, subprocess, urllib.request
from PIL import Image
from produce_books import ROOT, ART, read, write, sha, validate

def git(*args, binary=False):
    return subprocess.check_output(['git',*args],cwd=ROOT,**({} if binary else {'text':True,'encoding':'utf-8'}))
plan=read('assets/art-production/asset_plan.json')
rows=plan['assets']; assert len(rows)==671 and len({r['id'] for r in rows})==671
canonical={}
for group,path,key in [('equipment','equipment/equipment_catalog_300.json','items'),('books','items/book_catalog_70.json','books'),('materials','items/loot_tables_monsters_dungeons.json','materials'),('locations','assets/location_image_manifest.json','assets')]:
    for item in read(path)[key]: canonical[item['id']]=(group,item)
assert set(canonical)=={r['id'] for r in rows}
remote=git('rev-parse','origin/main').strip()
tree={line.split('\t',1)[1]:line.split()[2] for line in git('ls-tree','-r',remote).splitlines()}
commits=set(); individual=0
for row in rows:
    group,item=canonical[row['id']]
    assert row['group']==group and row['name']==item['name'],row['id']
    assert row['rarity']==item.get('rarity'),row['id']
    expected=item['path'] if group=='locations' else f"assets/items/{group}/{row['id']}.png"
    assert row['path']==expected and row['status']=='verified' and row['visual_verified'],row['id']
    path=ROOT/expected
    if group=='locations':
        with Image.open(path) as im:
            im.load();mode='RGBA' if row['id']=='IMG-SHARED-11' else 'RGB'
            assert im.format=='PNG' and im.mode==mode and im.width>=1536 and im.height>=1024,row['id']
            if mode=='RGBA': assert im.getchannel('A').getextrema()[0]==0
            checks={'size':list(im.size),'mode':mode,'sha256':sha(path)}
        if row['template']=='individual-imagegen': individual+=1
    else: checks=validate(path)
    assert checks==row['file_checks'],row['id']
    payload=path.read_bytes()
    blob=hashlib.sha1(b'blob '+str(len(payload)).encode()+b'\0'+payload).hexdigest()
    assert tree.get(expected)==blob,(row['id'],'remote Git blob mismatch')
    assert row['commit_sha'],row['id'];commits.add(row['commit_sha'])
for commit in commits:
    subprocess.run(['git','merge-base','--is-ancestor',commit,remote],cwd=ROOT,check=True)
reuses=read('assets/art-production/background-reuse-map.json')['mappings']
for reuse in reuses:
    assert sha(ROOT/reuse['source_path'])==sha(ROOT/reuse['target_path'])==reuse['sha256']
base=plan['source_main_sha']
old_png={line for line in git('ls-tree','-r','--name-only',base).splitlines() if line.endswith('.png')}
for commit in commits:
    changed=set(git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines())
    assert not (changed&old_png),(commit,'Preexisting artwork modified')
# Check HTTP delivery for each canonical image category and both special shared assets.
samples=[]
for group in ['equipment','books','materials']: samples.append(next(r for r in rows if r['group']==group))
manifest=read('assets/location_image_manifest.json')['assets']
byid={r['id']:r for r in rows}
for category in dict.fromkeys(r['category'] for r in manifest): samples.append(byid[next(r['id'] for r in manifest if r['category']==category)])
samples.extend(byid[id] for id in ['IMG-SHARED-11','IMG-SHARED-12'])
def check_http(row):
    url=f"https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/{remote}/{row['path']}"
    with urllib.request.urlopen(url,timeout=60) as response:
        assert response.status==200
        payload=response.read()
    assert hashlib.sha256(payload).hexdigest()==row['file_checks']['sha256'],row['id']
    return {'id':row['id'],'url':url,'status':200,'sha256_matches':True}
with ThreadPoolExecutor(max_workers=4) as pool: http=list(pool.map(check_http,samples))
result={'schema_version':1,'verified_slots':len(rows),'group_counts':dict(Counter(r['group'] for r in rows)),
        'remote_main_commit':remote,'all_671_remote_git_blobs_match':True,'all_image_commits_on_remote_main':True,
        'all_png_files_decoded':True,'all_410_icons_true_alpha_and_512_square':True,'reuse_mappings_verified':len(reuses),
        'preexisting_art_changed_by_image_batches':False,'representative_http_checks':http,
        'ui_scope':'Actual VN component sample rendered locally; existing cover-fit crops the image vertically on wide stages. Full 261-scene automatic routing and ChatGPT/Tampermonkey play were not tested.'}
write(ART/'final-audit.json',result)
print(json.dumps({k:v for k,v in result.items() if k!='representative_http_checks'},ensure_ascii=False))
print(f'GitHub raw HTTP samples passed: {len(http)}')
