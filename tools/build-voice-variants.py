"""Build recorded voice audition variants; no TTS or new acting is claimed."""
from pathlib import Path
import json, math, struct, wave

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/audio/voices'

def decode(path):
    data = path.read_bytes()
    assert data[:4] == b'RIFF' and data[8:12] == b'WAVE'
    chunks = {}; i = 12
    while i + 8 <= len(data):
        key = data[i:i+4]; size = struct.unpack_from('<I', data, i+4)[0]
        chunks[key] = data[i+8:i+8+size]; i += 8 + size + size % 2
    fmt = chunks[b'fmt ']; tag, channels, rate = struct.unpack_from('<HHI', fmt)
    bits = struct.unpack_from('<H', fmt, 14)[0]
    if tag == 65534: tag = struct.unpack_from('<H', fmt, 24)[0]
    raw = chunks[b'data']; width = bits // 8
    if tag == 3 and bits == 32: values = struct.unpack('<'+'f'*(len(raw)//4), raw)
    elif tag == 1: values = [(int.from_bytes(raw[i:i+width], 'little', signed=True)/(2**(bits-1))) for i in range(0,len(raw),width)]
    else: raise ValueError(f'Unsupported WAV {path}: {tag}/{bits}')
    samples = [sum(values[i:i+channels])/channels for i in range(0,len(values),channels)]
    assert samples and all(math.isfinite(x) for x in samples)
    return rate, samples

female = {'base':'anime_eh','smile':'laugh','angry':'annoyed_grumble','surprised':'gasp1','sad':'sigh1','embarrassed':'anime_uh','afraid':'anime_wah','annoyed':'sigh2','love':'small_single_laugh'}
cute = {'base':'healed1','angry':'attack3','sad':'damaged1','embarrassed':'healed2','afraid':'damaged3','annoyed':'attack2','love':'healed3'}
male = {'base':'male_jump.wav','smile':'source/male_victory0.wav','angry':'source/male_attackbig0.wav','surprised':'source/male_hurt6.wav','sad':'source/male_gameover0.wav','embarrassed':'source/male_hurt2.wav','afraid':'source/male_hurt4.wav','annoyed':'source/male_attack2.wav','love':'source/male_jump1.wav'}
labels = {'base':'기본','smile':'기쁨','angry':'분노','surprised':'놀람','sad':'슬픔','embarrassed':'부끄러움','afraid':'두려움','annoyed':'짜증','love':'애정'}
banks = [
    ('female_young','여성 · 어린',1.0,'기존 귀여운 웃음·놀람 유지, 나머지는 별도의 귀여운 여성 발성에서 선택한 후보'),
    ('female_mature','여성 · 중후',1.0,'별도의 중후 여성 성우 녹음에서 선택한 리액션'),
    ('male_young','남성 · 어린',1.1,'기존 남성 녹음을 조금 밝고 빠르게 가공한 후보'),
    ('male_mature','남성 · 중후',.88,'같은 남성 녹음을 낮고 여유 있게 가공한 후보')
]
registry = {'status':'recorded_and_processed_auditions','banks':[],'npc_defaults':{'serin':'female_young'},'notes':['Four voice styles are audition directions, not verified actor ages.','Emotion labels on effort/breath samples are editorial candidates, not newly acted emotional performances.','Only the two approved bright female cues are kept byte-for-byte. No NPC auto-play is added by this build.']}
for bank, label, rate, description in banks:
    cues = {}; folder = BASE / bank; folder.mkdir(exist_ok=True)
    for emotion in labels:
        source = ('source/mature_'+female[emotion]+'.wav') if bank.startswith('female') else male[emotion]
        preserve = bank == 'female_young' and emotion in ('smile','surprised')
        if preserve: source = 'female_laugh.wav' if emotion == 'smile' else 'female_gasp.wav'
        elif bank == 'female_young': source = 'source/cute_'+cute[emotion]+'.wav'
        path = folder / (emotion+'.wav'); sr, samples = decode(BASE/source)
        if preserve: path.write_bytes((BASE/source).read_bytes())
        else:
            audible = [i for i,v in enumerate(samples) if abs(v)>.004]
            assert audible, source
            samples = samples[max(0,audible[0]-int(sr*.02)):min(len(samples),audible[-1]+int(sr*.04))]
            count = min(int(len(samples)/sr/rate*44100), int(1.5*44100)); out=[]; low=0
            for i in range(count):
                pos=i*sr*rate/44100; index=min(int(pos),len(samples)-1); frac=pos-index
                value=samples[index]*(1-frac)+samples[min(index+1,len(samples)-1)]*frac
                if bank=='male_mature':
                    low += .25*(value-low); value=value*.72+low*.28
                out.append(value)
            peak=max(map(abs,out)); scale=(.48 if emotion in ('sad','embarrassed','love','base') else .7)/peak
            out=[max(-1,min(1,v*scale*min(1,i/441,(len(out)-1-i)/1323))) for i,v in enumerate(out)]
            with wave.open(str(path),'wb') as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(44100)
                wav.writeframes(struct.pack('<'+'h'*len(out),*[round(v*32767) for v in out]))
        cues[emotion]={'label':labels[emotion],'path':path.relative_to(ROOT).as_posix(),'source':(BASE/source).relative_to(ROOT).as_posix(),'processing':'unchanged' if preserve else f'trim, mono, rate {rate}, level and fades'+(', gentle low-pass blend' if bank=='male_mature' else ''),'status':'approved_reference' if preserve else 'audition_candidate'}
    registry['banks'].append({'id':bank,'label':label,'description':description,'cues':cues})
(BASE/'voice-banks.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Built 4 voice banks with 9 cues each; approved female references unchanged.')
