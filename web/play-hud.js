export function mountPlayHUD(state,{persist}){
  const $=id=>document.getElementById(id),game=document.querySelector('.game');
  const number=value=>typeof value==='number'?value.toLocaleString('ko-KR'):'—';
  function render(){
    const player=state.player;
    $('hud-player').textContent=player.name||'이름 미정';
    $('hud-hp').textContent=`${number(player.hp)} / ${number(player.maxHp)}`;
    $('hud-mp').textContent=`${number(player.mp)} / ${number(player.maxMp)}`;
    $('hud-location').textContent=state.scene?.location||state.gameState.place||'써니 빌리지';
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
