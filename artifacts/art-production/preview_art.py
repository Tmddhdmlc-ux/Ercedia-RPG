"""Offline layout/thumbnail QA only, never a live game screenshot."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
from produce_books import ROOT, ART

paths = sorted((ROOT / 'assets/items/templates/equipment').glob('*.png'))
sheet = Image.new('RGB', (1200, ((len(paths)+5)//6)*240), '#192530')
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(paths):
    x, y = index%6*200, index//6*240
    icon = Image.open(path)
    icon.thumbnail((175,175), Image.Resampling.LANCZOS)
    sheet.paste(icon, (x+12,y+8), icon)
    small = Image.open(path).resize((48,48), Image.Resampling.LANCZOS)
    sheet.paste(small, (x+12,y+182), small)
    draw.text((x+65,y+195),path.stem[:22],fill='white')
sheet.save(ART / 'equipment-template-preview.png')

background = Image.open(ROOT/'assets/backgrounds/regions/W1/overview.png').convert('RGBA')
preview = ImageOps.fit(background,(960,640),method=Image.Resampling.LANCZOS)
character = Image.open(ROOT/'assets/characters/main/serin/standing/base.png')
character.thumbnail((350,585),Image.Resampling.LANCZOS)
preview.alpha_composite(character,(490,40))
overlay = Image.new('RGBA',preview.size)
draw = ImageDraw.Draw(overlay)
draw.rounded_rectangle((28,492,932,618),radius=14,fill='#0a172bdb',outline='#d6b77c',width=2)
draw.text((48,515),'OFFLINE LAYOUT CHECK - NOT A GAME SCENE',fill='white')
draw.text((48,550),'Landmark / character overlap and lower dialogue-box coverage',fill='white')
preview.alpha_composite(overlay)
preview.convert('RGB').save(ART/'norvalt-vn-layout-check.png')

sheet = Image.new('RGB',(850,260),'#192530')
draw=ImageDraw.Draw(sheet)
colors=['#FFFFFF','#26B75A','#3489FF','#A35CF0','#E64444']
for index,color in enumerate(colors):
    x=index*170
    draw.rectangle((x+20,20,x+150,150),outline=color,width=3)
    icon=Image.open(ROOT/f'assets/items/templates/books/spellbook-tier-{index+1}.png').resize((124,124),Image.Resampling.LANCZOS)
    sheet.paste(icon,(x+23,23),icon)
    draw.text((x+35,171),color,fill='white')
    small=icon.resize((48,48),Image.Resampling.LANCZOS)
    draw.rectangle((x+58,198,x+109,249),outline=color,width=2)
    sheet.paste(small,(x+60,200),small)
sheet.save(ART/'book-rarity-ui-preview.png')
