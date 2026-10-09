# 세린 · 일본어 다섯 대사 목소리 후보

한국어 다섯 대사를 같은 뜻의 자연스러운 일본어 대사로 옮긴 비교 시안이다. Microsoft Edge 온라인 TTS의 ja-JP-NanamiNeural을 edge-tts로 사용했다. 기존 한국어 시안 및 세린 반응음과 동일한 성우가 아니다. 일본어라는 이유만으로 감정 연기가 더 강해진다고 주장하지 않는다. 속도·높이 조절을 지원하는 합성음 후보이며 전문 감정 연기 생성 방식은 아니다.

최종 개별 MP3와 all-five.mp3, 원본(source/), 일본어 대사·한국어 대응 대사·속도·높이·해시(lines.json)를 보관한다. 85 Hz 하이패스, 220 Hz의 무거운 부분 감소, 3 kHz의 또렷함 및 -18 LUFS/-1.5 dBTP 정리를 적용했다. 게임·컷씬·기존 반응음에는 연결하지 않았다.

재생성: `python tools/build-serin-lines.py --language ja`. Python edge-tts와 imageio-ffmpeg가 필요하며 대사 텍스트는 온라인 음성 생성 서비스로 전송한다. 도구 출처: https://github.com/rany2/edge-tts . 생성 음원은 CC0 외부 에셋으로 표기하지 않는다.

비교 미리보기: tests/serin-dialogue-preview.html?language=ja&revision=3 . 한국어/일본어를 선택해서 같은 상황의 다섯 대사를 듣는다.
