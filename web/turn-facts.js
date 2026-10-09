import {narrativeFocus} from './narrative-context.js';
import {isRecoveryAction,recoveryFacts} from './recovery-context.js';
import {itemCatalog,catalogItem} from './item-catalog.js';
import {currencyRules} from './economy.js';
import {npcSnapshot} from './npc-model.js';

// Send the small, relevant canonical records themselves, not only file names/counts.
export function turnFacts(state,domains,action='',nearbyActors=[]){
 const facts={},focus=narrativeFocus(state);
 if(Object.keys(focus).length)facts.narrative_focus=focus;
 if(isRecoveryAction(action))facts.recovery_wire=recoveryFacts(state);
 if(domains.crafting||domains.trade||/장비|무기|검|스태프|기술서|카탈로그/.test(action)){
  const owned=new Set((state.inventory||[]).map(i=>i.catalog_id||i.id));
  const named=itemCatalog.filter(i=>action.includes(i.id)||action.includes(i.name));
  const type=/스태프|지팡이/.test(action)?'staff':/갑옷|방어구/.test(action)?'armor':/악세|장신구/.test(action)?'accessory':'sword';
  const starters=itemCatalog.filter(i=>i.slot&&(i.subtype===type||i.slot===type)&&i.rarity==='하급').slice(0,3);
  facts.items=[...new Map([...named,...itemCatalog.filter(i=>owned.has(i.id)),...starters].map(i=>[i.id,i])).values()].slice(0,12);
  facts.item_rule='위 항목은 실제 원본이다. id/catalog_id와 quantity를 사용한다. basic_sword 등 경제 기준가 키는 물품 ID가 아니다. 기본 제작 결과는 등록 하급 장비로 기록한다. 가격·입수와 직업·장착 조건은 별개이며 제작했다고 직업을 자동 부여하지 않는다. 기존 미등록 장비를 확인할 때 원본 조회를 플레이어에게 떠넘기거나 다시 제작비를 청구하지 않는다.';
 }
 if(domains.growth||domains.crafting||domains.adventure||domains.quest){
  facts.xp={source:'PROGRESSION.md §2',rule:'위험 전투·실제 수련 성과·탐험·연구·의뢰·어려운 문제 해결은 경험을 얻을 수 있다. 활동별 고정 지급표는 없으므로 GM이 실제 성과로 양을 판정한다. 쉬운 반복은 감소하며 경지는 XP로 돌파하지 않는다.',profession:'검사/마법사 입문은 실제 학습·선택 후 engine_events {event_id,kind:profession,job:검사 또는 마법사,reason}. 기사 경지와 서클을 자동 부여하지 않는다.',event:{event_id:'고유_ID',kind:'xp',amount:'0 이상의 정수',reason:'이번 실제 학습·발견 근거'},practice:'실제 연습 완료는 engine_events practice: activity=physical/mental/craft/exploration,completed=true,xp_gain=양의 정수,reason 및 경과 game_state.date/time. 회당 레벨 필요 XP의20% 상한·같은 날 반복 감소. 전투·의뢰 보고·xp와 중복하지 않는다.'};
 }
 if(domains.combat){
  const nearby=state.gameState?.region;
  const ids=new Set([state.scene?.npc?.id,...(state.scene?.cast||[]).map(n=>n.id)].filter(Boolean));
  // Include only current regional or explicitly named actors; absence of stats stays absence.
  facts.combat_actors=[];
  const compactAction=action.replace(/\s/g,'');
  const namedActors=nearbyActors.filter(n=>compactAction.includes(String(n.name||'').replace(/\s/g,''))||action.includes(n.id));
  for(const n of namedActors)ids.add(n.id);
  // Generic encounter requests need a small regional reference, not every resident's sheet.
  if(!namedActors.length&&!state.scene?.npc?.id){
   const candidates=nearbyActors.map(n=>npcSnapshot(state,n.id)).filter(n=>n?.role==='monster'&&n.location_id===nearby).sort((a,b)=>a.level-b.level).slice(0,2);
   for(const n of candidates)ids.add(n.id);
  }
  facts.combat_rule='실제 적을 상대로 타격·사격·피해를 판정하면 battle을 출력한다. 발사만 하고 전투 기록 없이 부상·퇴각을 확정하지 않는다. 참가자의 숫자가 없으면 발명하지 말고 대피·구조 등 가능한 대응을 한다. 연습 표적·안전한 비접촉 훈련은 실제 적과의 전투가 아니다.';
  for(const id of ids){const n=npcSnapshot(state,id);if(n&&(n.location_id===nearby||compactAction.includes(String(n.name||'').replace(/\s/g,''))||id===state.scene?.npc?.id))facts.combat_actors.push(n);}
  facts.battle_wire={source:'tampermonkey/BATTLE_SCHEMA.md',battle:'{battle_id,trigger:dialogue/travel/dungeon/duel/ambush,participants,initiative:{actor_id,reason},events,outcome}',participant:'{id,name,side:allied/enemy,role:player/npc/monster,level,rank,realm,stats:{strength,dexterity,intelligence,constitution,manaStat},hp,maxHp,mp,maxMp,speed,level_hp_bonus,modifiers,skills,art}. player는 한 명. 원본 마수는 catalog_id와 creature_multiplier를 원본대로 사용한다. 미정 숫자는 발명하지 않는다. skills 각 항목은 {id,name,kind:physical/magic/unique/defend,mp_cost:0 이상의 정수}가 필수다. 원본 mainSkill의 이름만 복사한 불완전 skills는 금지한다. 평타는 skills=[]와 skill_id=null로 기록하고, 미정 기술 계수를 발명하지 않는다.',event:'{id,actor,target,kind:attack/dodge/defend/counter/magic/unique/defeat,result:hit/dodge/block/critical/none,skill_id:null 또는 보유기술,damage,mp_cost,actor_hp_after,actor_mp_after,target_hp_after,target_mp_after,narration,calculation?}',physical:'적중 calculation={base_roll:GM선택10~20,realm_multiplier:none/basic1 expert1.25 hyper1.65 master2.2,context_multiplier:기본1,defense:기본0,basis:상황보정근거}. raw=base_roll+floor(.65*STR+.2*DEX)+weapon_attack+technique_bonus; damage=min(상대HP,max(1,floor(raw*realm_multiplier*creature_multiplier*context_multiplier-defense))). 회피는0. counter는 직전 block 사건의 방어자가 공격자에게 반격할 때만 사용한다. 피격 뒤 재공격은 attack이다. initiative.actor_id는 첫 사건 actor와 같아야 하며 느린 쪽 선공은 기습/대응 근거를 기록한다. 사건별 HP/MP 연속, 속도는DEX+floor(STR/5)+장비/상태보정.',outcome:'{winner:allied/enemy/draw/escape,termination:defeat/surrender/draw/escape,reason,resources:[{id,hp,mp}],xp_gain:GM판정,items_added:[],items_consumed:[],injuries:부상 설명 문자열 배열[]}. injuries에는 객체 대신 문자열만 넣는다. items_added/items_consumed는 {id:등록ID,name,quantity} 배열이다. injuries 문자열은 종료 game_state.events에도 동일하게 포함한다. 마수전 loot_mode=per_kill_v1. 검증된 결과와 일치하는 종료 player/inventory/game_state 전체를 포함한다. 전리품은 UI가 추첨하므로 먼저 넣지 않는다.'};
 }
 if(domains.trade)facts.shop_wire={source:'tampermonkey/SHOP_TRADE_SCHEMA.md',event:'system_events [{event_id,kind:shop_open,reason,shop:{id,npc_id:실제상인,type:weapons/general/smith/junk 등,name,region_id,place,available:true,funds_copper:유한자금,valid_until:360일날짜,price_version:고유견적ID,price_basis:현지견적근거,open_hours:[8,22],items:[{id:등록물품ID,stock:실제수량,buy_price:동화정수,sell_price:동화정수}]}}]',rule:'가격/재고를 묻는 행동은 이번 응답에 현지 상인과 실제 견적을 제시한다. 구매·지출을 자동 확정하지 않는다. 원본에 없는 가격·현지 재고는 GM이 공개 상황과 경제 기준가로 합리적인 유한 견적을 구성할 수 있으며 물품 원본·돈을 새로 발명하지 않는다. 기존 상점은 shop_update, 실제 거래 정산은 UI에 맡긴다.'};
 if(domains.trade)facts.price_baselines=currencyRules.baseline_prices.filter(p=>/sword|staff|armor|bread|simple_meal/.test(p.id));
 return facts;
}
export const outcomeInstruction='[실제 기록] 대사·gm_rulings는 지급/의뢰 완료/전투의 대체 기록이 아니다. 새 현지 일반 의뢰의 ID·목표·보수는 GM이 구성할 수 있으며 사전 등록된 의뢰 ID가 없다는 이유로 조회를 반복하지 않는다. quest_updates에 offered 제안을 기록하고 실제 동의는 quest_events accept, 실제 수행 증거는 world_events, 발행자 보고는 quest_events report로 기록한다. 의뢰 선택지는 quest_id를 반드시 연결한다. 지급 숫자·원장·카탈로그 조회 지시를 NPC 대사나 선택지로 떠넘기지 않는다. 계약과 후속 판정은 서로 다른 gm_rulings.id를 쓴다. 기존 판정 내용은 수정하지 않는다. 일반 결과는 1~3개의 짧은 대사로 묶고 중요한 새 위험은 대응 선택 전에 자동 해결하지 않는다. ';
export function questWireFacts(state){
 return {source:'tampermonkey/QUEST_SCHEMA.md',new_quest:{id:'이번 캠페인의 고유 ID',title:'의뢰 제목',summary:'공개 조건',origin:'personal_npc 또는 guild_board 또는 dynamic_event',type:'repair/escort/investigate/delivery 등',status:'offered',rank:'F/E/D/C/B 또는 null',region_id:state.gameState?.region,issuer_npc_id:'현재 실제 발행자 등록 NPC ID',issuer_name:'등록 이름',story_required:true,objectives:[{id:'목표 고유 ID',description:'실제 수행',target:1,verification:{kind:'action 또는 clue 또는 escort 또는 실제 물품 delivery',target_id:'이번 계약의 구체적인 작업/단서 ID'}}],reward:{xp:'실제 난도에 맞게 GM 판정',currency:'발주자 예산 근거가 있는 동화 정수',item_ids:[],materials:[],affection_effects:[]}},quest_events:'[{event_id,quest_id,kind:accept/decline/abandon/fail/report,reason}]',world_events:'[{event_id,kind:action/clue/escort, target_id:목표 verification.target_id,location:실제 scene.location/place,proof:이번 행동의 구체적 결과,subject_alive:호위이면true}]',ordering:'수락한 뒤 수행한 증거만 유효하다. report는 목표 증거·위협 대응 완료 후 실제 발행자 앞에서. 보상 player/inventory/engine_events xp를 함께 출력하지 않는다. 화물 인벤토리 아닌 노동 운반·정찰·복구는 action 증거로 기록한다. delivery는 등록 소지품 감소와 recipient_id가 필요하다.',story_events:'[{event_id,quest_id,kind:threat,description:공개된 돌발 위협,protected:실제 보호 대상}]를 발견 턴에 기록하고 선택지를 제시한다. 플레이어가 대응한 후 다음 턴에 {event_id,quest_id,kind:resolve,threat_id:발견 사건ID,description:실제 대응과 후일담,protected:보호 대상}로 해결한다. 신규 위협 발견과 해결을 같은 응답에서 건너뛰지 않는다.'};
}
export function validateIncomingItems(items){
 for(const i of items){const id=i.catalog_id||i.id;if((id==='basic_sword'||/^(ER-EQ-|BK-)/.test(id||'')||['equipment','book'].includes(i.category))&&!catalogItem(id))throw Error('미등록 장비/기술서 ID '+(id||'(없음)')+'. 경제 기준가 키 대신 현재 turn_facts.items의 실제 원본 ID를 사용하세요.');}
}
