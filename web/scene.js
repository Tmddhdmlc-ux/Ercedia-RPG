import {buildTurnPrompt} from './gm-turn-policy.js';
import {narrativeFocus} from './narrative-context.js';
import {isRecoveryAction,recoveryFacts} from './recovery-context.js';
import {normalizeRulings} from './gm-rulings.js';
import {turnFacts,questWireFacts} from './turn-facts.js';
import {normalizeStoryEvents,hasActiveQuestStory} from './quest-story.js';
import {dungeonEncounterContext} from './dungeon-encounter-model.js';
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
  if(raw.appended!==undefined){if(!raw.appended||typeof raw.appended!=='object'||Array.isArray(raw.appended)||Object.keys(raw.appended).some(k=>k!=='gm_rulings')||!Object.hasOwn(raw.appended,'gm_rulings'))throw Error('응답 appended는 새 gm_rulings만 포함할 수 있습니다. 다른 변경은 장면의 정식 필드를 사용하세요.');scene.gm_rulings=normalizeRulings([...(raw.gm_rulings===undefined?[]:normalizeRulings(raw.gm_rulings,8)),...normalizeRulings(raw.appended.gm_rulings,8)],8);}
  else if(raw.gm_rulings!==undefined)scene.gm_rulings=normalizeRulings(raw.gm_rulings,8);
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
  // Routing only: an emergency treatment or a remembered attack is not a new combat command.
  let combatText=text.replace(/(?:응급|유료|약초|의료|상처|붕대|진료|치료)\s*처치/g,'치료').replace(/처치비/g,'치료비');
  if(isRecoveryAction(text))combatText=combatText.replace(/(?:특별한|추가|전문)\s*처치(?=\s*(?:가\s*필요|를\s*받|비용))/g,'치료');
  return {
    combat:/전투(?!불능|\s*(?:이후|후|뒤))|공격(?!력|받|당|을\s*받)|싸우|싸움|토벌|처치|사냥(?!꾼)|궁극기|사격|견제|베어|베기|찌른|쏜다|쏘아|쏘겠|발사|타격|방어(?!구)|가드/.test(combatText),
    dungeon:!!state.world_engine?.active_dungeon||/던전|미궁|보스/.test(text),
    trade:kind==='trade'||isRecoveryAction(text)||/상점|상인|행상|장터|거래|구매|구입|판매|견적|가격|재고|살.{0,8}검|경매|입찰|시설/.test(text),
    crafting:/제작|대장간|강화|분해|조합|단조|검.{0,15}(?:만들|만든)/.test(text),
    growth:kind==='training'||/수련|단련|훈련|학습|배우|연습|공부|복습|단조|익히|연구|기술서|돌파|경지|서클|입문|직업|전직/.test(text),
    adventure:['travel','quest','investigate'].includes(kind)||/이동|여행|출발|귀환|조사|탐색|탐험|조우|주민|일거리|운송|수레|의뢰|퀘스트|보고/.test(text),
    quest:kind==='quest'||!!choice?.quest_id||hasActiveQuestStory(state)||/의뢰|퀘스트|보고|수주|일거리|게시|보수|운송|운반|유급|순찰/.test(text),
    relationship:/관계|세력|조직|왕족|국왕|혼인|반란|배신|동료|동행/.test(text)
  };
}
export function turnContext(state,domains,action='',choiceId=null){
  const context=requestContext(state);
  context.turn_facts=turnFacts(state,domains,action,context.npc_catalog.nearby_npcs,state.scene?.choices?.find(c=>c.id===choiceId)?.quest_id||null);
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
export function actionPrompt(state,action,requestId,{compact=false,choiceId=null}={}){
 action=String(action);const domains=turnDomains(state,action,choiceId);
 const focus=narrativeFocus(state,action,state.scene?.choices?.find(c=>c.id===choiceId)?.quest_id||null);
 const context=compact?turnContext(state,domains,action,choiceId):requestContext(state);
 return buildTurnPrompt({state,action,id:requestId,domains,focus,payload:{...context,narrative_focus:focus,...(isRecoveryAction(action)?{recovery_wire:recoveryFacts(state)}:{})}});
}
import {validateEngineEvents} from './engine-model.js';
