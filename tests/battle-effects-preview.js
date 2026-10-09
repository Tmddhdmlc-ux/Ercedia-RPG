// Isolated visual proposal. No storage, bridge, rewards or combat adjudication.
import {effectProfiles,elementColors,skillEffectSVG} from './skill-effects-profiles.js';
const $=id=>document.getElementById(id),stage=$('stage'),enemy=$('enemy'),fx=$('target-fx'),hudFX=$('hud-fx');
fx.classList.add('skill-fx');hudFX.classList.add('skill-fx');
let books=[],visible=[],selected=null,animations=[],raf=0,last=0,elapsed=0,impacted=false,running=false,paused=false;
const total=3000,impactTime=1200,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function clear(){cancelAnimationFrame(raf);for(const a of animations)a.cancel();animations=[];for(const node of [fx,hudFX,$('projectile'),$('cast'),$('skill'),$('damage'),$('player-number')])node.style.opacity=0;$('skill').hidden=true;enemy.style.transform='';stage.style.transform='';}
function animate(node,frames,duration,delay=0){const a=node.animate(frames,{duration,delay,easing:'ease-out',fill:'none'});a.playbackRate=Number($('speed').value);animations.push(a);if(paused)a.pause();return a;}
function list(){visible=books.filter(b=>$('category').value==='all'||b.category===$('category').value||b.element===$('category').value);$('skill-list').replaceChildren();for(const b of visible){const o=document.createElement('option');o.value=b.skill_id;o.textContent=b.skill_name;$('skill-list').append(o);}$('count').textContent=visible.length+'종';if(!visible.some(b=>b.skill_id===selected))selected=visible[0]?.skill_id;$('skill-list').value=selected;}
function resources(d,after=false){const damage=effectProfiles[d.skill_id].illustrativeDamage?24:0;$('hp-enemy').value=100-(after?damage:0);$('hp-player').value=100;$('mp-player').value=100-(after?Math.min(d.base_mp_cost,100):0);$('enemy-hp').textContent=`HP ${$('hp-enemy').value} / 100`;$('player-hp').textContent='HP 100 / 100';$('player-mp').textContent=`MP ${$('mp-player').value} / 100`;}
function start(id=selected){const d=books.find(b=>b.skill_id===id);if(!d)return;clear();selected=id;const p=effectProfiles[id];running=true;paused=false;elapsed=0;last=0;impacted=false;resources(d);$('skill-list').value=id;
 $('selected-name').textContent=d.skill_name;$('source-summary').textContent=d.rarity+' · '+d.effect_summary;$('visual-summary').textContent='연출: '+p.description;$('speaker').textContent='주인공';$('line').textContent=d.skill_name+' — '+d.effect_summary;$('phase').textContent=p.illustrativeDamage?'공격 준비':'기술 전개';$('status').textContent=d.skill_name+' 재생 중';$('pause').disabled=false;$('pause').textContent='일시정지';
 for(const b of document.querySelectorAll('[data-skill]'))b.setAttribute('aria-pressed',String(b.dataset.skill===id));
 const color=elementColors[d.element]||(p.shape==='petal'||id==='skill_swd_025'?'#ffb0bd':id==='skill_swd_016'?'#bbebff':'#ffe0a7');fx.style.color=color;hudFX.style.color=color;stage.style.setProperty('--projectile-color',color);
 // First-person view: caster effects fill the centered foreground; attacks converge on the visible target.
 const onPlayer=!p.illustrativeDamage&&!['mark','mist','cage','corridor','eye','focus','parry'].includes(p.shape);fx.innerHTML=onPlayer?'':skillEffectSVG(p);hudFX.innerHTML=onPlayer?skillEffectSVG(p):'';stage.dataset.effectTarget=onPlayer?'player':'enemy';
 $('skill').hidden=false;$('skill').textContent=d.skill_name;animate($('skill'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,offset:.15},{opacity:1,offset:.72},{opacity:0}],1100);
 if(d.category==='spellbook')animate($('cast'),[{opacity:0,transform:'scale(.6)'},{opacity:.9,offset:.5},{opacity:0,transform:'scale(1.15)'}],1000);
 if(['orb','spear','thrust','trail','beam'].includes(p.shape)&&p.illustrativeDamage&&!reduced()){
  const rect=stage.getBoundingClientRect(),target=enemy.getBoundingClientRect(),x=target.left-rect.left+target.width*.5,fromY=rect.height*.86,toY=target.top-rect.top+target.height*.48,size=p.shape==='orb'?36+p.variant*12:64;
  $('projectile').style.left=(x-size/2)+'px';$('projectile').style.top=(fromY-size/2)+'px';$('projectile').style.width=size+'px';$('projectile').style.height=size+'px';
  animate($('projectile'),[{opacity:0,transform:'translateY(0) scale(1.8)',offset:0},{opacity:0,transform:'translateY(0) scale(1.8)',offset:.48},{opacity:1,offset:.56},{opacity:1,transform:`translateY(${toY-fromY}px) scale(.55)`,offset:.98},{opacity:0,transform:`translateY(${toY-fromY}px) scale(.55)`}],impactTime);
 }
 raf=requestAnimationFrame(tick);
}
function impact(){impacted=true;const d=books.find(b=>b.skill_id===selected),p=effectProfiles[selected],node=stage.dataset.effectTarget==='player'?hudFX:fx;resources(d,true);$('phase').textContent=p.illustrativeDamage?'적중':'효과 전개';
 animate(node,[{opacity:0,transform:reduced()?'none':'scale(.65)'},{opacity:1,transform:'scale(1)',offset:.15},{opacity:.95,offset:.65},{opacity:0,transform:reduced()?'none':'scale(1.15)'}],1400);
 if(!reduced()){
  for(const part of node.querySelectorAll('.stroke-part')){part.style.opacity=0;const order=Number(part.style.getPropertyValue('--order')||0);animate(part,[{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'scale(1)',offset:.25},{opacity:0,transform:'scale(1.12)'}],500,order*180);}
  const guard=node.querySelector('.guard-part');if(guard){guard.style.opacity=0;animate(guard,[{opacity:1},{opacity:0}],400);}
  if(['vortex','ring','eye'].includes(p.shape)){const group=node.querySelector('svg>g');animate(group,[{transform:'rotate(0deg)'},{transform:`rotate(${p.shape==='eye'?-100:140}deg)`}],1400);}
  if(p.shape==='rain')animate(node,[{transform:'translateY(-80px)'},{transform:'translateY(30px)'}],1200);
 }
 if(p.illustrativeDamage){$('damage').textContent='−24';animate($('damage'),[{opacity:0,transform:'translate(-50%,12px)'},{opacity:1,offset:.15},{opacity:1,offset:.65},{opacity:0,transform:reduced()?'translateX(-50%)':'translate(-50%,-44px)'}],1400);if(!reduced())animate(enemy,[{transform:'scale(1)'},{transform:'scale(.97) translateY(5px)',offset:.2},{transform:'scale(1)'}],450);}
 if(p.shape==='dash'&&!reduced())animate(node,[{opacity:0,transform:'translateY(65px) scale(1.25)'},{opacity:1,offset:.3},{opacity:0,transform:'translateY(-15px) scale(.75)'}],1000);
 if(p.shape==='break'&&!reduced())animate(stage,[{transform:'translateY(0)'},{transform:'translateY(-5px)'},{transform:'translateY(5px)'},{transform:'translateY(0)'}],260);
}
function next(){const i=visible.findIndex(b=>b.skill_id===selected);start(visible[(i+1)%visible.length]?.skill_id);}
function tick(now){if(!running)return;if(!paused){if(last)elapsed+=(now-last)*Number($('speed').value);if(elapsed>=impactTime&&!impacted)impact();if(elapsed>=total){running=false;$('pause').disabled=true;$('phase').textContent='재생 완료';$('status').textContent=books.find(b=>b.skill_id===selected).skill_name+' 재생 완료';if($('autoplay').checked)next();return;}}last=now;raf=requestAnimationFrame(tick);}
for(const b of document.querySelectorAll('[data-skill]'))b.onclick=()=>{const id=b.dataset.skill;if(!visible.some(b=>b.skill_id===id)){$('category').value='all';list();}start(id);};
$('category').onchange=()=>{list();start();};$('skill-list').onchange=e=>start(e.target.value);$('play').onclick=()=>start();$('next').onclick=next;
$('pause').onclick=()=>{if(!running)return;paused=!paused;for(const a of animations)paused?a.pause():a.play();last=0;$('pause').textContent=paused?'재개':'일시정지';$('status').textContent=paused?'일시정지':books.find(b=>b.skill_id===selected).skill_name+' 재생 중';};
$('speed').onchange=()=>{for(const a of animations)a.playbackRate=Number($('speed').value);last=0;};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)$('pause').click();});
for(const img of document.querySelectorAll('img'))img.onerror=()=>{$('status').textContent='원본 이미지 로드 실패 · 서버를 확인해주세요.';};
try{const response=await fetch('../items/book_catalog_70.json',{cache:'no-store'});if(!response.ok)throw Error('원본 목록 불러오기 실패');books=(await response.json()).books;if(books.length!==70||books.some(b=>!effectProfiles[b.skill_id]))throw Error('기술 원본과 연출 목록 불일치');list();start();}catch(e){$('status').textContent=e.message;for(const b of document.querySelectorAll('button'))b.disabled=true;}
