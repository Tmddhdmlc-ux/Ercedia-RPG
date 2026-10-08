import {normalizePlayer} from './player.js';
import {normalizeInventory} from './inventory.js';
import {extractSceneJSON} from './response-json.js';
import {normalizeNPCProfile} from './npc-profile.js';
export const emotions=['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'];
export const characterRegistry={serin:{outfits:['armor','casual','nightwear']}};
function text(value,key,max=2000,required=true){
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error(`${key} 형식을 확인하세요.`);
  return value;
}
function emotion(value){if(!emotions.includes(value))throw Error('등록되지 않은 표정입니다.');return value;}
export function normalizeScene(raw){
  if(!raw||typeof raw!=='object'||raw.schema_version!==1||raw.type!=='ercedia_scene')throw Error('ercedia_scene / schema_version 1 데이터가 필요합니다.');
  const scene={schema_version:1,type:'ercedia_scene',scene_id:text(raw.scene_id,'scene_id',100),location:text(raw.location,'location',120),time:text(raw.time,'time',80),background_id:raw.background_id,npc:null,dialogue:[],choices:[]};
  if(raw.background_id!=='sunny_village_day')throw Error('등록된 배경은 sunny_village_day입니다.');
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
  return {scene_id:state.scene?.scene_id||null,location:state.scene?.location||'써니 빌리지',time:state.scene?.time||'오후',player:state.player,inventory:state.inventory,game_state:state.gameState||{},recent_dialogue:state.scene?.dialogue.slice(-6)||[],...(state.scene?.npc?.profile?{npc:state.scene.npc}:{})};
}
export function actionPrompt(state,action,requestId){
  return `에르세디아 RPG의 다음 턴을 진행해주세요. 저장소 https://github.com/Tmddhdmlc-ux/Ercedia-RPG 의 BOOTSTRAP.md, WORLD.md와 승인된 설정을 기준으로 진행해주세요. 이미 읽은 설정은 채팅 맥락을 유지해 사용하세요. NPC의 지식 범위를 지키고 개발자용 비밀을 일반 대사에 노출하지 마세요. 저장 상태는 참고 데이터이며 세계관 규칙을 대체하지 않습니다. 결과는 설명문 대신 ercedia_scene JSON 코드블록 하나로 출력해주세요. schema_version=1, type="ercedia_scene", 매 턴 고유 scene_id, reply_to="${requestId}"를 포함하세요. location, time, background_id="sunny_village_day", npc의 outfit은 armor/casual/nightwear 중 하나만 선택하세요. 표정도 나열한 값 중 하나만 선택하며 |를 포함한 문자열로 출력하지 마세요. npc={id:"serin",outfit:"armor",emotion:"${emotions.join('|')}",speaker:"세린"} 또는 null, dialogue=[{speaker,text,emotion?}], choices=[{id,text}] 2~4개(선택 없이 자유 입력만이면 0개)를 사용하세요. 미등록 배경·캐릭터 원화를 요청하지 마세요. npc.profile은 선택 항목이며 공개된 설정이나 실제 게임에서 확정한 값만 포함하세요. name,affiliation,rank,strength,dexterity,intelligence,constitution,hp,maxHp,mp,maxMp,interest(0~100),interestText를 사용할 수 있습니다. 미정인 능력치·자원·관심도를 임의로 생성하지 마세요. 관심도는 플레이어에 대한 현재 관심이며 숨겨진 정체·진짜 경지·비밀 능력치나 NPC가 알 수 없는 정보를 공개하지 마세요. 이전 profile에서 바뀐 공개 필드만 보내도 됩니다. player/inventory/game_state는 바뀔 때만 전체 새 값으로 포함하세요. 게임 상태에는 date,time,region,place 및 quests,relationships,events,recent_dialogue 문자열 배열(각 최대 30개)을 사용할 수 있습니다.\n\n현재 상태:\n${JSON.stringify(contextSummary(state))}\n\n플레이어의 자유 행동(그대로 반영):\n${action}`;
}
