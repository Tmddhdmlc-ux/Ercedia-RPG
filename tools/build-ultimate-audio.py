import pathlib,subprocess,json,hashlib,imageio_ffmpeg
root=pathlib.Path.cwd();out=root/'assets/audio/ultimate';out.mkdir(parents=True,exist_ok=True);ff=imageio_ffmpeg.get_ffmpeg_exe()
recipes={
'prepare':(.45,[('skills/spell_02.ogg',.35,1.0,0,'areverse,lowpass=f=1100'),('kenney/impactPunch_heavy_000.ogg',.14,.6,0,'lowpass=f=240')]),
'face':(.65,[('kenney/knifeSlice2.ogg',.65,1.2,0,'highpass=f=650'),('starninjas/sword_3.ogg',.3,1.65,.03,'highpass=f=1700')]),
'reveal':(1.2,[('skills/magical_1.ogg',.52,.9,0,'highpass=f=350'),('skills/spell_01.ogg',.26,.8,.08,'lowpass=f=3200'),('kenney/impactPunch_heavy_001.ogg',.18,.65,0,'lowpass=f=190')]),
'charge':(1.55,[('skills/magical_4.ogg',.45,.7,0,'areverse,highpass=f=500'),('skills/spell_02.ogg',.23,.6,0,'areverse,lowpass=f=2800')]),
'anticipation':(.38,[('kenney/knifeSlice.ogg',1.7,.75,0,'areverse,highpass=f=500'),('skills/blade_03.ogg',1.1,.7,0,'areverse,highpass=f=1400')]),
'strike':(1.3,[('starninjas/sword_1.ogg',.68,1.1,0,'highpass=f=300'),('starninjas/sword_2.ogg',.28,.8,.035,'highpass=f=700'),('kenney/knifeSlice2.ogg',.35,1.45,0,'highpass=f=1000'),('kenney/impactPunch_heavy_000.ogg',.32,.55,.035,'lowpass=f=170'),('skills/magical_7.ogg',.14,1.6,.07,'highpass=f=1800')]),
'afterglow':(1.1,[('skills/magical_2.ogg',1.2,.7,0,'highpass=f=900,aecho=0.6:0.5:140|310:0.32|0.18'),('starninjas/sword_1.ogg',.18,.65,0,'highpass=f=2200,aecho=0.7:0.5:130|290:0.3|0.16')])}
for name,(duration,layers) in recipes.items():
 args=[ff,'-hide_banner','-loglevel','error','-y'];filters=[]
 for i,(path,gain,rate,delay,effects) in enumerate(layers):
  args+=['-i',str(root/'assets/audio'/path)];filters.append(f'[{i}:a]aresample=44100,aformat=channel_layouts=stereo,asetrate={44100*rate},aresample=44100,{effects},volume={gain},adelay={int(delay*1000)}:all=1,apad[a{i}]')
 filters.append(''.join(f'[a{i}]' for i in range(len(layers)))+f'amix=inputs={len(layers)}:normalize=0,alimiter=limit=0.82:level=0:latency=1,afade=t=in:d=0.004,afade=t=out:st={duration-.06}:d=0.06[out]')
 args+=['-filter_complex',';'.join(filters),'-map','[out]','-t',str(duration),'-c:a','libvorbis','-q:a','5',str(out/(name+'.ogg'))];subprocess.run(args,check=True);print(name)
(out/'recipes.json').write_text(json.dumps({'license':'CC0-1.0','sources':[{'author':'rubberduck','page':'https://opengameart.org/node/86018','files':['spell_01.ogg','spell_02.ogg','blade_03.ogg']},{'author':'JaggedStone','page':'https://opengameart.org/content/magic-spell-sfx','files':['magical_1.ogg','magical_2.ogg','magical_4.ogg','magical_7.ogg']},{'author':'StarNinjas','page':'https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes','files':['sword_1.ogg','sword_2.ogg','sword_3.ogg']},{'author':'Kenney','page':'https://kenney.nl/assets/rpg-audio','files':['knifeSlice.ogg','knifeSlice2.ogg']},{'author':'Kenney','page':'https://kenney.nl/assets/impact-sounds','files':['impactPunch_heavy_000.ogg','impactPunch_heavy_001.ogg']}],'processing':'Reversed risers, pitched and filtered external CC0 layers, timing offsets, echo tails, fades and peak limiting. No voice line or combat decision is generated.','recipes':recipes},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
