"""Validate selected cutscene assets and produce a delivery inventory; no game-state mutation."""
from pathlib import Path
from PIL import Image
from collections import Counter
import json, hashlib, subprocess, sys, io, urllib.request, concurrent.futures, time
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/ultimate-cutins'
def read(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))
def write(path,data): (ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(data): return hashlib.sha256(data).hexdigest()
plan=read('characters/ultimate_cutin_plan.json')
profiles=read('characters/combat_profiles.json')['characters']
queue=read('artifacts/ultimate-cutins/production-queue.json')
profile={c['id']:c for c in profiles}
assert len(profile)==163==len(plan['characters'])
assert {c['id'] for c in plan['characters']}==set(profile)
eligible=[c for c in plan['characters'] if profile[c['id']]['combat_class'] in ('knight','mage')]
assert len(eligible)==60
assert Counter(c['combat_class'] for c in eligible)=={'knight':37,'mage':23}
jobs={(j['id'],j['tier']):j for j in queue['jobs']}
assert len(jobs)==118==queue['completed_new_full_images']
rows=[];seen=set(); reference_hashes={}
for c in plan['characters']:
    p=profile[c['id']]
    assert c['combat_class']==p['combat_class']
    if c not in eligible:
        assert c.get('hold_reason') and all(not v.get('image') for v in c['versions'])
        continue
    expected={'expert','hyper'} if p['combat_class']=='knight' else {'circle3','circle6'}
    assert {v['tier'] for v in c['versions']}==expected,(c['id'],expected)
    assert not p['ultimate_design']['learned'] and not p['ultimate_design']['equipped']
    for ref in c.get('reference_review',[]):
        data=(ROOT/ref['path']).read_bytes()
        assert sha(data)==ref['sha256'],ref['path']
        reference_hashes[ref['path']]=sha(data)
    for v in c['versions']:
        path=v['image']; data=(ROOT/path).read_bytes(); digest=sha(data)
        assert digest not in seen,path
        seen.add(digest)
        im=Image.open(io.BytesIO(data));im.load()
        assert im.format=='PNG' and (im.mode=='RGB' or im.mode=='RGBA' and im.getchannel('A').getextrema()==(255,255)),path
        key=(c['id'],v['tier']);new=key in jobs
        if new:
            assert im.size==(1664,936),path
            assert not v['user_approved']
            j=jobs[key];assert j['image']==path and j['sha256']==digest
            meta=read(v['metadata'])
            m=next(x for x in meta['versions'] if x['destination']==path)
            assert m['sha256']==digest and m['tool']=='builtin_image_gen'
            assert m['prompt'] and m['references'] and not m['runtime_registered'] and not m['user_approved']
            crop=v['face_crop'];assert set(crop)=={'x','y','width','height'}
            assert min(crop.values())>=0 and crop['width']>0 and crop['height']>0
            assert crop['x']+crop['width']<=1 and crop['y']+crop['height']<=1
            assert v['scope']==m['scope']
        else:
            original=subprocess.check_output(['git','show',queue['source_commit']+':'+path],cwd=ROOT)
            assert sha(original)==digest,'Preserved Serin asset changed'
            assert abs(im.width/im.height-16/9)<.01
        rows.append({'id':c['id'],'name':c['name'],'combat_class':p['combat_class'],'tier':v['tier'],'scope':v.get('scope'),
                     'ability_name':c['ability_name'],'image':path,'sha256':digest,'size':list(im.size),
                     'new_image':new,'status':v['status'],'user_approved':v.get('user_approved',False),
                     'github_url':'https://github.com/Tmddhdmlc-ux/Ercedia-RPG/blob/main/'+path,
                     'cdn_url':'https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/main/'+path})
assert len(rows)==120 and sum(x['new_image'] for x in rows)==118
plan['audit_summary']={'roster_coverage':163,'settings_established':163,'art_design_ready':60,'art_pending_characters':0,
                      'completed_two_tier_characters':60,'deferred_non_ultimate_class':103,'selected_full_images':120,
                      'new_full_images':118,'reused_full_images':2,'new_face_images':0,'runtime_assets_added':0,
                      'user_review_pending_new_images':118}
write('characters/ultimate_cutin_plan.json',plan)
report={'selected_characters':60,'knights':37,'mages':23,'selected_full_images':120,'new_full_images':118,
        'preserved_serin_full_images':2,'new_image_resolution':[1664,936],'preserved_reference_images':len(reference_hashes),
        'checks':['all 163 roster IDs accounted for','two correct tiers for all 60 eligible characters',
                  'all selected PNGs decoded, opaque and unique','all new image SHA and metadata match',
                  'reference hashes unchanged','Serin selected images unchanged since source commit',
                  'normalized face crop bounds','no learned or equipped skill grant'],
        'browser_playback_tested':False,'runtime_assets_added':0,
        'visual_review_status':'drafts pending user review',
        'review_attention':['ER-CORE-004 hyper: palm/aura action differs from sword counterattack; review',
                            'Mage images with added weapon/accessory details require review against reference',
                            'High-tier knight poses and low/high effect strength require final art review']}
write('artifacts/ultimate-cutins/local-verification.json',report)
write('artifacts/ultimate-cutins/delivery-manifest.json',{'summary':report,'images':rows,
      'deferred':[{'id':c['id'],'name':c['name'],'combat_class':c['combat_class'],'reason':c['hold_reason']} for c in plan['characters'] if c not in eligible]})
print(json.dumps(report,ensure_ascii=False))
if '--cdn' in sys.argv:
    commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    def fetch(row):
        url='https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/'+commit+'/'+row['image']
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url,timeout=45) as r:
                    data=r.read();ctype=r.headers.get('Content-Type','');status=r.status
                assert status==200 and 'image/png' in ctype and sha(data)==row['sha256']
                image=Image.open(io.BytesIO(data));image.load();assert list(image.size)==row['size']
                return {'id':row['id'],'tier':row['tier'],'url':url,'status':status,'sha256':sha(data),'verified':True}
            except Exception as e:
                if attempt==2:return {'id':row['id'],'tier':row['tier'],'url':url,'verified':False,'error':str(e)}
                time.sleep(1+attempt)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(fetch,rows))
    result={'asset_commit':commit,'verified_count':sum(r['verified'] for r in results),'total':len(results),'images':results}
    write('artifacts/ultimate-cutins/cdn-verification.json',result)
    print('CDN:',result['verified_count'],'/',len(results),'commit',commit)
    assert result['verified_count']==120
