// Kenney Interface Sounds (CC0). Cosmetic feedback, independent of game saves.
export const uiSamples={hover:['interface/tick_001','interface/tick_002'],click:['interface/select_001','interface/select_002']};
const controls='button,a[href],summary,select,[role="button"],[role="tab"],input[type="checkbox"],input[type="radio"]';
export function uiSoundTarget(target,relatedTarget=null){
  const control=target?.closest?.(controls);
  if(!control||control.matches(':disabled,[aria-disabled="true"],.ui-sound-toggle')||control.closest('[inert]'))return null;
  if(relatedTarget&&control.contains(relatedTarget))return null;
  return control;
}
export function createUIAudio({assetBase='',onStatus=()=>{},contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url),storage=()=>window.localStorage,now=()=>performance.now()}={}){
  let ctx,master,loading,ready=false,muted=false,error=false,lastHover=-Infinity,lastClick=-Infinity,played=0,hoverPlayed=0,clickPlayed=0,lastCue='';
  const buffers=new Map(),voices=new Set(),cursor={};
  // UI feedback starts enabled on every launch.
  const status=()=>({ready,muted,error,played,hoverPlayed,clickPlayed,lastCue});
  const report=()=>onStatus(status());
  function stop(){for(const s of voices){try{s.stop();}catch{}s.disconnect();}voices.clear();}
  async function prepare(){
    if(loading)return loading;
    try{
      if(!ctx){ctx=contextFactory();master=ctx.createGain();master.gain.value=.38;master.connect(ctx.destination);}
      error=false;loading=Promise.all(Object.values(uiSamples).flat().map(async name=>{if(buffers.has(name))return;const response=await fetchAudio(assetBase+'assets/audio/'+name+'.ogg');if(!response.ok)throw Error('UI sample unavailable');buffers.set(name,await ctx.decodeAudioData(await response.arrayBuffer()));})).then(()=>{ready=true;report();return true;}).catch(()=>{error=true;loading=null;report();return false;});
      return loading;
    }catch{error=true;report();return false;}
  }
  async function unlock(){if(muted)return false;try{const pending=prepare();if(ctx)await ctx.resume();await pending;return ready&&ctx?.state==='running';}catch{return false;}}
  function play(cue){
    if(!uiSamples[cue]||!ready||muted||ctx?.state!=='running')return false;
    const time=now();if(cue==='hover'&&time-lastHover<110||cue==='click'&&time-lastClick<35)return false;
    if(cue==='hover')lastHover=time;else lastClick=time;
    // A click replaces its hover accent, so one gesture never produces a stack of ticks.
    stop();const choices=uiSamples[cue],index=(cursor[cue]||0)%choices.length;cursor[cue]=index+1;
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffers.get(choices[index]);source.playbackRate.value=cue==='hover'?1.45:1.16;gain.gain.value=cue==='hover'?.30:.75;
    source.connect(gain);gain.connect(master);voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};source.start();played++;if(cue==='hover')hoverPlayed++;else clickPlayed++;lastCue=cue;report();return true;
  }
  function setMuted(value){muted=!!value;if(muted)stop();try{storage().setItem('ercedia-ui-muted',String(muted));}catch{}report();}
  return {prepare,unlock,play,setMuted,stop,status};
}
export function mountUIAudio(root,{assetBase='',audioFactory=createUIAudio}={}){
  const audio=audioFactory({assetBase,onStatus:s=>{root.dataset.uiSoundPlayed=String(s.played);root.dataset.uiSoundCue=s.lastCue;root.dataset.uiHoverPlayed=String(s.hoverPlayed);root.dataset.uiClickPlayed=String(s.clickPlayed);}});
  // Load once while the title is shown. Hover starts after the first trusted gesture.
  void audio.prepare();
  root.addEventListener('pointerdown',()=>{void audio.unlock();},{capture:true});
  root.addEventListener('keydown',event=>{if(['Enter',' ','Tab'].includes(event.key))void audio.unlock();},{capture:true});
  root.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const target=uiSoundTarget(event.target,event.relatedTarget);if(target&&target.id!=='stage')audio.play('hover');});
  root.addEventListener('click',event=>{if(!uiSoundTarget(event.target))return;const time=performance.now();void audio.unlock().then(()=>{if(performance.now()-time<120)audio.play('click');});},{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();});
  return audio;
}
