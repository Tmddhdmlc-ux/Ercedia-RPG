from pathlib import Path
from PIL import Image
import json,hashlib,subprocess,sys,io
from urllib.request import urlopen,Request
root=Path(__file__).resolve().parents[1]
meta=json.loads((root/'assets/characters/cutins/drafts/serin/metadata.json').read_text(encoding='utf-8'))
plan=json.loads((root/'characters/ultimate_cutin_plan.json').read_text(encoding='utf-8'))
assert len(plan['characters'])==163 and len({c['id'] for c in plan['characters']})==163
assert sum(c['status']=='deferred_missing_approved_settings' for c in plan['characters'])==162
assert all(c.get('hold_reason') and len(c['versions'])==2 and all(v.get('hold_reason') for v in c['versions']) for c in plan['characters'] if c['id']!='serin')
rows=[]
for tier,key in [('expert','image'),('hyper','image'),('hyper','face_image')]:
    path=meta[tier][key];p=root/path
    im=Image.open(p);im.load();digest=hashlib.sha256(p.read_bytes()).hexdigest()
    opaque=im.mode=='RGB' or (im.mode=='RGBA' and im.getchannel('A').getextrema()==(255,255))
    assert opaque and digest==meta[tier][key+'_metrics']['sha256']
    if tier=='expert' or key=='face_image':assert im.width*9==im.height*16
    else:assert hashlib.sha256(subprocess.check_output(['git','show','HEAD:'+path],cwd=root)).hexdigest()==digest
    rows.append({'tier':tier,'kind':key,'path':path,'size':list(im.size),'mode':im.mode,'opaque':opaque,'sha256':digest,'passed':True})
assets=json.loads((root/'integration/assets.json').read_text(encoding='utf-8'))
assert not any(r['path'] in assets for r in rows if r['path'].startswith('assets/characters/cutins/'))
assert subprocess.check_output(['git','diff','--name-only','--','characters/serin.json','characters/npc_roster_100.json','characters/core_cast_stats_38.json','characters/common_npc_roster.json','characters/art_registry.json','integration/assets.json'],cwd=root,text=True).strip()==''
out={'all_passed':True,'sample_characters':1,'new_images':2,'preserved_references':1,'deferred_characters':162,'roster_coverage':163,'runtime_assets_added':0,'canonical_sources_unchanged':True,'files':rows,'browser_playback':'not_tested','visual_review':'Reference face/hair/eyes/armor, sword/hand continuity, distinct poses and low/high effect intensity reviewed visually; final user approval pending.'}
(root/'artifacts/ultimate-cutins/validation.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in out.items() if k not in ['files','visual_review']},ensure_ascii=False))
if len(sys.argv)>1:
    delivered=[]
    for item in rows:
        url=sys.argv[1].rstrip('/')+'/'+item['path']
        with urlopen(Request(url,headers={'User-Agent':'Ercedia-art-validation'}),timeout=60) as response:
            data=response.read();status=response.status
        im=Image.open(io.BytesIO(data));im.load()
        passed=status==200 and hashlib.sha256(data).hexdigest()==item['sha256'] and list(im.size)==item['size'] and im.mode==item['mode']
        assert passed
        delivered.append({'url':url,'http_status':status,'passed':passed,'sha256':item['sha256'],'size':item['size']})
    (root/'artifacts/ultimate-cutins/delivery-validation.json').write_text(json.dumps({'all_passed':True,'count':3,'files':delivered,'scope':'HTTP load, PNG decode and exact local/remote hash; browser playback remains untested.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('3/3 remote PNG files verified.')
