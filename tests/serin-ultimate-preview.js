import {ultimateFrame,ultimateDuration,ultimateImpact} from './serin-ultimate-timeline.js';
import {createUltimateAudio} from '../web/ultimate-audio.js';
const $=id=>document.getElementById(id),audio=createUltimateAudio({assetBase:location.origin+'/',onStatus:s=>{$('sound').textContent=s.muted?'컷신 음향 끔':'컷신 음향 켜짐';$('sound').setAttribute('aria-pressed',String(!s.muted));$('sound-status').textContent=s.error?'음원 준비 실패 · 재생으로 다시 시도':s.ready?'컷신 음향 준비됨':'재생하면 음원이 준비됩니다';$('sound-status').dataset.cue=s.lastCue;$('sound-status').dataset.played=String(s.played);}}),labels={prepare:'정적 속에 검광이 모인다',face:'결연한 눈빛 — 사선 컷인',full:'결의의 일섬 — 전신 개방',impact:'섬광의 검격',return:'빛의 잔상 — 전투 복귀',done:'연출 종료'};
let ready=false,running=false,paused=false,elapsed=0,last=null,raf=0,impacted=false,runRevision=0;
const canvas=$('effects'),ctx=canvas.getContext('2d'),reduced=()=> $('reduce').checked||matchMedia('(prefers-reduced-motion: reduce)').matches;
function paintEffects(f){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);if(!w||!h||f.done)return;
 ctx.save();ctx.globalCompositeOperation='screen';
 if(f.charge>0){ctx.globalAlpha=f.charge*.8;ctx.strokeStyle='#f9df9d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(w*.5,h*.49,w*(.13-.09*f.charge),h*(.24-.16*f.charge),-.3,0,Math.PI*2);ctx.stroke();const g=ctx.createRadialGradient(w*.5,h*.49,0,w*.5,h*.49,w*.15);g.addColorStop(0,'#fff7d7');g.addColorStop(.12,'#edc67788');g.addColorStop(1,'#edc67700');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 if(f.fullOpacity>0){for(let i=0;i<36;i++){const progress=((f.time/2100+i*.137)%1),x=w*((i*.618)%1),y=h*(1.05-progress*1.2),r=(i%3+1)*w/1100;ctx.globalAlpha=f.fullOpacity*Math.sin(progress*Math.PI)*.6;ctx.fillStyle=i%3?'#ffe4a0':'#ffffff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
 if(f.strike!==null&&!reduced()){const p=f.strike;ctx.translate(w*.52,h*.49);ctx.rotate(-.5);ctx.globalAlpha=(1-p)**2;const beam=ctx.createLinearGradient(0,-h*.025,0,h*.025);beam.addColorStop(0,'#f4bd5800');beam.addColorStop(.5,'#fffbe9');beam.addColorStop(1,'#f4bd5800');ctx.fillStyle=beam;ctx.fillRect(-w*.75,-h*.025,w*1.5,h*.05);ctx.strokeStyle='#ffdfa2';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,w*(.1+p*.4),h*(.07+p*.22),0,0,Math.PI*2);ctx.stroke();}
 ctx.restore();}
function draw(){const f=ultimateFrame(elapsed,reduced());$('shade').style.opacity=(f.phase==='prepare'||f.phase==='face')?.92:f.fullOpacity*.4;
 $('face').style.opacity=f.faceOpacity;$('face').style.transform=reduced()?'none':`translateY(${(1-f.faceOpen)*4}%)`;
 $('face').style.clipPath=`polygon(0 ${50-28*f.faceOpen}%,100% ${50-50*f.faceOpen}%,100% ${50+28*f.faceOpen}%,0 ${50+50*f.faceOpen}%)`;
 $('face-art').style.transform=`scale(${1.04-f.facePan*.04}) translateX(${f.facePan*-1.5}%)`;
 $('splash').style.opacity=f.fullOpacity;$('splash').style.transform=`translateY(${f.shake}px) scale(${f.zoom})`;$('vignette').style.opacity=f.fullOpacity;
 $('flash').style.opacity=f.flash;$('name').style.opacity=f.nameOpacity;$('name').style.transform=`translateY(${f.nameShift}px)`;
 for(const id of ['bar-top','bar-bottom'])$(id).style.height=`${f.letterbox*100}%`;
 paintEffects(f);$('phase').textContent=labels[f.phase];$('status').textContent=`${paused?'일시정지 · ':''}${labels[f.phase]} · ${(elapsed/1000).toFixed(1)} / ${(ultimateDuration/1000).toFixed(1)}초`;
 if(f.done){running=false;$('pause').disabled=true;$('skip').disabled=true;audio.stop();}}
new ResizeObserver(()=>{const rect=$('stage').getBoundingClientRect(),ratio=Math.min(1.5,devicePixelRatio||1);canvas.width=Math.round(Math.min(1920,rect.width*ratio));canvas.height=Math.round(canvas.width*rect.height/Math.max(1,rect.width));draw();}).observe($('stage'));
function tick(now){if(!running)return;if(!paused){if(last!==null)elapsed=Math.min(ultimateDuration,elapsed+(now-last)*Number($('speed').value));if(!impacted&&elapsed>=ultimateImpact)impacted=true;if(!document.hidden)audio.advance(elapsed,{speed:Number($('speed').value)});draw();}last=now;if(running)raf=requestAnimationFrame(tick);}
async function play(){if(!ready)return;const ticket=++runRevision;cancelAnimationFrame(raf);audio.reset();running=false;paused=false;elapsed=0;last=null;impacted=false;$('status').textContent='컷신 음향 준비 중…';
 $('skip').disabled=false;$('pause').disabled=true;if(!audio.status().muted)await audio.unlock();if(ticket!==runRevision||document.hidden)return;
 running=true;$('pause').disabled=false;$('skip').disabled=false;$('pause').textContent='일시정지';audio.advance(0,{speed:Number($('speed').value)});draw();raf=requestAnimationFrame(tick);}
$('play').onclick=play;$('pause').onclick=()=>{paused=!paused;last=null;if(paused)audio.stop();else if(running)audio.resume(elapsed,{speed:Number($('speed').value)});$('pause').textContent=paused?'재개':'일시정지';draw();};$('skip').onclick=()=>{runRevision++;elapsed=ultimateDuration;cancelAnimationFrame(raf);draw();};$('speed').onchange=()=>{last=null;};$('reduce').onchange=draw;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('status').textContent='이 브라우저에서는 전체화면을 열 수 없습니다.';}};
$('sound').onclick=()=>{audio.setMuted(!audio.status().muted);if(!audio.status().muted)void audio.unlock();};$('sound-volume').oninput=()=>audio.setVolume(Number($('sound-volume').value)/100);
document.addEventListener('visibilitychange',()=>{if(document.hidden){runRevision++;audio.stop();if(running&&!paused)$('pause').click();}});
$('play').disabled=true;try{await Promise.all([$('splash').decode(),$('stage').querySelector('.backdrop').decode()]);ready=true;$('play').disabled=false;elapsed=ultimateDuration;draw();$('phase').textContent='재생을 눌러 컷신을 확인하세요.';$('status').textContent='리마스터 준비 완료 · 재생 버튼을 누르세요.';}catch{$('status').textContent='원본 이미지를 불러오지 못했습니다.';}
