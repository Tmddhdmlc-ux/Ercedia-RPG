import {worldData} from './world-data.js';
import {currencyRules} from './economy.js';

// Select request facts only; this never heals, spends money, or clears an injury.
export const isRecoveryAction=action=>/치료|진료|응급\s*처치|휴식|숙박|여관|하룻밤|잠을|잠든|잠잔다|쉰다|쉬겠|쉬어|쉬고/.test(String(action));
export function recoveryFacts(state){
 const region=state.gameState?.region;
 return {
  source:'GAMEPLAY_CONVENIENCE_RULES.md / tampermonkey/WORLD_ENGINE_SCHEMA.md',
  facilities:worldData.facilities.filter(f=>f.region_id===region&&f.service.some(s=>['healing','rest','mana_rest'].includes(s))),
  price_baselines:currencyRules.baseline_prices.filter(p=>['herbal_treatment','inn_night','nice_inn_night'].includes(p.id)),
  offer:'system_events [{event_id,kind:offer,reason,offer:{id,type:shop/facility,venue_id,venue_name,region_id,valid_until,items:[],services:[{id,service,cost,basis,inputs:[],outputs:[],hp_restore?,mp_restore?}]}}]. 전문 시설은 위 등록 ID와 service만 사용한다. 일반 현지 의원/여관은 type=shop, service=herbal_treatment/inn_night/nice_inn_night로 견적을 구성한다. 기준가는 물품 ID가 아니며 새 견적의 회복량은 실제 진료·휴식 근거로 판정한다.',
  completion:'system_events [{event_id,kind:service,reason,offer_id,service_id}]. 현지 방문과 실제 견적·잔액·재료를 확인한다. 서비스 실행 장면의 game_state.region은 offer.region_id, game_state.place와 scene.location은 offer.venue_name 또는 venue_id와 정확히 일치시킨다. 정착지 안 진료소라면 실제 진료소 이름을 장소로 기록하며 상위 정착지명만 남기지 않는다. 기존 유효 견적을 재사용하거나 같은 응답에서 offer 다음 service를 기록한다. 비용·회복·재료는 엔진이 한 번 정산하므로 player/inventory 보상 스냅샷이나 별도 xp를 중복 출력하지 않는다. game_state의 실제 장소·360일 date/time과 scene.time을 경과 시간에 맞춘다.',
  narration:'가격 문의는 견적과 현지 인물의 답만 제시하며 결제하지 않는다. 명확한 일반 치료·숙박 요청은 승인된 저위험 후처리로 접수·치료·지불을 묶어 그 턴에 진전시킨다. 새 고액 비용·위험 치료·희귀 소비는 핵심 선택에서 멈춘다. 치료했다는 대사만으로 회복을 완료했다고 하지 않는다. HP0 소생·채무·전액 회복·부상 소멸을 자동 보장하지 않는다. 지난 부상 사건은 기억이므로 지우지 않고 실제 후속 진료 결과를 기록한다.'
 };
}
