# 결의의 일섬 · 비장한 금속 공명 버전 (revision 10 · revision 7 음원 복원)

확정된 5초 컷씬에 연결되는 7단계 효과음. 화려한 장조 금관 팡파르를 빼고, 저음 압력·불협화 금속 공명·역검풍·날카로운 검격을 중심으로 다시 설계했다.

- 0초: 어둡고 낮은 현악 질감과 금속 공명으로 검광 응축.
- 0.45초: 짧고 빠른 검풍과 높은 금속성 절단음.
- 1.45초: 전신 개방의 저음 압력과 거친 금속 울림.
- 1.8초: 불협화 공명과 역방향 심벌이 치솟는 긴장감.
- 3.07–3.33초: 강하게 압축된 역검풍. **3.33–3.45초는 모든 앞 단계가 끝난 120ms 정적**.
- 3.45초: 과장한 외부 검격, 날카로운 금속 파열, 내려가는 서브 저음, 짧은 노이즈 충격을 함께 재생.
- 3.9–5초: 금속 파편처럼 흩어지는 잔향. 원본 컷씬의 타격 순간은 변경하지 않는다.

참고: Riot 공식 [파이크 제작기](https://www.leagueoflegends.com/en-gb/news/dev/origins-pyke/)의 워터폰 가공과 긴장감 설계, [그웬 제작기](https://www.leagueoflegends.com/en-us/news/dev/champion-insights-gwen/)의 평범한 금속 도구 원음을 강하게 가공하는 방식. 그 게임의 녹음이나 곡은 포함하지 않는다. 금속의 비정수 배음·서브 저음·노이즈 충격은 자체 합성이며 실제 워터폰 녹음이라고 주장하지 않는다.

외부 원음: 기존 StarNinjas·Kenney·rubberduck·JaggedStone의 CC0 검격/마법 음원, VSCO 2 CE의 실제 심벌·팀파니·바이올린 합주 3개 원음. [VSCO 2 CE](https://versilian-studios.com/vsco-community/) — Versilian Studios / Sam Gossner and contributors, CC0. source/Readme.txt와 source/instruments.json에 고정 원본 경로·라이선스·SHA-256을 남겼다. 레시피와 가공 비율은 recipes.json에 기록한다.

Python numpy와 imageio-ffmpeg를 설치한 뒤 저장소 루트에서 `python tools/build-ultimate-audio.py`로 재생성한다. 재생은 web/ultimate-audio.js와 tests/serin-ultimate-preview.js의 컷씬 시간으로 연결되며, 일시정지·음소거·건너뛰기·배속·재시작을 지원한다. 음높이는 배속에 따라 바뀌지 않는다.

미리보기: /tests/serin-ultimate-preview.html?revision=10 . 실전 자동 발동과 최종 컷씬 자동 호출은 ULTIMATE_SYSTEM.md의 별도 엔진 연결 범위다. 기존 unique 이벤트나 세린의 습득 기록을 변경하지 않는다. 실제 ChatGPT/Tampermonkey 전투 플레이를 검증한 것으로 간주하지 않는다.

## 최종 음색 다듬기

비장한 금속 공명과 120ms 정적은 유지한다. 강한 포화·빠른 떨림을 줄이고 높은 배음은 더 빨리 사라지도록 조절했다. 잔향은 큰 메아리 몇 개 대신 작고 촘촘한 반사음으로 정리했다. 28Hz 이하 불필요한 저역, 3.4kHz의 거친 부분, 15.5kHz 위 고역을 완만하게 정리했다. 저음 충격과 날카로운 첫 검격은 유지하며 컷씬·재생 모듈·발동 판정은 변경하지 않는다.

## 음향 복원

사용자 선택에 따라 revision 7의 일곱 Ogg 음원과 제작 레시피를 그대로 복원했다. 음원을 다시 렌더링하거나 피치를 바꾸지 않았다. 컷씬과 최신 게임 엔진은 유지한다.
