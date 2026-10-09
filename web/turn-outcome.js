import {validateIncomingItems} from './turn-facts.js';
import {resolveNPC} from './npc-model.js';

// Reject inconsistent output before any state mutation; never infer/pay a reward from prose.
export function validateTurnOutcome(state,action,scene){
 if(scene.inventory){
  const old=new Map((state.inventory||[]).map(i=>[i.catalog_id||i.id,i.quantity]));
  validateIncomingItems(scene.inventory.filter(i=>!old.has(i.catalog_id||i.id)||i.quantity>old.get(i.catalog_id||i.id)));
 }
 const quests=[...(state.quest_log||[]),...(scene.quest_updates||[])];
 for(const c of scene.choices)if(c.kind==='quest'&&(!c.quest_id||!quests.some(q=>q.id===c.quest_id)))throw Error('의뢰 선택지에는 현재 quest_log 또는 이번 quest_updates의 실제 quest_id를 연결하세요. 단순 일거리 문의는 dialogue/action입니다.');
 if(scene.choices.some(c=>/원문.{0,12}(제공|첨부)|카탈로그.{0,12}(제공|첨부)|ID.{0,12}알려/.test(c.text)))throw Error('내부 원본 조회를 플레이어 선택으로 넘기지 마세요. turn_facts의 등록 항목으로 이번 요청을 처리하세요.');
 for(const [id,p] of Object.entries(scene.npc_updates||{})){
  const before=resolveNPC(state,id);if(!scene.battle&&Number.isFinite(p.hp)&&Number.isFinite(before?.hp)&&p.hp<before.hp&&/사격|공격|쏜다|쏘아|베기|찌른/.test(action))throw Error('실제 공격 피해는 battle 참가자·사건·자원·종료 결과로 판정하세요. NPC HP만 변경할 수 없습니다.');
 }
 const prose=scene.dialogue.map(l=>l.text).join(' ');
 if(!scene.battle&&/(?:늑대|마수|적).{0,40}(?:쏜다|사격한다|공격한다|베어낸다)/.test(action)&&/(?:화살|칼날|검날).{0,35}(?:박혔|꿰뚫었|적중했|살을 갈랐)/.test(prose))throw Error('실제 타격을 대사만으로 끝낼 수 없습니다. turn_facts.combat_actors와 BATTLE_SCHEMA로 battle을 기록하세요.');
 // Narrowly detect a completed payment to the player, not offers, historical quotations or denials.
 const paid=scene.dialogue.some(l=>/^(?:나레이션|시스템|GM)$/.test(l.speaker)&&/(?:보수|보상|대금).{0,20}\d+\s*동(?:화)?.{0,12}(?:받았다|받습니다|지급받았다|건네받았다)/.test(l.text)&&!/(?:않|못|아직|예정|약속|기록|원장|이전|어제|따옴표)/.test(l.text));
 if(paid&&!scene.quest_events?.some(e=>e.kind==='report')&&!scene.system_events?.some(e=>['trade','cash_receipt','auction_result'].includes(e.kind)))throw Error('보수를 실제로 받았다는 대사에 지급 사건이 없습니다. 등록 계약의 증거와 quest_events report로 한 번 정산하거나 아직 지급되지 않은 상황으로 바로잡으세요. gm_rulings만으로 지급하지 마세요.');
}
