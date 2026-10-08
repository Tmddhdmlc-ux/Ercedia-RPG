"""ID-derived art variations; no game stats, powers, or rarity frames are authored."""
import argparse
import math
import numpy as np
from PIL import Image, ImageDraw
from produce_books import ROOT, ART, read, write, fitted, validate, sha, progress

# Families occur in canonical order within each block of sixty equipment records.
KEYS = (['straight_sword','longsword','rapier','straight_sword','longsword','ceremonial_sword',
 'straight_sword','greatsword','rapier','ceremonial_sword','longsword','greatsword',
 'straight_sword','curved_sword','longsword','curved_sword','curved_sword','greatsword'] +
 ['wood_staff','metal_staff','wood_staff','nature_staff','crystal_staff','relic_staff',
 'nature_staff','metal_staff','relic_staff','crystal_staff','relic_staff','metal_staff',
 'crystal_staff','wood_staff','engineering_staff','engineering_staff','relic_staff','wood_staff'] +
 ['leather_armor','light_plate','leather_armor','heavy_plate','light_plate','combat_clothes',
 'robe','ritual_armor','combat_clothes','combat_clothes','light_plate','heavy_plate'] +
 ['ring','necklace','pendant','talisman','talisman','ring','earrings','mana_ornament',
 'pendant','talisman','mana_ornament','ring'])
BLUE = (61,104,138)
SILVER = (151,163,177)
BRASS = (160,120,63)
PALE = (174,199,210)
# Each family preserves its named material; tier never determines the blade color.
METALS = [SILVER,BLUE,SILVER,SILVER,SILVER,(170,148,107),(46,48,60),(124,132,141),
 SILVER,(181,156,112),SILVER,(106,115,125),PALE,(146,95,71),(183,192,205),SILVER,
 SILVER,(147,164,182)]
ACCENTS = [(89,65,50),(45,75,102),(89,54,43),(113,82,52),(67,79,92),(121,56,65),
 (40,41,52),(79,68,57),(82,108,111),(53,65,97),(57,85,99),(69,58,48),
 (88,115,136),(114,61,47),(61,76,92),(91,111,112),(70,91,111),(64,72,89)]

def tone(image, mask, color, strength=.8):
    a = np.asarray(image).copy()
    rgb = a[:,:,:3].astype(float)/255
    brightness = rgb.mean(2)
    color = np.array(color)/255
    tint = np.clip(color[None,None,:] * (brightness[:,:,None]/.48),0,1)
    w = mask[:,:,None]*strength
    a[:,:,:3] = np.rint(np.clip(rgb*(1-w)+tint*w,0,1)*255).astype('uint8')
    return Image.fromarray(a)

def masks(image):
    a = np.asarray(image)
    r,g,b = [a[:,:,i].astype(float)/255 for i in range(3)]
    solid = a[:,:,3]>0
    neutral = np.clip(1-(np.maximum.reduce([r,g,b])-np.minimum.reduce([r,g,b]))/.16,0,1)*solid
    blue = np.clip((b-r-.015)/.09,0,1)*solid
    warm = np.clip((r-b-.04)/.12,0,1)*solid
    return neutral,blue,warm

def metal(color):
    # Decor is physical hardware, not a border, aura, or invented ability.
    source = ROOT/'assets/items/templates/equipment/details/filigree.png'
    im = Image.open(source).convert('RGBA')
    return tone(im,masks(im)[0],color,.8)

def ornament(base, center, width, color, angle=0):
    # Narrow robe shoulders differ from plate silhouettes. Attach the rivet to the
    # nearest solid object pixel so no metal fitting floats beside the garment.
    alpha=np.asarray(base.getchannel('A'))
    cx,cy=map(round,center)
    if alpha[cy,cx]<128:
        yy,xx=np.nonzero(alpha>192)
        nearest=np.argmin((xx-cx)**2+(yy-cy)**2)
        center=(int(xx[nearest]),int(yy[nearest]))
    detail = metal(color)
    detail = detail.crop(detail.getchannel('A').getbbox())
    detail.thumbnail((width,width),Image.Resampling.LANCZOS)
    if angle:
        detail = detail.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    base.alpha_composite(detail,(round(center[0]-detail.width/2),round(center[1]-detail.height/2)))

