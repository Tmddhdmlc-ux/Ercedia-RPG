export function mountNPCInfo(state){
  const $=id=>document.getElementById(id),stage=$('stage'),card=$('npc-info-card'),button=$('npc-info-button');
  const menu=$('npc-action-menu'),view=$('npc-view-info');
  const close=document.createElement('button');close.type='button';close.className='npc-info-close';close.textContent='닫기 ×';card.prepend(close);
  let point=null,trigger=button;
  const display=value=>typeof value==='number'?value.toLocaleString('ko-KR'):'미정';
  const current=()=>state.scene?state.scene.npc:(state.character?{id:'serin',speaker:'세린'}:null);
  function refresh(){
    const npc=current(),profile=npc?.profile||{};
    button.hidden=!npc||!state.character;
    if(button.hidden){hide();return;}
    const name=profile.name||npc.speaker||'이름 미정';
    button.textContent=`${name} · 메뉴`;$('npc-menu-name').textContent=name;
    stage.querySelectorAll('.person').forEach(image=>{image.tabIndex=image.hidden?-1:0;image.setAttribute('role','button');image.setAttribute('aria-label',`${name} 초상화 · 메뉴 열기`);image.setAttribute('aria-controls','npc-action-menu');});
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
    if(!card.hidden)position(card);if(!menu.hidden)position(menu);
  }
  function position(panel){
    const bounds=stage.getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight;
    let x=point?point.x-bounds.left+20:bounds.width-width-16;
    let y=point?point.y-bounds.top+16:60;
    if(point&&x+width>bounds.width-12)x=point.x-bounds.left-width-20;
    panel.style.left=Math.round(Math.max(12,Math.min(bounds.width-width-12,x)))+'px';
    panel.style.top=Math.round(Math.max(12,Math.min(bounds.height-height-12,y)))+'px';
  }
  function openMenu(event){
    if(!current()||!state.character)return;
    trigger=event?.target?.matches('.person')?event.target:button;
    point=event?.type==='click'&&event.detail?{x:event.clientX,y:event.clientY}:null;
    card.hidden=true;menu.hidden=false;button.setAttribute('aria-expanded','true');refresh();position(menu);view.focus({preventScroll:true});
  }
  function hide(restoreFocus=false){card.hidden=true;menu.hidden=true;button.setAttribute('aria-expanded','false');if(restoreFocus&&!trigger.hidden)trigger.focus({preventScroll:true});}
  $('characters').addEventListener('click',event=>{if(event.target.matches('.person.ready')){event.stopPropagation();openMenu(event);}});
  $('characters').addEventListener('keydown',event=>{if(event.target.matches('.person.ready')&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();openMenu(event);}});
  button.addEventListener('click',event=>{event.stopPropagation();if(!menu.hidden)hide();else openMenu(event);});
  button.addEventListener('keydown',event=>event.stopPropagation());
  for(const panel of [menu,card]){panel.addEventListener('click',event=>event.stopPropagation());panel.addEventListener('keydown',event=>event.stopPropagation());}
  view.onclick=()=>{menu.hidden=true;card.hidden=false;button.setAttribute('aria-expanded','false');refresh();position(card);close.focus({preventScroll:true});};
  close.onclick=()=>hide(true);
  stage.addEventListener('click',event=>{if((!card.hidden||!menu.hidden)&&!card.contains(event.target)&&!menu.contains(event.target)&&event.target!==button&&!event.target.matches('.person.ready')){event.stopImmediatePropagation();hide();}},true);
  document.addEventListener('click',event=>{if(!stage.contains(event.target))hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(!card.hidden||!menu.hidden)){event.preventDefault();event.stopImmediatePropagation();hide(true);}},true);
  new ResizeObserver(()=>{if(!card.hidden)position(card);if(!menu.hidden)position(menu);}).observe(stage);
  return {refresh,hide};
}
