"""Split explicitly generated material pairs, normalize icons, track real files."""
import argparse
import shutil
from PIL import Image, ImageDraw
from produce_books import ROOT, ART, read, write, fitted, validate, sha, progress
p=argparse.ArgumentParser()
p.add_argument('--start',type=int,default=0)
p.add_argument('--count',type=int,default=20)
args=p.parse_args()
data=read('assets/art-production/asset_plan.json')
by_id={r['id']:r for r in data['assets']}
catalog=read('items/loot_tables_monsters_dungeons.json')['materials']
registries=sorted(ART.glob('material-request-*.json'))
for registry in registries:
    row=read(str(registry.relative_to(ROOT)))
    number=row['monster_number']
    source_path=ROOT/f'assets/items/templates/materials/source-{number:02d}.png'
    source_path.parent.mkdir(parents=True,exist_ok=True)
    if not source_path.exists(): shutil.copyfile(row['source'],source_path)
    source=Image.open(source_path)
    assert source.mode=='RGBA' and source.getchannel('A').getextrema()[0]==0
    row['source_path']=str(source_path.relative_to(ROOT)).replace('\\','/')
    row['source_sha256']=sha(source_path)
    parts=[(2,source)] if number==1 else [(1,source.crop((0,0,source.width//2,source.height))),
                                          (2,source.crop((source.width//2,0,source.width,source.height)))]
    for suffix,part in parts:
        id=f'MAT-{number:03d}-{suffix}'
        # Remove only imperceptible generator dust (alpha 1..3); retain all visible
        # edges and semitransparent glass. Unmodified generated source is preserved.
        part.putalpha(part.getchannel('A').point(lambda a: 0 if a<=3 else a))
        bbox=part.getchannel('A').getbbox()
        assert bbox and bbox[0]>0 and bbox[1]>0 and bbox[2]<part.width and bbox[3]<part.height, (id,'Source touches crop boundary',bbox,part.size)
        target=ROOT/by_id[id]['path']
        target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists(): fitted(part).save(target)
        checks=validate(target)
        if by_id[id]['status']!='verified':
            by_id[id].update(status='file_verified',template=row['source_path']+f'#part-{suffix}',file_checks=checks,visual_verified=False)
    write(registry,row)
write(ART/'asset_plan.json',data)
chosen=catalog[args.start:args.start+args.count]
ready=[i['id'] for i in chosen if by_id[i['id']]['status'] in ['file_verified','verified']]
missing=[i['id'] for i in chosen if i['id'] not in ready]
batch={'target_ids':[i['id'] for i in chosen],'completed_ids':[], 'pending_ids':[i['id'] for i in chosen],
       'file_verified_ids':ready,'failures':[], 'commit_sha':None,
       'note':'Material rarity is absent in source; monster rank, quality and value_class are not converted to item rarity.'}
write(ART/f'materials-batch-{args.start//20+1:02d}.json',batch)
sheet=Image.new('RGB',(1000,((len(chosen)+4)//5)*240),'#192530')
d=ImageDraw.Draw(sheet)
for n,item in enumerate(chosen):
    id=item['id']; x,y=n%5*200,n//5*240
    if id in ready:
        im=Image.open(ROOT/by_id[id]['path'])
        big=im.resize((176,176),Image.Resampling.LANCZOS)
        sheet.paste(big,(x+12,y+5),big)
        small=im.resize((48,48),Image.Resampling.LANCZOS)
        sheet.paste(small,(x+12,y+183),small)
    d.text((x+68,y+194),id,fill='white')
sheet.save(ART/f'materials-batch-{args.start//20+1:02d}-preview.png')
progress()
print(f'Materials file verified: {len(ready)}; pending source: {missing}')