def star(draw,x,y,r,color):
    points=[]
    for i in range(10):
        angle=i*math.pi/5-math.pi/2
        rr=r if i%2==0 else r*.43
        points.append((x+math.cos(angle)*rr,y+math.sin(angle)*rr))
    draw.polygon(points,fill=color,outline='#433c37')

def named_symbol(im,family):
    # Small physically attached motifs are only based on nouns already in the item name.
    d=ImageDraw.Draw(im)
    if family==21: # petal staff
        for i in range(5):
            a=i*math.tau/5
            x,y=416+math.cos(a)*12,101+math.sin(a)*12
            d.ellipse((x-8,y-8,x+8,y+8),fill='#ba8795',outline='#654d55',width=2)
        d.ellipse((411,96,421,106),fill='#dbc98e',outline='#654d55')
    elif family==28:
        star(d,421,100,12,'#cbcbd6')
    elif family==56:
        star(d,256,239,25,'#d5dbe7')
    elif family==58: # gold compass ornament, no lettering
        d.ellipse((178,178,334,334),fill='#a9894f',outline='#50402b',width=4)
        d.ellipse((186,186,326,326),outline='#e4ce9d',width=3)
        d.polygon([(256,191),(243,257),(256,281),(269,257)],fill='#eee4bd',outline='#55472f')
        d.polygon([(256,321),(244,257),(256,234),(268,257)],fill='#666879',outline='#55472f')
        d.ellipse((249,250,263,264),fill='#ecd89c',outline='#55472f',width=2)
    return im

def variant(item,index):
    family=index%60
    tier=item['rarity_tier']
    key=KEYS[family]
    im=Image.open(ROOT/f'assets/items/templates/equipment/{key}.png').convert('RGBA')
    neutral,blue,warm=masks(im)
    if family<18:
        im=tone(im,neutral,METALS[family],.78)
        im=tone(im,warm,ACCENTS[family],.60)
        im=tone(im,blue,ACCENTS[family],.55)
    elif family<36:
        local=family-18
        woods=[(142,103,62),(134,91,54),(109,116,99),(134,92,72),SILVER,BRASS,
               (95,76,54),SILVER,(129,134,146),BRASS,BRASS,(147,107,59),SILVER,
               (153,153,145),BRASS,(68,75,87),(165,172,181),(123,103,78)]
        crystals=[PALE,PALE,(80,145,167),(123,167,119),(181,212,218),(134,149,174),
                  (116,146,92),(145,181,198),(149,157,173),(215,144,52),(163,173,199),
                  (115,151,154),(137,207,214),PALE,(144,172,179),(99,115,137),PALE,(145,160,167)]
        im=tone(im,warm,woods[local],.75)
        im=tone(im,blue,crystals[local],.85)
        if local in [7,11,14,15,16]:
            im=tone(im,neutral,woods[local],.72)
    elif family<48:
        local=family-36
        cloth=[(106,75,51),(61,71,89),(114,88,60),(56,61,73),(82,91,105),(70,86,79),
               (73,79,102),(48,100,121),(50,83,112),(71,88,69),(89,76,59),(72,82,105)]
        metals=[SILVER,SILVER,SILVER,(115,122,134),SILVER,SILVER,SILVER,SILVER,
                SILVER,SILVER,(170,131,66),(187,195,207)]
        im=tone(im,blue,cloth[local],.85)
        im=tone(im,warm,cloth[local],.6)
        im=tone(im,neutral,metals[local],.55)
    else:
        local=family-48
        metals=[(112,118,127),SILVER,BRASS,BRASS,SILVER,SILVER,SILVER,SILVER,
                SILVER,BRASS,(181,144,65),SILVER]
        stones=[(112,120,129),PALE,(215,135,44),(134,106,64),SILVER,(81,175,189),
                PALE,(109,167,204),(102,135,186),(98,77,54),(182,144,70),(35,38,50)]
        im=tone(im,neutral,metals[local],.78)
        im=tone(im,blue,stones[local],.95)
        if local==8:
            im=tone(im,warm,stones[local],.95)
        if local==4:
            im=tone(im,warm,SILVER,.85)
    # Material finish, never the UI rarity color.
    rgba=np.asarray(im).copy()
    rgb=rgba[:,:,:3].astype(float)
    if tier==1:
        gray=rgb.mean(2,keepdims=True)
        rgb=(rgb*.87+gray*.13)*.94
    elif tier==2:
        rgb=rgb*1.01
    elif tier==3:
        rgb=(rgb-110)*1.045+115
    elif tier>=4:
        rgb=(rgb-105)*1.075+114
    rgba[:,:,:3]=np.clip(rgb,0,255).astype('uint8')
    im=named_symbol(Image.fromarray(rgba),family)
    if tier>=3:
        color=(183,192,207) if tier<5 else (197,159,82)
        width=65 if tier==3 else (100 if tier==4 else 136)
        if family<18:
            # Relative guard anchor follows each blade's diagonal silhouette.
            anchors={'straight_sword':(145,362),'longsword':(133,377),'rapier':(140,369),
                     'greatsword':(154,351),'curved_sword':(153,362),'ceremonial_sword':(129,380)}
            ornament(im,anchors[key],width,color,-45)
        elif family<36:
            ornament(im,(413,102),width*.72,color,-45)
        elif family<48:
            ornament(im,(256,174),width*.78,color)
            if tier==5:
                ornament(im,(124,141),82,color,24)
                ornament(im,(388,141),82,color,-24)
        else:
            if key=='ring': center=(255,145)
            elif key=='necklace': center=(260,361)
            elif key=='talisman': center=(256,218)
            elif key=='earrings':
                ornament(im,(233,326),width*.43,color)
                ornament(im,(312,278),width*.43,color)
                center=None
            else: center=(256,132)
            if center is not None: ornament(im,center,width*.85,color)
    if tier==5 and family<36:
        # Second metal fitting adds a physical silhouette change at the pommel / staff tail.
        ornament(im,(93,419) if family<18 else (87,422),38,(197,159,82),-45)
    return fitted(im),key

