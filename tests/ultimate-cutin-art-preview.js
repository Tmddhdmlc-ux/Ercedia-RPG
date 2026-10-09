const $=id=>document.getElementById(id);
const metadata=await fetch('../assets/characters/cutins/drafts/serin/metadata.json').then(r=>r.json());
const audit=await fetch('../artifacts/ultimate-cutins/settings-audit.json').then(r=>r.json());
for(const item of audit.deferred){const tr=document.createElement('tr');for(const value of [item.id,item.name,item.reason]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('holds').append(tr);}
let elapsed=0,last=null,running=false,paused=false,raf=0;
const total=()=>$('tier').value==='expert'?3000:3800;
function draw(){
  const t=elapsed,d=total(),face=t>=350&&t<1050,full=t>=1050&&t<d-400,impact=t>=d-1100&&t<d-950;
  $('face').style.opacity=face?1:0;$('full').style.opacity=full?1:0;$('name').style.opacity=full?1:0;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  $('flash').style.opacity=impact&&!reduced ? .35 : 0;$('full').style.transform=reduced?'none':`scale(${1+Math.min(.025,Math.max(0,t-1050)/80000)})`;
  $('phase').textContent=t<350?'발동 준비':face?'얼굴 컷인':impact?'타격 순간 연출':full?'전체 컷신':'전투 복귀 · 프리뷰 종료';
  $('status').textContent=`${paused?'일시정지 · ':''}${(t/1000).toFixed(1)} / ${d/1000}초`;
  if(t>=d){running=false;$('pause').disabled=true;$('skip').disabled=true;}
}
function tick(now){if(!running)return;if(!paused){if(last!==null)elapsed=Math.min(total(),elapsed+(now-last)*Number($('speed').value));draw();}last=now;if(running)raf=requestAnimationFrame(tick);}
async function choose(){cancelAnimationFrame(raf);running=false;paused=false;const m=metadata[$('tier').value];$('play').disabled=true;$('full').src='../'+m.image;await $('full').decode();
  if(m.face_image){$('face').style.aspectRatio='16 / 9';$('face').style.backgroundImage=`url('../${m.face_image}')`;$('face').style.backgroundSize='cover';$('face').style.backgroundPosition='center';}
  else{const c=m.face_crop,s=m.image_metrics.size;$('face').style.aspectRatio=String(s[0]*c.width/(s[1]*c.height));$('face').style.backgroundImage=`url('../${m.image}')`;$('face').style.backgroundSize=`${100/c.width}% ${100/c.height}%`;$('face').style.backgroundPosition=`${100*c.x/(1-c.width)}% ${100*c.y/(1-c.height)}%`;}
  elapsed=total();draw();$('play').disabled=false;$('status').textContent='준비 완료 · 실제 피해/자원 변경 없음';
}
$('play').onclick=()=>{cancelAnimationFrame(raf);elapsed=0;last=null;paused=false;running=true;$('pause').disabled=false;$('skip').disabled=false;$('pause').textContent='일시정지';draw();raf=requestAnimationFrame(tick);};
$('pause').onclick=()=>{paused=!paused;last=null;$('pause').textContent=paused?'재개':'일시정지';draw();};
$('skip').onclick=()=>{elapsed=total();draw();cancelAnimationFrame(raf);};$('tier').onchange=()=>choose().catch(e=>{$('status').textContent='이미지 오류: '+e.message;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)$('pause').click();});
await choose();
