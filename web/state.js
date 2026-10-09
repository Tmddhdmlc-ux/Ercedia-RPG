import {normalizeSlots} from './save-slots.js';
import {normalizeAmbiencePreferences} from './ambience.js';
import {normalizeLocalReputation} from './epic-model.js';
import {normalizeLoadout} from './skill-loadout.js';
import {normalizeVoicePreferences} from './voice-audio.js';
import {bindWallet} from './wallet.js';
import {normalizeScene} from './scene.js';
import {normalizeQuestLog} from './quest-model.js';
import {normalizeInventory} from './inventory.js';
import {mapData} from './map-data.js';
import {newPlayer,normalizePlayer} from './player.js';
import {mapViews} from './map-camera.js';
import {factionLocations} from './faction-data.js';
import {normalizeIntroDraft,creationFields} from './intro-model.js';
import {findNPC} from './npc-model.js';
import {normalizeNPCProfile} from './npc-profile.js';
import {normalizeEngine} from './engine-model.js';
import {normalizeWorld} from './world-engine.js';
import {normalizeLife} from './npc-life.js';
export const KEY = 'ercedia.vn.v04';
export const outfitKeys = ['armor', 'casual', 'nightwear'];
export const expressionKeys = ['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'];
export const regionKeys = ['village','world','west','east','south','wild','ruins',...mapViews.map(r=>r.id),...mapData.locations.map(p=>p.id)];
export const defaultLayout = () => ({scale:260,x:50,y:-120});
export const defaults = () => ({version:1,outfit:'armor',expression:'base',layouts:Object.fromEntries(outfitKeys.map(k=>[k,defaultLayout()])),background:true,character:true,index:0,region:'village',mapView:'world',page:'story',player:newPlayer(),inventory:[],scene:null,sceneIndex:0,seenScenes:[],gameState:{}});
const num = (value,min,max,fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max,Math.max(min,Math.round(value))) : fallback;
export function normalize(raw) {
  const s=defaults();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return s;
  if(Object.hasOwn(raw,'save_slots'))s.save_slots=normalizeSlots(raw.save_slots);
  if(raw.local_reputation)s.local_reputation=normalizeLocalReputation(raw.local_reputation);
  if(raw.npc_life)s.npc_life=normalizeLife(raw.npc_life);
  for (const [key,choices] of Object.entries({outfit:outfitKeys,expression:expressionKeys,region:regionKeys,page:['story','map','status','inventory','quests']})) if (choices.includes(raw[key])) s[key]=raw[key];
  for (const k of outfitKeys) { const l=raw.layouts?.[k]; if (l) s.layouts[k]={scale:num(l.scale,50,400,260),x:num(l.x,0,100,50),y:num(l.y,-350,200,-120)}; }
  for (const k of ['background','character']) if(typeof raw[k] === 'boolean') s[k]=raw[k];
  s.index=num(raw.index,0,3,0);
  s.player=normalizePlayer(raw.player);
  if(raw.world_engine)s.world_engine=normalizeWorld(raw.world_engine,raw);
  if(typeof raw.campaign_id==='string'&&raw.campaign_id.length<=100)s.campaign_id=raw.campaign_id;
  if(raw.engine){const engine=normalizeEngine(raw.engine);if(engine)s.engine=engine;}
  if(raw.npcStates&&typeof raw.npcStates==='object'&&!Array.isArray(raw.npcStates)){s.npcStates={};for(const [id,p] of Object.entries(raw.npcStates).slice(0,256)){if(findNPC(id)){try{s.npcStates[id]=normalizeNPCProfile(p);}catch{}}}}
  if(raw.introDraft){const draft=normalizeIntroDraft(raw.introDraft);if(draft)s.introDraft=draft;}
  if(raw.intro_completed===true){
    try{Object.assign(s,creationFields({name:raw.character_name,goal:raw.journey_goal,appearance:raw.gender_or_appearance||'',answers:raw.chosen_answers||{},passive:raw.starting_passive_id,kingdom:({벨로아:'west',드라켄:'east',루메린:'south'})[raw.starting_kingdom],lordship:raw.starting_lordship_id}));}catch{}
  }
  if(raw.previousGame&&typeof raw.previousGame==='object'&&raw.previousGame.version===1)s.previousGame=JSON.parse(JSON.stringify(raw.previousGame));
  // Optional until the player chooses a name: legacy launchers compare exact saved keys.
  if(typeof raw.chosenName==='string')s.chosenName=raw.chosenName.trim().slice(0,40);
  if(s.chosenName)s.player.name=s.chosenName;
  // Keep new preferences absent from old saves until the user changes them.
  if(raw.uiPreferences&&typeof raw.uiPreferences==='object'){
    s.uiPreferences={};
    if(raw.uiPreferences.ambience)s.uiPreferences.ambience=normalizeAmbiencePreferences(raw.uiPreferences.ambience);
    if(raw.uiPreferences.voice)s.uiPreferences.voice=normalizeVoicePreferences(raw.uiPreferences.voice);
    if(raw.uiPreferences.music){const m=raw.uiPreferences.music;s.uiPreferences.music={enabled:m.enabled!==false,mode:['auto','village','night','battle','border','royal','farEast','unexplored','boss'].includes(m.mode)?m.mode:'auto',volume:Number.isFinite(m.volume)?Math.max(0,Math.min(.7,m.volume)):.22};}
    if(['normal','large','largest'].includes(raw.uiPreferences.textSize))s.uiPreferences.textSize=raw.uiPreferences.textSize;
    if(typeof raw.uiPreferences.portraitHintDismissed==='boolean')s.uiPreferences.portraitHintDismissed=raw.uiPreferences.portraitHintDismissed;
  }
  if(Object.hasOwn(raw,'quest_log'))s.quest_log=normalizeQuestLog(raw.quest_log);
  if(Array.isArray(raw.quest_event_ids))s.quest_event_ids=[...new Set(raw.quest_event_ids.filter(v=>typeof v==='string'&&v.length<=200))].slice(0,10000);
  if(Object.hasOwn(raw,'wallet_copper')||Object.hasOwn(raw,'currency'))bindWallet(Object.assign(s,{...(Object.hasOwn(raw,'wallet_copper')?{wallet_copper:raw.wallet_copper}:{currency:raw.currency})}));
  if(raw.initial_currency_granted===true)s.initial_currency_granted=true;
  if(raw.inventory_limits&&Number.isSafeInteger(raw.inventory_limits.slots)&&raw.inventory_limits.slots>0&&raw.inventory_limits.slots<=32)s.inventory_limits={slots:raw.inventory_limits.slots,...(Number.isFinite(raw.inventory_limits.max_weight)&&raw.inventory_limits.max_weight>=0?{max_weight:raw.inventory_limits.max_weight}:{})};
  if(raw.relationships&&typeof raw.relationships==='object'&&!Array.isArray(raw.relationships)){s.relationships={};for(const [id,r] of Object.entries(raw.relationships).slice(0,256)){if(!r||!Number.isFinite(r.affection))continue;s.relationships[id]={affection:Math.max(-100,Math.min(100,r.affection)),flags:Array.isArray(r.flags)?r.flags.filter(v=>typeof v==='string').slice(-100):[],interaction_history:Array.isArray(r.interaction_history)?r.interaction_history.filter(v=>typeof v==='string').slice(-100):[],last_interaction_day:typeof r.last_interaction_day==='string'?r.last_interaction_day:null};}}
  s.inventory=normalizeInventory(raw.inventory);
  try {s.scene=raw.scene?normalizeScene(raw.scene):null;}catch {s.scene=null;}
  s.sceneIndex=num(raw.sceneIndex,0,(s.scene?.dialogue.length||1)-1,0);
  s.seenScenes=Array.isArray(raw.seenScenes)?raw.seenScenes.filter(v=>typeof v==='string'&&v.length<=100).slice(-100):[];
  if(raw.gameState&&typeof raw.gameState==='object'){
    for(const k of ['date','time','region','place'])if(typeof raw.gameState[k]==='string')s.gameState[k]=raw.gameState[k].slice(0,160);
    for(const k of ['quests','relationships','events','recent_dialogue'])if(Array.isArray(raw.gameState[k]))s.gameState[k]=raw.gameState[k].filter(v=>typeof v==='string').slice(-30).map(v=>v.slice(0,500));
  }
  if(['world',...mapViews.map(r=>r.id)].includes(raw.mapView))s.mapView=raw.mapView;
  if(Object.hasOwn(raw,'mapFaction'))s.mapFaction=null;
  if(raw.lootPopup&&typeof raw.lootPopup.battle_id==='string'&&raw.lootPopup.battle_id.length<=100&&Number.isSafeInteger(raw.lootPopup.copper)&&raw.lootPopup.copper>=0&&Array.isArray(raw.lootPopup.items)&&raw.lootPopup.items.length<=32&&raw.lootPopup.items.every(i=>typeof i.name==='string'&&i.name.length<=60&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=999999))s.lootPopup={battle_id:raw.lootPopup.battle_id,copper:raw.lootPopup.copper,items:raw.lootPopup.items.map(i=>({id:typeof i.id==='string'?i.id.slice(0,100):null,name:i.name,quantity:i.quantity,...(typeof i.rarity==='string'?{rarity:i.rarity}: {})})),pending:raw.lootPopup.pending===true};
  if(Array.isArray(raw.battleApplied))s.battleApplied=raw.battleApplied.filter(id=>typeof id==='string'&&id.length<=100).slice(-100);
  if(raw.battlePlayback){try{const b=raw.battlePlayback,scene=normalizeScene(b.scene);if(!scene.battle)throw Error('battle absent');s.battlePlayback={scene,index:num(b.index,0,scene.battle.events.length,0),speed:[.5,1,2].includes(b.speed)?b.speed:1,paused:b.paused===true,done:b.done===true,replay:b.replay===true,...(typeof b.manual==='boolean'?{manual:b.manual}:{})};}catch{}}
  const faction=factionLocations.find(p=>p.id===raw.mapFaction);
  if(faction&&faction.region===s.mapView&&faction.anchor_id===s.region)s.mapFaction=faction.id;
  if(raw.skill_loadout)s.skill_loadout=normalizeLoadout(raw.skill_loadout,s);
  return s;
}
export function load(storage) {
  try { const data=storage.getItem(KEY); return {state:data ? normalize(JSON.parse(data)) : defaults(),message:data ? '저장된 설정을 불러왔습니다.' : '설정은 이 브라우저에 저장됩니다.'}; }
  catch { return {state:defaults(),message:'저장값을 읽지 못해 기본 설정으로 시작합니다.'}; }
}
