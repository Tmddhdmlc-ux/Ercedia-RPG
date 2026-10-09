from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1]
folder=root/'assets/characters/cutins/drafts/serin'
metadata=json.loads((folder/'metadata.json').read_text(encoding='utf-8'))
for tier,key in [('expert','image'),('hyper','face_image')]:
    p=root/metadata[tier][key]
    im=Image.open(p);original=list(im.size)
    # Trim only the 4px horizontal/2-3px vertical overscan to exact16:9.
    scale=min(im.width//16,im.height//9);w,h=16*scale,9*scale
    if im.size!=(w,h):
        x=(im.width-w)//2;y=(im.height-h)//2
        im=im.crop((x,y,x+w,y+h));im.save(p,optimize=True)
    assert im.mode in ['RGB','RGBA']
    if im.mode=='RGBA':assert im.getchannel('A').getextrema()==(255,255)
    metadata[tier][key+'_metrics']={'source_size':original,'size':list(im.size),'mode':im.mode,'opaque':True,'aspect_ratio':'16:9','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'processing':'Minimal symmetric edge trim to exact16:9; no resizing, background removal, transparency or relighting.'}
old=root/metadata['hyper']['image']
with Image.open(old) as im:metadata['hyper']['image_metrics']={'size':list(im.size),'mode':im.mode,'sha256':hashlib.sha256(old.read_bytes()).hexdigest(),'preserved_original':True,'note':'Existing approximate16:9 reference preserved at original resolution.'}
(folder/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
planpath=root/'characters/ultimate_cutin_plan.json'
plan=json.loads(planpath.read_text(encoding='utf-8'))
c=next(c for c in plan['characters'] if c['id']=='serin')
c['status']='two_tier_hypothetical_sample_ready'
c['element_status']='visual_proposal_only_not_canon'
c['user_approved']=False
c['metadata']='assets/characters/cutins/drafts/serin/metadata.json'
for v in c['versions']:
    data=metadata[v['tier']]
    v.update({'status':'draft_pending_user_review','image':data['image'],'size':data['image_metrics']['size'],'user_approved':False,'runtime_usable':False,'composition':data['composition'],'element':data['element'],'element_status':data['element_status']})
    if v['tier']=='expert':v['face_crop']=data['face_crop']
    else:v['face_image']=data['face_image']
plan['audit_summary'].update({'new_full_cutscenes':1,'reused_full_cutscenes':1,'new_face_cutins':1,'completed_sample_characters':1,'deferred_characters':162,'runtime_assets_added':0})
planpath.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(plan['audit_summary'],ensure_ascii=False))
