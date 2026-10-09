import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const layouts=await read('locations/dungeon_layouts.json'),roster=(await read('characters/npc_roster_100.json')).characters;
// One individually authored identity per existing dungeon; no new coordinates or secret lore.
const designs=[
 ['눈바람과 숨결 추적','얼음 발판의 미끄러짐','발자국과 바람을 읽어 안전한 발판을 확보','빙설 추격자','백숨의 우두머리','갈기를 낮추고 숨을 들이킨 뒤 직선 돌진','옆의 암반으로 피하고 돌진 후 빈틈을 노린다'],
 ['눈 아래 묻힌 둥지','눈처마와 좁은 굴목','지지대를 점검하고 눈처마 아래에 밀집하지 않는다','구혈 뿔지기','설벽의 백각왕','앞발로 눈을 긁은 뒤 뿔로 굴목을 봉쇄','넓은 안쪽 공간으로 유도하고 뿔의 방향을 벗어난다'],
 ['납골묘의 정적과 소리','석관 사이의 메아리','소음으로 무리를 깨우지 않고 석관 틈을 조사','납골 길잡이쥐','석관을 갉는 회색어금니','벽을 긁어 울림을 만든 뒤 측면에서 달려든다','긁는 소리를 추적하고 좁은 틈의 퇴로를 막는다'],
 ['왕가 지하실의 중량 장치','균형추와 꺼진 승강대','추를 고정해 우회로를 열고 바닥 하중을 분산','문장 철갑수','사자문을 부수는 철엄니','바닥을 두 번 구른 뒤 문짝처럼 몸을 세워 돌진','균형추 기둥을 사이에 두고 돌진 뒤 옆구리를 노린다'],
 ['식량을 지키는 곡창 탐사','곡물 분진과 무너진 선반','화염 사용 전 분진을 가라앉히고 남은 식량을 보존','분진 잠복쥐','곡창의 잿꼬리','선반 위 곡물을 쏟은 뒤 시야 아래로 파고든다','분진에서 물러나 바닥 진동으로 접근을 읽는다'],
 ['농로의 함정과 식량 흔적','진흙 구덩이와 쓰러진 울타리','식량 흔적을 따라 함정을 찾고 우회 발판을 만든다','이삭길 돌격수','울타리 분쇄자','울타리를 밀어 길을 좁힌 뒤 돌진','울타리를 정리하고 진흙 밖 단단한 발판에서 대응한다'],
 ['참호의 엄폐와 잔불','사각의 잿더미와 불씨','참호 모서리마다 사각을 확인하고 잔불을 격리','참호 잿불사냥꾼','붉은 참호의 열비늘','목 비늘이 붉어지며 잿더미를 향해 꼬리를 휘두른다','잔불 밖으로 이동하고 달아오른 목을 식힐 시간을 만든다'],
 ['폐요새의 방어선 돌파','무너진 성문과 좁은 통로','폐쇄문을 우회하고 철제 장애물을 엄폐로 활용','성문 철갑수','잔해요새의 공성엄니','철판을 긁으며 성문 통로에 몸을 맞춘다','통로 밖으로 유도하고 회전이 느린 후방을 노린다'],
 ['교역 잔해의 회수와 조사','굴러가는 마차와 끊긴 밧줄','바퀴를 고정하고 상인의 유실품을 구분해 회수','차축 파괴수','마차무덤의 검은엄니','차축을 들이받아 짐더미를 무너뜨린다','짐더미 아래를 피하고 고정한 마차로 접근을 제한한다'],
 ['협곡 고저차와 바람','낙석과 상승기류','위쪽 둥지를 정찰하고 밧줄을 바람 반대편에 고정','절벽 급강하수','돌문 위의 부리왕','날개를 접고 울음 뒤 절벽 그림자에서 급강하','암벽에 붙어 급강하를 피하고 착지 직후를 노린다'],
 ['안개 속 청각 탐색','시야 단절과 울음 반향','표식을 남기고 울음의 반향으로 길을 확인','안개 초소지기','회안개의 소리날개','매달린 몸을 펴고 높은 울음을 낸 뒤 날아든다','울음 방향을 확인하며 엄폐하고 낮게 선회할 때 대응한다'],
 ['차가운 균열의 정전기','간헐적인 마나 맥동','맥동 간격을 관찰해 차폐 구간을 통과','균열 뇌각수','시린 균열의 뇌관왕','뿔 끝에 푸른 전기가 모인 뒤 좁은 길을 질주','맥동이 멎는 구간으로 이동하고 충전 중 진로를 벗어난다'],
 ['도체 회로와 진동','금속 바닥에 이어진 전류','절연 발판을 고르고 회로 연결을 끊는다','도체 공명거미','청동맥의 직조자','다리를 펼쳐 도체 사이에 공명 실을 당긴다','실의 연결점을 끊고 금속 발판에서 떨어져 대응한다'],
 ['폐연구실의 빛과 잔류 전류','차단기의 역류와 눈부신 결정','전원 흐름을 조사해 구역별로 차단한다','역류 광충','폐전류의 섬광핵','몸의 결정이 차례로 빛나며 한 방향을 겨눈다','빛나는 순서를 읽고 결정의 조사 방향 밖으로 이동한다'],
 ['수정 갱도의 구조 안전','낙석과 균열 확산','지주와 균열을 확인하고 강한 충격을 줄인다','갱도 천공충','붕락의 수정턱','턱으로 천장을 긁어 낙석을 만든 뒤 파고든다','낙석을 피할 지주 사이 공간을 확보하고 굴착 후 대응한다'],
 ['지하 방벽의 마나 연결','방벽과 거미줄의 공명','연결된 결정을 찾아 방벽을 순서대로 해제','방벽 연결거미','잿빛 방벽의 매듭왕','다리를 결정에 대고 줄을 팽팽히 당긴다','연결 결정을 분리해 엄폐를 열고 줄이 풀릴 때 접근한다'],
 ['교량 아래의 바람길','횡풍과 끊긴 발판','밧줄을 고정하고 바람의 약한 구간을 골라 이동','교각 날개지기','바람깎이 부리군주','교각에 앉아 날개를 크게 펼친 뒤 옆으로 쓸고 간다','교각 뒤에서 바람을 피하고 회전 직후를 노린다'],
 ['유지보수 통로의 문과 접지','젖은 사다리와 좁은 교각','사다리를 고정하고 젖은 금속과 충전을 피한다','교각 뇌각수','폐통로의 푸른뿔','뿔로 난간을 문지르며 통로 끝을 겨눈다','난간과 떨어져 넓은 점검실로 유도한다'],
 ['수문 조작과 얕은 물길','조수와 미끄러운 수로','수위를 확인하고 잠기기 전 복귀 경로를 확보','수문 집게지기','진주수로의 백각집게','집게로 수문을 두드린 뒤 좁은 통로를 막는다','수위를 낮춘 발판에서 큰 집게의 바깥쪽을 노린다'],
 ['기울어진 화물창의 탐사','밀려오는 물과 떠다니는 화물','문을 고정하고 적재물을 옮겨 발판을 만든다','화물 은비늘','침몰창의 은물결','몸을 비틀며 물속 그림자를 바꾸고 수면으로 튀어 오른다','화물 위 발판에서 물결을 읽고 도약 후 착수를 노린다'],
 ['역참의 추적과 보급','모래 덮인 표식과 미끼 흔적','옛 표식을 복원하고 서로 다른 발자국을 비교','역참 모래추적자','황금길의 거짓발자국','모래를 차올리며 반대 방향으로 발자국을 만든다','흔적보다 실제 그림자와 바람을 확인해 측면을 지킨다'],
 ['요새의 병참과 열기','건조한 적재물과 잔불','급수로를 찾아 불길이 이어지는 적재물을 분리','폐요새 열비늘','황금길의 잿불군주','달아오른 등을 보인 뒤 적재물 쪽으로 몸을 휘두른다','타는 적재물에서 떨어지고 열기가 잦아드는 동안 대응한다'],
 ['암초의 조수와 소굴 흔적','밀물과 젖은 암반','썰물 시간을 확인하고 높은 퇴로를 표시한다','암초 바람사냥꾼','해풍의 감긴날개','암초 위에서 몸을 말아 날개를 모은 뒤 도약','낮은 바람을 피할 바위를 택하고 날개가 펴지는 순간 대응한다'],
 ['배수로의 압력과 암수역','수압과 검은 물의 시야','배수 밸브를 열고 안전한 공기 공간을 확보','배수 먹장어','심해수로의 흑진주턱','물빛이 검어지고 수로 벽을 몸으로 울린다','물을 뺀 좁은 지점에서 진동을 읽고 옆으로 비켜선다'],
 ['금고의 반사광과 잠금장치','흑유리 반사와 밝은 미끼','빛을 가려 실제 통로와 반사상을 구분한다','금고 등불나방','흑유리의 거짓등불','날개를 펴 반사면에 여러 빛을 만든다','반사면을 가리고 실제 날개의 그림자를 추적한다'],
 ['폐예배당의 달빛과 발자국','움직이는 그림자와 갈라진 바닥','달빛 각도를 관찰하고 돌아오는 발자국을 추적한다','달그림자 고리뿔','폐예배당의 월흔왕','고리뿔을 숙이고 달빛 속 그림자가 길게 늘어진다','그림자보다 실제 발굽과 바닥 균열을 보고 진로를 피한다']
];
const rankMultiplier={'하급':1,'중급':1.25,'상급':1.55,'엘리트':1.95};
const signatureNames=['백숨 돌진','눈처마 뿔받기','석관 메아리 습격','사자문 분쇄','분진 잠복습격','이삭길 울타리 돌파','참호 잿불 휩쓸기','성문 공성돌격','차축 붕괴','돌문 급강하','회안개 반향습격','균열 뇌각돌진','청동맥 공명직조','역류 섬광돌파','수정턱 굴착','방벽 매듭조이기','교각 횡풍강하','폐통로 난간돌파','백각 수문압박','은물결 수면도약','거짓발자국 측면습격','잿불 적재물 휩쓸기','감긴날개 암초도약','흑진주 수로습격','흑유리 잔광습격','월흔 고리뿔돌진'];
const profiles=[];
for(const [index,d] of layouts.dungeons.entries()){
 const [theme,hazard,solution,eliteName,bossName,telegraph,counter]=designs[index],base=roster.find(r=>r.name===d.monster_examples[0]);if(!base)throw Error(d.id);
 const identity={dungeon_id:d.id,theme,hazard,exploration:solution,boss_id:d.id+'-BOSS',elite_id:d.id+'-ELITE',base_monster_id:base.id};
 d.encounter_profile=identity;
 for(const role of ['elite','boss']){
   const level=role==='boss'?d.level_range[1]:Math.round((d.level_range[0]+d.level_range[1])/2),scale=role==='boss'?1.12:1;
   const stat=key=>Math.max(1,Math.round((base.stats[key]+(level-base.level)*.55)*scale));
   const stats={strength:stat('strength'),dexterity:stat('agility'),intelligence:stat('intelligence'),constitution:stat('constitution'),manaStat:stat('mana')},bonus=level*3+(role==='boss'?60:25);
   profiles.push({id:identity[role+'_id'],dungeon_id:d.id,role,name:role==='boss'?bossName:eliteName,base_monster_id:base.id,rank:d.danger_rank,level,realm:'none',stats,level_hp_bonus:bonus,hp:100+10*(stats.constitution-10)+3*(stats.strength-10)+bonus,mp:Math.max(0,100+6*(stats.manaStat-10)),speed:stats.dexterity+Math.floor(stats.strength/5),creature_multiplier:rankMultiplier[d.danger_rank],telegraph,counter,behavior:role==='boss'?'핵심 구역을 지키며 지형으로 접근을 통제한다.':'지역 지형을 활용해 길목을 지키며, 발각되면 엄폐·측면 이동을 시도한다.',limits:'예고 동작은 관측 가능한 단서이며 명중·반격·약점 공략을 자동 성공시키지 않는다. 비용·피해·가드·상황 보정은 기존 전투 사건으로 GM이 판정한다.',art_policy:'전용 원화는 characters/dungeon_monster_art.json의 개체 등록을 조회; 미등록이면 원본 종 원화 사용'});
 }
 for(const z of d.zones){z.scene_prompt=z.scene_prompt.split(' 지역 특색: ')[0]+' 지역 특색: '+theme+'. 위험: '+hazard+'. 탐색 대응: '+solution+'.';if(z.type==='boss')z.encounter_ids=[identity.boss_id];else if(['miniboss','midboss'].includes(z.type))z.encounter_ids=[identity.elite_id];else if(z.type==='combat')z.encounter_ids=[base.id,identity.elite_id];}
}
// These are encounter roles, separate from the existing monster threat rank named 엘리트.
for(const p of profiles){const d=layouts.dungeons.find(d=>d.id===p.dungeon_id),index=layouts.dungeons.indexOf(d);p.allowed_zone_ids=d.zones.filter(z=>p.role==='boss'?z.type==='boss':['combat','miniboss','midboss'].includes(z.type)).map(z=>z.id);p.skills=[{id:p.id+'-SKILL',name:(p.role==='elite'?'정예 ':'')+signatureNames[index],kind:'physical',mp_cost:5+Math.floor(p.level/6),technique_bonus:3+Math.floor(p.level/10)}];if(p.role==='elite')p.telegraph='길목에서 '+d.encounter_profile.hazard+' 쪽으로 움직이며 공격할 방향을 드러낸다.';}
for(const p of profiles)if(p.role==='boss')p.behavior='핵심 구역을 지키며, 첫 접근이 막히면 지역 지형을 활용해 공격 경로를 바꾼다.';
await writeFile('locations/dungeon_encounters.json',JSON.stringify({version:1,profiles},null,2)+'\n');
await writeFile('locations/dungeon_layouts.json',JSON.stringify(layouts,null,2)+'\n');
const rows=layouts.dungeons.map(d=>{const a=d.encounter_profile,b=profiles.find(p=>p.id===a.boss_id),e=profiles.find(p=>p.id===a.elite_id);return `| ${d.region_id} · ${d.name} | ${a.theme}；${a.hazard} | ${e.name} | ${b.name} |`;}).join('\n');
await writeFile('DUNGEON_ENCOUNTERS.md',`# 지역 던전 특색·보스·정예 개체\n\n2026-10-09. 기존 13개 영지·26개 던전·108개 구역에 보스 26종과 정예 26종을 연결한다. 던전·영지·지도 좌표를 새로 만들지 않는다. 원본은 locations/dungeon_encounters.json과 locations/dungeon_layouts.json이다.\n\n| 지역·던전 | 환경과 공략 특색 | 정예 | 보스 |\n|---|---|---|---|\n${rows}\n\n정예는 던전 안의 역할이고 마수 위협등급 ‘엘리트’와 별개다. 보스·정예의 위협등급은 소속 던전의 danger_rank를 따른다. 초반 정예를 국가 전력이 필요한 엘리트 등급으로 자동 올리지 않는다. 새 개체는 기존 종을 바탕으로 한 지역 변종으로 별도 수치·이름·기술을 등록하며 기존 종과 NPC의 수치를 변경하지 않는다. 수치는 초기 밸런스이며 실제 플레이 승률은 미검증이다.\n\n각 보스는 서로 다른 공격 예고·대응법·고유 기술을 갖는다. 정예는 지역의 지형과 장애물을 이용해 길목을 지킨다. MP 비용과 기술 보정은 등록 값, 실제 명중·가드·피해·환경 대응은 기존 GM 사전 판정과 엔진 검산을 따른다. 환경과 대응 서술만으로 자동 피해·절대 면역·약점 공략 성공을 주지 않는다. 기술은 등록 skills를 선언해 기존 중앙 기술명·MP·피해 재생에 연결한다.\n\n보스 구역은 지정 보스 1개체의 실제 처치, 중간보스 구역은 지정 정예의 실제 처치가 필요하다. 일반 전투 구역에는 원본 종과 정예를 후보로 연결하며 모든 교전에 정예를 강제하지 않는다. 이름과 예고 동작은 실제 조사·조우 때 공개하고 숨겨진 방의 단서는 기존 규칙을 유지한다. 실제 지정 출현 구역 밖의 변종 전투는 거절한다. 기존 기록된 구형 전투의 정산은 호환 경로를 유지한다.\n\n참가자는 고유 instance id, dungeon_foe_id, base_monster_id를 catalog_id로 사용한다. 등록 name/rank/level/stats/hp/maxHp/mp/maxMp/speed/level_hp_bonus/creature_multiplier를 일치시키며 미등록 modifiers는 0이다. 마수 음성은 원본 종의 등록 자산을 사용한다. 원화는 characters/dungeon_monster_art.json에 등록된 경우 UI가 dungeon_foe_id로 해당 개체의 전용 PNG를 선택한다. art.id와 catalog_id는 원본 종 ID를 그대로 유지한다. 등록 전용 원화가 없는 개체·일반 마수·구형 저장 전투는 기존 종의 원화를 사용한다. 제작 프롬프트·경로는 assets/characters/monsters/dungeon/production-plan.json, 원화 모음은 tests/dungeon-monster-gallery.html에서 확인한다.\n\n보스와 정예도 한 마리당 전리품 추첨 한 번이다. 확정 희귀 보상·재추첨·별도 보스 상자를 추가하지 않는다. 재료는 원본 종에서, 장비·기술서 후보와 등급 상한은 실제 던전 및 변종 위협등급에서 가져온다. 보스 전리품 정산 후 클리어 XP·기록을 별도 확인할 수 있으며 지급된 아이템을 다시 주지 않는다. 토벌 의뢰는 원본 종 또는 dungeon_foe_id를 지정할 수 있다. 실제 재출현 증거 없는 즉시 반복 파밍은 금지한다.\n`, 'utf8');
