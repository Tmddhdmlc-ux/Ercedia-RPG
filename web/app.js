import {createGameBridge} from '../integration/game-bridge.js';
import {mountChatUI} from './chat-ui.js';
import {mountInventory,normalizeInventory} from './inventory.js';
import {KEY,defaultLayout,load} from './state.js';
import {faceFit} from './face-fit.js';
import {mapData} from './map-data.js';
import {mapSelectionInfo} from './map-info.js';
import {mountFactionMap,factionInfo} from './faction-map.js';
import {mountPlayer} from './player-ui.js';
import {mountNPCInfo} from './npc-info.js';
import {mountPlayHUD} from './play-hud.js';
import {mountNewGame} from './new-game.js';
import {mountBattleUI} from './battle-ui.js';
import {mountCatalogUI} from './catalog-ui.js';
import {initializeNameOnlyPlayer} from './legacy-player.js';
import {locationLabel as canonicalLocationLabel} from './location-label.js';
import {mountTitleMenu} from './title-menu.js';
import {mapViews,regionFrame,cameraTransform,viewForSelection} from './map-camera.js';
const $=id=>document.getElementById(id);
const CDN=window.__ERCEDIA_CONFIG__?.assetBase||'https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@2b8de39504ff4f3fdabcefa6f2b5a848babcd683/';
const MAP_CDN=window.__ERCEDIA_CONFIG__?.assetBase||'https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@2117dcd5f2f61dbe4c9de3452a255d2c22403d1b/';
const standing='assets/characters/main/serin/standing/';
// Only approved, registered assets belong here. Drafts and absent expressions are excluded.
const outfits={armor:{label:'갑옷',expressions:{base:standing+'base.png'}},casual:{label:'평상복',expressions:{base:standing+'outfits/casual/base.png'}},nightwear:{label:'잠옷',expressions:{base:standing+'outfits/nightwear/base.png'}}};
const labels={base:'기본',smile:'미소',angry:'분노',surprised:'놀람',sad:'슬픔',embarrassed:'부끄러움',afraid:'두려움',annoyed:'불쾌함',love:'애정'};
const dialogues=[['나레이션','장면 시작','마을 광장에서 순찰을 마친 세린과 마주쳤다.'],['세린','미소','아, 여행자님! 오늘도 좋은 날씨네요.'],['세린','호기심','저는 이 근처를 순찰하고 있었어요. 어디로 가시는 길인가요?'],['세린','주의','아참, 세 나라가 전쟁 중이라 먼 여행은 위험할 수도 있답니다.']];
const regions={world:['에르세디아 세계지도','등록된 메인 지도 · 지역명과 지점 표식을 눌러 살펴보세요.'],village:['솔브린 마을','벨로아 왕국 W3 엘름베르크 백작령 소속 마을입니다. 세부 지도 좌표는 아직 미정입니다.'],wild:['북부 미개척지','북부 위험 지역의 표식을 선택해 살펴보세요.'],ruins:['고대 유적 후보','던전·마나 이상 지역의 위치는 검토용 시안입니다.']};
for(const r of mapData.regions){const info=mapSelectionInfo(r.id);regions[r.id]=[info.title,info.description];}
regions.archipelago=['주변 군도','군도 탐험 지점의 검토용 시안입니다.'];
const regionNames={west:'벨로아',east:'드라켄',south:'루메린'};
const locationLabel=p=>p.label.replace(/^(west|east|south)\b/,(_,id)=>regionNames[id]);
for(const p of mapData.locations){const info=mapSelectionInfo(p.id);regions[p.id]=[info.title,info.description];}
// Build the click overlay once. Its coordinate system and aspect ratio match the map image.
const svgNS='http://www.w3.org/2000/svg';
for(const p of [...mapData.regions,...mapData.locations]){
  const node=document.createElementNS(svgNS,'circle');
  node.setAttribute('cx',String(p.x*1536));node.setAttribute('cy',String(p.y*1024));
  node.setAttribute('r',p.kind?'24':'40');node.setAttribute('class','map-hit');node.dataset.region=p.id;
  const title=document.createElementNS(svgNS,'title');title.textContent=regions[p.id][0];node.append(title);$('map-points').append(node);
  if(p.kind){
    const label=document.createElementNS(svgNS,'text');label.setAttribute('x',String(p.x*1536));label.setAttribute('y',String(p.y*1024-32));label.setAttribute('class','map-detail-label');label.dataset.location=p.id;label.textContent=p.kind==='lordship'?p.label.replace(/ (변경백|공작|후작|백작)령$/,''):p.kind==='capital'?p.label.replace(' (도시명 미정)',''):p.label;$('map-points').append(label);
  }
}
const kindLabels={capital:'왕도',lordship:'영주령',port:'항구',fortress:'요새',mana_mine:'마나 광산',dungeon:'던전',beast_habitat:'마수 서식지',anomaly:'마나 이상·유적',island:'군도 탐험'};
for(const view of mapViews){const button=document.createElement('button');button.dataset.mapView=view.id;button.textContent=view.label.replace(' (임시)','');$('map-regions').append(button);}
for(const p of mapData.locations){const button=document.createElement('button');button.dataset.region=p.id;button.dataset.parentRegion=p.region;const title=document.createElement('b'),kind=document.createElement('span');title.textContent=locationLabel(p);kind.textContent=p.lord?`영주 · ${p.lord}`:kindLabels[p.kind]||p.kind;button.append(title,kind);$('map-detail-list').append(button);}
const embedded=!!window.__ERCEDIA_CONFIG__;
let storage;
let restored;
try {storage=window.__ERCEDIA_STORAGE__||window.localStorage;restored=load(storage);} catch {restored=load({getItem(){throw Error('unavailable');}});}
const state=restored.state;
let introUI=null,battleUI=null,catalogUI=null,titleUI=null;
const npcInfo=mountNPCInfo(state);
const playHUD=mountPlayHUD(state,{persist:saveGame});
const factionUI=mountFactionMap(state,{select(p){state.mapFaction=p.id;state.region=p.anchor_id;state.mapView=p.region;renderRegion();dirty();}});
$('save-status').textContent=restored.message;
const images=new Map();
const faces=new Map();
const faceLayer=document.createElement('div');
faceLayer.className='face-layer';faceLayer.hidden=true;
function trackImage(img,path,label,cdn=CDN) {
  const row=document.createElement('li');
  const status=document.createElement('span');
  const link=document.createElement('a');
  link.href=cdn+path;link.target='_blank';link.rel='noopener';link.textContent='원본';
  row.append(status,document.createTextNode(' · '),link);$('asset-status').append(row);
  img.dataset.status='loading';status.textContent=label+' · 로딩 중';
  img.addEventListener('load',()=>{img.dataset.status='ready';img.classList.add('ready');status.textContent=label+' · 정상 로드';if(img.id==='world-map-image')mapImageStatus(true);renderAppearance();});
  img.addEventListener('error',()=>{img.dataset.status='error';img.classList.remove('ready');status.textContent=label+' · 로드 실패';row.classList.add('error');document.querySelector('.asset-details').open=true;if(img.id==='world-map-image')mapImageStatus(false);renderAppearance();});
  img.src=cdn+path;
}
function mapImageStatus(loaded){
  $('map-points').style.visibility=loaded?'visible':'hidden';
  $('map-status').textContent=loaded?'지역을 눌러 확대하고 영주령 정보를 확인하세요. 국경·행정 경계와 대표 위치는 미확정입니다.':'세계지도 이미지 로드 실패 · 아래 이미지 로딩 상태의 원본 링크를 확인하세요.';
  $('map-status').classList.toggle('asset-alert',!loaded);
}
$('map-points').style.visibility='hidden';
trackImage($('world-map-image'),'assets/maps/world/world_main.png','메인 세계지도',MAP_CDN);
for (const [outfit,data] of Object.entries(outfits)) {
  for (const [emotion,path] of Object.entries(data.expressions)) {
    const img=new Image();img.alt=`세린 ${data.label} · ${labels[emotion]}`;img.className='person';img.draggable=false;img.hidden=true;
    images.set(outfit+':'+emotion,img);$('characters').append(img);trackImage(img,path,img.alt);
  }
}
$('characters').append(faceLayer);
for(const expression of Object.keys(labels)){
  const img=new Image();img.alt=`세린 공통 얼굴 · ${labels[expression]}`;img.className='face-image';img.draggable=false;img.hidden=true;
  faces.set(expression,img);faceLayer.append(img);
  trackImage(img,`assets/characters/main/serin/faces/${expression}.png`,img.alt);
}
trackImage($('background'),'assets/locations/towns/sunny_village/town_day.png','솔브린 마을');
function dirty(){ $('save-status').textContent='변경사항이 있습니다. 설정 저장을 눌러 보관하세요.';if(embedded||state.scene)saveGame(); }
function renderAppearance(){
  const key=state.outfit+':base';
  for (const [id,img] of images) img.hidden=id!==key || !state.character;
  $('background').hidden=!state.background;
  const current=images.get(key);
  const face=faces.get(state.expression);
  faceLayer.hidden=!state.character || current.dataset.status!=='ready';
  for(const [id,img] of faces)img.hidden=id!==state.expression;
  const error=current.dataset.status==='error';
  $('expression-status').textContent=error ? '캐릭터 이미지 로드 실패. 아래 원본 링크를 확인하세요.' : `${outfits[state.outfit].label} · ${labels[state.expression]} 표정. 복장을 바꿔도 표정이 유지됩니다.`;
  if(current.dataset.status==='loading' || face.dataset.status==='loading') $('expression-status').textContent+=' 이미지 로딩 중…';
  if(face.dataset.status==='error') $('expression-status').textContent=`${labels[state.expression]} 얼굴 로드 실패. 복장 원본의 기본 얼굴을 유지합니다.`;
  if($('background').dataset.status==='error') $('expression-status').textContent+=' 배경 로드 실패.';
  $('expression-status').classList.toggle('asset-alert',error || face.dataset.status==='error' || $('background').dataset.status==='error');
  document.querySelectorAll('[data-outfit]').forEach(btn=>{const selected=btn.dataset.outfit===state.outfit;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});
  $('expression').value=state.expression;
  $('show-background').checked=state.background;$('show-character').checked=state.character;
  renderLayout();
  npcInfo.refresh();
}
function renderLayout(){
  const l=state.layouts[state.outfit];
  for(const k of ['scale','x','y']) {$(k).value=l[k];$(k+'-value').textContent=l[k]+(k==='y'?'px':'%');}
  for(const [key,img] of images) if(key.startsWith(state.outfit+':')) {img.style.left=l.x+'%';img.style.top=l.y+'px';img.style.transform=`translateX(-50%) scale(${l.scale/100})`;}
  faceLayer.style.left=l.x+'%';faceLayer.style.top=l.y+'px';faceLayer.style.transform=`translateX(-50%) scale(${l.scale/100})`;
  const fit=faceFit[state.outfit];
  faceLayer.style.setProperty('--face-left',`${fit.x/1024*100}%`);
  faceLayer.style.setProperty('--face-top',`${fit.y/1536*100}%`);
  faceLayer.style.setProperty('--face-size',`${fit.size/1024*100}%`);
}
function renderDialogue(){
  const list=state.scene?.dialogue||dialogues.map(([speaker,emotion,text])=>({speaker,emotion,text}));
  const index=state.scene?state.sceneIndex:state.index,d=list[index];
  $('speaker').textContent=d.speaker;$('emotion').textContent=labels[d.emotion]||d.emotion||'';$('line').textContent=d.text;
  $('count').textContent=`${String(index+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;
  $('previous').disabled=index===0;$('next').disabled=index===list.length-1;$('stage').setAttribute('aria-label',index===list.length-1?'마지막 대사':'장면을 눌러 다음 대사 보기');
  if(state.scene){
    const scene=state.scene;
    $('scene-location').textContent=canonicalLocationLabel(scene.location);$('scene-time').textContent=scene.time;
    state.character=scene.npc?.id==='serin';
    state.background=scene.background_id!==null;
    if(scene.npc?.id==='serin'){state.outfit=scene.npc.outfit;state.expression=scene.npc.emotion;
      for(let i=0;i<=index;i++)if(list[i].emotion)state.expression=list[i].emotion;
    }
    renderAppearance();
  }
}
function advance(delta){if(battleUI?.active())return;const key=state.scene?'sceneIndex':'index',last=(state.scene?.dialogue.length||dialogues.length)-1;const next=Math.max(0,Math.min(last,state[key]+delta));if(next===state[key])return;state[key]=next;renderDialogue();chatUI.controls();dirty();}
function switchTo(page){inventoryUI.hide();factionUI.hide();npcInfo.hide();if(page==='inventory')inventoryUI.render();state.page=page;document.querySelector('.game').dataset.page=page;for(const [id,panel] of [['story','story'],['map','map-panel'],['status','status-panel'],['inventory','inventory-panel']]){const active=id===page;$(panel).hidden=!active;$(id+'-tab').classList.toggle('active',active);$(id+'-tab').setAttribute('aria-pressed',String(active));}if(page==='map')updateMapCamera();}
function updateMapCamera(){
  factionUI.hide();
  const width=$('map-container').clientWidth,height=$('map-container').clientHeight;if(!width||!height)return;
  const camera=cameraTransform(regionFrame(state.mapView),width,height);
  $('map-sheet').style.transform=`translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
  $('map-sheet').style.setProperty('--map-label-font',`${16/camera.scale}px`);
  $('map-sheet').style.setProperty('--map-label-stroke',`${2/camera.scale}px`);
  $('map-sheet').style.setProperty('--map-pin-font',`${20/camera.scale}px`);
  $('map-sheet').style.setProperty('--map-pin-radius',`${16/camera.scale}px`);
}
let mapListView='';
function filterMapLists(){
  const term=$('map-search').value.trim().toLocaleLowerCase();
  document.querySelectorAll('#map-sidebar .map-detail-list button').forEach(button=>button.classList.toggle('search-filtered',!button.textContent.toLocaleLowerCase().includes(term)));
  const factions=$('map-sidebar').dataset.list==='factions',panel=$(factions?'faction-panel':'map-detail-panel');
  const count=[...panel.querySelectorAll('button')].filter(button=>!button.hidden&&!button.classList.contains('search-filtered')).length;
  $('map-list-empty').hidden=!panel.hidden&&count>0;
  $('map-list-empty').textContent=state.mapView==='world'?'위쪽 지역 버튼이나 지도에서 지역을 선택하세요.':term?'검색한 이름과 일치하는 항목이 없습니다.':'선택한 지역에 등록된 항목이 없습니다.';
}
function setMapList(kind){
  $('map-sidebar').dataset.list=kind;
  $('map-locations-tab').setAttribute('aria-pressed',String(kind==='locations'));
  $('map-factions-tab').setAttribute('aria-pressed',String(kind==='factions'));
  filterMapLists();
}
$('map-search').addEventListener('input',filterMapLists);
$('map-locations-tab').onclick=()=>setMapList('locations');
$('map-factions-tab').onclick=()=>setMapList('factions');
function renderMapView(){
  const overview=state.mapView==='world',view=mapViews.find(r=>r.id===state.mapView);
  $('map-breadcrumb').textContent=overview?'세계지도':`세계지도 › ${view.label}`;$('map-overview').disabled=overview;
  $('map-detail-panel').hidden=overview;
  const points=mapData.locations.filter(p=>p.region===state.mapView);
  $('map-detail-title').textContent=view?`${view.label} · 세부 지점`:'세부 지점';$('map-detail-count').textContent=`${points.length}곳`;
  document.querySelectorAll('[data-map-view]').forEach(el=>{el.classList.toggle('active',el.dataset.mapView===state.mapView);el.setAttribute('aria-pressed',String(el.dataset.mapView===state.mapView));});
  document.querySelectorAll('[data-parent-region]').forEach(el=>{el.hidden=el.dataset.parentRegion!==state.mapView;});
  document.querySelectorAll('.map-hit').forEach(el=>{const id=el.dataset.region;const visible=overview || mapData.locations.some(p=>p.id===id&&p.region===state.mapView);el.style.display=visible?'':'none';});
  document.querySelectorAll('.map-detail-label').forEach(el=>{el.style.display=!overview&&points.some(p=>p.id===el.dataset.location)?'':'none';});
  factionUI.render();
  if(mapListView!==state.mapView){mapListView=state.mapView;$('map-search').value='';}
  setMapList(state.mapFaction?'factions':'locations');
  updateMapCamera();
}
function renderRegion(){
  const r=regions[state.region],info=factionInfo(state.mapFaction)||mapSelectionInfo(state.region);
  $('region-title').textContent=info?.title||r[0];$('region-description').textContent=info?.description||r[1];
  const fields=$('region-fields');fields.replaceChildren();
  for(const [name,value] of info?.fields||[]){const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=name;detail.textContent=value;fields.append(term,detail);}
  fields.hidden=!info?.fields.length;
  $('region-note').textContent=info?.note||'';$('region-note').hidden=!info?.note;
  document.querySelectorAll('[data-region]').forEach(el=>{el.classList.toggle('selected',el.dataset.region===state.region);el.setAttribute('aria-pressed',String(el.dataset.region===state.region));});renderMapView();introUI?.syncMap();catalogUI?.region();
}
document.querySelectorAll('[data-region]').forEach(el=>{el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',regions[el.dataset.region][0]);const select=()=>{state.mapFaction=null;state.region=el.dataset.region;state.mapView=viewForSelection(state.region);renderRegion();dirty();};el.addEventListener('click',select);if(el.tagName.toLowerCase()!=='button')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});});
document.querySelectorAll('[data-map-view]').forEach(el=>el.onclick=()=>{state.mapFaction=null;state.mapView=el.dataset.mapView;state.region=state.mapView;renderRegion();dirty();});
$('map-overview').onclick=()=>{state.mapFaction=null;state.mapView='world';state.region='world';renderRegion();dirty();};
const mapResizeObserver=new ResizeObserver(updateMapCamera);mapResizeObserver.observe($('map-container'));
$('story-tab').onclick=()=>{switchTo('story');dirty();};$('map-tab').onclick=()=>{switchTo('map');dirty();};$('return').onclick=()=>{switchTo('story');$('story-tab').focus();dirty();};
$('inventory-tab').onclick=()=>{switchTo('inventory');dirty();};
$('status-tab').onclick=()=>{if(initializeNameOnlyPlayer(state)){playerUI.render();playHUD.render();saveGame();}switchTo('status');dirty();};
$('previous').onclick=()=>advance(-1);$('next').onclick=()=>advance(1);$('stage').onclick=()=>advance(1);
$('stage').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();advance(1);}};
document.querySelectorAll('[data-outfit]').forEach(btn=>btn.onclick=()=>{state.outfit=btn.dataset.outfit;renderAppearance();dirty();});
$('expression').onchange=e=>{state.expression=e.target.value;renderAppearance();dirty();};
let frame=0;
for(const k of ['scale','x','y']) $(k).oninput=e=>{state.layouts[state.outfit][k]=Number(e.target.value);$(k+'-value').textContent=e.target.value+(k==='y'?'px':'%');if(!frame) frame=requestAnimationFrame(()=>{frame=0;renderLayout();});dirty();};
for(const [id,key] of [['show-background','background'],['show-character','character']]) $(id).onchange=e=>{state[key]=e.target.checked;renderAppearance();dirty();};
$('reset').onclick=()=>{state.layouts[state.outfit]=defaultLayout();renderLayout();dirty();};
function saveGame(){try{storage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='저장 완료 · 주인공 정보·스킬·화면 설정을 보관했습니다.';}catch{$('save-status').textContent='저장 실패 · 브라우저 저장 공간을 사용할 수 없습니다. 현재 화면은 유지됩니다.';}}
$('save').onclick=saveGame;
const playerUI=mountPlayer(state);
const inventoryUI=mountInventory(state);
// A future game engine sends the complete current bag; UI previews never change it.
window.addEventListener('ercedia:inventory-update',event=>{
  state.inventory=normalizeInventory(event.detail);inventoryUI.render();
  saveGame();
});
function renderAll(){renderAppearance();renderDialogue();renderRegion();playerUI.render();inventoryUI.render();switchTo(state.page);playHUD.render();introUI?.render();battleUI?.render();catalogUI?.refresh();titleUI?.refresh();}
const chatUI=mountChatUI(state,{render:renderAll,persist:saveGame,storage,embedded,getBattle:()=>battleUI,getIntro:()=>introUI});
introUI=mountNewGame(state,{render:renderAll,persist:saveGame,chat:chatUI,embedded});
battleUI=mountBattleUI(state,{render:renderAll,persist:saveGame,chat:chatUI,assetBase:CDN});
catalogUI=mountCatalogUI(state,{request:action=>{switchTo('story');chatUI.submit(action);catalogUI.refresh();},isPending:()=>chatUI.isPending()});
window.gameBridge=createGameBridge(state,{apply:chatUI.apply,restore:chatUI.restore,render:renderAll,persist:saveGame});
titleUI=mountTitleMenu(state,{newGame:introUI,render:renderAll,isPending:()=>chatUI.isPending()});
renderAll();

