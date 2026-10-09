// Isolated visual proposal. No production modules, storage, bridge or combat adjudication.
const $=id=>document.getElementById(id),stage=$('stage'),enemy=$('enemy'),fx=$('target-fx'),hudFX=$('hud-fx');
const svg=`<svg viewBox="0 0 400 500" aria-hidden="true"><g class="slash" fill="none" stroke-linecap="round"><path d="M 45 375 Q 145 175 365 95 Q 220 200 110 385" stroke="currentColor" stroke-width="17"/><path d="M 50 360 Q 155 175 360 100" stroke="#fff" stroke-width="5"/><path d="M100 220 L78 203 M280 302 L310 318 M170 140 L161 116 M303 173 L330 166" stroke="currentColor" stroke-width="6"/></g><g class="burst" fill="none" stroke="currentColor"><circle cx="210" cy="250" r="72" stroke-width="7"/><path d="M210 135V180 M210 320V380 M95 250H145 M270 250H335 M125 165L165 205 M265 305L310 355 M305 160L270 203 M155 305L110 352" stroke-width="8"/></g><g class="shield" fill="none" stroke="currentColor"><path d="M200 115L320 170V265Q303 340 200 395Q97 340 80 265V170Z" fill="#62cfff22" stroke-width="8"/><path d="M200 147V358 M112 208H288 M112 265H288" stroke-width="3"/><circle cx="200" cy="250" r="143" stroke-width="2"/></g><g class="trails" stroke="currentColor" fill="none" stroke-linecap="round"><path d="M80 170H220 M35 220H190 M65 270H230 M25 320H190" stroke-width="12" opacity=".65"/></g><g class="flame"><path d="M200 80Q320 195 290 285Q337 254 310 365Q270 432 200 430Q87 428 70 332Q52 257 130 186Q113 268 168 285Q210 225 200 80Z" fill="#ff8039b0"/><path d="M207 228Q270 315 243 379Q187 430 150 362Q129 331 168 301Q162 347 187 353Q216 315 207 228Z" fill="#fff0b4"/><path d="M80 190L67 155 M311 220L337 186 M109 384L78 407 M289 407L322 432" stroke="currentColor" stroke-width="8"/></g><g class="rune" stroke="currentColor" fill="none"><circle cx="200" cy="250" r="143" stroke-width="4"/><circle cx="200" cy="250" r="117" stroke-width="2"/><path d="M200 100L330 325H70Z M200 400L330 175H70Z" stroke-width="4"/><path d="M200 152V348 M102 250H298" stroke="#fff" stroke-width="7"/></g></svg>`;
fx.innerHTML=svg;hudFX.innerHTML=svg;
const demos=[
 {id:'slash',name:'검격',actor:'주인공',line:'검을 휘둘러 상대의 방어 틈을 파고든다!',damage:24},
 {id:'critical',name:'치명타',actor:'주인공',line:'결정적인 일격이 상대에게 적중한다!',damage:48},
 {id:'dodge',name:'회피',actor:'주인공',line:'상대가 옆으로 몸을 빼며 공격을 피한다!',damage:0},
 {id:'block',name:'방어',actor:'주인공',line:'상대의 방벽이 공격을 막아낸다!',damage:0},
 {id:'magic',name:'화염 마법',actor:'주인공',line:'응축된 화염이 상대를 향해 날아간다!',damage:32,mp:12,skill:'화염탄 · 연출 예시'},
 {id:'unique',name:'고유능력',actor:'세린',line:'빛의 고리가 퍼지며 강력한 일격이 주인공을 덮친다!',damage:40,playerTarget:true,skill:'별빛의 일격 · 연출 예시'}
];
let selected=0,animations=[],raf=0,last=0,elapsed=0,impacted=false,running=false,paused=false;
const total=2400,impactTime=1000;
function clear(){cancelAnimationFrame(raf);for(const a of animations)a.cancel();animations=[];fx.style.opacity=0;hudFX.style.opacity=0;$('projectile').style.opacity=0;$('cast').style.opacity=0;$('skill').hidden=true;$('skill').style.opacity=0;$('damage').style.opacity=0;$('player-number').style.opacity=0;enemy.style.transform='';stage.style.transform='';}
function animate(node,frames,duration){const a=node.animate(frames,{duration,easing:'ease-out',fill:'none'});a.playbackRate=Number($('speed').value);animations.push(a);return a;}
function resources(d,after=false){$('hp-enemy').value=100-(after&&!d.playerTarget?d.damage:0);$('hp-player').value=100-(after&&d.playerTarget?d.damage:0);$('mp-player').value=100-(after?d.mp||0:0);$('enemy-hp').textContent=`HP ${$('hp-enemy').value} / 100`;$('player-hp').textContent=`HP ${$('hp-player').value} / 100`;$('player-mp').textContent=`MP ${$('mp-player').value} / 100`;}
function start(index=selected){clear();selected=index;running=true;paused=false;elapsed=0;last=0;impacted=false;const d=demos[selected];resources(d);$('speaker').textContent=d.actor;$('line').textContent=d.line;$('phase').textContent='공격 준비';$('status').textContent=d.name+' 재생 중';$('pause').disabled=false;$('pause').textContent='일시정지';for(const b of document.querySelectorAll('[data-effect]'))b.setAttribute('aria-pressed',String(b.dataset.effect===d.id));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(d.skill){$('skill').hidden=false;$('skill').textContent=d.skill;animate($('skill'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,offset:.15},{opacity:1,offset:.75},{opacity:0}],950);}
  if(d.id==='magic'){
    const rect=stage.getBoundingClientRect(),target=enemy.getBoundingClientRect(),sx=rect.width*.18,sy=rect.height*.52,tx=target.left-rect.left+target.width*.5,ty=target.top-rect.top+target.height*.48;
    $('projectile').style.left=sx+'px';$('projectile').style.top=sy+'px';
    animate($('cast'),[{opacity:0,transform:'scale(.6)'},{opacity:1,offset:.5},{opacity:0,transform:'scale(1.15)'}],650);
    animate($('projectile'),[{opacity:0,transform:'translate(0,0)',offset:0},{opacity:0,transform:'translate(0,0)',offset:.45},{opacity:1,offset:.55},{opacity:1,transform:reduced?'none':`translate(${tx-sx}px,${ty-sy}px)`,offset:.96},{opacity:0,transform:reduced?'none':`translate(${tx-sx}px,${ty-sy}px)`}],impactTime);
  }else if(!reduced&&d.playerTarget)animate(enemy,[{transform:'translateX(0)'},{transform:'translateX(-40px)',offset:.4},{transform:'translateX(0)'}],1500);
  raf=requestAnimationFrame(tick);
}
function impact(){impacted=true;const d=demos[selected],node=d.playerTarget?hudFX:fx,number=d.playerTarget?$('player-number'):$('damage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  resources(d,true);$('phase').textContent='타격';node.dataset.type=d.id==='magic'?'fire':d.id;number.textContent=d.id==='dodge'?'MISS':d.id==='block'?'BLOCK':'−'+d.damage;number.classList.toggle('critical',d.id==='critical');
  animate(node,[{opacity:0,transform:reduced?'none':'scale(.55) rotate(-12deg)'},{opacity:1,transform:'scale(1)',offset:.18},{opacity:.9,offset:.4},{opacity:0,transform:reduced?'none':'scale(1.25) rotate(8deg)'}],d.id==='unique'?1000:650);
  animate(number,[{opacity:0,transform:'translate(-50%,12px)'},{opacity:1,offset:.15},{opacity:1,offset:.6},{opacity:0,transform:reduced?'translateX(-50%)':'translate(-50%,-44px)'}],1250);
  if(!reduced&&!d.playerTarget){if(d.id==='dodge')animate(enemy,[{transform:'translateX(0)',opacity:1},{transform:'translateX(65px)',opacity:.35,offset:.35},{transform:'translateX(0)',opacity:1}],750);else if(d.damage)animate(enemy,[{transform:'translateX(0)'},{transform:'translateX(20px)',offset:.18},{transform:'translateX(-6px)',offset:.35},{transform:'translateX(0)'}],500);}
  if(!reduced&&d.id==='critical')animate(stage,[{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}],280);
}
function tick(now){if(!running)return;if(!paused){if(last)elapsed+=(now-last)*Number($('speed').value);if(elapsed>=impactTime&&!impacted)impact();if(elapsed>=total){running=false;$('pause').disabled=true;$('phase').textContent='재생 완료 · 읽은 뒤 다음 이펙트';$('status').textContent=demos[selected].name+' 재생 완료';if($('autoplay').checked)start((selected+1)%demos.length);return;}}last=now;raf=requestAnimationFrame(tick);}
for(const b of document.querySelectorAll('[data-effect]'))b.onclick=()=>start(demos.findIndex(d=>d.id===b.dataset.effect));
$('play').onclick=()=>start();$('next').onclick=()=>start((selected+1)%demos.length);
$('pause').onclick=()=>{if(!running)return;paused=!paused;for(const a of animations)paused?a.pause():a.play();last=0;$('pause').textContent=paused?'재개':'일시정지';$('status').textContent=paused?'일시정지':demos[selected].name+' 재생 중';};
$('speed').onchange=()=>{for(const a of animations)a.playbackRate=Number($('speed').value);last=0;};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)$('pause').click();});
for(const img of document.querySelectorAll('img'))img.onerror=()=>{$('status').textContent='원본 이미지 로드 실패 · 서버를 확인해주세요.';};
start();