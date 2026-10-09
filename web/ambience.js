import {backgroundArt,resolveBackground} from './location-art.js';
import {gameTimeView} from './game-time.js';
import {createBackgroundMusic} from './background-music.js';
export const ambienceTracks=Object.fromEntries([
 ['villageDay','마을 · 새와 바람'],['villageNight','마을 밤 · 풀벌레'],['city','도시 · 먼 사람 소리'],['cityNight','도시 밤 · 조용한 바람'],
 ['border','국경 · 거센 바람'],['royal','왕궁 · 고요한 회랑'],['farEast','극동 · 물과 바람'],['unexplored','미탐색 · 낯선 바람'],
 ['forestDay','숲 · 새와 나뭇잎'],['forestNight','숲 밤 · 풀벌레와 잎새'],['mountain','설산 · 산바람'],['coast','해안 · 물결'],
 ['dungeon','던전 · 낮은 울림'],['inn','여관 · 벽난로'],['camp','야영지 · 모닥불'],['rain','빗길 · 빗소리'],['workshop','공방 · 화로']
].map(([id,name])=>[id,{name,path:`assets/audio/ambience/${id}.ogg`}]));
export function normalizeAmbiencePreferences(raw={}){return {enabled:raw.enabled!==false,volume:Number.isFinite(raw.volume)?Math.max(0,Math.min(.5,raw.volume)):.18};}
export function sceneAmbience(state={}){
 const scene=state.scene,art=backgroundArt(resolveBackground(scene,state));
 const place=scene?.game_state?.place||scene?.location||state.gameState?.place||'';
 const text=place+' '+(art?.name||'');
 const night=['night','dawn','evening'].includes(gameTimeView(state).phase);
 const shared={'IMG-SHARED-01':'inn','IMG-SHARED-02':night?'cityNight':'city','IMG-SHARED-03':night?'villageNight':'villageDay','IMG-SHARED-04':night?'forestNight':'forestDay','IMG-SHARED-05':'border','IMG-SHARED-06':'camp','IMG-SHARED-07':'mountain','IMG-SHARED-08':'rain','IMG-SHARED-09':'royal','IMG-SHARED-10':night?'cityNight':'city'};
 if(shared[art?.id])return shared[art.id];
 if(/비오는|비 오는|빗길|폭우/.test(text))return 'rain';
 if(art?.category==='dungeon_zone'||art?.category==='dungeon_entrance'||/동굴|던전|지하|납골|구혈|묘지|유적/.test(text))return 'dungeon';
 if(/국왕실|왕궁|왕실|알현|회랑|성당|성전|마법탑/.test(text))return 'royal';
 if(/여관|숙소|주점/.test(text))return 'inn';
 if(/대장간|공방/.test(text))return 'workshop';
 if(art?.category==='facility_interior')return 'royal';
 if(/국경|검문|요새|성벽|수비|참호/.test(text))return 'border';
 if(/야영|군영|주둔|모닥불/.test(text))return 'camp';
 if(/미탐색|미개척|미탐사|이상지대/.test(text))return 'unexplored';
 if(/극동/.test(text))return 'farEast';
 if(/설산|설벽|눈 덮인|눈덮인|빙하|노르발트|산길/.test(text))return 'mountain';
 if(/해안|항구|바다|군도|해변|벨마리나|아쿠아렌/.test(text))return 'coast';
 if(/숲|원시림|수림/.test(text))return night?'forestNight':'forestDay';
 const regional={W1:'mountain',W2:night?'cityNight':'city',W3:night?'villageNight':'villageDay',W4:'border',W5:night?'cityNight':'city',E1:'mountain',E2:'workshop',E3:'border',E4:'mountain',S1:'coast',S2:'border',S3:'coast',S4:night?'villageNight':'villageDay'};
 if(['region_hub','region_overview'].includes(art?.category)&&regional[art.region_id])return regional[art.region_id];
 if(/도시|왕도|시장|거점|상단|재료상/.test(text)||['region_hub','facility_exterior','faction_location'].includes(art?.category))return night?'cityNight':'city';
 return night?'villageNight':'villageDay';
}
export function createAmbience(options={}){return createBackgroundMusic({...options,tracks:ambienceTracks,initialVolume:.18});}
export function mountAmbience(root,{state,assetBase='',persist=()=>{}}={}){
 let prefs=normalizeAmbiencePreferences(state.uiPreferences?.ambience),unlocked=false,blocked=true,starting=false;
 const details=document.createElement('details'),summary=document.createElement('summary'),panel=document.createElement('div'),button=document.createElement('button'),label=document.createElement('label'),volume=document.createElement('input');
 details.className='music-controls ambience-controls';panel.className='music-settings';button.type='button';label.textContent='환경음 음량 ';volume.type='range';volume.min='0';volume.max='50';volume.step='1';volume.setAttribute('aria-label','환경음 음량');label.append(volume);panel.append(button,label);details.append(summary,panel);root.querySelector('.tabs')?.append(details);
 const audio=createAmbience({assetBase,onStatus:s=>{root.dataset.ambienceTrack=s.active||'';root.dataset.ambienceEnabled=String(s.enabled);summary.textContent=s.error?'환경음 다시 시도':s.loading?'환경음 준비 중':s.active?'환경음 · '+ambienceTracks[s.active].name.split(' · ')[0]:'환경음 끔';button.textContent=prefs.enabled?'환경음 끄기':'환경음 켜기';volume.value=String(Math.round(prefs.volume*100));}});
 const save=()=>{state.uiPreferences={...state.uiPreferences,ambience:{...prefs}};persist();};
 function sync(){
  prefs=normalizeAmbiencePreferences(state.uiPreferences?.ambience);
  const next=document.hidden||root.dataset.title==='active'||['black','map'].includes(root.dataset.introPhase);
  const wasBlocked=blocked;blocked=next;
  void audio.select(sceneAmbience(state));
  audio.setVolume(prefs.volume*(root.dataset.battle==='active'?.25:1));
  if(blocked||!prefs.enabled){if(wasBlocked!==blocked||starting||audio.status().enabled||audio.status().loading)audio.pause();}
  else if(unlocked&&!starting&&!audio.status().enabled){starting=true;void audio.enable().finally(()=>{starting=false;if(!blocked&&prefs.enabled&&!audio.status().enabled&&!audio.status().error)sync();});}
 }
 button.onclick=()=>{unlocked=true;prefs.enabled=!prefs.enabled;save();sync();};
 volume.oninput=()=>{prefs.volume=Number(volume.value)/100;save();sync();};
 const activate=e=>{if(!e.isTrusted||e.target.closest('.ambience-controls'))return;unlocked=true;sync();};
 root.addEventListener('pointerdown',activate);root.addEventListener('keydown',activate);
 document.addEventListener('visibilitychange',sync);
 new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-title','data-battle','data-intro-phase']});
 sync();return {sync,status:audio.status};
}
