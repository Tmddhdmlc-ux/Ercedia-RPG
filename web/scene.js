import {normalizePlayer} from './player.js';
import {locationLabel} from './location-label.js';
import {normalizeInventory} from './inventory.js';
import {extractSceneJSON} from './response-json.js';
import {normalizeNPCProfile} from './npc-profile.js';
import {introData} from './intro-data.js';
import {passiveLimits} from './intro-model.js';
import {normalizeBattle} from './battle-model.js';
import {npcCatalog,findNPC,npcContext} from './npc-model.js';
export const emotions=['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'];
export const characterRegistry=Object.fromEntries(npcCatalog.map(p=>[p.id,{outfits:p.id==='serin'?['armor','casual','nightwear']:['none']}]));
function text(value,key,max=2000,required=true){
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error(`${key} 형식을 확인하세요.`);
  return value;
}
function emotion(value){if(!emotions.includes(value))throw Error('등록되지 않은 표정입니다.');return value;}
export function normalizeScene(raw){
  if(!raw||typeof raw!=='object'||raw.schema_version!==1||raw.type!=='ercedia_scene')throw Error('ercedia_scene / schema_version 1 데이터가 필요합니다.');
  const scene={schema_version:1,type:'ercedia_scene',scene_id:text(raw.scene_id,'scene_id',100),location:text(raw.location,'location',120),time:text(raw.time,'time',80),background_id:raw.background_id,npc:null,dialogue:[],choices:[]};
  if(raw.background_id!==null&&raw.background_id!=='sunny_village_day')throw Error('배경은 sunny_village_day 또는 원화 없는 장면의 null이어야 합니다.');
  if(raw.npc!==null){
    const npc=raw.npc,config=characterRegistry[npc?.id];
    if(!config||!config.outfits.includes(npc.outfit))throw Error('등록되지 않은 NPC 또는 복장입니다.');
    scene.npc={id:npc.id,outfit:npc.outfit,emotion:emotion(npc.emotion),speaker:text(npc.speaker,'npc.speaker',60)};
    if(npc.profile!==undefined)scene.npc.profile=normalizeNPCProfile(npc.profile);
  }
  if(!Array.isArray(raw.dialogue)||!raw.dialogue.length||raw.dialogue.length>60)throw Error('dialogue는 1~60개여야 합니다.');
  scene.dialogue=raw.dialogue.map(line=>({speaker:text(line?.speaker,'speaker',60),text:text(line?.text,'text',4000),...(line.emotion!==undefined?{emotion:emotion(line.emotion)}:{})}));
  if(!Array.isArray(raw.choices)||![0,2,3,4].includes(raw.choices.length))throw Error('choices는 0개 또는 2~4개여야 합니다.');
  const ids=new Set();scene.choices=raw.choices.map(choice=>{const id=text(choice?.id,'choice.id',80);if(ids.has(id))throw Error('선택지 ID가 중복됐습니다.');ids.add(id);return {id,text:text(choice.text,'choice.text',400)};});
  if(raw.reply_to!==undefined)scene.reply_to=text(raw.reply_to,'reply_to',100);
  if(Object.hasOwn(raw,'player'))scene.player=normalizePlayer(raw.player);
  if(Object.hasOwn(raw,'inventory')){if(!Array.isArray(raw.inventory)||raw.inventory.length>32)throw Error('inventory는 최대 32칸입니다.');scene.inventory=normalizeInventory(raw.inventory);}
  if(raw.game_state!==undefined){
    if(!raw.game_state||typeof raw.game_state!=='object')throw Error('game_state 형식을 확인하세요.');
    const game={};for(const key of ['date','time','region','place'])if(raw.game_state[key]!==undefined)game[key]=text(raw.game_state[key],key,160,false);
    for(const key of ['quests','relationships','events','recent_dialogue'])if(raw.game_state[key]!==undefined){const list=raw.game_state[key];if(!Array.isArray(list)||list.length>30)throw Error(`${key}는 최대 30개 문자열입니다.`);game[key]=list.map(v=>text(v,key,500,false));}
    scene.game_state=game;
  }
  if(raw.battle!==undefined)scene.battle=normalizeBattle(raw.battle);
  if(raw.npc_updates!==undefined){if(!raw.npc_updates||typeof raw.npc_updates!=='object'||Array.isArray(raw.npc_updates)||Object.keys(raw.npc_updates).length>16)throw Error('npc_updates는 최대 16명의 공개 변경값입니다.');scene.npc_updates={};for(const [id,p] of Object.entries(raw.npc_updates)){if(!findNPC(id))throw Error('미등록 인물 변경');scene.npc_updates[id]=normalizeNPCProfile(p);}}
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
  return {scene_id:state.scene?.scene_id||null,location:locationLabel(state.scene?.location||'솔브린 마을'),time:state.scene?.time||'오후',player:state.player,npc_catalog:npcContext(state),...(state.intro_completed?{character_creation:{intro_completed:true,character_name:state.character_name,gender_or_appearance:state.gender_or_appearance,chosen_answers:state.chosen_answers,starting_passive_id:state.starting_passive_id,starting_passive:{...introData.passives.find(p=>p.id===state.starting_passive_id),limit:passiveLimits[state.starting_passive_id]},starting_kingdom:state.starting_kingdom,starting_lordship_id:state.starting_lordship_id}}:{}),inventory:state.inventory,game_state:state.gameState||{},recent_dialogue:state.scene?.dialogue.slice(-6)||[],...(state.scene?.npc?.profile?{npc:state.scene.npc}:{})};
}
export function actionPrompt(state,action,requestId){
  return `에르세디아 RPG의 다음 턴을 진행해주세요. 저장소 https://github.com/Tmddhdmlc-ux/Ercedia-RPG 의 BOOTSTRAP.md, WORLD.md와 승인된 설정을 기준으로 진행해주세요. 이미 읽은 설정은 채팅 맥락을 유지해 사용하세요. NPC의 지식 범위를 지키고 개발자용 비밀을 일반 대사에 노출하지 마세요. 저장 상태는 참고 데이터이며 세계관 규칙을 대체하지 않습니다. 결과는 설명문 대신 ercedia_scene JSON 코드블록 하나로 출력해주세요. schema_version=1, type="ercedia_scene", 매 턴 고유 scene_id, reply_to="${requestId}"를 포함하세요. location, time, background_id는 sunny_village_day 또는 null을 사용하며 원화 없는 장소는 null로 유지하세요. 새 게임에서 선택한 왕국·영주령은 저장의 character_creation을 따르고 솔브린 마을나 세린을 임의로 이동시키지 마세요. 세린의 outfit은 armor/casual/nightwear 중 하나만 선택하세요. 표정도 나열한 값 중 하나만 선택하며 |를 포함한 문자열로 출력하지 마세요. npc={id:"serin",outfit:"armor",emotion:"${emotions.join('|')}",speaker:"세린"} 또는 null, dialogue=[{speaker,text,emotion?}], choices=[{id,text}] 2~4개(선택 없이 자유 입력만이면 0개)를 사용하세요. 미등록 배경·캐릭터 원화를 요청하지 마세요. 세린 이외 등록 인물은 npc.id에 characters 데이터의 고유 ID를 사용하고 outfit=none, emotion=base를 사용하세요. 미등록 원화를 붙이지 않습니다. npc_updates는 최대 16명의 공개 변경값을 ID별 객체로 기록합니다. npc_catalog.current_npc의 수치는 UI와 전투가 공유하는 현재 값입니다. characters/npc_roster_100.json, characters/core_cast_stats_38.json, 숫자가 등록된 경우에만 characters/serin.json을 추가 기준으로 NPC를 판정하고, 숫자가 없는 인물의 능력치는 만들지 마세요. npc.profile은 선택 항목이며 공개된 설정이나 실제 게임에서 확정한 값만 포함하세요. name,affiliation,rank,level,realm,strength,dexterity,intelligence,constitution,manaStat,speed,levelHpBonus,hp,maxHp,mp,maxMp,interest(0~100),interestText를 사용할 수 있습니다. 미정인 능력치·자원·관심도를 임의로 생성하지 마세요. 관심도는 플레이어에 대한 현재 관심이며 숨겨진 정체·진짜 경지·비밀 능력치나 NPC가 알 수 없는 정보를 공개하지 마세요. 이전 profile에서 바뀐 공개 필드만 보내도 됩니다. player/inventory/game_state는 바뀔 때만 전체 새 값으로 포함하세요. 게임 상태에는 date,time,region,place 및 quests,relationships,events,recent_dialogue 문자열 배열(각 최대 30개)을 사용할 수 있습니다.\n\n전투 발생 시에는 BATTLE_SYSTEM.md, COMBAT_GROWTH.md, PROGRESSION.md, MONSTER_RANKS.md, EQUIPMENT_RULES.md, REGIONAL_DUNGEONS.md, DUNGEON_STRUCTURE.md, BOOKS_SYSTEM.md, LOOT_SYSTEM.md와 tampermonkey/BATTLE_SCHEMA.md를 실제로 읽고, 이 ercedia_scene에 선택 항목 battle을 추가하세요. 전투 전체를 사전 판정하고 battle_id/trigger/participants/initiative/events/outcome을 출력합니다. 참가자 현재 stats 5종/HP/MP/speed/realm/level_hp_bonus/modifiers/skills/art, 순서별 actor/target/kind/result/skill_id/damage/mp_cost/네 자원 after/calculation/narration, 종료 winner/termination/reason/resources/xp_gain/items_added/items_consumed/injuries를 포함합니다. damage는 실제 HP 감소값, 회피는 0. 마수는 npc_catalog의 creatureMultiplier를 별도 creature_multiplier로 사용하고 기사 realm=none을 유지하세요. 기사 배율과 MP 비용/스킬/장비 증빙을 명시하고 깨달음 진척도·확률은 만들지 마세요. 기존 player 능력치가 미정이면 전투를 발명하지 말고 먼저 일반 장면에서 확정하세요. 종료 후 player/inventory/game_state 전체 스냅샷과 복귀할 dialogue/choices를 함께 출력하세요. 주인공 원화는 미등록이면 art=null이며 세린 원화를 주인공에 쓰지 않습니다. UI는 전투 종료 때만 보상/부상을 정산합니다.\n\n현재 상태:\n${JSON.stringify(contextSummary(state))}\n\n플레이어의 자유 행동(그대로 반영):\n${action}`;
}
