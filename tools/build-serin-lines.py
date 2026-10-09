"""Five spoken-line auditions, separate from the approved reaction voice bank.

Requires edge-tts and imageio-ffmpeg. No API credentials are stored.
"""
import asyncio
import hashlib
import json
import pathlib
import subprocess
import edge_tts
import imageio_ffmpeg

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/dialogue/serin-audition'
VOICE = 'ko-KR-SunHiNeural'
LINES = [
    ('greeting', '첫 만남', '세린입니다. 앞으로 잘 부탁드려요.', '+9%', '+38Hz', '밝고 귀여운 인사'),
    ('concern', '걱정', '다치신 건 아니죠? 잠깐만 보여주세요.', '+12%', '+32Hz', '가볍고 다급한 걱정'),
    ('battle', '전투 시작', '제 뒤에 계세요. 제가 앞을 맡겠습니다.', '+7%', '+28Hz', '밝은 목소리의 또렷한 결의'),
    ('ultimate', '궁극기', '이곳은… 제가 지킵니다!', '-1%', '+30Hz', '맑고 단단한 결의'),
    ('victory', '승리', '끝났네요… 모두 무사해서 다행이에요.', '+5%', '+38Hz', '밝고 가벼운 안도'),
]

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'source').mkdir(exist_ok=True)
    result = []
    for ident, situation, text, rate, pitch, direction in LINES:
        raw = OUT / 'source' / (ident + '.mp3')
        await edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch).save(str(raw))
        target = OUT / (ident + '.mp3')
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y',
                        '-i', str(raw), '-af', 'highpass=f=85,equalizer=f=220:t=q:w=0.7:g=-2,equalizer=f=3000:t=q:w=1:g=1,loudnorm=I=-18:TP=-1.5:LRA=7',
                        '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '160k', str(target)], check=True)
        result.append(dict(id=ident, situation=situation, text=text, voice=VOICE,
                           rate=rate, pitch=pitch, intended_direction=direction,
                           path=target.relative_to(ROOT).as_posix(),
                           sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
        print(ident, target.stat().st_size, flush=True)
    args = [imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y']
    for line in result:
        args += ['-i', str(ROOT / line['path'])]
    filters = ';'.join(f'[{i}:a]apad=pad_dur=0.55[a{i}]' for i in range(len(result)))
    filters += ';' + ''.join(f'[a{i}]' for i in range(len(result))) + f'concat=n={len(result)}:v=0:a=1[out]'
    subprocess.run(args + ['-filter_complex', filters, '-map', '[out]', '-c:a', 'libmp3lame',
                           '-b:a', '160k', str(OUT / 'all-five.mp3')], check=True)
    (OUT / 'lines.json').write_text(json.dumps({
        'status': 'audition_only', 'provider': 'Microsoft Edge online TTS via edge-tts',
        'tool_reference': 'https://github.com/rany2/edge-tts',
        'voice': VOICE, 'synthetic': True, 'revision': 2, 'direction': 'Bright, light, cute adult character voice audition',
        'notes': 'A new spoken voice candidate, not the same performer as existing reaction clips. Rate and pitch adjustments are not emotion-directed acting. Not connected to live dialogue or combat.',
        'processing': '85 Hz high-pass, gentle 220 Hz reduction and 3 kHz presence; loudness normalization to -18 LUFS, -1.5 dBTP; mono 48 kHz MP3.',
        'lines': result,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    asyncio.run(main())
