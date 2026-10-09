import json,pathlib,urllib.request,hashlib,subprocess,zipfile,imageio_ffmpeg
root=pathlib.Path.cwd(); out=root/'assets/audio/ambience'; src=out/'source'; src.mkdir(parents=True,exist_ok=True)
items=[('birds','birds-isaiah658_0.ogg','ambient-bird-sounds','isaiah658'),('crickets','crickets_1.mp3','crickets-ambient-noise-loopable','Wolfgang_ / Ted Kerr'),('wind','wind1.wav','wind1','Luke.RUSTLTD'),('water','VistulaShort_0.mp3','sea-and-river-wave-sounds','RandomMind'),('rain','Rain%20OGG.zip','rain-loopable','Ylmir'),('crowd','crowd_shouting_0.ogg','crowd-shoutingspeaking-ambience','StarNinjas'),('fire','fire.wav','fireplace-sound-loop','PagDev'),('steps','full%20steps%20stereo.ogg','random-sounds-samples','Augmentality / Brandon Morris'),('leaves','moving%20leaves%20stereo.ogg','random-sounds-samples','Augmentality / Brandon Morris')]
meta=[]; paths={}
for key,file,page,author in items:
 p=src/(key+('.zip' if key=='rain' else pathlib.Path(file).suffix)); url='https://opengameart.org/sites/default/files/'+file
 if not p.exists():
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=90) as r:p.write_bytes(r.read())
 meta.append(dict(id=key,author=author,license='CC0-1.0',page='https://opengameart.org/content/'+page,url=url,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
 if key=='rain':
  with zipfile.ZipFile(p) as z:
   name=next(n for n in z.namelist() if n.lower().endswith('.ogg')); q=src/'rain.ogg';q.write_bytes(z.read(name));paths[key]=q
 else:paths[key]=p
 print('source',key,flush=True)
profiles={'villageDay':[('birds',.65),('wind',.12)],'villageNight':[('crickets',.5),('wind',.13)],'city':[('crowd',.12),('wind',.08),('birds',.2)],'cityNight':[('wind',.15),('crickets',.2)],'border':[('wind',.5),('leaves',.1),('crowd',.04)],'royal':[('wind',.035),('steps',.025)],'farEast':[('water',.3),('wind',.25)],'unexplored':[('wind',.4),('leaves',.09)],'forestDay':[('birds',.55),('leaves',.13),('wind',.2)],'forestNight':[('crickets',.65),('leaves',.1),('wind',.15)],'mountain':[('wind',.7)],'coast':[('water',.65),('wind',.3)],'dungeon':[('wind',.2),('water',.035)],'inn':[('fire',.45),('crowd',.035)],'camp':[('fire',.5),('wind',.15),('crickets',.2)],'rain':[('rain',.65),('wind',.2)],'workshop':[('fire',.4),('steps',.06)]}
ff=imageio_ffmpeg.get_ffmpeg_exe()
for key,layers in profiles.items():
 args=[ff,'-hide_banner','-loglevel','error','-y'];filters=[]
 for i,(name,vol) in enumerate(layers):
  args+=['-stream_loop','-1','-i',str(paths[name])]
  low=700 if key in ['royal','dungeon'] else 1800 if name=='crowd' else 9000
  filters.append(f'[{i}:a]aresample=32000,aformat=channel_layouts=stereo,lowpass=f={low},volume={vol}[a{i}]')
 filters.append(''.join(f'[a{i}]' for i in range(len(layers)))+f'amix=inputs={len(layers)}:normalize=0,alimiter=limit=0.8:level=0,afade=t=in:d=0.05,afade=t=out:st=31.95:d=0.05[out]')
 args+=['-filter_complex',';'.join(filters),'-map','[out]','-t','32','-c:a','libvorbis','-q:a','3',str(out/(key+'.ogg'))]
 subprocess.run(args,check=True);print('mix',key,flush=True)
(out/'sources.json').write_text(json.dumps({'license':'CC0-1.0','sources':meta,'mixes':profiles,'processing':'32-second stereo mixes; filtering, attenuation and limiting. Runtime overlaps loop edges. Wind is synthesized by original author; water is a river recording.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
