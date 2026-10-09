"""Five spoken-line auditions, separate from the approved reaction voice bank.

Requires edge-tts and imageio-ffmpeg. No API credentials are stored.
"""
import asyncio
import argparse
import hashlib
import json
import pathlib
import subprocess
import edge_tts
import imageio_ffmpeg

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/dialogue/serin-audition'
VOICE = 'ko-KR-SunHiNeural'
LANGUAGE = 'ko'
LINES = [
    ('greeting', '첫 만남', '세린입니다. 앞으로 잘 부탁드려요.', '+9%', '+38Hz', '밝고 귀여운 인사'),
    ('concern', '걱정', '다치신 건 아니죠? 잠깐만 보여주세요.', '+12%', '+32Hz', '가볍고 다급한 걱정'),
    ('battle', '전투 시작', '제 뒤에 계세요. 제가 앞을 맡겠습니다.', '+7%', '+28Hz', '밝은 목소리의 또렷한 결의'),
    ('ultimate', '궁극기', '이곳은… 제가 지킵니다!', '-1%', '+30Hz', '맑고 단단한 결의'),
    ('victory', '승리', '끝났네요… 모두 무사해서 다행이에요.', '+5%', '+38Hz', '밝고 가벼운 안도'),
]
KOREAN_TEXT = {line[0]: line[2] for line in LINES}
JAPANESE_LINES = [
    ('greeting', '첫 만남', 'セリンです！これからよろしくお願いしますね！', '+10%', '+44Hz', '밝고 앳된 인사'),
    ('concern', '걱정', '怪我はしていませんか？ちょっと見せてください！', '+14%', '+48Hz', '높고 다급한 질문 뒤 부드러운 걱정'),
    ('battle', '전투 시작', '私の後ろにいてください！前は私が守ります。', '+8%', '+36Hz', '빠른 경고 뒤 단단한 약속'),
    ('ultimate', '궁극기', 'ここは……私が守ります！', '-3%', '+38Hz', '짧게 멈춘 뒤 힘을 주는 결의'),
    ('victory', '승리', '終わりましたね……みんな無事で、よかったです！', '+5%', '+44Hz', '안도에서 밝은 기쁨으로'),
]
# Separate prosody for each phrase. The gap is silence after that phrase, in seconds.
JAPANESE_SEGMENTS = {
    'greeting': [('セリンです！', '+12%', '+46Hz', .16), ('これからよろしくお願いしますね！', '+7%', '+40Hz', 0)],
    'concern': [('怪我はしていませんか？', '+14%', '+48Hz', .12), ('ちょっと見せてください！', '+4%', '+38Hz', 0)],
    'battle': [('私の後ろにいてください！', '+11%', '+40Hz', .20), ('前は私が守ります。', '-2%', '+30Hz', 0)],
    'ultimate': [('ここは……', '-9%', '+34Hz', .34), ('私が守ります！', '+4%', '+40Hz', 0)],
    'victory': [('終わりましたね……', '-8%', '+36Hz', .23), ('みんな無事で、', '+3%', '+40Hz', .12), ('よかったです！', '+10%', '+48Hz', 0)],
}

async def japanese_phrase_audio(ident, raw):
    args = [imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y']
    segments = []
    filters = []
    trim = 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB'
    for i, (text, rate, pitch, gap) in enumerate(JAPANESE_SEGMENTS[ident]):
        source = OUT / 'source' / f'{ident}-{i+1}.mp3'
        await edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch).save(str(source))
        args += ['-i', str(source)]
        filters.append(f'[{i}:a]{trim},areverse,{trim},areverse,afade=t=in:d=0.004,apad=pad_dur={gap}[a{i}]')
        segments.append(dict(text=text, rate=rate, pitch=pitch, gap_seconds=gap, source=source.relative_to(ROOT).as_posix()))
    filters.append(''.join(f'[a{i}]' for i in range(len(segments))) + f'concat=n={len(segments)}:v=0:a=1[out]')
    subprocess.run(args + ['-filter_complex', ';'.join(filters), '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '192k', str(raw)], check=True)
    return segments

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'source').mkdir(exist_ok=True)
    result = []
    for ident, situation, text, rate, pitch, direction in LINES:
        raw = OUT / 'source' / (ident + '.mp3')
        segments = None
        if LANGUAGE == 'ja':
            segments = await japanese_phrase_audio(ident, raw)
        else:
            await edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch).save(str(raw))
        target = OUT / (ident + '.mp3')
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y',
                        '-i', str(raw), '-af', 'highpass=f=85,equalizer=f=220:t=q:w=0.7:g=-2,equalizer=f=3000:t=q:w=1:g=1,loudnorm=I=-18:TP=-1.5:LRA=7',
                        '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '160k', str(target)], check=True)
        result.append(dict(id=ident, situation=situation, text=text, voice=VOICE,
                           language=LANGUAGE, korean_text=KOREAN_TEXT[ident],
                           rate=rate, pitch=pitch, intended_direction=direction,
                           segments=segments,
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
        'voice': VOICE, 'language': LANGUAGE, 'synthetic': True, 'revision': 2, 'direction': 'Youthful, bright voice with phrase-by-phrase expressive prosody' if LANGUAGE=='ja' else 'Bright, light, cute adult character voice audition',
        'notes': 'A new spoken voice candidate, not the same performer as existing reaction clips. Rate and pitch adjustments are not emotion-directed acting. Not connected to live dialogue or combat.',
        'processing': '85 Hz high-pass, gentle 220 Hz reduction and 3 kHz presence; loudness normalization to -18 LUFS, -1.5 dBTP; mono 48 kHz MP3.',
        'lines': result,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--language', choices=['ko', 'ja'], default='ko')
    LANGUAGE = parser.parse_args().language
    if LANGUAGE == 'ja':
        OUT = ROOT / 'assets/audio/dialogue/serin-audition-ja'
        VOICE = 'ja-JP-NanamiNeural'
        LINES = JAPANESE_LINES
    asyncio.run(main())
