import {battleIsActive,battleFrame,validateBattleSettlement} from './battle-model.js';
import {characterVisual,artBase} from './character-art.js';
import {faceFit} from './face-fit.js';
import {resolveBackground,backgroundURL} from './location-art.js';
import {appendItemIcon} from './item-art-ui.js';
import {battleCommentary} from './battle-presentation.js';
export function mountBattleUI(state,{render,persist,chat,assetBase,renderBackground=()=>{}}){
  const $=id=>document.getElementById(id),game=document.querySelector('.game'),stage=$('stage');
  const overlay=document.createElement('img');overlay.className='battle-transition-overlay';overlay.alt='';overlay.hidden=true;stage.append(overlay);
  let identity=null,raf=0,lastTime=0,elapsed=0,impacted=false,waiting=false,animations=[],cards=new Map();
  const slots=['left','right'].map(side=>{const root=$('battle-'+side),visual=document.createElement('div'),missing=document.createElement('div'),number=document.createElement('span'),effect=document.createElement('div');visual.className='battle-visual';missing.className='battle-missing';number.className='battle-number';effect.className='battle-effect';root.append(visual,missing,effect,number);return {root,visual,missing,number,effect,body:null,face:null,id:null};});
  const duration=e=>e.kind==='unique'?2200:e.skill_id?1600:e.result==='critical'?1300:1000;
  function clearAnimation(){for(const a of animations)a.cancel();animations=[];for(const s of slots){s.number.textContent='';s.effect.className='battle-effect';}for(const card of cards.values())card.number.textContent='';$('battle-cutin').hidden=true;}
  function stop(){cancelAnimationFrame(raf);raf=0;lastTime=0;clearAnimation();}
  function save(){persist();chat.controls();}
  function art(slot,p){
    slot.id=p.id;slot.root.hidden=p.id==='player';slot.root.dataset.participant=p.id;slot.missing.textContent=p.name+' · 스탠딩 미등록';slot.missing.hidden=!!p.art;slot.visual.hidden=!p.art;
    if(!p.art)return;
    if(!slot.body){slot.body=new Image();slot.face=new Image();slot.body.className='battle-body';slot.face.className='battle-face';slot.visual.append(slot.body,slot.face);slot.body.onerror=()=>{slot.visual.hidden=true;slot.missing.hidden=false;slot.missing.textContent=p.name+' · 원화 로드 실패';};slot.face.onerror=()=>{slot.face.hidden=true;slot.missing.hidden=false;slot.missing.textContent='표정 로드 실패 · 원본 얼굴 유지';};}
    if(p.id!=='serin'){const art=characterVisual(p.art.id,p.art.outfit,p.art.emotion);slot.face.hidden=true;slot.body.alt=p.name+' '+(art.kind==='monster'?'마수 초상화':'스탠딩');slot.root.classList.toggle('monster-art',art.kind==='monster');const url=artBase(assetBase)+art.path;if(slot.body.getAttribute('src')!==url)slot.body.src=url;return;}
    slot.root.classList.remove('monster-art');
    const outfit=p.art.outfit,path=outfit==='armor'?'base.png':`outfits/${outfit}/base.png`,bodyURL=(assetBase||'https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@2b8de39504ff4f3fdabcefa6f2b5a848babcd683/')+'assets/characters/main/serin/standing/'+path,faceURL=(assetBase||'https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@2b8de39504ff4f3fdabcefa6f2b5a848babcd683/')+'assets/characters/main/serin/faces/'+p.art.emotion+'.png';
    if(slot.body.getAttribute('src')!==bodyURL)slot.body.src=bodyURL;if(slot.face.getAttribute('src')!==faceURL)slot.face.src=faceURL;
    slot.body.alt=p.name+' 스탠딩';slot.face.alt=p.name+' '+p.art.emotion+' 표정';slot.face.hidden=false;
    const fit=faceFit[outfit];Object.assign(slot.face.style,{left:fit.x/1024*100+'%',top:fit.y/1536*100+'%',width:fit.size/1024*100+'%'});
  }
  function showResources(resources){for(const [id,card] of cards){const p=state.battlePlayback.scene.battle.participants.find(p=>p.id===id),r=resources[id];card.hp.textContent=`HP ${r.hp} / ${p.maxHp}`;card.mp.textContent=`MP ${r.mp} / ${p.maxMp}`;card.bar.max=p.maxHp;card.bar.value=r.hp;card.mpBar.max=Math.max(1,p.maxMp);card.mpBar.value=r.mp;card.root.dataset.defeated=String(r.hp===0);}}
  function animate(node,keyframes,ms){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const a=node.animate(keyframes,{duration:ms,easing:'ease-in-out'});a.playbackRate=state.battlePlayback.speed;animations.push(a);if(state.battlePlayback.paused||document.querySelector('.game').dataset.title==='active')a.pause();}
  function eventStart(){
    const playback=state.battlePlayback,b=playback.scene.battle,e=b.events[playback.index];if(!e)return finish();
    clearAnimation();elapsed=0;impacted=false;waiting=false;$('battle-next').disabled=true;showResources(battleFrame(b,playback.index));
    const actor=b.participants.find(p=>p.id===e.actor),target=b.participants.find(p=>p.id===e.target),allied=actor.side==='allied'?actor:target.side==='allied'?target:b.participants.find(p=>p.side==='allied'),enemy=actor.side==='enemy'?actor:target.side==='enemy'?target:b.participants.find(p=>p.side==='enemy');
    art(slots[0],allied);art(slots[1],enemy);
    for(const [id,card] of cards){card.root.dataset.acting=String(id===e.actor);card.root.dataset.target=String(id===e.target);}
    for(const s of slots)s.root.dataset.defeated=String(battleFrame(b,playback.index)[s.id].hp===0);
    $('speaker').textContent=actor.name;$('speaker').dataset.voice='character';$('emotion').textContent='전투 중계';$('line').dataset.voice='narration';$('line').textContent=battleCommentary(e.narration);
    const skill=actor.skills.find(s=>s.id===e.skill_id);if(skill){$('battle-cutin').hidden=false;$('battle-cutin').textContent=skill.name;$('battle-cutin').dataset.kind=e.kind;animate($('battle-cutin'),[{opacity:0,transform:'translateY(10px) scale(.9)'},{opacity:1,transform:'translateY(0) scale(1)',offset:.15},{opacity:1,offset:.65},{opacity:0,transform:'translateY(-8px) scale(1.03)'}],duration(e)*.8);}
    $('battle-progress').textContent=`${playback.replay?'다시보기 · ':''}${playback.index+1} / ${b.events.length}`;
    const active=slots.find(s=>s.id===e.actor),direction=actor.side==='allied'?1:-1;
    if(active&&['attack','counter'].includes(e.kind))animate(active.root,[{transform:'translateX(0)'},{transform:`translateX(${direction*65}px)`,offset:.32},{transform:'translateX(0)'}],duration(e));
    if(active&&e.kind==='magic'){active.effect.className='battle-effect casting '+e.element;animate(active.effect,[{opacity:0,transform:'scale(.5)'},{opacity:1,transform:'scale(1.15)'},{opacity:0}],duration(e));}
    if(active&&e.kind==='unique'){animate(active.root,[{transform:'scale(1)'},{transform:'scale(1.18)',offset:.35},{transform:'scale(1)'}],duration(e));active.effect.className='battle-effect unique';}
    if(active&&e.kind==='defeat')animate(active.root,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(140px)'}],duration(e));
  }
  function impact(){
    const playback=state.battlePlayback,b=playback.scene.battle,e=b.events[playback.index];impacted=true;showResources(battleFrame(b,playback.index+1));
    const target=slots.find(s=>s.id===e.target);
    if(target){const number=target.root.hidden?cards.get(e.target)?.number:target.number;number.textContent=e.result==='dodge'?'MISS':e.result==='block'&&e.damage===0?'BLOCK':e.damage?'-'+e.damage:'';number.dataset.critical=String(e.result==='critical');
      if(e.result==='dodge'){target.effect.className='battle-effect afterimage';animate(target.root,[{transform:'translateX(0)',opacity:1},{transform:`translateX(${target===slots[0]?-35:35}px)`,opacity:.45},{transform:'translateX(0)',opacity:1}],duration(e)*.55);}
      else if(e.result==='block'||e.kind==='defend'){target.effect.className='battle-effect barrier';animate(target.effect,[{opacity:0},{opacity:1},{opacity:0}],duration(e)*.55);}
      else if(e.damage){animate(target.root,[{transform:'translateX(0)'},{transform:`translateX(${target===slots[0]?-20:20}px)`},{transform:'translateX(0)'}],duration(e)*.55);if(!target.root.hidden){target.effect.className='battle-effect strike '+(e.element||'physical');animate(target.effect,[{opacity:0,transform:'scale(.65) rotate(-12deg)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:0,transform:'scale(1.2) rotate(12deg)'}],400);}}
      if(number.textContent)animate(number,[{opacity:0,transform:'translateY(10px)'},{opacity:1,offset:.2},{opacity:0,transform:'translateY(-30px)'}],duration(e)*.55);
    }
    if(e.result==='critical')animate(stage,[{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],300);
  }
  function tick(now){
    if(!battleIsActive(state)){stop();return;}
    if(document.querySelector('.game').dataset.title==='active'){lastTime=0;raf=requestAnimationFrame(tick);return;}
    const p=state.battlePlayback,e=p.scene.battle.events[p.index];if(!e)return finish();
    if(!p.paused&&!waiting){if(lastTime)elapsed+=(now-lastTime)*p.speed;if(!impacted&&elapsed>=duration(e)*.4)impact();if(elapsed>=duration(e)*.8)$('battle-cutin').hidden=true;if(elapsed>=duration(e)){if(p.manual!==false){waiting=true;$('battle-next').disabled=false;$('battle-next').textContent=p.index===p.scene.battle.events.length-1?'전투 결과 확인':'다음 턴 →';$('battle-progress').textContent=`${p.index+1} / ${p.scene.battle.events.length} · 읽은 뒤 다음 턴`;}else next();}}
    lastTime=now;if(battleIsActive(state))raf=requestAnimationFrame(tick);
  }
  function finish(){
    const p=state.battlePlayback;if(!p||p.done)return;stop();
    p.index=p.scene.battle.events.length;p.done=true;p.paused=false;
    const id=p.scene.battle.battle_id,already=state.battleApplied?.includes(id);
    if(!p.replay&&!already){state.battleApplied=[...(state.battleApplied||[]),id].slice(-100);chat.apply(JSON.stringify(p.scene),{commitBattle:true});}
    else {render();save();}identity=null;
  }
  function start(scene){
    validateBattleSettlement(scene,state);
    state.battlePlayback={scene,index:0,speed:1,paused:false,done:false,replay:false,manual:true};state.page='story';identity=null;save();render();
  }
  function refresh(){
    const p=state.battlePlayback,active=battleIsActive(state);game.dataset.battle=active?'active':'none';
    overlay.hidden=!active;if(active&&!overlay.getAttribute('src'))overlay.src=backgroundURL('IMG-SHARED-11',assetBase);overlay.onerror=()=>{overlay.hidden=true;};
    const result=$('battle-result');result.hidden=!(p?.done&&state.scene?.scene_id===p.scene.scene_id);result.replaceChildren();
    if(!result.hidden){renderBackground('IMG-SHARED-12');const summary=document.createElement('p');summary.textContent=p.scene.battle.outcome.reason+' · 획득 경험치 '+p.scene.battle.outcome.xp_gain;result.append(summary);for(const reward of p.scene.battle.outcome.items_added){const row=document.createElement('div'),label=document.createElement('span');row.className='battle-loot-row';appendItemIcon(row,reward,assetBase);label.textContent=reward.name+' × '+reward.quantity;row.append(label);result.append(row);}}
    $('battle-hud').hidden=!active;$('battle-arena').hidden=!active;$('battle-controls').hidden=!active;$('battle-replay').hidden=!p?.done;
    $('battle-replay').disabled=chat.isPending();
    for(const id of ['story-tab','map-tab','status-tab','inventory-tab','quests-tab','new-game','continue-game','restore-previous-game','hud-player'])$(id).disabled=active||!!state.introDraft;
    if(!active){stop();identity=null;return;}
    // During playback the current battle background is shown without exposing the aftermath.
    renderBackground(resolveBackground(p.scene,state));
    $('battle-speed').value=String(p.speed);$('battle-pause').textContent=p.paused?'재개':'일시정지';$('battle-mode').textContent=p.manual===false?'자동 재생 중':'한 턴씩 읽기';$('battle-mode').setAttribute('aria-pressed',String(p.manual!==false));
    if(identity!==p){stop();identity=p;cards=new Map();$('battle-hud').replaceChildren();
      for(const participant of p.scene.battle.participants){const root=document.createElement('article'),title=document.createElement('strong'),meta=document.createElement('span'),hp=document.createElement('span'),bar=document.createElement('progress'),mp=document.createElement('span'),mpBar=document.createElement('progress'),number=document.createElement('span');number.className='battle-number battle-hud-number';number.setAttribute('aria-live','polite');root.className='battle-participant '+participant.side;title.textContent=participant.name;meta.textContent=`Lv.${participant.level} · ${participant.rank} · 속도 ${participant.speed} · ×${({none:1,basic:1,expert:1.25,hyper:1.65,master:2.2})[participant.realm]*(participant.creature_multiplier??1)}`;bar.className='battle-hp-bar';mpBar.className='battle-mp-bar';bar.setAttribute('aria-label',participant.name+' 체력');mpBar.setAttribute('aria-label',participant.name+' 마나');root.append(title,meta,hp,bar,mp,mpBar,number);$('battle-hud').append(root);cards.set(participant.id,{root,hp,bar,mp,mpBar,number});}
      eventStart();lastTime=0;raf=requestAnimationFrame(tick);
    }else{
      // Other UI updates must not overwrite the one-line commentary.
      const e=p.scene.battle.events[p.index];if(e){$('speaker').textContent=p.scene.battle.participants.find(a=>a.id===e.actor).name;$('speaker').dataset.voice='character';$('emotion').textContent='전투 중계';$('line').dataset.voice='narration';$('line').textContent=battleCommentary(e.narration);}
    }
  }
  function next(){if(!battleIsActive(state))return;const p=state.battlePlayback;if(p.manual!==false&&!waiting)return;p.paused=false;$('battle-pause').textContent='일시정지';p.index++;save();eventStart();lastTime=0;}
  $('battle-next').onclick=next;
  $('battle-mode').onclick=()=>{if(!battleIsActive(state))return;const p=state.battlePlayback;p.manual=p.manual===false;if(!p.manual&&waiting){waiting=false;p.paused=false;for(const a of animations)a.play();}save();refresh();};
  $('battle-pause').onclick=()=>{const p=state.battlePlayback;if(!battleIsActive(state))return;p.paused=!p.paused;for(const a of animations)p.paused?a.pause():a.play();$('battle-pause').textContent=p.paused?'재개':'일시정지';lastTime=0;save();};
  $('battle-speed').onchange=e=>{if(!battleIsActive(state))return;state.battlePlayback.speed=Number(e.target.value);for(const a of animations)a.playbackRate=state.battlePlayback.speed;lastTime=0;save();};
  $('battle-skip').onclick=finish;
  $('battle-replay').onclick=()=>{const p=state.battlePlayback;if(!p?.done||chat.isPending())return;p.index=0;p.done=false;p.paused=false;p.manual=true;p.replay=true;identity=null;state.page='story';save();render();};
  document.addEventListener('ercedia:title-closed',()=>{lastTime=0;for(const a of animations)if(!state.battlePlayback?.paused)a.play();});
  return {start,render:refresh,next,active:()=>battleIsActive(state)};
}
