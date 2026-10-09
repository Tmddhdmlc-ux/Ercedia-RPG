// External CC0 samples. Audio is presentation only and never changes combat data.
export const impactSamples={
  hit:['impactPunch_medium_000','impactPunch_medium_001','impactPunch_medium_002'],
  critical:['impactPunch_heavy_000','impactPunch_heavy_001'],
  block:['impactMetal_medium_000','impactMetal_medium_001'],
  dodge:['knifeSlice','knifeSlice2']
};
export function impactCue(event){
  if(!['attack','counter','magic','unique','defend'].includes(event.kind))return null;
  if(event.result==='dodge')return 'dodge';
  if(event.result==='block'||event.kind==='defend')return 'block';
  if(!(event.damage>0))return null;
  return event.result==='critical'?'critical':'hit';
}
export function createBattleAudio({assetBase='',onStatus=()=>{},contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url),storage=()=>window.localStorage}={}){
  let ctx,master,loading,ready=false,unlocked=false,muted=false,volume=.65,error=false,played=0,lastCue=null;
  const buffers=new Map(),voices=new Set(),cursor={};
  try{const saved=JSON.parse(storage().getItem('ercedia-impact-audio')||'null');if(saved){muted=saved.muted===true;if(Number.isFinite(saved.volume))volume=Math.max(0,Math.min(1,saved.volume));}}catch{}
  const status=()=>({ready,unlocked,muted,volume,error,played,lastCue,active:voices.size});
  const report=()=>onStatus(status());
  function save(){try{storage().setItem('ercedia-impact-audio',JSON.stringify({muted,volume}));}catch{}}
  function stop(){for(const source of voices){try{source.stop();}catch{}source.disconnect();}voices.clear();}
  async function unlock(){
    try{
      if(!ctx){ctx=contextFactory();master=ctx.createGain();master.connect(ctx.destination);master.gain.value=muted?0:volume;}
      // Resume immediately in the trusted click; no delayed impacts are queued.
      await ctx.resume();unlocked=ctx.state==='running';
      if(!loading){error=false;loading=Promise.all(Object.values(impactSamples).flat().map(async name=>{
        if(buffers.has(name))return;
        const response=await fetchAudio(assetBase+'assets/audio/kenney/'+name+'.ogg');
        if(!response.ok)throw Error('Audio load failed');
        buffers.set(name,await ctx.decodeAudioData(await response.arrayBuffer()));
      })).then(()=>{ready=true;error=false;report();}).catch(()=>{loading=null;error=true;report();});}
      report();await loading;return ready&&unlocked;
    }catch{error=true;report();return false;}
  }
  function play(event){
    const cue=impactCue(event);
    if(!cue||!ready||muted||volume===0||ctx?.state!=='running')return false;
    const choices=impactSamples[cue],index=(cursor[cue]||0)%choices.length;cursor[cue]=index+1;
    while(voices.size>=4){const oldest=voices.values().next().value;oldest.stop();voices.delete(oldest);}
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffers.get(choices[index]);
    gain.gain.value=cue==='critical'?.95:cue==='block'?.58:cue==='dodge'?.6:.82;
    source.connect(gain);gain.connect(master);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
    source.start();played++;lastCue=cue;report();return true;
  }
  function setMuted(value){muted=!!value;if(muted)stop();if(master)master.gain.value=muted?0:volume;save();report();}
  function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.value=muted?0:volume;if(volume===0)stop();save();report();}
  return {unlock,play,stop,setMuted,setVolume,status};
}
export function mountBattleAudio(controls,assetBase){
  const button=document.createElement('button'),label=document.createElement('label'),slider=document.createElement('input'),note=document.createElement('span');
  button.type='button';button.id='battle-sound';slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.id='battle-volume';slider.setAttribute('aria-label','타격음 음량');
  label.style.whiteSpace='nowrap';label.textContent='타격음 ';label.append(slider);note.id='battle-audio-status';note.setAttribute('role','status');note.style.fontSize='12px';
  const audio=createBattleAudio({assetBase,onStatus:s=>{note.dataset.played=String(s.played);note.dataset.cue=s.lastCue||'';button.textContent=s.muted?'소리 켜기':s.unlocked?'소리 끄기':'소리 켜기';button.setAttribute('aria-pressed',String(s.unlocked&&!s.muted));slider.value=String(Math.round(s.volume*100));note.textContent=s.error?'음원 로드 실패 · 다시 켜기':s.ready?(s.muted?'음소거':'타격음 준비됨'):s.unlocked?'음원 준비 중':'클릭하면 타격음이 켜집니다';}});
  slider.value=String(Math.round(audio.status().volume*100));button.textContent='소리 켜기';note.textContent='클릭하면 타격음이 켜집니다';
  button.onclick=async()=>{const s=audio.status();if(s.unlocked&&!s.muted&&!s.error){audio.setMuted(true);return;}audio.setMuted(false);await audio.unlock();};
  slider.oninput=()=>audio.setVolume(Number(slider.value)/100);
  controls.append(button,label,note);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();});
  return audio;
}
