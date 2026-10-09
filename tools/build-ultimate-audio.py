import pathlib,subprocess,json,hashlib,imageio_ffmpeg,numpy as np,wave,tempfile
root=pathlib.Path.cwd();out=root/'assets/audio/ultimate';out.mkdir(parents=True,exist_ok=True);ff=imageio_ffmpeg.get_ffmpeg_exe()
recipes={
'prepare':(1.45,[('skills/metal_01.ogg',.5,1.0,0,'highpass=f=450,lowpass=f=6500'),('starninjas/sword_3.ogg',.12,1.2,.025,'highpass=f=1200')]),
'face':(.65,[('kenney/knifeSlice2.ogg',.65,1.2,0,'highpass=f=650'),('starninjas/sword_3.ogg',.3,1.65,.03,'highpass=f=1700')]),
'reveal':(1.62,[('skills/magical_1.ogg',.52,.9,0,'highpass=f=350'),('skills/spell_01.ogg',.26,.8,.08,'lowpass=f=3200'),('kenney/impactPunch_heavy_001.ogg',.18,.65,0,'lowpass=f=190')]),
'charge':(1.55,[('skills/metal_01.ogg',.38,1.1,0,'highpass=f=700,lowpass=f=7200'),('starninjas/sword_3.ogg',.1,1.35,.025,'highpass=f=1600')]),
'anticipation':(.26,[('kenney/knifeSlice.ogg',1.7,.75,0,'areverse,highpass=f=500'),('skills/blade_03.ogg',1.1,.7,0,'areverse,highpass=f=1400')]),
'strike':(1.55,[('starninjas/sword_1.ogg',1.25,1.25,0,'highpass=f=300'),('starninjas/sword_2.ogg',.5,.9,.035,'highpass=f=700'),('kenney/knifeSlice2.ogg',.65,1.6,0,'highpass=f=1000'),('kenney/impactPunch_heavy_000.ogg',.32,.55,.035,'lowpass=f=170'),('skills/magical_7.ogg',.14,1.6,.07,'highpass=f=1800')]),
'afterglow':(1.1,[('skills/magical_2.ogg',1.2,.7,0,'highpass=f=900,aecho=0.6:0.5:140|310:0.32|0.18'),('starninjas/sword_1.ogg',.18,.65,0,'highpass=f=2200,aecho=0.7:0.5:130|290:0.3|0.16')])}
# Cymbal/low drum/one dark string recording are heavily transformed into SFX.
# Waterphone-like inharmonic resonance is original synthesis, not a waterphone recording.
instruments={}
for key in ['cymbal','timpani','stringsD']:
 sample=out/'source'/(key+'.wav')
 data=subprocess.check_output([ff,'-v','error','-i',str(sample),'-f','f32le','-ac','2','-ar','44100','-'])
 arr=np.frombuffer(data,dtype='<f4').reshape(-1,2).copy()
 instruments[key]=arr*(.75/max(.001,np.max(np.abs(arr))))
def bed(name,duration):
 sr=44100;n=int(sr*duration);t=np.arange(n)/sr;signal=np.zeros((n,2));rng=np.random.default_rng(670+len(name))
 def sample(key,gain,reverse=False,decay=None):
  sound=instruments[key][:n].copy()
  if reverse:sound=sound[::-1]
  signal[:len(sound)]+=sound*gain*(np.exp(-t[:len(sound)]/decay) if decay else np.ones(len(sound)))[:,None]
 def metal(base,gain,rise=0,decay=None):
  phase=2*np.pi*np.cumsum(base+rise*(t/duration)**2)/sr
  env=np.exp(-t/decay) if decay else (t/duration)**.8
  for c in range(2):
   ring=sum(np.sin(phase*p*(1+c*.003)+.4*c)*np.exp(-t*i*(.8 if decay else .12))/(i+1)**1.05 for i,p in enumerate([1,1.477,2.113,2.693,3.79]))
   signal[:,c]+=(.65*ring/1.4+.35*np.tanh(ring))*gain*env*(.94+.06*np.sin(2*np.pi*4.2*t+c))
 if name=='prepare':
  sample('stringsD',.035,decay=.3);metal(920,.14,decay=.22)
  signal+=.10*np.sin(2*np.pi*61*t)[:,None]*np.exp(-t/.25)[:,None]
 elif name=='face':
  sample('cymbal',.2,decay=.17);metal(2350,.2,decay=.13)
 elif name=='reveal':
  metal(670,.25,decay=.5);sample('cymbal',.22,decay=.7)
  signal+=.23*np.sin(2*np.pi*79*t)[:,None]*np.exp(-t/.3)[:,None]
 elif name=='charge':
  metal(1380,.18,decay=.38);sample('cymbal',.10,decay=.4)
 elif name=='anticipation':
  sample('cymbal',.7,reverse=True);metal(1750,.3,rise=1900)
 elif name=='strike':
  sample('cymbal',.55,decay=.85);sample('timpani',.45,decay=.4);metal(2900,.33,decay=.18)
  phase=2*np.pi*np.cumsum(155*np.exp(-t/.06)+43)/sr
  signal+=.52*np.sin(phase)[:,None]*np.exp(-t/.55)[:,None]
  noise=rng.normal(0,1,n);signal+=noise[:,None]*.19*np.exp(-t/.045)[:,None]
 elif name=='afterglow':
  metal(1280,.15,decay=.45);sample('cymbal',.16,decay=.65)
 dry=signal.copy()
 for delay,gain in [(.043,.12),(.079,.13),(.113,.12),(.157,.10),(.211,.09),(.269,.08),(.337,.07),(.419,.055),(.521,.04),(.637,.03)]:
  d=int(delay*sr)
  if d<n:signal[d:,0]+=dry[:-d,1]*gain;signal[d:,1]+=dry[:-d,0]*gain
 signal*=np.minimum(1,t/.004)[:,None]*np.minimum(1,(duration-t)/.045)[:,None]
 signal*=.85/max(.85,np.max(np.abs(signal)))
 return signal,sr
