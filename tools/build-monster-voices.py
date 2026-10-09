"""Derive short fantasy creature reactions from licensed CC0 recordings."""
from pathlib import Path
import io, json, math, struct, wave, zipfile
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/audio/monsters'
pack=zipfile.ZipFile(BASE/'source/ogrebane-pack.zip')
def decode(n):
    with wave.open(io.BytesIO(pack.read(f'monster_sfx_pack/monster-{n}.wav'))) as w:
        channels,width,sr=w.getnchannels(),w.getsampwidth(),w.getframerate()
        raw=w.readframes(w.getnframes())
    values=[int.from_bytes(raw[i:i+width],'little',signed=True)/2**(width*8-1) for i in range(0,len(raw),width)]
    return sr,[sum(values[i:i+channels])/channels for i in range(0,len(values),channels)]
# Families are editorial fantasy sound designs, not recordings of these animals.
families=[('canine','짐승 · 송곳니',1,1.0),('horned','뿔짐승 · 울림',6,.82),('boar','멧돼지 · 거친 숨',8,.72),('small','작은 생물 · 날카로운 소리',2,1.8),('reptile','파충류 · 쉿소리',4,1.25),('winged','날개 생물 · 울음',3,1.6),('insect','벌레 · 기괴한 진동',7,1.9),('aquatic','수중 생물 · 젖은 울림',9,.92),('spectral','영체 · 낮은 신음',10,.65)]
registry={'source':'https://opengameart.org/content/monster-sound-effects-pack','author':'Ogrebane','license':'CC0-1.0','families':{}}
for family,label,n,pitch in families:
    folder=BASE/family;folder.mkdir(parents=True,exist_ok=True)
    cues={}
    for phase,offset,speed in [('base',0,.9),('attack',1,1.08),('hurt',2,1.25),('death',3,.72)]:
        source=(n+offset-1)%10+1;sr,samples=decode(source);rate=pitch*speed
        audible=[i for i,v in enumerate(samples) if abs(v)>.008]
        samples=samples[max(0,audible[0]-int(.015*sr)):min(len(samples),audible[-1]+int(.025*sr))]
        length=min(int(len(samples)/sr/rate*44100),int((1.5 if phase=='death' else 1.15)*44100));out=[];low=0
        for i in range(length):
            pos=min(i*sr*rate/44100,len(samples)-1);j=int(pos);f=pos-j
            v=samples[j]*(1-f)+samples[min(j+1,len(samples)-1)]*f
            low+=.18*(v-low)
            if family in ('reptile','small','winged'):v=.75*(v-low)+.3*v
            if family=='insect':v*=.6+.4*math.sin(i/44100*2*math.pi*47)
            if family=='aquatic':v=(v*.55+low*.45)*(.7+.3*math.sin(i/44100*2*math.pi*9))
            if family=='spectral' and i>4410:v+=out[i-4410]*.3
            out.append(v)
        peak=max(map(abs,out));out=[max(-1,min(1,v*.65/peak*min(1,i/441,(len(out)-1-i)/1323))) for i,v in enumerate(out)]
        path=folder/(phase+'.wav')
        with wave.open(str(path),'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(44100);w.writeframes(struct.pack('<'+'h'*len(out),*[round(v*32767) for v in out]))
        cues[phase]={'path':path.relative_to(ROOT).as_posix(),'source_member':f'monster_sfx_pack/monster-{source}.wav','rate':round(rate,4),'processing':'mono, trim, pitch/rate, family filter/modulation, normalize, fades'}
    registry['families'][family]={'label':label,'cues':cues}
(BASE/'monster-banks.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Built 9 monster styles x 4 reactions')
