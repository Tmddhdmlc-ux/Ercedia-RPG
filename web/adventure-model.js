import {worldData} from './world-data.js';
import {findNPC} from './npc-model.js';
import {publicLife} from './npc-life.js';
import {calendarDay} from './quest-model.js';
export function actualPlace(state){return {region:state.gameState?.region||state.scene?.game_state?.region||null,place:state.gameState?.place||state.scene?.location||'위치 미확인'};}
export function nearbyPeople(state){const {region,place}=actualPlace(state),present=state.scene?.cast||(state.scene?.npc?[state.scene.npc]:[]),ids=new Set(present.map(p=>p.id));
 for(const [id,p]of Object.entries(state.npc_life?.npcs||{}))if(p.known&&p.region===region&&(p.place===place||p.accompanying))ids.add(id);
 return [...ids].map(id=>{const npc=findNPC(id),life=publicLife(state,id),record=state.npc_life?.npcs?.[id];if(record?.location_confirmed&&!record.accompanying&&(record.region!==region||record.place!==place&&record.place!==region))return null;return npc?{id,name:npc.name,activity:life.activity,place:record?.place||place,accompanying:life.accompanying}:null;}).filter(Boolean);
}
export function adventureOptions(state){const {region}=actualPlace(state);return {dungeons:worldData.dungeons.filter(d=>d.region_id===region),facilities:worldData.facilities.filter(f=>f.region_id===region),people:nearbyPeople(state)};}
export function questPreview(q,state){const today=calendarDay(state.gameState?.date),deadline=calendarDay(q.deadline_at),objectives=q.objectives||[];
 return {title:q.title,description:q.summary||'',reward:q.reward||{},days:today!==null&&deadline!==null?deadline-today:null,progress:objectives.length?Math.round(100*objectives.reduce((sum,o)=>sum+Math.min(1,(o.current||0)/Math.max(1,o.target||1)),0)/objectives.length):0};}
export function adventureGuide(state){const log=state.quest_log||[],ready=log.filter(q=>q.status==='ready_to_report'),active=log.filter(q=>['accepted','active'].includes(q.status));
 if(ready.length)return {title:'의뢰를 보고하고 보상을 받자',detail:ready[0].title+' · 발행자에게 실제로 보고하면 보상이 한 번 지급됩니다.',action:'quests'};
 if((state.player?.unspentStatPoints||0)>0)return {title:'성장 포인트를 투자하자',detail:`미사용 ${state.player.unspentStatPoints}포인트 · 상태창에서 HP·MP·공격 변화를 비교하세요.`,action:'status'};
 if(active.length)return {title:'진행 중인 목표를 확인하자',detail:active[0].title+' · 목표와 위치를 확인하고 준비해서 출발하세요.',action:'quests'};
 return {title:'첫 장비와 여비를 마련하자',detail:'일거리 확인 · 주변 탐색 · 주민 만나기 중 원하는 길을 선택하세요. 의뢰 수락은 필수가 아닙니다.',action:'board'};
}
export function adventureContext(state){return {location:actualPlace(state),guide:adventureGuide(state),nearby_people:nearbyPeople(state),loop:'준비 → 의뢰·탐험 → 전투·실제 획득 → 귀환 → 보고·성장·정비 → 다음 도전',rules:'첫 장면에는 지역에서 실제 가능한 안전한 일거리·탐색·주민 만남을 선택지로 안내하되 강제 수락하지 않는다. 반복 활동은 충분히 익숙하고 안전한 경우에만 시간·비용·위험을 사전 고지하고 결과 요약. 새 보스·미지 구역·중요 선택은 생략 금지. 보상은 실제 사건과 기존 엔진으로 한 번만 지급.'};}
