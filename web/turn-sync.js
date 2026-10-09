import {narrativeInstruction} from './narrative-context.js';
import {outcomeInstruction} from './turn-facts.js';
import {questStoryInstruction,hasActiveQuestStory} from './quest-story.js';
import {craftingAttemptInstruction,isCraftingAttempt} from './crafting-policy.js';
import {turnContext,turnDomains} from './scene.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function difference(value,old,removed=[],path=''){if(same(value,old))return undefined;if(value&&old&&typeof value==='object'&&typeof old==='object'&&!Array.isArray(value)&&!Array.isArray(old)){const result={};for(const [k,v]of Object.entries(value)){const changed=difference(v,old[k],removed,path+'/'+k.replaceAll('~','~0').replaceAll('/','~1'));if(changed!==undefined)result[k]=changed;}for(const k of Object.keys(old))if(!Object.hasOwn(value,k))removed.push(path+'/'+k.replaceAll('~','~0').replaceAll('/','~1'));return Object.keys(result).length?result:undefined;}return value;}
export function syncContext(state,action,choiceId){
 const domains=turnDomains(state,action,choiceId),c=clone(turnContext(state,domains,action,choiceId));
 if(c.npc_catalog&&!state.scene?.npc&&!state.scene?.cast?.length)c.npc_catalog.current_npc=null;
 delete c.item_registry;if(!domains.relationship)delete c.relationship_network;
 if(c.adventure)for(const k of ['guide','loop','rules','resident_rules'])delete c.adventure[k];
 if(c.skill_loadout){delete c.skill_loadout.rule;delete c.skill_loadout.slots_per_mode;}
 if(c.regional_epics){delete c.regional_epics.constraints;delete c.regional_epics.source;}
 if(c.npc_catalog)for(const k of ['sources','art_registry','placements','catalog_digest'])delete c.npc_catalog[k];
 if(c.economy)delete c.economy.rules;
 if(c.growth&&!/돌파|경지|서클|마나 방어|반사/.test(action))c.growth={profile:c.growth.profile,next:c.growth.next,learned_abilities:c.growth.learned_abilities};
 if(!domains.dungeon)delete c.dungeon_encounters;
 if(c.background_registry){delete c.background_registry.source;delete c.background_registry.registered;if(!domains.adventure&&!domains.dungeon&&!domains.crafting&&!domains.trade&&!domains.growth)delete c.background_registry.available;}
 return {context:c,domains};
}
export function createTurnSync(){
 let baseline=null,completed=0,campaign=null,generation=0;
 function reset(){baseline=null;completed=0;campaign=null;generation++;}
 function prepare(state,action,choiceId,force=false){
  const key=state.campaign_id||'legacy';if(campaign!==key){reset();campaign=key;}
  const {context,domains}=syncContext(state,action,choiceId),checkpoint=force||!baseline||completed%10===0;
  const removed=[];const changed=checkpoint?context:difference(context,baseline,removed)||{};
  const required=new Set(['npc','cast','turn_facts']);
  if(domains.combat||domains.growth||domains.crafting)for(const k of ['player','engine','inventory','skill_loadout','npc_catalog','growth','loot','dungeon_encounters','gm_rulings'])required.add(k);
  if(domains.trade)for(const k of ['player','inventory','wallet_copper','shops','economy','trade_receipts','npc_catalog'])required.add(k);
  if(domains.quest)for(const k of ['quest_log','quest_event_ids','regional_epics','wallet_copper'])required.add(k);
  if(domains.relationship)required.add('relationship_network');
  for(const k of required)if(Object.hasOwn(context,k))changed[k]=context[k];
  return {generation,campaign:key,completed,checkpoint,domains,snapshot:context,payload:{mode:checkpoint?'checkpoint':'delta',anchor:{campaign_id:state.campaign_id||null,scene_id:state.scene?.scene_id||null,region:state.gameState?.region||null,place:state.gameState?.place||state.scene?.location||null,date:state.gameState?.date||null,time:state.gameState?.time||state.scene?.time||null},state:changed,...(removed.length?{removed}:{})}};
 }
 function acknowledge(packet){if(!packet||packet.generation!==generation||packet.completed!==completed||packet.campaign!==campaign)return false;baseline=clone(packet.snapshot);completed++;return true;}
 return {prepare,acknowledge,reset};
}
export function incrementalPrompt(state,action,id,packet){
 const d=packet.domains;
 let rules='에르세디아 다음 턴. 이 채팅에서 확인한 BOOTSTRAP.md, WORLD.md와 승인 설정을 유지합니다. 확인된 세계관을 유지하고 미정인 진행 방법은 GM이 구성하세요. 실행은 준비 질문을 연속 반복하지 말고 가능한 대체 방법으로 이번 응답에서 결과까지 처리하세요. 게임 속 시간을 정산하고 실제 대기를 요구하지 마세요. 정보 문의와 실행을 구분하고 큰 위험·미승인 지출·중요 선택만 확인하세요. 캠페인 기록만 사용하며 journey_goal은 동기입니다. NPC 지식·비밀 제한을 지키세요. 보상 없음·지급 없음·수치 변화 없음·수락하지 않음 같은 무변화 보고는 dialogue에 넣지 마세요. 실제로 달라진 상황과 인물 반응만 자연스럽게 서술하고 획득 알림은 대화에서 생략하세요. 획득·습득·레벨업 알림은 UI가 실제 정산 후 중앙에 표시하므로 dialogue에서 보상 숫자·기술 등록·엔진 정산 설명을 반복하지 마세요. 대화에는 행동 장면과 인물 반응만 서술하세요.  실행 불가·실패·비용·위험처럼 다음 선택에 필요한 제한은 이유와 함께 안내하세요. 실제 판정과 구조화 사건은 유지하세요. '+
 '생략된 상태는 이전 값을 유지합니다. delta의 객체는 제공 필드만 병합하고 배열은 전체 대체합니다. checkpoint는 최신 진행 요약입니다. removed의 필드 경로는 현재 문맥에서 제거합니다. 엔진의 최신 상태가 대화 기억보다 우선합니다. 전체 진행 요약은 최초/불러오기 직후와 성공한 10턴마다 제공합니다. 전체 설정을 다시 읽거나 요청하지 마세요. '+
 'ercedia_scene JSON 코드블록 하나: schema_version=1,type=ercedia_scene,고유 scene_id,reply_to="'+id+'",location,time,background_id,npc,dialogue,choices. npc/cast는 등록 ID·원화·표정만, 원화 없으면 null. NPC 대사에 speaker_id를 넣고 cast 최대3명. choices.kind는 dialogue/travel/quest/investigate/trade/training/action 또는 생략. 중요한 선택2~4개, 자유입력만이면0개. 일반 대화는1~3개 짧은 대사. '+
 '변경 없는 player/inventory/game_state·profile은 생략하고 변경 시 전체 최신값을 출력하세요. 실제 시간 경과와 위치를 game_state에 반영하세요. 미정 진행 방법은 gm_rulings로 기록하고 기존 판정을 지키세요. 보상·관계·이동·직업 변경은 기존 사건으로 검증하고 보상을 중복 지급하지 마세요. 미장착 스킬 효과 금지. 실제 성과는 practice, 새 기술 학습은 learn_custom_skill로 기록하세요. ';
 const learningRules='육체 단련·공부·단조 연습 등 실제 성과를 완료했다면 단순 진행 중 문장 대신 engine_events practice={event_id,kind:practice,reason,activity:physical/mental/craft/exploration,completed:true,xp_gain:GM이 판정한 양의 정수}와 실제 경과 game_state.date/time을 기록하세요. 엔진은 레벨별 필요 XP의20%를 회당 상한으로 삼고 같은 날짜·분야 반복은 1/(횟수+1)로 감소시킵니다. xp나 전투·의뢰 보고 보상과 이중 지급하지 마세요. 기술을 배웠다면 learn_custom_skill도 함께 기록할 수 있습니다. '+
 'learn_custom_skill={event_id,kind,reason,skill:{id:GM-SKILL-고유값,name,description,skill_type:active/passive,usage:battle/dialogue/both,formula?,mp_cost?,technique_bonus?,spell_base_power?,element?}}. 단조 등 생활 기술은 passive/dialogue가 기본이며 명확한 효과·한계와 실제 학습 근거를 기록하세요. 기존 기술이나 궁극기를 덮어쓰지 말고 현재 레벨·경지에 맞는 효과와 제한을 정하세요. ';
 if(packet.checkpoint||d.growth||d.crafting)rules+=learningRules;
 if(isCraftingAttempt(action))rules+=craftingAttemptInstruction;
 if(packet.checkpoint||d.quest||hasActiveQuestStory(state))rules+=questStoryInstruction;
 if(d.combat)rules+='전투는 BATTLE_SCHEMA의 참가자·현재 수치·장착 기술·행동별 계산·HP/MP·최종 결과 전체를 사전 판정하고 일반 장면 생략 규칙의 예외로 종료 player/inventory/game_state 세 필드 전체를 반드시 포함하세요. 변경 없는 inventory도 생략하지 마세요. UI 정산·전리품 추첨과 중복 지급 금지. ';
 if(d.trade)rules+='거래는 SHOP_TRADE_SCHEMA/ECONOMY_SCHEMA의 실제 재고·가격·예산으로 확인하세요. 동화100=은화1, 은화100=금화1, wallet_copper는 엔진 원장입니다. UI 정산 거래를 스냅샷으로 재지급하지 마세요. ';
 if(d.growth||d.crafting)rules+='실제 수련·제작·학습 결과와 시간을 이번 턴에 판정하세요. 실제 연습 성과는 practice, 그 외 경험치는 engine_events xp, 학습은 learn_book/learn_custom_skill, 경지 승급은 실제 깨달음과 기존 최소 레벨을 확인하세요. ';
 if(d.quest)rules+='의뢰는 quest_updates/quest_events/world_events의 실제 증거로 처리하고 보고 보상은 UI에 맡기세요. ';
 return narrativeInstruction+rules+outcomeInstruction+'\n현재 상태:\n'+JSON.stringify(packet.payload)+'\n\n플레이어의 자유 행동(그대로 반영):\n'+action;
}
