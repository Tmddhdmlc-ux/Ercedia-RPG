from pathlib import Path
import json,re,math,hashlib,subprocess
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,a):
    f=ROOT/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sources=[('characters/npc_roster_100.json','characters'),('characters/core_cast_stats_38.json','roster'),('characters/common_npc_roster.json','characters')]
# One-off authored setting edition: reproduce against the reviewed source snapshot only.
BASELINE_COMMIT='5574f19e3773eabc5680f0c7ca9867da5c03d041'
baseline=lambda p:json.loads(subprocess.check_output(['git','show',BASELINE_COMMIT+':'+p],cwd=ROOT).decode('utf-8'))
documents={p:baseline(p) for p,k in sources};serin=baseline('characters/serin.json')
entries=[(c,p) for p,k in sources for c in documents[p][k]]+[(serin,'characters/serin.json')]
original={c['id']:{k:c.get(k) for k in ['rank','level','stats','appearance','location_id','affiliation']} for c,p in entries}
lords=(ROOT/'LORDSHIPS.md').read_text(encoding='utf-8')
regions={m.group(1):{'name':m.group(2),'text':m.group(3)} for m in re.finditer(r'### ([WES]\d) · ([^\n]+)\n(.*?)(?=\n### |\n## |\Z)',lords,re.S)}
def field(text,label):
    m=re.search(r'- \*\*'+re.escape(label)+r':\*\* ([^\n]+)',text);return m.group(1) if m else ''
realm_names={'basic':'베이직 나이트','expert':'익스퍼트 나이트','hyper':'하이퍼 나이트','master':'마스터 나이트','none':'해당 없음'}
rank_realm=lambda r:next((k for k,v in realm_names.items() if k!='none' and v in r),'none')

