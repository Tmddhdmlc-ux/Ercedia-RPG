import {narrativeInstruction} from './narrative-context.js';
import {normalizeRulings} from './gm-rulings.js';
import {turnFacts,questWireFacts,outcomeInstruction} from './turn-facts.js';
import {normalizeStoryEvents} from './quest-story.js';
import {craftingAttemptInstruction} from './crafting-policy.js';
import {gameplayPacingInstruction} from './gameplay-pacing.js';
import {dungeonEncounterContext} from './dungeon-encounter-model.js';
import {questStoryInstruction,hasActiveQuestStory} from './quest-story.js';
import {relationshipContext} from './relationship-model.js';
import {craftingContext} from './crafting-model.js';
import {lootContext} from './loot-model.js';
import {growthContext} from './growth-model.js';
import {loadoutContext} from './skill-loadout.js';
import {adventureContext} from './adventure-model.js';
import {epicContext} from './epic-model.js';
import {wallet} from './wallet.js';
import {currencyRules} from './economy.js';
import {validateSystemEvents} from './world-engine.js';
import {usableSkills} from './engine-model.js';
import {lootCatalog} from './item-catalog.js';
import {backgroundArt,backgroundContext} from './location-art.js';
import {registeredArt} from './character-art.js';
import {normalizePlayer} from './player.js';
import {locationLabel} from './location-label.js';
import {normalizeInventory} from './inventory.js';
import {extractSceneJSON} from './response-json.js';
import {normalizeNPCProfile} from './npc-profile.js';
import {introData} from './intro-data.js';
import {passiveLimits} from './intro-model.js';
import {normalizeBattle} from './battle-model.js';
import {npcCatalog,findNPC,npcContext} from './npc-model.js';
import {normalizeQuest,normalizeWorldEvents} from './quest-model.js';
import {validateLifeEvents,lifeContext} from './npc-life.js';
export const emotions=['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'];
export const characterRegistry=Object.fromEntries(npcCatalog.map(p=>[p.id,{outfits:p.id==='serin'?['armor','casual','nightwear']:['none'],emotions:p.id==='serin'?emotions:registeredArt[p.id]?.expressions||['base']}]));
function text(value,key,max=2000,required=true){
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error(`${key} 형식을 확인하세요.`);
  return value;
}
function emotion(value){if(!emotions.includes(value))throw Error('등록되지 않은 표정입니다.');return value;}
export function normalizeScene(raw){
  if(!raw||typeof raw!=='object'||raw.schema_version!==1||raw.type!=='ercedia_scene')throw Error('ercedia_scene / schema_version 1 데이터가 필요합니다.');
  if(Object.hasOwn(raw,'wallet_copper')||Object.hasOwn(raw,'currency')||raw.player&&('wallet_copper' in raw.player||'currency' in raw.player)||raw.game_state&&('wallet_copper' in raw.game_state||'currency' in raw.game_state))throw Error('화폐 스냅샷은 금지합니다. 경제 사건으로 정산하세요.');
  const scene={schema_version:1,type:'ercedia_scene',scene_id:text(raw.scene_id,'scene_id',100),location:text(raw.location,'location',120),time:text(raw.time,'time',80),background_id:raw.background_id,npc:null,dialogue:[],choices:[]};
  if(raw.background_id!==null&&!backgroundArt(raw.background_id))throw Error('등록되지 않은 배경입니다. 원화 없는 장면은 null을 사용하세요.');
  if(raw.npc!==null){
    const npc=raw.npc,config=characterRegistry[npc?.id];
    if(!config||!config.outfits.includes(npc.outfit)||!config.emotions.includes(npc.emotion))throw Error('등록되지 않은 NPC 또는 복장입니다.');
    scene.npc={id:npc.id,outfit:npc.outfit,emotion:emotion(npc.emotion),speaker:text(npc.speaker,'npc.speaker',60)};
    if(npc.profile!==undefined)scene.npc.profile=normalizeNPCProfile(npc.profile);
  }
  if(raw.cast!==undefined){
    if(!Array.isArray(raw.cast)||raw.cast.length<1||raw.cast.length>3)throw Error('cast는 1~3명이어야 합니다.');
    const ids=new Set();scene.cast=raw.cast.map(npc=>{
      const config=characterRegistry[npc?.id];
      if(!config||!config.outfits.includes(npc.outfit)||!config.emotions.includes(npc.emotion)||ids.has(npc.id))throw Error('cast의 인물·복장·표정 또는 중복 ID를 확인하세요.');
      ids.add(npc.id);return {id:npc.id,outfit:npc.outfit,emotion:emotion(npc.emotion),speaker:text(npc.speaker,'cast.speaker',60),...(npc.profile!==undefined?{profile:normalizeNPCProfile(npc.profile)}:{})};
    });
    if(scene.npc&&!ids.has(scene.npc.id))throw Error('주 대화 상대 npc는 cast에 포함되어야 합니다.');
  }
  if(!Array.isArray(raw.dialogue)||!raw.dialogue.length||raw.dialogue.length>60)throw Error('dialogue는 1~60개여야 합니다.');
  scene.dialogue=raw.dialogue.map(line=>{
    if(line?.speaker_id!==undefined&&!(scene.cast||[scene.npc]).some(p=>p?.id===line.speaker_id))throw Error('speaker_id는 현재 대화 참가자여야 합니다.');
    return {speaker:text(line?.speaker,'speaker',60),text:text(line?.text,'text',4000),...(line.speaker_id!==undefined?{speaker_id:line.speaker_id}:{}),...(line.emotion!==undefined?{emotion:emotion(line.emotion)}:{})};
  });
  if(!Array.isArray(raw.choices)||![0,2,3,4].includes(raw.choices.length))throw Error('choices는 0개 또는 2~4개여야 합니다.');
  const ids=new Set();scene.choices=raw.choices.map(choice=>{const id=text(choice?.id,'choice.id',80);if(ids.has(id))throw Error('선택지 ID가 중복됐습니다.');ids.add(id);const result={id,text:text(choice.text,'choice.text',400)};if(choice.kind!==undefined){if(!['dialogue','travel','quest','investigate','trade','training','action'].includes(choice.kind))throw Error('선택지 유형 오류');result.kind=choice.kind;}for(const [key,max]of [['title',160],['description',1000],['quest_id',100]])if(choice[key]!==undefined)result[key]=text(choice[key],'choice.'+key,max);return result;});
  if(raw.reply_to!==undefined)scene.reply_to=text(raw.reply_to,'reply_to',100);
  if(raw.settings_loaded!==undefined){const r=raw.settings_loaded;if(!/^[a-f0-9]{40}$/.test(r?.commit||'')||!Number.isInteger(r.file_count)||r.file_count<1||r.file_count>2000)throw Error('설정 읽기 확인 형식 오류');scene.settings_loaded={commit:r.commit,file_count:r.file_count};}
  if(Object.hasOwn(raw,'player'))scene.player=normalizePlayer(raw.player);
  if(Object.hasOwn(raw,'inventory')){if(!Array.isArray(raw.inventory)||raw.inventory.length>32)throw Error('inventory는 최대 32칸입니다.');scene.inventory=normalizeInventory(raw.inventory);}
  if(raw.game_state!==undefined){
    if(!raw.game_state||typeof raw.game_state!=='object')throw Error('game_state 형식을 확인하세요.');
    const game={};for(const key of ['date','time','region','place'])if(raw.game_state[key]!==undefined)game[key]=text(raw.game_state[key],key,160,false);
    for(const key of ['quests','relationships','events','recent_dialogue'])if(raw.game_state[key]!==undefined){const list=raw.game_state[key];if(!Array.isArray(list)||list.length>30)throw Error(`${key}는 최대 30개 문자열입니다.`);game[key]=list.map(v=>text(key==='recent_dialogue'&&v&&typeof v==='object'&&Object.keys(v).every(k=>['speaker','text','emotion'].includes(k))&&typeof v.speaker==='string'&&typeof v.text==='string'?`${v.speaker}: ${v.text}`:v,key,500,false));}
    scene.game_state=game;
  }
  if(raw.battle!==undefined){
    scene.battle=normalizeBattle(raw.battle);
    // Verified battle injuries are the canonical source; do not require GM to repeat them verbatim.
    if(scene.game_state&&scene.battle.outcome.injuries.length){
      const injuries=scene.battle.outcome.injuries;
      scene.game_state.events=[...new Set([...(scene.game_state.events||[]).filter(e=>!injuries.includes(e)),...injuries])].slice(-30);
    }
  }
  if(raw.locality_events!==undefined){if(!Array.isArray(raw.locality_events)||raw.locality_events.length>16)throw Error("지역 평가 사건 한도");scene.locality_events=raw.locality_events.map(e=>({event_id:e.event_id,scope_id:e.scope_id,delta:e.delta,reason:e.reason}));}
  if(raw.quest_updates!==undefined){if(!Array.isArray(raw.quest_updates)||raw.quest_updates.length>20)throw Error('quest_updates는 최대 20개');scene.quest_updates=raw.quest_updates.map(normalizeQuest);}
  if(raw.story_events!==undefined)scene.story_events=normalizeStoryEvents(raw.story_events);
  if(raw.world_events!==undefined)scene.world_events=normalizeWorldEvents(raw.world_events);
  if(raw.quest_events!==undefined){if(!Array.isArray(raw.quest_events)||raw.quest_events.length>20)throw Error('quest_events는 최대 20개');scene.quest_events=raw.quest_events.map(e=>{if(!['accept','decline','abandon','fail','report'].includes(e?.kind))throw Error('의뢰 사건 종류 오류');return {event_id:text(e.event_id,'event_id',100),quest_id:text(e.quest_id,'quest_id',100),kind:e.kind,reason:text(e.reason,'reason',1000)};});}
  if(raw.npc_updates!==undefined){if(!raw.npc_updates||typeof raw.npc_updates!=='object'||Array.isArray(raw.npc_updates)||Object.keys(raw.npc_updates).length>16)throw Error('npc_updates는 최대 16명의 공개 변경값입니다.');scene.npc_updates={};for(const [id,p] of Object.entries(raw.npc_updates)){if(!findNPC(id))throw Error('미등록 인물 변경');scene.npc_updates[id]=normalizeNPCProfile(p);}}
  if(raw.engine_events!==undefined)scene.engine_events=validateEngineEvents(raw.engine_events);
  if(raw.system_events!==undefined)scene.system_events=validateSystemEvents(raw.system_events);
  if(raw.life_events!==undefined)scene.life_events=validateLifeEvents(raw.life_events);
  if(raw.gm_rulings!==undefined)scene.gm_rulings=normalizeRulings(raw.gm_rulings,8);
  return scene;
}
export function parseScene(source){
  if(typeof source!=='string'||source.length>120000)throw Error('응답은 120KB 이하의 JSON이어야 합니다.');
  const input=source.trim();
  const extracted=extractSceneJSON(input);
  if(extracted)return normalizeScene(JSON.parse(extracted));
  if(input.startsWith('{'))return normalizeScene(JSON.parse(input));
  const blocks=[...input.matchAll(/```(?:json|ercedia)?\s*\n([\s\S]*?)```/g)];
  for(const block of blocks){try{const raw=JSON.parse(block[1]);if(raw.type==='ercedia_scene')return normalizeScene(raw);}catch(error){if(block[1].includes('ercedia_scene'))throw error;}}
  throw Error('완료된 ercedia_scene JSON 블록을 찾지 못했습니다.');
}
export function contextSummary(state){
  return {...(state.gm_rulings?.length?{gm_rulings:state.gm_rulings}:{}),relationship_network:relationshipContext(state),dungeon_encounters:dungeonEncounterContext(state),crafting:craftingContext(),loot:lootContext(),adventure:adventureContext(state),skill_loadout:loadoutContext(state),growth:growthContext(state),regional_epics:epicContext(state),background_registry:backgroundContext(state),item_registry:{equipment:300,books:70,materials:40,sources:['equipment/equipment_catalog_300.json','items/book_catalog_70.json','items/loot_tables_monsters_dungeons.json'],region_rewards:lootCatalog.dungeon_rewards.filter(p=>p.region_id===(state.gameState?.region||state.region))},npc_life:lifeContext(state),campaign_id:state.campaign_id||null,engine:state.engine||null,scene_id:state.scene?.scene_id||null,location:locationLabel(state.scene?.location||'솔브린 마을'),time:state.scene?.time||'오후',player:state.player,npc_catalog:npcContext(state),...(state.intro_completed?{character_creation:{intro_completed:true,character_name:state.character_name,journey_goal:state.journey_goal||'',gender_or_appearance:state.gender_or_appearance,chosen_answers:state.chosen_answers,starting_passive_id:state.starting_passive_id,starting_passive:{...introData.passives.find(p=>p.id===state.starting_passive_id),limit:passiveLimits[state.starting_passive_id]},starting_kingdom:state.starting_kingdom,starting_lordship_id:state.starting_lordship_id}}:{}),quest_log:state.quest_log||[],quest_event_ids:state.quest_event_ids||[],wallet_copper:wallet(state),shops:Object.fromEntries(Object.entries(state.world_engine?.shops||{}).filter(([,s])=>s.region_id===state.gameState?.region)),trade_receipts:Object.fromEntries(Object.entries(state.world_engine?.trade_ids||{}).slice(-10)),economy:{rules:currencyRules,offers:state.world_engine?.offers||{},merchants:state.world_engine?.merchants||{},auctions:state.world_engine?.auctions||{},market_changes:state.world_engine?.market_changes||[]},relationships:state.relationships||{},inventory:state.inventory,game_state:state.gameState||{},recent_dialogue:state.scene?.dialogue.slice(-6)||[],...(state.scene?.npc?.profile?{npc:state.scene.npc}:{})};
}
// Full requests bootstrap a conversation; continuations reuse acknowledged rules.
export function turnDomains(state,action,choiceId){
  const choice=state.scene?.choices?.find(c=>c.id===choiceId),kind=choice?.kind,text=String(action);
  return {
    combat:/전투(?!불능)|공격|싸우|싸움|토벌|처치|사냥|궁극기|사격|견제|화살|베어|베기|찌른|늑대/.test(text),
    dungeon:!!state.world_engine?.active_dungeon||/던전|미궁|보스|탐색|탐험/.test(text),
    trade:kind==='trade'||/상점|상인|행상|장터|거래|구매|구입|판매|견적|가격|재고|살.{0,8}검|경매|입찰|시설|치료|숙박/.test(text),
    crafting:/제작|대장간|강화|분해|조합|단조|검.{0,15}(?:만들|만든)/.test(text),
    growth:kind==='training'||/수련|단련|훈련|학습|배우|배운|연습|공부|단조|익히|익힌|연구|기술서|돌파|경지|서클|입문|직업|전직/.test(text),
    adventure:['travel','quest','investigate'].includes(kind)||/이동|여행|출발|귀환|조사|탐색|탐험|주민|일거리|운송|수레|의뢰|퀘스트|보고/.test(text),
    quest:kind==='quest'||!!choice?.quest_id||hasActiveQuestStory(state)||/의뢰|퀘스트|보고|수주|일거리|게시|보수|운송|운반|유급|순찰/.test(text),
    relationship:/관계|세력|조직|왕족|국왕|혼인|반란|배신|동료|동행/.test(text)
  };
}
export function turnContext(state,domains,action=''){
  const context=requestContext(state);
  context.turn_facts=turnFacts(state,domains,action,context.npc_catalog.nearby_npcs);
  if(domains.quest)context.turn_facts.quests=questWireFacts(state);
  const involved=new Set([state.scene?.npc?.id,...(state.scene?.cast||[]).map(n=>n.id),...(state.quest_log||[]).filter(q=>['accepted','active','ready_to_report'].includes(q.status)).map(q=>q.issuer_npc_id||q.issuer_id)].filter(Boolean));
  for(const id of Object.keys(context.npc_life?.npcs||{}))involved.add(id);
  for(const npc of context.npc_catalog.nearby_npcs)if(action.includes(npc.name))involved.add(npc.id);
  context.cast=state.scene?.cast||[];context.npc=state.scene?.npc||null;
  context.npc_catalog.npc_changes=Object.fromEntries(Object.entries(context.npc_catalog.npc_changes||{}).filter(([id])=>involved.has(id)));
  if(!domains.adventure&&!domains.trade&&!domains.relationship)context.npc_catalog.nearby_npcs=context.npc_catalog.nearby_npcs.filter(n=>involved.has(n.id));
  if(!domains.dungeon&&!domains.combat)delete context.dungeon_encounters;
  if(!domains.crafting)delete context.crafting;
  if(!domains.combat&&!domains.dungeon)delete context.loot;
  else {
    // Drop pools are consumed by the UI, not by GM narration or its RNG.
    // Sending every dungeon's equipment pool dominated even a simple request.
    delete context.loot.dungeon_pools;
  }
  if(!domains.growth&&!domains.combat)delete context.growth;
  if(!domains.adventure&&!domains.trade){
    const residents=context.adventure.regional_residents.filter(n=>involved.has(n.id));
    if(residents.length)context.adventure={location:context.adventure.location,regional_residents:residents,resident_rules:context.adventure.resident_rules};
    else delete context.adventure;
  }
  if(!domains.quest)delete context.regional_epics;
  if(!domains.trade){delete context.shops;delete context.economy;delete context.trade_receipts;}
  if(!domains.dungeon&&!domains.combat)delete context.item_registry.region_rewards;
  // Preserve live equipment/resources, quests, memories and the clock in full.
  return context;
}
export function requestContext(state){
  const context=contextSummary(state);
  // The UI owns these pools even on the first turn after restoring a save.
  // Keeping all bootstrap rules does not require transmitting UI lottery data.
  delete context.loot.dungeon_pools;
  return context;
}
const gmDiscretionInstruction="[GM 재량] 확정 세계관·성장 조건·실제 상태는 지키되 미정인 전직 방법·수련 절차·현지 만남·일거리·소요 시간은 상황에 맞게 구성하세요. 방법 미정이라는 이유로 진행을 거부하지 마세요. 전직의 레벨·직업 조건을 새 보편 법칙으로 만들지 말고 적합한 시험·스승·과업을 제시하세요. 한 캠페인에서 확정한 방법은 gm_rulings=[{id,topic,decision}]로 공개 요약을 기록하고 현재 상태의 동명 기록을 우선합니다. 보상·직업·위치의 실제 변경은 기존 사건으로 검증하며 미등록 원화·능력치를 만들지는 않습니다. 실제 학습한 새 기술은 learn_custom_skill로 GM-SKILL ID를 기록할 수 있습니다. ";
const turnPacingInstruction="[행동 판정·성장] 플레이어가 실행을 요청하면 통상적인 소요 시간·접근 경로·성공 여부·실제 수련 성과는 GM이 현재 상태와 승인 규칙으로 판정하고 이번 응답에서 사건과 시각에 반영하세요. 사용자가 세부 시간을 정하지 않았다는 이유로 진행을 멈추거나 확인 질문을 연속 반복하지 마세요. 정보 문의는 실행 동의가 아니며 큰 위험·미승인 지출·되돌릴 수 없는 선택만 사전에 확인하세요. 원래 방식이 막히면 대체 방법을 마련해 같은 응답에서 실행·결과까지 성사시키세요. 초반 선택지는 안전한 일거리 수행·실제 탐색·등록된 적과의 적정 난도 조우 등 성장 행동을 우선하고 시설·지도 확인만 반복하지 마세요. 일반 지역에서 가능한 조우는 GM이 판정하되 미등록 적·능력치·위치를 발명하거나 과도한 난도의 던전 전투를 강제하지 마세요. 실제 수련·탐험 성과의 XP는 PROGRESSION.md와 기존 engine_events xp로 근거와 함께 기록하고 반복 안전 활동의 획득 감소를 반영하세요. 전투·의뢰 보상은 기존 정산만 사용하며 중복 지급하지 마세요. 단련은 소요 시간·성과·XP 유무와 이유를 결과로 보여주고 미확정 상태 문장으로 끝내지 마세요. 능력치 포인트 배분·장비 선택·경지 돌파는 자동 확정하지 마세요. ";
export function actionPrompt(state,action,requestId,{compact=false,choiceId=null}={}){
  action=String(action);
  const shopInstruction='상점은 SHOP_TRADE_SCHEMA.md의 shop_open/shop_update 또는 검증된 offer로 실제 NPC·재고·시장 견적·유한 자금을 제시합니다. 양방향 상점 UI가 실물과 wallet_copper를 원자 정산하므로 GM은 거래 반응만 서술하고 이미 정산한 거래를 trade 또는 inventory 스냅샷으로 반복 지급하지 마세요. ';
  const currencyInstruction='[화폐 경제] CURRENCY_ECONOMY.md, economy/currency_rules.json, tampermonkey/ECONOMY_SCHEMA.md를 읽으세요. 모든 가격과 보상은 동화 정수, 동화100=은화1, 은화100=금화1입니다. wallet_copper는 엔진 원장이고 새 게임 500동화는 이미 지급했습니다. 대사와 화폐 스냅샷으로 잔액을 바꾸지 마세요. 등록 상인·한정 재고·매입 예산·명성·교육허가·가격 근거를 실제 견적에 포함하세요. 경매는 판매자와 실제 개체·증가액·마감·예치/낙찰을 기록하세요. 마수는 기본 동전 없이 재료만, 신물11개는 일반 거래 불가입니다. 실제 전쟁·습격·흉작·국경 사건의 가격/재고 변화는 기간과 증거를 market으로 기록합니다. ';
  const craftingInstruction=craftingAttemptInstruction+'[대장간 제작] 정식 위탁으로 장인에게 등록 장비 제작을 맡길 때는 items/crafting_recipes.json과 CRAFTING_SYSTEM.md의 등록 제작법을 사용하세요. 실제 smithing 시설 방문 뒤 offer.services에 recipe_id, 등록 inputs/outputs/cost, craftsman 및 craftsman_proof/base_stock_proof, 희귀 제작법이면 recipe_proof, 스태프·악세사리이면 artificer_proof를 넣어 견적을 제시하세요. 사용자 제작 요청 후 실제 작업 시간을 진행하고 service 사건에 work_minutes/work_proof를 기록합니다. 재료와 제작비는 엔진이 소모하고 결과 장비는 1개 지급하므로 inventory/player 보상 스냅샷을 넣지 마세요. 제작은 별도 실패 확률을 추가하지 않습니다. 이 위탁 정산 조건을 단독 시도 전체의 거부 사유로 사용하지 마세요. ';
  const lootInstruction='[처치별 전리품] LOOT_ACQUISITION.md를 읽고 마수 전투 outcome.loot_mode=per_kill_v1을 반드시 넣으세요. UI 엔진이 실제로 처치된 개체마다 일반60%·특수10%·장비/기술서 하급6%·중급2%·고급1%·유니크0.7%·에픽0.3%·없음20%를 각각 1회 추첨하고 종료 인벤토리에 추가합니다. GM은 이 무작위 보상이나 loot_rolls를 미리 만들거나 items_added/inventory에 이중 반영하지 마세요. 처치별 모드의 items_added는 빈 배열, inventory는 추첨 전 종료 소유품으로 제출하세요. 동물 몸에서 동전을 자동 생성하지 않고 실제 현상금·보물·소지금은 기존 cash_receipt와 증거로 정산합니다. 보스도 처치별 판정 1회이며 clear_dungeon에 material_id/optional_item_id를 다시 넣지 않습니다. 전투 완료 후 UI가 중앙 획득 팝업을 띄우므로 대사에 획득 목록을 반복하지 마세요. ';
  const growthInstruction='[성장·경지 지침] CLASS_GROWTH.md, progression/growth_rules.json 및 tampermonkey/GROWTH_SCHEMA.md를 읽으세요. 최소 레벨은 하한이며 깨달음 서술로만 순차 돌파합니다. 경지·서클 변경은 engine_events breakthrough, 경지 공통능력 학습은 learn_realm_ability로 기록하고 player 스냅샷에는 기존 경지를 유지하세요. 전투 밖에서도 숙련·생업·마나 정밀도·피로·사회적 대우를 묘사하세요. 기사 하위 마나 추가 피해는 mana_component와 mana_guard, 마법 반사는 realm_reaction reflection과 바로 다음 reflection_source_event 사건으로 증빙합니다. 전투 난수는 GM이 판정하고 UI는 재추첨하지 않습니다. 처치별 전리품만 별도 UI 추첨을 사용합니다. 히든클래스는 보류이며 해금하지 마세요. ';
  const rpgInstruction='[모험 순환·장착 지침] RPG_ADVENTURE_LOOP.md를 읽으세요. 첫 마을에서는 안전한 일거리·주변 탐색·주민 만남을 안내하고 강제 수락하지 마세요. 출정 전 경로·시간·위험·보상·준비 상태를 설명하세요. 마을 UI 요청도 기존 사건 검증과 동일합니다. 현재 skill_loadout.battle에 장착한 액티브·패시브 합계 4칸만 전투에서 적용하고, skill_loadout.dialogue 패시브 4칸만 대화·탐험에 적용하세요. 미장착 시작 패시브도 효과를 적용하지 마세요. 기본 공격·경지 능력·실제 습득 궁극기는 별도 조건입니다. battle.participants의 주인공 skills에는 장착한 액티브와 실제 보유 궁극기만 포함하세요. 미장착 기술을 사용하거나 수치를 임의로 올리지 마세요. 습득 스킬은 player.skills에 보존하며 skill_type=active/passive, usage=battle/dialogue/both, 궁극기는 ultimate=true로 기록하세요. 실제 수련으로 배운 창작 기술은 learn_custom_skill로 기록하고 설명만으로 보상을 지급하지 마세요. 반복 안전 활동은 실제 시간·비용·위험을 반영하여 요약하고 미지 구역·보스·중요 선택은 건너뛰지 마세요. ';
  const dungeonInstruction='[지역 던전] DUNGEON_ENCOUNTERS.md와 locations/dungeon_encounters.json을 읽으세요. dungeon_encounters의 등록 보스·정예 개체는 dungeon_foe_id, 원본 종 catalog_id, 등록 name/rank/stats/HP/MP/level/speed/level_hp_bonus/creature_multiplier를 사용합니다. 장비·상태 modifiers는 0입니다. 각 구역의 theme/hazard/exploration과 예고 동작·대응을 반영하되 자동 피해·절대 면역·자동 약점 성공을 만들지 마세요. 보스 구역은 지정 보스, 중간보스 구역은 지정 정예를 실제 처치해야 해결됩니다. 일반 전투의 정예는 상황에 맞게 등장시키며 모든 싸움에 강제하지 않습니다. 기존 종 원화는 외형 참고이며 신규 전용 원화가 아닙니다. 별도 확정 드롭이나 재추첨을 추가하지 않습니다. ';
  const relationshipInstruction='[인물·세력 관계] CHARACTER_RELATIONSHIPS.md와 CHARACTER_RELATIONSHIPS_GM.md, characters/relationship_graph_gm.json의 실제 원문을 읽으세요. relationship_network.baseline은 공개된 시작 관계이며 actual_links와 실제 기억·사건이 현재 관계를 우선합니다. 국왕·후계자·기사단 내부·마법탑·교단·상단·시민 조직의 서로 다른 관점과 갈등 계기를 반영하되 속마음을 상대나 제삼자가 자동으로 알지 않게 하세요. 조직의 적대가 모든 개인의 적대가 아니며 호감도만으로 법·직무·혼인·반란·배신을 확정하지 않습니다. 별도 신뢰·친숙·충성 점수를 추가하지 마세요. 기존 등록 NPC 간 실제 관계 변화는 life_events npc_relation과 source_id/reason/player_known로 기록합니다. lore_only 인물은 이름·관계 설정만 있으므로 등록 NPC 장면 ID·전투 수치·원화로 사용하지 않습니다. 미발견 관계·불법 활동·왕위 논쟁의 진상·세계 비밀을 일반 대사와 관계 UI에 자동 공개하지 않습니다. ';
  const engineInstruction='[다인 대화] 실제 현장에 있는 등록 인물이 함께 대화하면 cast=[{id,outfit,emotion,speaker,profile?}]를 최대 3명까지 출력하세요. 좌측부터 배열 순서로 배치하며 npc는 주 대화 상대 또는 null입니다. 각 인물 대사에는 speaker_id=참가자 ID를 넣고 나레이션에는 넣지 마세요. 네 번째 인물은 장면 전환으로 교체하세요. 등록 원화만 사용하고 현재 위치·일정에 모순되지 않는 만남 경로는 GM이 구성하세요. [세계 엔진 지침] tampermonkey/WORLD_ENGINE_SCHEMA.md를 읽고 전리품·던전·동료·국경·시설·거래·경매·연간 사건은 system_events로 확인하세요. 클릭과 대사만으로 보상을 지급하지 마세요. 처치별 모드의 보스 전리품은 UI 추첨 한 번이며 클리어 패키지는 경험치·기록만 정산합니다. XP와 아이템을 중복 출력하지 마세요. 월간 planned는 후보이며 실제 사건 결과는 GM이 조건과 근거로 판정합니다. ' + '[NPC 생활 지침] tampermonkey/NPC_LIFE_SCHEMA.md를 읽고 life_events를 출력하세요. 시간·직무·현재 위치·본인이 직접 겪은 기억과 도착한 소문을 반영하세요. 호감도 하나만 사용하고 개인 친분으로 법·직무를 무시하지 마세요. 공개되지 않은 기억은 UI용 대사로 누설하지 마세요. [엔진 지침] tampermonkey/ENGINE_SCHEMA.md를 읽고 실제로 판정한 변경은 engine_events로 출력하세요. 엔진·전투·의뢰의 같은 경험치나 아이템을 이중 지급하지 마세요. 장비가 반영된 player 수치에 engine.bonuses를 다시 더하지 마세요. 기술서는 engine.learned와 player.skills를 참조하고 실제 학습·MP·서클 조건을 지키세요.';
  if(compact){
    const domains=turnDomains(state,action,choiceId);
    const ordinary=!Object.values(domains).some(Boolean);
    const brief=ordinary&&!hasActiveQuestStory(state)&&!/자세|상세|길게|긴 대사|연출|독백/.test(action);
    const outputStyle=brief?'[일상 대화 응답] dialogue는 보통 1~3개 짧은 대사, choices는 중요한 2개 또는 자유 입력만이면 0개. 불필요한 description·반복 설명은 생략하되 중요한 사건·감정·의뢰·전투는 필요한 만큼 펼치고 필수 사건 증빙은 생략하지 마세요. ':'';
    const liveRules=ordinary?'현장 등록 인물 cast 최대3명, NPC 대사 speaker_id. 실제 일정·위치·직접 기억·도착한 소문을 따르세요. 변경은 ENGINE_SCHEMA/WORLD_ENGINE_SCHEMA/NPC_LIFE_SCHEMA 사건으로 기록하고 보상·장비 보너스를 중복 적용하지 마세요. 친분은 life_events experience.affection_delta, 이동은 국경 증빙을 포함한 life_events move. ':engineInstruction;
    const rules=[liveRules,
      domains.adventure?rpgInstruction:'',domains.trade?shopInstruction+currencyInstruction:'',
      domains.relationship?relationshipInstruction:'',domains.dungeon?dungeonInstruction:'',
      domains.crafting?craftingInstruction:'',domains.combat||domains.dungeon?lootInstruction:'',
      domains.growth||domains.combat?growthInstruction:''].filter(Boolean).join('').replaceAll('를 읽으세요.','를 따르세요.').replaceAll('를 읽고','를 따라');
    const special=domains.combat?'전투는 기존 BATTLE_SCHEMA.md를 따라 battle_id/trigger/participants/initiative/events/outcome 전체를 사전 판정합니다. 현재 수치·장착 기술·MP 비용·계산 근거를 사용하고 종료 player/inventory/game_state와 복귀 장면을 포함하세요. 미정 수치로 전투를 발명하지 마세요. ':'';
    return narrativeInstruction+(ordinary?"대사·gm_rulings는 보상·의뢰·전투 사건을 대신하지 않습니다. 기존 판정 ID의 내용은 바꾸지 말고 후속 결과는 새 ID로 기록하세요. ":outcomeInstruction)+gameplayPacingInstruction+`에르세디아 다음 턴. 이 채팅에서 확인한 BOOTSTRAP.md, WORLD.md와 승인 설정을 계속 적용하세요. 무관한 문서는 다시 읽지 말고 미정 진행 방법은 GM이 보완하세요. 현재 campaign_id의 기록만 쓰며 저장은 설정을 대체하지 않습니다. journey_goal은 동기이며 능력·직업·보상·성공을 확정하지 않습니다. NPC 지식·GM 비밀 경계를 지키세요.
응답은 ercedia_scene JSON 코드블록 하나. schema_version=1,type="ercedia_scene",고유 scene_id,reply_to="${requestId}",location,time,background_id,npc,dialogue,choices를 포함하세요. 행동에 따라 시간이 경과할 때만 360일 달력의 game_state.date/time과 scene.time을 일치시키고 시각이 미정이면 장면에 맞는 시작 시각을 GM이 정해 기록하세요. 실제 위치와 선택한 시작 왕국·영주령을 유지하며 지도 클릭은 이동이 아닙니다. background_registry.available의 등록 ID 또는 null만 사용하고 숨겨진 미발견 장소 및 IMG-SHARED-11을 배경으로 쓰지 마세요.
npc={id,speaker,outfit,emotion} 또는 null. 등록 인물·표정만 사용하고 세린 outfit은 armor/casual/nightwear, 나머지는 none, 미등록 감정은 base입니다. dialogue=[{speaker,text,emotion?}], choices=[{id,text,kind?,title?,description?,quest_id?}], kind는 dialogue/travel/quest/investigate/trade/training/action 중 하나 또는 생략합니다. 선택지는 중요한 선택 2~4개 또는 자유 입력만이면 0개. 불필요한 확인 선택은 생략하고 선택 행동의 결과부터 진행하세요. NPC 현재 수치와 실제 위치를 우선하며 미정 수치·원화·만남을 발명하지 마세요. player/inventory/game_state는 변경 시에만 전체 새 값으로 출력합니다. 아이템은 원본 id/catalog_id와 quantity를 사용합니다. 경험치·전리품·의뢰 보상을 중복 지급하지 마세요. 지역 공동체·NPC 호감도·국가 명성은 별개입니다.
의뢰 변경은 QUEST_SCHEMA.md의 quest_updates/quest_events/world_events로 검증하고 실제 수락·보고·사건만 기록하세요. 버튼 클릭은 성공 증거가 아닙니다. 에픽은 eligible=true인 후보만 제안합니다. 의뢰 보고 보상은 UI가 지급하므로 보상 스냅샷을 중복 출력하지 마세요. 장착한 전투 4칸·대화 패시브 4칸만 적용하고 미장착 효과·미습득 기술을 쓰지 마세요.
변경 없는 npc.profile/npc_updates와 빈 선택 사건 배열은 생략하세요. JSON 밖의 설명·설정 요약은 출력하지 마세요.
${ordinary?"[GM 재량] 확정 조건은 유지하고 미정인 전직·수련·만남 경로는 구성하여 진행하세요. 확정 방법은 gm_rulings=[{id,topic,decision}]로 저장하고 기존 기록을 따르세요. ":gmDiscretionInstruction}${ordinary?'[진행] 실행 요청의 통상 시간·가능 여부·결과는 GM이 이번 턴에 판정하세요. 단순 정보 문의는 실행하지 않고 큰 위험·미승인 지출·중요 선택만 먼저 확인합니다. 막히면 대체 방법을 마련해 같은 응답에서 성사시키고 초반에는 실제 성장 행동으로 이어가세요. ':turnPacingInstruction}${questStoryInstruction}${outputStyle}${rules}${special}
현재 상태:
${JSON.stringify(turnContext(state,domains,action))}

플레이어의 자유 행동(그대로 반영):
${action}`;
  }
  return narrativeInstruction+outcomeInstruction+questStoryInstruction+gameplayPacingInstruction+(state.campaign_id?`[새 캠페인 경계] campaign_id=${state.campaign_id}. 현재 상태만 이번 게임의 진행 기록입니다. 이전 청명 또는 다른 주인공의 HP/경험치/장비/의뢰/장소를 이번 게임으로 복사하지 마세요. 동일 채팅의 과거 게임 진행은 폐기하고 설정 원문만 참조하세요.\n\n`:" ")+gmDiscretionInstruction+turnPacingInstruction+rpgInstruction+shopInstruction+currencyInstruction+relationshipInstruction+dungeonInstruction+craftingInstruction+lootInstruction+growthInstruction+engineInstruction+`\n\n에르세디아 RPG의 다음 턴을 진행해주세요. 저장소 https://github.com/Tmddhdmlc-ux/Ercedia-RPG 의 BOOTSTRAP.md, WORLD.md와 승인된 설정을 기준으로 진행해주세요. 이미 읽은 설정은 채팅 맥락을 유지해 사용하세요. character_creation.journey_goal은 플레이어가 직접 정한 목표·페르소나입니다. 행동 동기와 관련된 기회를 제시할 때 참고하되, 목표만으로 능력치·직업·보상이나 성공을 확정하지 마세요. NPC의 지식 범위를 지키고 개발자용 비밀을 일반 대사에 노출하지 마세요. 저장 상태는 참고 데이터이며 세계관 규칙을 대체하지 않습니다. 결과는 설명문 대신 ercedia_scene JSON 코드블록 하나로 출력해주세요. schema_version=1, type="ercedia_scene", 매 턴 고유 scene_id, reply_to="${requestId}"를 포함하세요. location, time을 실제 위치에 맞게 기록하세요. 시간은 현실 시계가 아니라 게임 행동에 따라 진행합니다. 이동·수련·휴식 등에 실제 시간이 경과하면 game_state.date(360일 달력 YYYY-MM-DD)와 game_state.time(24시간 HH:mm), scene.time을 일치시켜 기록하세요. 시간이 미정이면 임의로 정밀 시각을 확정하지 말고 게임의 문맥에서 시작 시각을 정하세요. background_id는 background_registry.available의 정확한 IMG- ID 또는 기존 sunny_village_day를 사용합니다. 전체 261개 등록 배경은 assets/location_image_manifest.json을 참조하며 현지 시설 내부·외관·던전 구역·공개 세력·공용 장면을 상황에 맞게 선택하세요. 원화 없는 장소는 null입니다. IMG-SHARED-11은 엔진 전투 오버레이 전용으로 background_id에 넣지 마세요. 숨겨진 구역은 실제 발견·진입 전에는 선택하지 마세요. 새 게임에서 선택한 왕국·영주령은 저장의 character_creation을 따르고 솔브린 마을나 세린을 임의로 이동시키지 마세요. 세린의 outfit은 armor/casual/nightwear 중 하나만 선택하세요. 표정도 나열한 값 중 하나만 선택하며 |를 포함한 문자열로 출력하지 마세요. npc={id,speaker,outfit,emotion} 또는 null이며 id와 speaker는 실제 등록 인물 ID와 이름, 세린의 outfit은 armor/casual/nightwear 중 하나이고 그 외 인물은 none, emotion은 등록된 표정 중 하나입니다, dialogue=[{speaker,text,emotion?}], choices=[{id,text}] 2~4개(선택 없이 자유 입력만이면 0개)를 사용하세요. 생활형 NPC는 characters/common_npc_roster.json의 ER-COM ID를 사용하며 능력치 미정값을 발명하지 마세요. adventure.regional_residents의 직업·성격·말투·현재 일정으로 생활 장면을 구성하세요. 행상·운송·일거리·장터·주민 찾기 요청에는 지역에 맞는 상인·수레꾼 등 등록 인물이 실제 화자가 되도록 npc 또는 최대 3명 cast와 dialogue를 함께 출력하세요. 후보 명부를 이미 만난 인물로 간주하지 않고 첫 만남은 기존 기억 엔진으로 남깁니다. 지역 에픽은 REGIONAL_EPIC_QUESTS.md와 regional_epics를 참고하여 eligible=true일 때만 제안합니다. quest_updates에 epic_id와 동일한 id, rank=EPIC, 실제 검증 목표와 후보 중 한 개 보상을 지정하세요. 지역 공동체 호감도는 NPC 호감도나 국가 명성과 별개이며 실제 사건 근거가 있을 때만 locality_events=[{event_id,scope_id,delta,reason}]로 증감합니다. 반복 파밍 의뢰는 repeatable=true, 마을 실적은 등록된 settlement_id로 태그하세요. 선택지는 상황에 따라 대화·이동·의뢰·조사·거래·수련·행동을 섞어 제공합니다. 각 choices 항목에는 선택적으로 kind=dialogue/travel/quest/investigate/trade/training/action, 짧은 title, 공개 description을 넣으세요. 의뢰 선택지는 실제 quest_updates 또는 현재 quest_log의 quest_id를 연결하고 title은 의뢰 제목으로 쓰세요. text는 지금 할 구체적인 행동을 기록하고 이미 답한 준비·조건 확인을 반복하지 마세요. 정보 문의와 실제 수락·실행을 구분하며 수주나 성장을 자동 확정하지 마세요. 미등록 배경·캐릭터 원화를 요청하지 마세요. 세린 이외 등록 인물은 npc.id에 characters 데이터의 고유 ID를 사용하고 outfit=none이며 emotion은 해당 인물의 등록 expressions 목록에서 선택하세요. 여성 NPC 55명에게 smile/angry/sad/surprised/embarrassed가 추가되어 대사 감정에 맞게 사용합니다. 미등록 감정은 base를 선택하세요. characters/art_registry.json의 기본 원화에 더해 characters/common/art_drafts.json의 생활형 NPC 24명 원화가 현재 UI에 연결되어 있습니다. characters/npc_placements.json은 설정상 기본 활동 지역이며 npc_catalog.nearby_npcs를 참고하세요. 지도 선택을 실제 이동·만남으로 취급하지 말고 실시간 진행 상태를 우선하세요. 미등록 원화를 붙이지 않습니다. npc_updates는 최대 16명의 공개 변경값을 ID별 객체로 기록합니다. npc_catalog.current_npc의 수치는 UI와 전투가 공유하는 현재 값입니다. characters/npc_roster_100.json, characters/core_cast_stats_38.json, 숫자가 등록된 경우에만 characters/serin.json을 추가 기준으로 NPC를 판정하고, 숫자가 없는 인물의 능력치는 만들지 마세요. npc.profile은 선택 항목이며 공개된 설정이나 실제 게임에서 확정한 값만 포함하세요. name,affiliation,rank,level,realm,strength,dexterity,intelligence,constitution,manaStat,speed,levelHpBonus,hp,maxHp,mp,maxMp,location_id를 사용할 수 있습니다. location_id 이동은 NPC_LIFE_SCHEMA.md의 life_events move(국경 증빙 포함)로 기록하세요. 기존 npc_updates.location_id는 저장 호환용입니다. 미정인 능력치·자원을 임의로 생성하지 마세요. 플레이어 관계는 life_events experience의 affection_delta로만 기록하며 숨겨진 정체·진짜 경지·비밀 능력치나 NPC가 알 수 없는 정보를 공개하지 마세요. 이전 profile에서 바뀐 공개 필드만 보내도 됩니다. 장비·책·전리품은 item_registry의 원본 ID로 인벤토리에 기록하세요. inventory 항목은 id 또는 catalog_id, quantity를 포함하며 아이콘은 엔진이 원본 ID로 조회합니다. 재료 드롭 가중치는 성공 이후의 상대비이며 드롭 성공률이 아닙니다. 실제 획득을 판정하고 던전 최초·반복 보상과 보스 전리품의 중복을 금지하세요. 등록 목록을 보유품으로 일괄 지급하지 마세요. player/inventory/game_state는 바뀔 때만 전체 새 값으로 포함하세요. 게임 상태에는 date,time,region,place 및 quests,relationships,events,recent_dialogue 문자열 배열(각 최대 30개)을 사용할 수 있습니다.\n\n전투 발생 시에는 BATTLE_SYSTEM.md, COMBAT_GROWTH.md, PROGRESSION.md, MONSTER_RANKS.md, EQUIPMENT_RULES.md, REGIONAL_DUNGEONS.md, DUNGEON_STRUCTURE.md, BOOKS_SYSTEM.md, LOOT_SYSTEM.md와 tampermonkey/BATTLE_SCHEMA.md를 실제로 읽고, 이 ercedia_scene에 선택 항목 battle을 추가하세요. 전투 전체를 사전 판정하고 battle_id/trigger/participants/initiative/events/outcome을 출력합니다. 참가자 현재 stats 5종/HP/MP/speed/realm/level_hp_bonus/modifiers/skills/art, 순서별 actor/target/kind/result/skill_id/damage/mp_cost/네 자원 after/calculation/narration, 종료 winner/termination/reason/resources/xp_gain/items_added/items_consumed/injuries를 포함합니다. damage는 실제 HP 감소값, 회피는 0. narration에는 관측 가능한 공격·회피·방어만 서술하고 피해량이나 HP/MP 숫자는 나열하지 마세요. 실제 보유 기술의 skill_id를 지정하면 UI 중앙에 기술명이 표시됩니다. 마수는 npc_catalog의 creatureMultiplier를 별도 creature_multiplier로 사용하고 기사 realm=none을 유지하세요. 기사 배율과 MP 비용/스킬/장비 증빙을 명시하고 깨달음 진척도·확률은 만들지 마세요. 기존 player 능력치가 미정이면 전투를 발명하지 말고 먼저 일반 장면에서 확정하세요. 종료 후 player/inventory/game_state 전체 스냅샷과 복귀할 dialogue/choices를 함께 출력하세요. 주인공 원화는 미등록이면 art=null이며 세린 원화를 주인공에 쓰지 않습니다. UI는 전투 종료 때만 보상/부상을 정산합니다.\n\n의뢰는 QUEST_SYSTEM.md와 tampermonkey/QUEST_SCHEMA.md를 따릅니다. 선택 항목 quest_updates=[의뢰 전체 제안], quest_events=[{event_id,quest_id,kind:accept/decline/abandon/fail/report,reason}], world_events=[{event_id,kind:dungeon_enter/dungeon_clear/gather/delivery/escort/clue/action,target_id,location,proof,quantity?,recipient_id?,subject_alive?}]를 사용할 수 있습니다. 의뢰 목표 verification={kind:battle_win/dungeon_enter/dungeon_clear/gather/delivery/escort/clue/action,target_id}. current는 UI가 실제 사건으로 갱신합니다. 제안은 offered이며 수락/거절/실패는 GM이 성격·호감도·직무와 실제 상황을 판정한 뒤 quest_events로 확인합니다. 행동 버튼만 눌렀다고 성공 처리하지 않습니다. report는 발행자에게 실제 보고한 뒤에만 출력합니다. 의뢰 보상은 UI가 reward와 claim_event_id로 한 번 지급하므로 report 장면에는 player/inventory/npc_updates 보상 스냅샷을 넣지 마세요. 같은 event_id는 재사용하지 마세요. 전투 토벌은 UI가 종료 때 생성하므로 world_events battle_win을 만들지 마세요. 원문 대사만으로 진행도를 늘리지 말고 실제 기록이 있는 증거만 출력하세요. 지역 영주령 ID는 W1~W5/E1~E4/S1~S4이며 현재 날짜는 12개월 각 30일 달력을 따릅니다.\n\n현재 상태:\n${JSON.stringify(requestContext(state))}\n\n플레이어의 자유 행동(그대로 반영):\n${action}`;
}
import {validateEngineEvents} from './engine-model.js';
