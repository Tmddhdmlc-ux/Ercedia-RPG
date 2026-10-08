"""Register verified icons without changing game data, rarity or mechanics."""
import copy
from produce_books import ROOT, ART, read, write, validate, sha
data=read('assets/art-production/asset_plan.json')
by_id={r['id']:r for r in data['assets']}
records=[]
art_keys={'icon_path','icon_status','art_status'}
for source,key,group in [('equipment/equipment_catalog_300.json','items','equipment'),
                         ('items/book_catalog_70.json','books','books'),
                         ('items/loot_tables_monsters_dungeons.json','materials','materials')]:
    catalog=read(source)
    before=copy.deepcopy(catalog)
    for item in catalog[key]:
        row=by_id[item['id']]
        assert row['status']=='verified' and row['visual_verified'],item['id']
        assert validate(ROOT/row['path'])==row['file_checks'],item['id']
        item.update(icon_path=row['path'],icon_status='created_visual_verified')
        if group=='equipment': item['art_status']='created_visual_verified'
        records.append({'id':item['id'],'name':item['name'],'group':group,'path':row['path'],
                        'rarity':item.get('rarity'),'sha256':row['file_checks']['sha256'],
                        'status':'created_visual_verified','template':row['template']})
    def without_art(c):
        c=copy.deepcopy(c)
        for item in c[key]:
            for k in art_keys: item.pop(k,None)
        return c
    assert without_art(before)==without_art(catalog),'Game data changed'
    write(ROOT/source,catalog)
assert len(records)==410 and len({r['id'] for r in records})==410
write(ROOT/'assets/items/item_image_manifest.json',{
    'schema_version':1,'count':410,'count_by_group':{'equipment':300,'books':70,'materials':40},
    'rules':{'format':'PNG','size':[512,512],'background':'true_alpha','rarity_frame_in_png':False,
             'rarity_ui_colors':{'하급':'#FFFFFF','중급':'#26B75A','고급':'#3489FF','유니크':'#A35CF0','에픽':'#E64444'},
             'material_rarity':'Not defined in canonical loot catalog; do not infer from monster_rank or quality.'},
    'assets':records})
locations=read('assets/location_image_manifest.json')
locations['purpose']='Canonical location asset slots with individual actual production status; see ART_PRODUCTION_PROGRESS.md.'
write(ROOT/'assets/location_image_manifest.json',locations)
print('Registered 410 verified icons; canonical game values unchanged.')