# Each entry is an authored personal technique, not an element inferred by the generator.
# name / action / optional element. Existing numeric statistics are preserved.
npc_specs='''
왕문 수호|장검을 세워 통로를 좁히고 반격 한 번으로 침입자를 밀어낸다
청색 엄호|몸을 낮추고 검을 비껴 세워 동료의 후퇴를 지킨다
장미 선봉|낮은 자세에서 한 발 깊게 들어가 갑옷 틈을 찌른다
측면 돌파|경량 갑옷의 기동성을 살려 옆으로 돌아 짧게 벤다
성벽 되받기|방패로 공격을 흘린 뒤 짧은 검격을 되돌린다
철갑 버티기|룬 철갑의 보호 부위를 맞춰 충격을 받아낸다
균열 추적|고글로 관찰한 발자국과 지형을 따라 퇴로를 차단한다
회흑 급습|장애물 뒤에서 한 번 짧게 접근해 베고 이탈한다
백파도 호위|배의 흔들림에 맞춰 발을 옮기며 근접 위협을 밀어낸다
선측 막기|청백 제복의 활동성을 살려 좁은 선측을 지킨다
해풍 가르기|밧줄 사이를 지나 무기 팔을 짧게 베어 진로를 확보한다
갑판 균형|흔들리는 갑판에서 체중을 낮춰 공격을 흘린다
문헌 투영|손에 든 기록 위로 빛을 모아 숨겨진 필기와 마나 흔적을 읽는다|빛
서고 등불|책상 한 곳을 비추는 작은 빛을 일정하게 유지한다|빛
뇌명 분할|금속 장갑의 도체를 따라 전류를 나눠 가까운 한 대상에 모은다|전기
공방 도통|청동 소매의 도체로 장치 하나의 전류를 안정시킨다|전기
청류 회환|물줄기를 휘감아 국소 화재를 진압하거나 접근을 밀어낸다|물
선상 순풍|망토 곁의 기류를 정돈해 작은 돛 하나를 보조한다|바람
황혼 장막|한 구역의 명암을 낮춰 후퇴하는 동료를 숨긴다|암흑
음영 접기|검은 베일 가까이에 얇은 그늘을 드리워 시야를 줄인다|암흑
초석 방벽|회청 로브 앞에 응축 마나 방벽을 세워 정면 타격을 완화한다
광맥 점검|황동 렌즈로 광석의 발광 차이를 관찰해 불안정 부분을 표시한다|빛
기록 대조|남청 기록복의 문서철을 펼쳐 연대와 증언의 불일치를 찾는다
길목 측량|여행 도구로 문과 길의 간격을 재고 통행자를 안내한다
생체 살피기|손으로 생체 마나 흐름을 살펴 압박 지혈과 응급 처치를 돕는다
은종 안식|은종의 잔향을 따라 사령 침범의 흔적을 식별하고 매장 의례를 돕는다
화로 진정|작은 화로의 불길을 손 가까이에서 낮춰 안전한 작업을 돕는다|불
조수 정화|받아 둔 물 한 그릇의 불순물을 분리한다|물
순례 바람|짧은 바람으로 연기와 먼지를 밀어 길을 확보한다|바람
피뢰 분기|청동 도체의 전류를 접지선 쪽으로 분산한다|전기
광휘 길잡이|흰금 제의 앞에 빛을 띄워 피난 통로를 밝힌다|빛
그늘 피난|작은 천막의 밝기를 낮춰 피난민의 노출을 줄인다|암흑
인연 중재|서로의 증언과 계약을 대조해 오해를 좁힌다
붉은길 추적|여행 망토를 여미고 지형 흔적을 따라 목표의 이동 경로를 찾는다
돌길 회피|두꺼운 부츠로 발판을 확보해 한 공격을 피한다
깃털 연격|가벼운 체중 이동으로 다른 각도의 검격 두 번을 잇는다
항로 호위|좁은 길목을 막고 동료가 지나갈 틈을 만든다
쇠갈퀴 격파|큰 체격과 쇠갑옷의 무게를 실어 정면 방어를 압박한다
의료 청수|의료가방의 물을 정화하고 처치 도구를 씻는다|물
선원 걸기|밧줄로 상대의 균형을 흐트러뜨린 뒤 물러선다
해상 엄호|경갑을 이용해 이동하며 동료의 측면을 지킨다
황금돛 결산|계약과 운임을 대조해 손실과 납기 위험을 계산한다
항만 수배|납품 명부를 확인해 물자 운송 순서를 조정한다
대상단 방어|모직옷 아래 몸을 낮춰 수레 옆에서 공격을 받아 흘린다
통행 장부|관문별 요금과 운송 문서를 맞춰 통과 문제를 찾는다
들불 설득|작업복 차림으로 주민의 증언을 모아 공개 청원을 조직한다
곡물 분배|밀짚 모자와 계량 도구를 이용해 배급량을 확인한다
갱도 안전점검|황동 고글로 지지대와 낙석 징후를 확인한다
노동 협상|붉은 스카프를 정리하고 작업 기록을 근거로 보상을 협상한다
그물 구호|청록 작업복의 팔을 걷고 그물과 밧줄로 구조한다
징세 검산|항만 징세 명부와 실제 하역량을 비교한다
전쟁고아 돌봄|회백 성의 차림으로 아이들을 진정시키고 안전하게 이동시킨다
중재 기록|남색 코트의 문서철에 양측 합의와 미합의 조건을 분리한다
전시 통역|붉은 필기첩으로 서로 다른 말과 군사 용어를 교차 확인한다
도서 감별|보라 가방에서 견본을 꺼내 필사와 위조 흔적을 비교한다
칙령 정리|금테 안경으로 조항을 확인하고 필요한 공문을 작성한다
변경 응급처치|털망토를 깔고 동상과 외상을 응급 처치한다
곡창 검수|장부가방의 명부와 곡물 저장 상태를 맞춘다
수입 대조|흰 조끼 차림으로 입출고 수량과 장부를 검산한다
사절 조율|남청 제복을 갖추고 교섭 발언과 조건을 조정한다
공방 조달|부품 규격과 납품량을 비교해 대체 조달을 정한다
선박 응급처치|푸른 가방의 도구로 흔들리는 배 안에서 지혈한다
감시탑 보강|두꺼운 장갑으로 손상 목재를 다루고 지지대를 보강한다
약초 선별|올리브 작업복을 걷고 식물 상태를 비교해 재배와 채취를 정한다
교량 발판|짐의 무게를 옮기며 흔들리는 교량을 조심스럽게 통과한다
곡창길 압박|갈색 갑옷으로 길목을 막고 강한 내려치기로 호위를 몰아낸다
관문 매복궁|누더기 망토로 몸을 가리고 준비한 한 발을 쏜다
산길 급습|검정 가죽갑의 기동성으로 사각에서 찌르고 이탈한다
탈영병 반격|파손 철갑의 멀쩡한 부위로 받아내고 거칠게 반격한다
계약 위조|푸른 후드 아래 서류의 인장과 문구를 흉내 낸다
갑판 강습|붉은 허리띠를 낮게 묶고 상대를 선측 쪽으로 몰아낸다
선측 투척|낡은 가죽조끼 차림으로 가까운 표적에 투척물을 던진다
갱도 파쇄|광부 도구로 약한 지지점을 노려 통로를 막는다
장치 해체|금속 도구띠의 도구로 잠금 장치를 분해한다
귀족 사칭|자주 예복과 호칭으로 신뢰를 얻으려 시도한다
수레길 창격|녹슨 창의 사거리를 살려 좁은 수레길을 찌른다
설산 추격궁|모피 외투로 몸을 덮고 눈밭의 발자국을 따라 사냥한다
유적 지렛대|황동 장비로 닫힌 틈을 열고 낙하 함정을 살핀다
가짜 경매|화려한 반지와 말솜씨로 물건의 가치를 부풀린다
검문 위협|가짜 휘장과 짧은 무기로 행인을 압박한다
서리갈기 돌진|눈밭에서 낮게 달려들어 턱으로 물고 늘어진다
백각 밀치기|거대한 뿔을 낮춰 전방의 상대를 밀어낸다
철가죽 들이받기|단단한 등피로 충격을 견디며 엄니를 들이민다
곡창 잠입|좁은 저장 틈으로 숨고 꼬리로 균형을 잡아 달아난다
잿불 분사|등가시 가까이에 열을 모아 짧은 불꽃을 뿜는다|불
협곡 급강하|돌빛 날개를 접고 발톱으로 한 목표를 움켜잡는다
광충 섬광|수정 껍질에 모은 빛을 짧게 터뜨려 접근자를 교란한다|빛
수정 진동망|다리와 거미줄을 통해 가까운 진동을 감지한다
청전기 뿔치기|뿔 사이의 짧은 전류를 접촉한 상대에 흘린다|전기
안개 회피|막날개를 접고 흐린 시야 속으로 급히 물러선다
해풍 활공|작은 날개와 지느러미로 바람을 타고 짧게 덮친다
암초 집게|단단한 집게로 붙들고 암초 틈으로 물러난다
심해 휘감기|긴 몸으로 감고 이빨로 고정해 움직임을 제한한다
은비늘 급류|지느러미로 물살을 타며 짧게 돌진한다
밤등불 점멸|날개의 빛무늬를 점멸시켜 추적 방향을 흐린다|빛
모래 꼬리막|꼬리로 모래를 흩뿌려 시야를 가린다
원시림 뿌리결박|뿌리다리를 펼쳐 가까운 이동로를 붙잡는다
심연고리 압박|뿔고리와 체중으로 상대를 몰아낸다
균열 잔상|여섯 발의 급격한 방향 전환과 짧은 마나 잔상으로 추적을 흔든다
석갑 통로봉쇄|고대 문자 돌갑각을 세우고 거대한 몸으로 던전 통로를 막는다
'''.strip().splitlines()
assert len(npc_specs)==100
core_specs='''
왕관의 수호|knight|hyper|수호검|왕실 장검을 세워 근위대의 빈틈을 메운다
수정 관통|mage|5|정밀 주문|지팡이 또는 장갑 앞에 모은 빛을 좁은 관통선으로 쏜다|빛
해유리 굴절|mage|3|외교·방호|홀 앞의 빛을 굴절시켜 접근자의 조준을 흐린다|빛
북곰 버티기|knight|hyper|강검|낡은 강철갑과 낮은 중심으로 버티며 크게 되받아친다
사자 인장검|knight|expert|정검|절제된 한 걸음과 정확한 검끝으로 공격선을 끊는다
곡창 수로|mage|2|생활 생산|작은 물줄기를 정돈해 종자와 식수 관리를 돕는다|물
장미 쇄진|knight|hyper|강검|기스 난 중갑의 체중을 실어 전열 한 곳을 돌파한다
은매 비껴검|knight|expert|쾌검|승마복의 기동성을 살려 비껴 찌르고 거리를 벌린다
검은관문 수비|knight|hyper|수호검|변경의 좁은 길목에서 검선을 고정해 접근을 막는다
수정 회로|mage|5|장치 제어|제복의 도체 앞에서 전류를 분할해 마도구를 정밀 제어한다|전기
철산 무너뜨리기|knight|hyper|강검|산악 보급로에서 중량 검격으로 방패의 균형을 무너뜨린다
은다리 엄호|mage|3|피난 방호|얇은 마나 방벽을 세워 교량을 지나는 사람을 엄호한다
황금돛 물막|mage|3|항만 방호|선측에 물막을 세워 날아오는 작은 파편을 완화한다|물
백매 길열기|knight|hyper|정검|백청 제복의 단정한 자세로 막힌 통로를 정확히 베어 연다
쌍파도 연격|knight|expert|쾌검|갑판의 흔들림에 맞춰 두 각도의 검격을 잇는다
금열쇠 조명|mage|2|생활 생산|좁은 작업대를 고르게 밝혀 금융 문서 위조 흔적을 비교한다|빛
영시 보존|cleric|none|시간 잔향|기록의 미세한 마나 어긋남을 감지해 훼손 지점을 보존한다
천문 길잡이|cleric|none|공간 감각|가까운 문과 통로의 거리 왜곡을 읽고 피난 경로를 안내한다
새벽 생맥|cleric|none|생명 보조|손을 대어 생체 마나 흐름을 정돈하고 상처 재생을 돕는다
은종 잔향|cleric|none|임종·안식|임종의 마나 잔향과 침범 징후를 식별해 장례 구호를 돕는다
화로의 손|cleric|none|소방|손 가까이의 열을 유도해 구조 통로의 불길을 낮춘다|불
푸른만 정화|cleric|none|수난 구호|국소 물 흐름을 정돈해 오염을 분리하고 구조를 보조한다|물
순풍의 귀|cleric|none|기류·소리|미세 기류와 소리 방향을 읽어 조난자를 탐색한다|바람
천뢰 분도|cleric|none|접지 보호|전류를 나누어 준비한 접지 도체로 유도한다|전기
백일 정렬|cleric|none|광휘 방호|흰금 성의 앞에서 빛을 정렬해 피난 경로를 밝힌다|빛
흑월 안식|cleric|none|은신 구호|가까운 피난 공간에 그늘을 둘러 외부의 시야를 줄인다|암흑
삼실 갈림|cleric|none|선택 감지|선택 직전의 마나 갈림을 읽어 위험 신호를 알린다
청금사자 결계검|knight|master|수호검|장검의 검결을 곡선으로 제어해 근위 전열 앞을 지킨다
적장미 관통|knight|hyper|강검|전방의 좁은 공격선에 검결을 응축해 돌파한다
청뢰성벽 반격|knight|master|수호검|받아낸 충격 뒤 검결을 정밀하게 방향 전환해 반격한다
균열 경계선|knight|hyper|정검|검결의 짧은 잔향으로 근거리 움직임을 관측하고 반격한다
백파도 귀환검|knight|master|정검|휘어진 검결을 통제해 동료를 비껴 위협의 무기 팔을 겨눈다
해풍 쇄도|knight|hyper|쾌검|갑판의 움직임을 따라 검결을 좁은 궤적으로 방출한다
기록광 추출|mage|6|고문서 분석|빛으로 고문서의 마나 층을 분리해 기록 흔적을 읽는다|빛
뇌명 도체망|mage|7|정밀 전류|준비한 여러 도체를 연결해 전류를 분기하고 영역을 제어한다|전기
청류 구조환|mage|6|항해 구호|회전하는 물줄기로 주변의 잔해를 밀어 구조 통로를 확보한다|물
황혼 은폐막|mage|6|인식·은폐|주변 공간의 그늘을 정렬해 동료의 후퇴를 숨긴다|암흑
초석 응력막|mage|6|광산 방호|여러 마나 방벽을 겹쳐 낙석 충격을 나누어 받는다
'''.strip().splitlines()
assert len(core_specs)==38
common_names=['안전 벌목','종자 선별','수레 균형','화로 집게','빵 발효','양떼 유도','숲길 사격','징세 대조','갱도 지주','약초 감별','산길 전달','재고 분류','금속 감정','계약 방어','골목 이탈','광석 선별','연안 투망','생활품 흥정','거리 합주','바느질 수선','여관 접객','채소 이식','그물 매듭','부두 숨기']
common_stats=[(18,12,10,17,8),(12,11,13,14,8),(17,13,10,16,7),(16,13,14,15,9),(12,12,15,13,8),(11,13,12,13,9),(14,19,13,14,10),(10,12,19,11,9),(19,11,11,18,7),(10,15,17,12,10),(12,20,13,14,9),(13,11,18,14,8),(10,14,20,12,9),(25,22,13,23,13),(12,23,16,12,10),(16,12,13,16,8),(16,15,12,16,8),(11,15,19,12,9),(10,18,16,12,11),(11,19,17,12,9),(10,16,17,13,9),(16,12,13,16,8),(17,15,13,17,9),(13,24,15,13,10)]
common_levels=[12,10,11,12,13,9,15,14,13,12,14,13,15,18,14,11,12,15,13,14,12,11,13,15]
ordinary_combat={34:('knight','expert'),35:('knight','basic'),36:('martial','none'),37:('knight','basic'),38:('knight','expert'),40:('martial','none'),41:('martial','none'),44:('knight','basic'),66:('knight','basic'),67:('martial','none'),68:('martial','none'),69:('knight','basic'),71:('knight','basic'),72:('martial','none'),73:('martial','none'),76:('martial','none'),77:('martial','none'),78:('martial','none'),80:('martial','none')}
common_actions=['밧줄과 날을 덮은 도끼를 확인하고 나무의 무게 방향을 따라 안전하게 벌목한다','곡물의 색과 건조 상태를 살펴 다음 파종에 쓸 종자를 분리한다','짐의 중심을 낮추고 수레의 바퀴와 끈을 점검한다','집게로 달군 금속을 고정해 대장장이의 가공을 보조한다','밀가루와 물의 상태를 살피고 시간과 온도를 맞춰 반죽을 발효한다','목소리와 울타리를 이용해 흩어진 양을 안전한 길로 모은다','숲의 발자국과 바람을 살피고 준비한 한 발로 사냥한다','영지 징세 기록과 실제 수납액을 대조해 착오를 찾는다','갱도의 균열을 살피고 버팀목을 세워 작업 공간을 확보한다','약초의 잎과 냄새를 비교해 독성 식물을 분리한다','가벼운 몸으로 산길을 이동하며 봉인한 전언을 전달한다','물품을 종류와 상태별로 나누고 창고 장부를 맞춘다','작은 금속 제품의 무게와 표면을 살펴 불량품을 구분한다','고용 계약의 보호 대상을 확인하고 짧은 검으로 접근선을 막는다','골목의 장애물을 이용해 추적 시야를 끊고 이탈한다','광석의 결을 비교해 맥석과 사용 가능한 광물을 분리한다','조수와 바람을 확인하고 가까운 바다에 그물을 던진다','잡화의 상태와 운송 비용을 근거로 거래를 흥정한다','손가락의 리듬과 관객 반응을 살피며 악기를 연주한다','의복의 찢어진 결을 따라 바늘로 수선하고 치수를 맞춘다','손님의 요구와 빈방을 확인해 식사와 숙박을 안내한다','흙의 수분과 뿌리 상태를 확인해 채소 모종을 이식한다','그물의 해진 곳에 매듭을 이어 인장력을 나누어 받게 한다','부두 화물 틈에서 소리를 줄이고 추적자의 시야를 피한다']
profiles=[]
for c,source in entries:
    id=c['id'];r=rank_realm(c.get('rank',''));circle=0;kind='civilian';specialty='生業';element=None
    if id.startswith('ER-NPC-'):
        n=int(id[-3:]);parts=npc_specs[n-1].split('|');name,action=parts[:2];element=parts[2] if len(parts)>2 else None
        if n>=81:kind='monster'
        elif r!='none':kind='knight'
        elif re.search(r'([1-7])서클',c.get('rank','')):kind='mage';circle=int(re.search(r'([1-7])서클',c['rank'])[1])
        elif 23<=n<=33:kind='cleric'
        elif n in ordinary_combat:kind,r=ordinary_combat[n]
        specialty='수호검' if kind=='knight' and any(s in action for s in ['지킨','막고','방패','받아']) else '쾌검' if kind=='knight' and any(s in action for s in ['이탈','가벼','돌아']) else '강검' if kind=='knight' and any(s in action for s in ['강한','무게','압박']) else '정검' if kind=='knight' else '원소 주문' if kind=='mage' and element else '마나 방호' if kind=='mage' else '교단 실무' if kind=='cleric' else '생태 기술' if kind=='monster' else c.get('rank','생업')
    elif id.startswith('ER-CORE-'):
        n=int(id[-3:]);parts=core_specs[n-1].split('|');name,kind,tier,specialty,action=parts[:5];element=parts[5] if len(parts)>5 else None
        if kind=='knight':r=tier
        elif kind=='mage':circle=int(tier)
    elif id.startswith('ER-COM-'):
        n=int(id[-3:]);name=common_names[n-1];action=common_actions[n-1];specialty=c['job']
        kind='martial' if n in [7,14,15,24] else 'civilian'
        if n==14:kind='knight';r='basic'
        st=common_stats[n-1];c['level']=common_levels[n-1];c['level_hp_bonus']=(c['level']-1)*(2+st[0]//10)
        hp=max(1,100+10*(st[3]-10)+3*(st[0]-10)+c['level_hp_bonus']);mp=max(0,100+6*(st[4]-10))
        c['stats']=dict(zip(['strength','agility','intelligence','constitution','mana'],st));c['stats'].update(hp=hp,max_hp=hp,mp=mp,max_mp=mp)
        c.update(stat_status='assigned_initial_balance_v1',xp=0,unspent_stat_points=0,realm_awarded_bonuses={},xp_to_next=math.floor(100*c['level']**1.5),level_hp_bonus_method='initial_baseline_estimate')
    else:name='巡回의 엄호'.replace('巡回','순찰');action='장검을 비껴 세우고 주민 쪽으로 몸을 옮겨 한 번의 근접 공격을 막는다';kind='knight';r='basic';specialty='수호검'
    if kind=='knight' and original[id]['rank'] and rank_realm(original[id]['rank'])!='none':r=rank_realm(original[id]['rank'])
    rank=realm_names[r] if kind=='knight' else str(circle)+'서클 마법사' if kind=='mage' else c.get('rank','일반인')
    c.update(combat_class=kind,realm=r,circle=circle,combat_rank=rank,specialization=specialty,setting_status='established_v1_user_requested')
    multiplier={'none':1,'basic':1,'expert':1.25,'hyper':1.65,'master':2.2}[r]
    c['realm_damage_multiplier']=multiplier
    if original[id]['stats'] is None:
        s=c['stats'];base=math.floor(.65*s['strength']+.20*s['agility']);c['combat']={'speed':s['agility']+s['strength']//5,'base_attack_min':10+base,'base_attack_max':20+base,'realm_damage_multiplier':multiplier}
    elif 'combat' in c:c['combat']['realm_damage_multiplier']=multiplier
    loc=c.get('location_id','');region=regions.get(loc,{});kingdom='벨로아' if loc.startswith('W') or loc=='CW' else '드라켄' if loc.startswith('E') or loc=='CE' else '루메린' if loc.startswith('S') or loc=='CS' else '문명권 밖'
    appearance=field(region.get('text',''),'외형·의상') if c.get('appearance')=='해당 전문 설정집 참조' else c.get('appearance')
    basis={'kingdom':kingdom,'national_trait':{'벨로아':'농경·기병·기사 문화','드라켄':'고원·마나 광맥·공방·요새','루메린':'항해·교역·구호·항만','문명권 밖':'기존 생태 및 마나 이상지대'}[kingdom],'lordship':region.get('name'),'lord':field(region.get('text',''),'영주'),'regional_economy':field(region.get('text',''),'생산·경제'),'regional_terrain':field(region.get('text',''),'지형·민생'),'affiliation':c.get('affiliation'),'appearance':appearance,'references':[source,'KINGDOMS.md','LORDSHIPS.md','FACTIONS.md','CLASS_GROWTH.md']}
    skill_type='attack' if kind in ['knight','martial','monster'] else 'spell' if kind=='mage' else 'divine_service' if kind=='cleric' else 'profession'
    if any(w in action for w in ['구조','구호','피난','정화','치료','지혈','처치','보존']):skill_type='support'
    elif any(w in action for w in ['방벽','지킨','보호','엄호','버티','완화']):skill_type='defense'
    limit='시야·사거리·자세와 실제 지형에 제한되며 자동 적중·절대 방어가 아니다.' if kind in ['knight','martial','monster'] else '준비된 도구·시야·거리와 마나 유지가 필요하며 국가 규모·무제한 효과가 아니다.' if kind in ['mage','cleric'] else '도구·시간·재료와 실제 정보가 필요하며 성공과 결과를 자동 보장하지 않는다.'
    if kind=='cleric':limit+=' 신의 전체 권능이나 신격을 상속하지 않으며 신앙 기적은 별도 GM 판정이다.'
    skill={'id':id+'-MAIN-01','name':name,'category':skill_type,'element':element,'element_status':'established' if element else 'non_elemental','action':action,'limits':limit,'cost_rule':'실제 사용 범위와 기술 비용을 GM 사건에 기록한다. 미정 위력·피해·회복 수치는 자동 지급하지 않는다.','setting_basis':basis,'learning_status':'initial_background_training' if kind!='monster' else 'species_behavior'}
    c['main_skill']=skill
    eligible=kind=='knight' and r in ['expert','hyper','master'] or kind=='mage' and circle>=3
    ultimate=None
    if kind in ['knight','mage']:
        low='expert' if kind=='knight' else 'circle3';high='hyper' if kind=='knight' else 'circle6'
        ultimate={'id':id+'-ULT-01','name':'결의의 일섬' if id=='serin' else name+' · 결전식','element':element,'current_eligible':bool(eligible),'learned':False,'equipped':False,'source_skill':skill['id'],'usage_rules':'ULTIMATE_SYSTEM.md','low':{'tier':low,'action':action,'effect':'무기·손·접점 한 곳에 힘을 응축한 단일 발동. 짧은 검광 또는 국소 '+(element+' 효과' if element else '마나 효과')+'.','scope':'current_tier_concept' if eligible else 'future_hypothetical'},'high':{'tier':high,'action':action+' 발동 지점을 달리하고 주변의 힘 흐름을 정밀하게 제어한다.','effect':'같은 정체성의 큰 '+(element+' 효과' if element else '비원소 마나 현상')+'와 환경 반응. 얼굴과 동작은 유지한다.','scope':'current_tier_concept' if kind=='knight' and r in ['hyper','master'] or kind=='mage' and circle>=6 else 'future_hypothetical'},'note':'기술 연출 설계 확정. 현재 학습·장착을 뜻하지 않으며 기존 저장의 기술·경지·스탯을 자동 변경하지 않는다.'}
        if kind=='knight':ultimate['high']['unique_phenomenon']={'name':name+'의 검결','effect':'대표 동작의 방향에 마나를 응축하여 한 궤적을 유지한다. 고유 현상의 구체 한계는 근거리 한 교환으로 제한한다.','cost':'마나 유지가 끊기거나 자세가 무너지면 해제. 광역 절대 방어·자동 추적 없음.','status':'current_background_concept' if r in ['hyper','master'] else 'future_hypothetical_only'}
    c['ultimate_design']=ultimate
    profiles.append({'id':id,'name':c['name'],'source':source,'combat_class':kind,'social_rank':c.get('rank',c.get('job')),'combat_rank':rank,'realm':r,'circle':circle,'level':c.get('level'),'stats':c.get('stats'),'stats_origin':'preserved' if original[id]['stats'] else 'new_initial_baseline','specialization':specialty,'main_skill':skill,'ultimate_design':ultimate,'identity_preserved':True,'existing_save_policy':'preserve_existing_state','basis':basis})

assert len(profiles)==163 and len({c['id'] for c in profiles})==163
for p,k in sources:write(p,documents[p])
write('characters/serin.json',serin)
write('characters/combat_profiles.json',{'schema_version':1,'setting_version':'1.0','authorization':'2026-10-09 사용자: 캐릭터별 기사/마법사 구분, 경지, 스탯, 대표 기술을 지역·왕국·외형에서 확립','scope':'163 UI roster characters; civilians, clergy, ordinary fighters and monsters remain distinct','existing_save_policy':'no_automatic_migration_or_skill_grant','characters':profiles})
plan=read('characters/ultimate_cutin_plan.json');index={p['id']:p for p in profiles}
for c in plan['characters']:
    p=index[c['id']];u=p['ultimate_design'];c.update(settings_source='characters/combat_profiles.json',combat_class=p['combat_class'],current_realm=p['realm'],current_circle=p['circle'],main_skill_id=p['main_skill']['id'])
    if not u:
        reason='생업·성직·일반 무예·마수 기술 계열로 정리. 기사/마법사 궁극기 규격을 강제로 적용하지 않음.'
        c.update(status='deferred_non_ultimate_class',ability_status='not_applicable',element_status=p['main_skill']['element_status'],hold_reason=reason)
        for v in c['versions']:v.update(status='deferred',hold_reason=reason)
        continue
    c.update(ability_name=u['name'],ability_status='established_visual_design_not_learned',element=u['element'],element_status='established' if u['element'] else 'non_elemental',runtime_usable=False,hold_reason=None)
    if c['id']!='serin':c['status']='settings_ready_art_pending';c['versions']=[{'tier':v['tier'],'status':'ready_to_produce','image':None,'user_approved':False,'design':v,'scope':v['scope']} for v in [u['low'],u['high']]]
    for v in c['versions']:v.pop('hold_reason',None)
    c['note']='2026-10-09 설정 제작 요청으로 개인 기술·원소·발동 동작을 확립. 원화 승인과 실제 습득은 별도.'
plan['settings_establishment']={'source':'characters/combat_profiles.json','counts':dict(Counter(p['combat_class'] for p in profiles)),'art_ready_characters':sum(bool(p['ultimate_design']) for p in profiles),'runtime_skills_granted':0}
write('characters/ultimate_cutin_plan.json',plan)
rows=['# 캐릭터별 전투·생업 설정 v1.0','', '2026-10-09 사용자 요청에 따라 163명의 계열·경지·스탯·대표 기술과 궁극기 연출 설계를 확립한다. 권위 있는 기계 판독 원문은 `characters/combat_profiles.json`이다. 기존 숫자 스탯·외형·소속·사회적 계급을 유지했고 생활형 24명만 초기 스탯을 배정했다. 새 경지는 이전에 미정인 항목만 초기 배경 설정으로 채웠다. 기존 세이브의 경지·학습·자원·진행 기록은 보존하며 자동 승급·기술 지급·재분배를 하지 않는다.', '', '기사·마법사 외에 일반 무예·생활인·성직·마수 계열을 구분한다. 신의 시간·공간·생명·죽음·운명을 새로운 인간 마법 원소로 추가하지 않는다. 성직자의 사제 직급·마나 적합성은 마법사 서클과 별개다. 나라의 특성은 기술의 맥락이며 나라 전체가 같은 원소를 사용하지 않는다.', '', '대표 기술은 인물의 초기 배경 수련 또는 생태 기술이다. 궁극기 설계는 그 대표 기술을 바탕으로 한 결전 연출이며 현재 학습·장착과 구분한다. 낮은 경지의 고단계 설계는 미래/가정이다. 베이직·1/2서클에게 궁극기를 지급하지 않는다. 비용·실제 위력·상성·적중과 효과는 ULTIMATE_SYSTEM.md 및 승인된 GM 사건으로 판단하며 이미지가 결과를 결정하지 않는다.', '', '## 명부', '', '| ID | 이름 | 계열 | 전투 경지 | Lv | STR/DEX/INT/CON/MANA | 대표 기술 | 원소 |','|---|---|---|---|---:|---|---|---|']
for p in profiles:
    st=p['stats'];rows.append('| '+' | '.join([p['id'],p['name'],p['combat_class'],p['combat_rank'],str(p['level']),' / '.join(str(st[k]) for k in ['strength','agility','intelligence','constitution','mana']),p['main_skill']['name'],p['main_skill']['element'] or '비원소'])+' |')
rows+=['','## 개별 설정과 근거','']
for p in profiles:
    b=p['basis'];s=p['main_skill'];rows += ['### '+p['id']+' · '+p['name'],'',f"- 지역: {b['kingdom']} / {b.get('lordship') or '왕도·외곽'} / {b['affiliation']}.",f"- 근거: {b['national_trait']}; {b['regional_terrain'] or '기존 위치 설정'}; 외형: {b['appearance']}.",f"- 주 기술 **{s['name']}**: {s['action']}.",'- 한계: '+s['limits'],'- 경지·스탯: '+p['combat_rank']+f" / Lv.{p['level']} / HP {p['stats']['max_hp']} · MP {p['stats']['max_mp']}.",'- 궁극기: '+(p['ultimate_design']['name']+'; 낮은/높은 단계의 발동·효과는 JSON 참조. 실제 학습과 원화 승인은 별도.' if p['ultimate_design'] else '해당 없음. 현재 역할을 유지하며 기사/마법사 궁극기로 강제 변환하지 않음.'),'']
(ROOT/'CHARACTER_COMBAT_SETTINGS.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
write('artifacts/character-settings/establishment-audit.json',{'characters':163,'counts':dict(Counter(p['combat_class'] for p in profiles)),'preserved_numeric_stat_records':sum(p['stats_origin']=='preserved' for p in profiles),'assigned_common_stat_records':24,'ultimate_designs':sum(bool(p['ultimate_design']) for p in profiles),'previous':original,'runtime_skill_grants':0})
print(Counter(p['combat_class'] for p in profiles));print('163 profiles established')
