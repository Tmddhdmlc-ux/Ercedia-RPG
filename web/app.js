import {KEY,defaultLayout,load} from './state.js';
const $=id=>document.getElementById(id);
const CDN='https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@74bc3cf3099ddadcc73c34cea8c3cee0e1f0a361/';
const standing='assets/characters/main/serin/standing/';
// Only approved, registered assets belong here. Drafts and absent expressions are excluded.
const outfits={armor:{label:'갑옷',expressions:{base:standing+'base.png'}},casual:{label:'평상복',expressions:{base:standing+'outfits/casual/base.png'}},nightwear:{label:'잠옷',expressions:{base:standing+'outfits/nightwear/base.png'}}};
const labels={base:'기본',smile:'미소',angry:'분노',surprised:'놀람',sad:'슬픔',embarrassed:'부끄러움',afraid:'두려움',annoyed:'불쾌함',love:'애정'};
const dialogues=[['나레이션','장면 시작','마을 광장에서 순찰을 마친 세린과 마주쳤다.'],['세린','미소','아, 여행자님! 오늘도 좋은 날씨네요.'],['세린','호기심','저는 이 근처를 순찰하고 있었어요. 어디로 가시는 길인가요?'],['세린','주의','아참, 세 나라가 전쟁 중이라 먼 여행은 위험할 수도 있답니다.']];
const regions={village:['써니 빌리지','현재 세린과 대화하는 마을입니다.'],west:['서부 왕국','임시 국가 배치. 영주령과 국명 미확정.'],east:['동부 왕국','임시 국가 배치. 영주령과 국명 미확정.'],south:['남부 왕국','임시 국가 배치. 영주령과 국명 미확정.'],wild:['북부 마수림','마수 서식지의 임시 위치.'],ruins:['고대 유적','미지의 던전 후보지.']};
let restored;
try {restored=load(window.localStorage);} catch {restored=load({getItem(){throw Error('unavailable');}});}
const state=restored.state;
$('save-status').textContent=restored.message;
const images=new Map();
function trackImage(img,path,label) {
  const row=document.createElement('li');
  const status=document.createElement('span');
  const link=document.createElement('a');
  link.href=CDN+path;link.target='_blank';link.rel='noopener';link.textContent='원본';
  row.append(status,document.createTextNode(' · '),link);$('asset-status').append(row);
  img.dataset.status='loading';status.textContent=label+' · 로딩 중';
  img.addEventListener('load',()=>{img.dataset.status='ready';img.classList.add('ready');status.textContent=label+' · 정상 로드';renderAppearance();});
  img.addEventListener('error',()=>{img.dataset.status='error';img.classList.remove('ready');status.textContent=label+' · 로드 실패';row.classList.add('error');document.querySelector('.asset-details').open=true;renderAppearance();});
  img.src=CDN+path;
}
for (const [outfit,data] of Object.entries(outfits)) {
  for (const [emotion,path] of Object.entries(data.expressions)) {
    const img=new Image();img.alt=`세린 ${data.label} · ${labels[emotion]}`;img.className='person';img.draggable=false;img.hidden=true;
    images.set(outfit+':'+emotion,img);$('characters').append(img);trackImage(img,path,img.alt);
  }
}
trackImage($('background'),'assets/locations/towns/sunny_village/town_day.png','써니 빌리지');
function dirty(){ $('save-status').textContent='변경사항이 있습니다. 설정 저장을 눌러 보관하세요.'; }
function renderAppearance(){
  const found=!!outfits[state.outfit].expressions[state.expression];
  const key=state.outfit+':'+(found?state.expression:'base');
  for (const [id,img] of images) img.hidden=id!==key || !state.character;
  $('background').hidden=!state.background;
  const current=images.get(key);
  const error=current.dataset.status==='error';
  $('expression-status').textContent=error ? '캐릭터 이미지 로드 실패. 아래 원본 링크를 확인하세요.' : (found ? '기본 표정 표시 중 · 추가 표정 8종은 미등록입니다.' : `${labels[state.expression]} 표정은 미등록입니다. ${outfits[state.outfit].label} 기본형을 유지합니다.`);
  if(current.dataset.status==='loading') $('expression-status').textContent+=' 이미지 로딩 중…';
  if($('background').dataset.status==='error') $('expression-status').textContent+=' 배경 로드 실패.';
  $('expression-status').classList.toggle('asset-alert',error || $('background').dataset.status==='error');
  document.querySelectorAll('[data-outfit]').forEach(btn=>{const selected=btn.dataset.outfit===state.outfit;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});
  $('expression').value=state.expression;
  $('show-background').checked=state.background;$('show-character').checked=state.character;
  renderLayout();
}
function renderLayout(){
  const l=state.layouts[state.outfit];
  for(const k of ['scale','x','y']) {$(k).value=l[k];$(k+'-value').textContent=l[k]+(k==='y'?'px':'%');}
  for(const [key,img] of images) if(key.startsWith(state.outfit+':')) {img.style.left=l.x+'%';img.style.top=l.y+'px';img.style.transform=`translateX(-50%) scale(${l.scale/100})`;}
}
function renderDialogue(){const d=dialogues[state.index];$('speaker').textContent=d[0];$('emotion').textContent=d[1];$('line').textContent=d[2];$('count').textContent=`0${state.index+1} / 04`;$('previous').disabled=state.index===0;$('next').disabled=state.index===3;$('stage').setAttribute('aria-label',state.index===3?'마지막 대사':'장면을 눌러 다음 대사 보기');}
function advance(delta){const next=Math.max(0,Math.min(3,state.index+delta));if(next===state.index)return;state.index=next;renderDialogue();dirty();}
function switchTo(page){state.page=page;$('story').hidden=page!=='story';$('map-panel').hidden=page!=='map';for(const id of ['story','map']){const active=id===page;$(id+'-tab').classList.toggle('active',active);$(id+'-tab').setAttribute('aria-pressed',String(active));}}
function renderRegion(){const r=regions[state.region];$('region-title').textContent=r[0];$('region-description').textContent=r[1];document.querySelectorAll('[data-region]').forEach(el=>{el.classList.toggle('selected',el.dataset.region===state.region);el.setAttribute('aria-pressed',String(el.dataset.region===state.region));});}
document.querySelectorAll('[data-region]').forEach(el=>{el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',regions[el.dataset.region][0]);const select=()=>{state.region=el.dataset.region;renderRegion();dirty();};el.addEventListener('click',select);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});});
$('story-tab').onclick=()=>{switchTo('story');dirty();};$('map-tab').onclick=()=>{switchTo('map');dirty();};$('return').onclick=()=>{switchTo('story');$('story-tab').focus();dirty();};
$('previous').onclick=()=>advance(-1);$('next').onclick=()=>advance(1);$('stage').onclick=()=>advance(1);
$('stage').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();advance(1);}};
document.querySelectorAll('[data-outfit]').forEach(btn=>btn.onclick=()=>{state.outfit=btn.dataset.outfit;renderAppearance();dirty();});
$('expression').onchange=e=>{state.expression=e.target.value;renderAppearance();dirty();};
let frame=0;
for(const k of ['scale','x','y']) $(k).oninput=e=>{state.layouts[state.outfit][k]=Number(e.target.value);$(k+'-value').textContent=e.target.value+(k==='y'?'px':'%');if(!frame) frame=requestAnimationFrame(()=>{frame=0;renderLayout();});dirty();};
for(const [id,key] of [['show-background','background'],['show-character','character']]) $(id).onchange=e=>{state[key]=e.target.checked;renderAppearance();dirty();};
$('reset').onclick=()=>{state.layouts[state.outfit]=defaultLayout();renderLayout();dirty();};
$('save').onclick=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='저장 완료 · 복장별 배치와 대화 진행을 이 브라우저에 보관했습니다.';}catch{$('save-status').textContent='저장 실패 · 브라우저 저장 공간을 사용할 수 없습니다. 현재 화면은 유지됩니다.';}};
renderAppearance();renderDialogue();renderRegion();switchTo(state.page);

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
