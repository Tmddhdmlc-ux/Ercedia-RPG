export function gameMinute(game){
 const date=/^(\d+)-(\d{1,2})-(\d{1,2})$/.exec(game?.date||''),time=/^(\d{1,2}):(\d{2})$/.exec(game?.time||'');if(!date||!time)return null;
 const [y,m,d]=date.slice(1).map(Number),[h,min]=time.slice(1).map(Number);if(m<1||m>12||d<1||d>30||h>23||min>59)return null;return (y*360+(m-1)*30+d-1)*1440+h*60+min;
}
export function validatePractice(state,scene){
 const events=(scene.engine_events||[]).filter(e=>e.kind==='practice');if(!events.length)return;
 if(scene.battle||scene.quest_events?.some(e=>e.kind==='report')||scene.engine_events.some(e=>e.kind==='xp'))throw Error('연습 보상과 다른 경험치의 중복 지급 금지');
 const before=gameMinute(state.gameState),after=gameMinute({...state.gameState,...scene.game_state});if(before===null||after===null||after-before<1)throw Error('연습 완료의 실제 경과 시간을 기록하세요');
 if(events.length>1)throw Error('한 번의 연습에는 성장 보상 한 번만 기록하세요');
 if(scene.player&&['level','xp','unspentStatPoints'].some(k=>scene.player[k]!==undefined&&scene.player[k]!==state.player[k]))throw Error('연습 성장 스냅샷 중복 지급 금지');
 for(const e of events)if(!['physical','mental','craft','exploration'].includes(e.activity)||e.completed!==true||!Number.isSafeInteger(e.xp_gain)||e.xp_gain<1||e.xp_gain>999999)throw Error('실제 연습 성과·활동·경험치 판정이 필요합니다');
}
export function practiceReward(state,event){
 const engine=state.engine,date=state.gameState.date,record=engine.practice_daily?.date===date?engine.practice_daily:{date,counts:{}};
 const count=record.counts[event.activity]||0,cap=Math.max(1,Math.floor(100*state.player.level**1.5*.2));
 const amount=Math.floor(Math.min(cap,event.xp_gain)/(count+1));record.counts[event.activity]=count+1;engine.practice_daily=record;
 engine.practice_history=[...(engine.practice_history||[]),{event_id:event.event_id,date,activity:event.activity,awarded_xp:amount,reason:event.reason}].slice(-30);return amount;
}
