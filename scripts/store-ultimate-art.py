from pathlib import Path
from PIL import Image
import json,sys,hashlib
root=Path(__file__).resolve().parents[1]
record=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
queue_path=root/'artifacts/ultimate-cutins/production-queue.json'
queue=json.loads(queue_path.read_text(encoding='utf-8'))
plan_path=root/'characters/ultimate_cutin_plan.json'
plan=json.loads(plan_path.read_text(encoding='utf-8'))
for job in record:
    source=Path(job['generated_path']);dest=root/job['destination'];assert source.is_file()
    assert not dest.exists(),str(dest)
    im=Image.open(source);im.load();assert im.mode=='RGB' or im.mode=='RGBA' and im.getchannel('A').getextrema()==(255,255)
    size=im.size;n=min(im.width//16,im.height//9);w,h=n*16,n*9;x=(im.width-w)//2;y=(im.height-h)//2
    assert abs(im.width/im.height-16/9)<.03
    im=im.crop((x,y,x+w,y+h));dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest)
    job.update(size=list(im.size),source_size=list(size),mode=im.mode,opaque=True,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),processing='minimal edge crop to exact 16:9; no resizing, no background removal',tool='builtin_image_gen',status='generated_visual_reviewed',user_approved=False,runtime_registered=False)
    meta=dest.parent/'production-metadata.json';data=json.loads(meta.read_text(encoding='utf-8')) if meta.exists() else {'character_id':job['id'],'name':job['name'],'versions':[]}
    data['versions'].append(job);meta.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    c=next(c for c in plan['characters'] if c['id']==job['id']);v=next(v for v in c['versions'] if v['tier']==job['tier'])
    v.update(image=job['destination'],status='generated_review_pending',metadata=str(meta.relative_to(root)).replace('\\','/'),size=list(im.size),user_approved=False,face_crop=job.get('face_crop'))
    c['status']='two_tier_art_ready_review_pending' if all(v.get('image') for v in c['versions']) else 'partial_art_in_production'
    j=next(j for j in queue['jobs'] if j['id']==job['id'] and j['tier']==job['tier']);j.update(status='generated_visual_reviewed',image=job['destination'],sha256=job['sha256'],size=list(im.size))
queue['completed_new_full_images']=sum(j['status']=='generated_visual_reviewed' for j in queue['jobs'])
for p,a in [(queue_path,queue),(plan_path,plan)]:p.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Saved {len(record)} images; {queue['completed_new_full_images']}/{queue['new_full_images']} new full images")