def batch(start,count):
    items=read('equipment/equipment_catalog_300.json')['items']
    data=read('assets/art-production/asset_plan.json')
    by_id={r['id']:r for r in data['assets']}
    done=[]
    metadata=[]
    for index,item in enumerate(items[start:start+count],start):
        target=ROOT/by_id[item['id']]['path']
        im,key=variant(item,index)
        target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists() or by_id[item['id']]['status']!='verified': im.save(target)
        checks=validate(target)
        row=by_id[item['id']]
        if row['status']!='verified':
            row.update(status='file_verified',visual_verified=False,template=f'assets/items/templates/equipment/{key}.png',file_checks=checks)
        done.append(item['id'])
        metadata.append({'id':item['id'],'name':item['name'],'rarity':item['rarity'],'path':row['path'],
                         'template':key,'family_index':index%60,'design':'Named-material palette and motif; tier 3 small metal fitting, tier 4 enlarged silver filigree, tier 5 gold filigree and additional hardware. No rarity frame or halo.'})
    write(ART/'asset_plan.json',data)
    write(ART/f'equipment-batch-{start//25+1:02d}.json',{'target_ids':done,'completed_ids':[],
          'file_verified_ids':done,'pending_ids':done,'failures':[],'commit_sha':None,'assets':metadata})
    # Five columns give every asset a meaningful 150px and actual 48px visual check.
    sheet=Image.new('RGB',(1000,((len(done)+4)//5)*240),'#192530')
    d=ImageDraw.Draw(sheet)
    for n,id in enumerate(done):
        x,y=n%5*200,n//5*240
        im=Image.open(ROOT/by_id[id]['path'])
        big=im.resize((176,176),Image.Resampling.LANCZOS)
        sheet.paste(big,(x+12,y+5),big)
        small=im.resize((48,48),Image.Resampling.LANCZOS)
        sheet.paste(small,(x+12,y+183),small)
        d.text((x+68,y+194),id,fill='white')
    sheet.save(ART/f'equipment-batch-{start//25+1:02d}-preview.png')
    progress()
    print(f'File verified {len(done)} icons; awaiting visual inspection.')

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--start',type=int,default=0)
    p.add_argument('--count',type=int,default=25)
    args=p.parse_args()
    detail=read('assets/art-production/filigree-request.json')
    path=ROOT/detail['path']
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():
        Image.open(detail['source']).save(path)
    batch(args.start,args.count)
