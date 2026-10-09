import {calendarDay} from './quest-model.js';
import {backgroundArt} from './location-art.js';
const phases=[['dawn','새벽','◐','새벽빛이 밝아옵니다.'],['morning','아침','☀','아침이 되었습니다.'],['day','낮','☀','한낮의 햇살이 비칩니다.'],['evening','저녁','◒','해가 저물었습니다.'],['night','밤','☾','밤이 깊어집니다.']];
export function parseGameTime(value){const raw=String(value||'').trim(),m=/(?:^|\s)(\d{1,2}):(\d{2})(?:\s|$)/.exec(raw);let hour=null,minute=null;
 if(m&&+m[1]<24&&+m[2]<60){hour=+m[1];minute=+m[2];if(/오후/.test(raw)&&hour<12)hour+=12;if(/오전/.test(raw)&&hour===12)hour=0;}
 let phase=hour!==null?(hour<4?'night':hour<7?'dawn':hour<11?'morning':hour<17?'day':hour<20?'evening':'night'):null;
 if(!phase)phase=/새벽|dawn/i.test(raw)?'dawn':/아침|오전|morning/i.test(raw)?'morning':/저녁|해질|황혼|evening|dusk/i.test(raw)?'evening':/밤|심야|자정|night/i.test(raw)?'night':/낮|정오|오후|day|noon/i.test(raw)?'day':'unknown';
 const info=phases.find(p=>p[0]===phase)||['unknown','시간 미정','◷',''];return {phase,label:info[1],icon:info[2],notice:info[3],hour,minute,clock:hour===null?'':`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,raw};
}
export function gameTimeView(state){const scene=state.scene,stored=parseGameTime(state.gameState?.time),display=parseGameTime(scene?.time);
 // An explicit scene timestamp wins; old saves with only descriptive times remain valid.
 const value=scene?.game_state?.time||(display.clock?scene.time:display.phase!=='unknown'&&stored.phase!==display.phase?scene.time:state.gameState?.time||scene?.time);
 const time=parseGameTime(value),date=scene?.game_state?.date||state.gameState?.date||state.world_engine?.calendar?.date||'',known=calendarDay(date)!==null,m=known?date.split(/[-/.]/).map(Number):null;
 return {...time,date,dateLabel:m?`${m[0]}년 ${m[1]}월 ${m[2]}일`:date||'날짜 미정',campaign:state.campaign_id||''};
}
export function timeAtmosphere(phase,background){const art=backgroundArt(background);if(!art||phase==='unknown'||background==='IMG-SHARED-08'||/dungeon|interior|faction/.test(art.category))return 'neutral';return phase;}
export function mountGameTime(state){const $=id=>document.getElementById(id),stage=$('stage'),image=$('background');let previous=null,timer=null;
 function render(){const view=gameTimeView(state),blocked=document.querySelector('.game').dataset.title==='active'||['black','map'].includes(document.querySelector('.game').dataset.introPhase),context=view.campaign;
  $('hud-game-time').textContent=`${view.icon} ${view.dateLabel} · ${view.label}${view.clock?' '+view.clock:''}`;
  $('hud-game-time').title='게임 시간 · 이동·수련·휴식 등으로 진행됩니다.';
  image.dataset.timeAtmosphere=blocked?'neutral':timeAtmosphere(view.phase,image.dataset.backgroundId);
  stage.dataset.timePhase=view.phase;
  if(previous&&previous.campaign===context&&previous.phase!=='unknown'&&view.phase!=='unknown'&&previous.phase!==view.phase&&!blocked){$('time-notice').textContent=view.notice;$('time-notice').hidden=false;clearTimeout(timer);timer=setTimeout(()=>{$('time-notice').hidden=true;},3200);}
  if(blocked||previous?.campaign!==context){clearTimeout(timer);$('time-notice').hidden=true;}
  previous={campaign:context,phase:view.phase};
 }
 return {render};
}