bed_temp=tempfile.TemporaryDirectory(prefix='ercedia-ultimate-')
for name,(duration,layers) in recipes.items():
 signal,sr=bed(name,duration);bed_path=pathlib.Path(bed_temp.name)/(name+'.wav')
 with wave.open(str(bed_path),'wb') as wav:
  wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes((np.clip(signal,-.97,.97)*32767).astype('<i2').tobytes())
 args=[ff,'-hide_banner','-loglevel','error','-y'];filters=[]
 for i,(path,gain,rate,delay,effects) in enumerate(layers):
  args+=['-i',str(root/'assets/audio'/path)];filters.append(f'[{i}:a]aresample=44100,aformat=channel_layouts=stereo,asetrate={44100*rate},aresample=44100,{effects},volume={gain},adelay={int(delay*1000)}:all=1,apad[a{i}]')
 i=len(layers);args+=['-i',str(bed_path)];filters.append(f'[{i}:a]volume=1[a{i}]')
 filters.append(''.join(f'[a{i}]' for i in range(len(layers)+1))+f'amix=inputs={len(layers)+1}:normalize=0,highpass=f=28,equalizer=f=3400:t=q:w=1.1:g=-2,lowpass=f=15500,alimiter=limit=0.82:level=0:latency=1,afade=t=in:d=0.004,afade=t=out:st={duration-.06}:d=0.06[out]')
 args+=['-filter_complex',';'.join(filters),'-map','[out]','-t',str(duration),'-c:a','libvorbis','-q:a','5',str(out/(name+'.ogg'))];subprocess.run(args,check=True);print(name)
(out/'recipes.json').write_text(json.dumps({'license':'CC0-1.0','sources':[{'author':'rubberduck','page':'https://opengameart.org/node/86018','files':['spell_01.ogg','spell_02.ogg','blade_03.ogg','metal_01.ogg']},{'author':'JaggedStone','page':'https://opengameart.org/content/magic-spell-sfx','files':['magical_1.ogg','magical_2.ogg','magical_4.ogg','magical_7.ogg']},{'author':'StarNinjas','page':'https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes','files':['sword_1.ogg','sword_2.ogg','sword_3.ogg']},{'author':'Kenney','page':'https://kenney.nl/assets/rpg-audio','files':['knifeSlice.ogg','knifeSlice2.ogg']},{'author':'Kenney','page':'https://kenney.nl/assets/impact-sounds','files':['impactPunch_heavy_000.ogg','impactPunch_heavy_001.ogg']}],'orchestration':json.loads((out/'source/instruments.json').read_text()),'original_synthesis':'Inharmonic metal resonance, sub-bass descent and transient noise. No actual waterphone recording.', 'references':['https://www.leagueoflegends.com/en-gb/news/dev/origins-pyke/','https://www.leagueoflegends.com/en-us/news/dev/champion-insights-gwen/'], 'direction':'No charging riser in prepare/reveal/charge. Short unsheathing metal and static decaying blade resonance replace it; 120ms pre-strike silence remains.', 'polish':'Reduced saturated high partials and flutter, quicker high-frequency decay, denser softer stereo reflections, 28 Hz cleanup, mild 3.4 kHz harshness reduction and 15.5 kHz rolloff. Preserves the 120 ms pre-strike silence and attack timing.','processing':'Reversed risers, pitched and filtered external CC0 layers, timing offsets, echo tails, fades and peak limiting. No voice line or combat decision is generated.','recipes':recipes},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

bed_temp.cleanup()
