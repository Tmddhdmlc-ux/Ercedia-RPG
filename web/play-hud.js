import {locationLabel} from './location-label.js';
export function mountPlayHUD(state,{persist}){
  const $=id=>document.getElementById(id),game=document.querySelector('.game');
  const number=value=>typeof value==='number'?value.toLocaleString('ko-KR'):'—';
  function render(){
    const player=state.player;
    $('hud-player').textContent=player.name||'이름 미정';
    $('hud-level').textContent=`Lv.${number(player.level)}`;
    $('hud-hp').textContent=`${number(player.hp)} / ${number(player.maxHp)}`;
    $('hud-mp').textContent=`${number(player.mp)} / ${number(player.maxMp)}`;
    $('hud-xp').textContent=`${number(player.xp)} / ${number(player.requiredXp)}`;
    for(const [key,current,max] of [['hp',player.hp,player.maxHp],['mp',player.mp,player.maxMp],['xp',player.xp,player.requiredXp]]){
      const bar=$('hud-'+key+'-bar'),known=Number.isFinite(current)&&Number.isFinite(max)&&max>0;
      bar.max=known?max:1;bar.value=known?Math.max(0,Math.min(max,current)):0;bar.dataset.unknown=String(!known);
      bar.setAttribute('aria-valuetext',known?`${number(current)} / ${number(max)}`:'미정');
    }
    $('hud-location').textContent=locationLabel(state.scene?.location||state.gameState.place||'솔브린 마을');
    const size=state.uiPreferences?.textSize||'normal';game.dataset.textSize=size;$('text-size').value=size;
    $('portrait-hint').hidden=!state.character||!!state.uiPreferences?.portraitHintDismissed;
  }
  function dismissHint(){
    if(state.uiPreferences?.portraitHintDismissed)return;
    state.uiPreferences={...state.uiPreferences,portraitHintDismissed:true};render();persist();
  }
  $('hud-player').onclick=()=>$('status-tab').click();
  $('text-size').onchange=event=>{state.uiPreferences={...state.uiPreferences,textSize:event.target.value};render();persist();};
  $('dismiss-portrait-hint').onclick=event=>{event.stopPropagation();dismissHint();};
  $('portrait-hint').addEventListener('keydown',event=>event.stopPropagation());
  document.addEventListener('ercedia:npc-menu-open',dismissHint);
  return {render};
}
