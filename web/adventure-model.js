import {worldData} from './world-data.js';
import {findNPC,npcCatalog} from './npc-model.js';
import {effectivePlacement} from './character-art.js';
import {publicLife} from './npc-life.js';
import {calendarDay} from './quest-model.js';
import {lootCatalog,catalogItem} from './item-catalog.js';
export function actualPlace(state){return {region:state.gameState?.region||state.scene?.game_state?.region||null,place:state.gameState?.place||state.scene?.location||'위치 미확인'};}
export function nearbyPeople(state){const {region,place}=actualPlace(state),present=state.scene?.cast?.length?state.scene.cast:(state.scene?.npc?[state.scene.npc]:[]),ids=new Set(present.map(p=>p.id));
 for(const [id,p]of Object.entries(state.npc_life?.npcs||{}))if(p.known&&p.region===region&&(p.place===place||p.accompanying))ids.add(id);
 return [...ids].map(id=>{const npc=findNPC(id),life=publicLife(state,id),record=state.npc_life?.npcs?.[id];if(record?.location_confirmed&&!record.accompanying&&(record.region!==region||record.place!==place&&record.place!==region))return null;return npc?{id,name:npc.name,activity:life.activity,place:record?.place||place,accompanying:life.accompanying}:null;}).filter(Boolean);
}
export function regionalCommonNPCs(state){
 const {region,place}=actualPlace(state),today=calendarDay(state.gameState?.date);
 if(!region||state.world_engine?.active_dungeon)return [];
 return npcCatalog.filter(p=>p.id.startsWith('ER-COM-')&&p.duty!=='활동 미확인').flatMap(p=>{
  const record=state.npc_life?.npcs?.[p.id],scheduled=today===null?null:record?.schedule?.find(s=>calendarDay(s.start)<=today&&calendarDay(s.end)>=today);
  const actualRegion=scheduled?.region||record?.region||effectivePlacement(p.id,state)?.location_id||p.location_id;
  const actualLocation=scheduled?.place||record?.place;
  if(actualRegion!==region||record?.accompanying||state.npcStates?.[p.id]?.hp===0||record?.activity==='전투불능')return [];
  if((scheduled||record?.location_confirmed)&&actualLocation&&actualLocation!==region&&actualLocation!==place)return [];
  return [{id:p.id,name:p.name,job:p.duty,affiliation:p.affiliation,region:actualRegion,place:actualLocation||null,known:record?.known===true,personality:p.personality,speech_style:p.speech_style,presence_confirmed:record?.known===true&&actualLocation===place,appearance:p.appearance}];
 });
}
export function adventureOptions(state){const {region}=actualPlace(state);return {dungeons:worldData.dungeons.filter(d=>d.region_id===region),facilities:worldData.facilities.filter(f=>f.region_id===region),people:nearbyPeople(state),residents:regionalCommonNPCs(state)};}
export function dungeonRewardPreview(d,state){const reward=lootCatalog.dungeon_rewards.find(r=>r.dungeon_id===d.id),claimed=!!state.world_engine?.dungeons?.[d.id]?.claimed;if(!reward)return '승인 보상은 현지 조사에서 확인하세요.';const guaranteed=reward.first_clear?.guaranteed||[],xp=guaranteed.find(r=>r.type==='xp')?.amount,materials=guaranteed.filter(r=>r.type==='material_bundle').flatMap(r=>r.source_material_ids||[]).map(id=>catalogItem(id)?.name||id);return `${claimed?'반복':'최초 클리어'} 보상 · ${xp===undefined?'XP 미정':claimed?'XP 최초의 '+Math.round((reward.repeat_clear?.xp_fraction_of_first_clear||0)*100)+'%':'EXP +'+xp} · 처치별 전리품: 일반60% · 특수10% · 장비·기술서 등급별 추첨(에픽0.3%) · 지역 재료 후보: ${materials.join(', ')||'승인 목록 확인'} · 클리어 시 재료·장비 추가 지급 없음${claimed?' · 실제 재출현 필요':''}`;}
export function questPreview(q,state){const today=calendarDay(state.gameState?.date),deadline=calendarDay(q.deadline_at),objectives=q.objectives||[];
 return {title:q.title,description:q.summary||'',reward:q.reward||{},days:today!==null&&deadline!==null?deadline-today:null,progress:objectives.length?Math.round(100*objectives.reduce((sum,o)=>sum+Math.min(1,(o.current||0)/Math.max(1,o.target||1)),0)/objectives.length):0};}
export function adventureGuide(state){const log=state.quest_log||[],ready=log.filter(q=>q.status==='ready_to_report'),active=log.filter(q=>['accepted','active'].includes(q.status));
 if(ready.length)return {title:'의뢰를 보고하고 보상을 받자',detail:ready[0].title+' · 발행자에게 실제로 보고하면 보상이 한 번 지급됩니다.',action:'quests'};
 if((state.player?.unspentStatPoints||0)>0)return {title:'성장 포인트를 투자하자',detail:`미사용 ${state.player.unspentStatPoints}포인트 · 상태창에서 HP·MP·공격 변화를 비교하세요.`,action:'status'};
 if(active.length)return {title:'진행 중인 목표를 확인하자',detail:active[0].title+' · 목표와 위치를 확인하고 준비해서 출발하세요.',action:'quests'};
 return {title:'첫 장비와 여비를 마련하자',detail:'일거리 확인 · 주변 탐색 · 주민 만나기 중 원하는 길을 선택하세요. 의뢰 수락은 필수가 아닙니다.',action:'board'};
}
export function adventureContext(state){return {location:actualPlace(state),guide:adventureGuide(state),nearby_people:nearbyPeople(state),regional_residents:regionalCommonNPCs(state),resident_rules:'지역 주민은 만남 후보이며 현재 장면에 모두 있다는 뜻이 아니다. 마을·거리·시장·운송 등 생활 장면에서 상황에 맞는 등록 주민 1~2명을 자연스럽게 만나게 하거나 찾아가는 선택지를 제공한다. 장소·일정 확인 후 npc/cast에 실제 ER-COM ID, outfit=none, 등록 emotion을 넣고 해당 이름의 dialogue를 출력한다. 직업·성격·말투로 반응을 구분하고 첫 만남·재회는 기존 life_events와 기억 엔진으로 기록한다. 이미 중요한 대화·전투 중이면 주민을 강제로 끼워 넣지 않는다. 국경·던전·이동 기록을 무시한 소환과 비밀 직업 누설을 금지한다.',loop:'준비 → 의뢰·탐험 → 전투·실제 획득 → 귀환 → 보고·성장·정비 → 다음 도전',rules:'첫 장면에는 지역에서 실제 가능한 안전한 일거리·탐색·주민 만남을 선택지로 안내하되 강제 수락하지 않는다. 반복 활동은 충분히 익숙하고 안전한 경우에만 시간·비용·위험을 사전 고지하고 결과 요약. 새 보스·미지 구역·중요 선택은 생략 금지. 보상은 실제 사건과 기존 엔진으로 한 번만 지급.'};}
