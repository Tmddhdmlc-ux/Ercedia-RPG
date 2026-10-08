export function mountNPCInfo(state){
  const $=id=>document.getElementById(id),stage=$('stage'),card=$('npc-info-card'),button=$('npc-info-button');
  let closeTimer=null,pinned=false,point=null,positionFrame=0;
  const display=value=>typeof value==='number'?value.toLocaleString('ko-KR'):'미정';
  const current=()=>state.scene?state.scene.npc:(state.character?{id:'serin',speaker:'세린'}:null);
  function refresh(){
    const npc=current(),profile=npc?.profile||{};
    button.hidden=!npc||!state.character;
    if(button.hidden){hide();return;}
    const name=profile.name||npc.speaker||'이름 미정';
    button.textContent=`${name} · 정보 ⓘ`;
    $('npc-info-name').textContent=name;
    $('npc-info-affiliation').textContent=profile.affiliation||'소속 미정';
    $('npc-info-rank').textContent=profile.rank||(npc.id==='serin'?'베이직 나이트':'경지 미정');
    for(const key of ['strength','dexterity','intelligence','constitution'])$('npc-info-'+key).textContent=display(profile[key]);
    for(const [key,maxKey] of [['hp','maxHp'],['mp','maxMp']]){
      const value=profile[key],max=profile[maxKey],known=typeof value==='number'&&typeof max==='number'&&max>0;
      $('npc-info-'+key).textContent=`${display(value)} / ${display(max)}`;
      const bar=$('npc-info-'+key+'-bar');bar.max=known?max:1;bar.value=known?Math.min(value,max):0;bar.classList.toggle('unset',!known);
      bar.setAttribute('aria-valuetext',known?`${value} / ${max}`:'미정');
    }
    $('npc-interest-label').textContent=state.player.name?`${state.player.name}에 대한 관심도`:'나에 대한 관심도';
    $('npc-info-interest').textContent=typeof profile.interest==='number'?`${profile.interest} / 100`:'미정';
    $('npc-info-interest-text').textContent=profile.interestText||(typeof profile.interest==='number'?'마지막 게임 응답에 기록된 관심도입니다.':'아직 기록된 관계 정보가 없습니다.');
    if(!card.hidden)position();
  }
  function position(){
    const bounds=stage.getBoundingClientRect(),width=card.offsetWidth,height=card.offsetHeight;
    let x=point?point.x-bounds.left+20:bounds.width-width-16;
    let y=point?point.y-bounds.top+16:60;
    if(point&&x+width>bounds.width-12)x=point.x-bounds.left-width-20;
    card.style.left=Math.round(Math.max(12,Math.min(bounds.width-width-12,x)))+'px';
    card.style.top=Math.round(Math.max(12,Math.min(bounds.height-height-12,y)))+'px';
  }
  function show(event){
    clearTimeout(closeTimer);if(!current()||!state.character)return;
    point=event?.type?.startsWith('pointer')?{x:event.clientX,y:event.clientY}:null;
    card.hidden=false;button.setAttribute('aria-expanded','true');refresh();position();
  }
  function hide(){clearTimeout(closeTimer);pinned=false;card.hidden=true;button.setAttribute('aria-expanded','false');}
  function scheduleHide(){if(!pinned)closeTimer=setTimeout(hide,150);}
  $('characters').addEventListener('pointerover',event=>{if(event.target.matches('.person.ready'))show(event);});
  $('characters').addEventListener('pointerout',scheduleHide);
  $('characters').addEventListener('pointermove',event=>{
    if(card.hidden||pinned)return;point={x:event.clientX,y:event.clientY};
    if(!positionFrame)positionFrame=requestAnimationFrame(()=>{positionFrame=0;if(!card.hidden)position();});
  });
  button.addEventListener('pointerenter',show);button.addEventListener('pointerleave',scheduleHide);
  button.addEventListener('focus',()=>show());button.addEventListener('blur',scheduleHide);
  button.addEventListener('click',event=>{event.stopPropagation();if(pinned)hide();else{pinned=true;show();}});
  button.addEventListener('keydown',event=>event.stopPropagation());
  card.addEventListener('pointerenter',()=>clearTimeout(closeTimer));card.addEventListener('pointerleave',scheduleHide);
  card.addEventListener('click',event=>event.stopPropagation());
  stage.addEventListener('pointerleave',()=>{if(!pinned)hide();});
  stage.addEventListener('click',event=>{if(pinned&&!card.contains(event.target)&&event.target!==button)hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!card.hidden){event.stopImmediatePropagation();hide();}},true);
  new ResizeObserver(()=>{if(!card.hidden)position();}).observe(stage);
  return {refresh,hide};
}
