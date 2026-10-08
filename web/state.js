import {normalizeScene} from './scene.js';
import {normalizeInventory} from './inventory.js';
import {mapData} from './map-data.js';
import {newPlayer,normalizePlayer} from './player.js';
import {mapViews} from './map-camera.js';
import {factionLocations} from './faction-data.js';
import {normalizeIntroDraft,creationFields} from './intro-model.js';
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
  for (const [key,choices] of Object.entries({outfit:outfitKeys,expression:expressionKeys,region:regionKeys,page:['story','map','status','inventory']})) if (choices.includes(raw[key])) s[key]=raw[key];
  for (const k of outfitKeys) { const l=raw.layouts?.[k]; if (l) s.layouts[k]={scale:num(l.scale,50,400,260),x:num(l.x,0,100,50),y:num(l.y,-350,200,-120)}; }
  for (const k of ['background','character']) if(typeof raw[k] === 'boolean') s[k]=raw[k];
  s.index=num(raw.index,0,3,0);
  s.player=normalizePlayer(raw.player);
  if(raw.introDraft){const draft=normalizeIntroDraft(raw.introDraft);if(draft)s.introDraft=draft;}
  if(raw.intro_completed===true){
    try{Object.assign(s,creationFields({name:raw.character_name,appearance:raw.gender_or_appearance||'',answers:raw.chosen_answers||{},passive:raw.starting_passive_id,kingdom:({벨로아:'west',드라켄:'east',루메린:'south'})[raw.starting_kingdom],lordship:raw.starting_lordship_id}));}catch{}
  }
  if(raw.previousGame&&typeof raw.previousGame==='object'&&raw.previousGame.version===1)s.previousGame=JSON.parse(JSON.stringify(raw.previousGame));
  // Optional until the player chooses a name: legacy launchers compare exact saved keys.
  if(typeof raw.chosenName==='string')s.chosenName=raw.chosenName.trim().slice(0,40);
  if(s.chosenName)s.player.name=s.chosenName;
  // Keep new preferences absent from old saves until the user changes them.
  if(raw.uiPreferences&&typeof raw.uiPreferences==='object'){
    s.uiPreferences={};
    if(['normal','large','largest'].includes(raw.uiPreferences.textSize))s.uiPreferences.textSize=raw.uiPreferences.textSize;
    if(typeof raw.uiPreferences.portraitHintDismissed==='boolean')s.uiPreferences.portraitHintDismissed=raw.uiPreferences.portraitHintDismissed;
  }
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
  const faction=factionLocations.find(p=>p.id===raw.mapFaction);
  if(faction&&faction.region===s.mapView&&faction.anchor_id===s.region)s.mapFaction=faction.id;
  return s;
}
export function load(storage) {
  try { const data=storage.getItem(KEY); return {state:data ? normalize(JSON.parse(data)) : defaults(),message:data ? '저장된 설정을 불러왔습니다.' : '설정은 이 브라우저에 저장됩니다.'}; }
  catch { return {state:defaults(),message:'저장값을 읽지 못해 기본 설정으로 시작합니다.'}; }
}
