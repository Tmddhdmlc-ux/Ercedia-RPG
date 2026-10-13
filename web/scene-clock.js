// Legacy descriptive times remain supported; precise clocks must agree.
const precise=v=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
export function validateSceneClock(state,scene){
 const clock=scene.game_state?.time??state.gameState?.time;
 if(precise(scene.time)&&precise(clock)&&scene.time!==clock)throw Error('장면 시각과 저장 시각 불일치 · 실제 시간 경과는 game_state.date/time을 포함한 전체 최신 game_state로 기록하고 scene.time과 일치시켜 주세요.');
}
