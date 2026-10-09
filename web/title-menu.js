export function hasGameSave(state){return !!(state.scene||state.introDraft||state.intro_completed||state.player?.name?.trim()||state.player?.level!=null);}
export function mountTitleMenu(state,{newGame,render,isPending,openLoad,hasSlots=()=>false,assetBase='',registerSettings=()=>{},getSettingsStatus=()=>null}){
  const $=id=>document.getElementById(id),game=document.querySelector('.game'),screen=$('title-screen');
  const art=$('title-art');if(art)art.src=assetBase+'assets/title/title-ensemble-v1.png';
  let active=true,startedFromTitle=false,loading=false,error='',registrationRequested=false;
  function refresh(){
    screen.hidden=!active;screen.inert=!active;game.dataset.title=active?'active':'closed';document.body.classList.toggle('title-screen-active',active);
    if(active)for(const child of game.children)child.inert=child!==screen;
    const saved=hasGameSave(state)||hasSlots(),battle=!!state.battlePlayback&&!state.battlePlayback.done;$('title-load-game').disabled=loading||!saved||isPending()&&!battle;$('title-new-game').disabled=loading||isPending();
    const registration=getSettingsStatus(),button=$('title-register-settings');
    if(button){button.disabled=loading||isPending();button.textContent=registration?.busy?'설정 등록 중…':'새 채팅방 설정 등록';}
    $('title-load-note').textContent=registrationRequested&&registration?.message?registration.message:loading?'GitHub 최신 게임 설정을 불러오는 중…':error||(saved?'':'아직 저장된 게임이 없습니다.');
    $('title-return').disabled=isPending()||!!state.introDraft;
  }
  function enter(){active=false;startedFromTitle=false;for(const child of game.children)child.inert=false;render();document.dispatchEvent(new Event('ercedia:title-closed'));}
  $('title-new-game').onclick=async()=>{if(loading||isPending())return;loading=true;error='';refresh();try{const begun=await newGame.begin({restart:true});if(begun!==false){active=false;startedFromTitle=true;for(const child of game.children)child.inert=false;render();}}catch(e){error=e.message+' · 저장은 유지됩니다. 새게임 시작을 눌러 다시 시도하세요.';}finally{loading=false;refresh();}};
  $('title-load-game').onclick=()=>{if(!(hasGameSave(state)||hasSlots())||isPending()&&!(state.battlePlayback&&!state.battlePlayback.done))return;if(openLoad){openLoad();return;}enter();if(state.introDraft)document.getElementById('intro-input').focus({preventScroll:true});};
  const registrationButton=$('title-register-settings');
  if(registrationButton)registrationButton.onclick=async()=>{if(loading||isPending())return;registrationRequested=true;error='';try{await registerSettings();}finally{refresh();}};
  $('title-return').onclick=()=>{if(isPending()||state.introDraft)return;active=true;render();$('title-new-game').focus({preventScroll:true});};
  document.addEventListener('ercedia:intro-cancelled',()=>{if(startedFromTitle){startedFromTitle=false;active=true;render();$('title-new-game').focus({preventScroll:true});}});
  document.addEventListener('ercedia:intro-completed',()=>{startedFromTitle=false;});
  refresh();return {refresh,enter};
}