const game=document.querySelector('.game');
let expandedInPage=false;
function syncFullscreen(){
  const active=document.fullscreenElement===game || expandedInPage;
  game.classList.toggle('is-expanded',active);
  document.body.classList.toggle('game-expanded',active);
  $('fullscreen').textContent=active?'⛶ 전체화면 해제':'⛶ 전체화면';
  $('fullscreen').setAttribute('aria-pressed',String(active));
  $('fullscreen').title=active?'원래 화면으로 돌아가기 · Esc':'전체화면으로 보기 · Esc로 돌아가기';
}
$('fullscreen').onclick=async()=>{
  if(document.fullscreenElement===game){
    try{await document.exitFullscreen();}catch{ /* Keep the button in sync if exiting is denied. */ }
  }else if(expandedInPage){
    expandedInPage=false;
  }else{
    try{
      if(!game.requestFullscreen || !document.fullscreenEnabled) throw Error('unsupported');
      await game.requestFullscreen();
    }catch{expandedInPage=true;}
  }
  syncFullscreen();
  $('fullscreen').focus({preventScroll:true});
};
document.addEventListener('fullscreenchange',()=>{syncFullscreen();$('fullscreen').focus({preventScroll:true});});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && expandedInPage){expandedInPage=false;syncFullscreen();$('fullscreen').focus({preventScroll:true});}
});
