// The approved five-second Serin cutscene. Audio changes presentation only.
export const ultimateAudioCues=[
 {id:'prepare',at:0,end:1450,label:'발검 · 차가운 쇳소리'},
 {id:'face',at:450,end:1250,label:'얼굴 컷인 · 검풍'},
 {id:'reveal',at:1450,end:3070,label:'전신 개방 · 광휘'},
 {id:'charge',at:1800,end:3070,label:'결의 · 칼날 공명'},
 {id:'anticipation',at:3070,end:3330,label:'일격 직전 · 역검풍'},
 {id:'strike',at:3450,end:5000,label:'결의의 일섬'},
 {id:'afterglow',at:3900,end:5000,label:'빛의 잔향'}
].map(c=>({...c,path:`assets/audio/ultimate/${c.id}.ogg`}));
export const ultimateSamplePaths=ultimateAudioCues.map(c=>c.path);
export function createUltimateAudio({assetBase='',contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url),onStatus=()=>{}}={}){
 let ctx,master,loading,ready=false,muted=false,volume=.7,error=false,lastCue='',played=0;
 const buffers=new Map(),voices=new Set(),fired=new Set();
 const status=()=>({ready,muted,volume,error,lastCue,played,active:voices.size});
 const report=()=>onStatus(status());
 function stop(){for(const v of voices){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}voices.clear();report();}
 async function unlock(){
  try{
   if(!ctx){ctx=contextFactory();master=ctx.createGain();const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-9;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.002;limiter.release.value=.12;master.gain.value=muted?0:volume;master.connect(limiter);limiter.connect(ctx.destination);}
   await ctx.resume();
   if(!loading)loading=Promise.all(ultimateAudioCues.map(async cue=>{if(buffers.has(cue.id))return;const r=await fetchAudio(assetBase+cue.path);if(!r.ok)throw Error('Ultimate audio load failed');const buffer=await ctx.decodeAudioData(await r.arrayBuffer());if(!(buffer.duration>0))throw Error('Empty audio');buffers.set(cue.id,buffer);})).then(()=>{ready=true;error=false;report();return true;}).catch(()=>{error=true;loading=null;report();return false;});
   return await loading;
  }catch{error=true;report();return false;}
 }
 function play(cue,elapsed,speed=1,resuming=false){
  if(!ready||muted||!volume||ctx?.state!=='running')return false;
  const buffer=buffers.get(cue.id),late=Math.max(0,(elapsed-cue.at)/1000),offset=resuming||late>.08?late:0;
  const length=Math.min(buffer.duration-offset,(cue.end-elapsed)/1000/Math.max(.5,Math.min(2,speed)));
  if(length<=.012)return false;
  while(voices.size>=4){const v=voices.values().next().value;v.source.stop();v.source.disconnect();v.gain.disconnect();voices.delete(v);}
  const source=ctx.createBufferSource(),gain=ctx.createGain(),time=ctx.currentTime;
  source.buffer=buffer;source.connect(gain);gain.connect(master);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(1,time+.004);gain.gain.setValueAtTime(1,time+Math.max(.004,length-.035));gain.gain.linearRampToValueAtTime(0,time+length);
  const voice={source,gain};voices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(voice);};source.start(time,offset,length);
  played++;lastCue=cue.id;report();return true;
 }
 function advance(elapsed,{speed=1}={}){
  if(elapsed>=5000){stop();return;}
  for(const cue of ultimateAudioCues){if(cue.at>elapsed||fired.has(cue.id))continue;fired.add(cue.id);play(cue,elapsed,speed);}
 }
 function reset(){stop();fired.clear();lastCue='';played=0;report();}
 function resume(elapsed,{speed=1}={}){for(const cue of ultimateAudioCues)if(['prepare','reveal','charge','afterglow'].includes(cue.id)&&fired.has(cue.id)&&elapsed>=cue.at&&elapsed<cue.end)play(cue,elapsed,speed,true);}
 function setMuted(value){muted=!!value;if(muted)stop();if(master)master.gain.value=muted?0:volume;report();}
 function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.value=muted?0:volume;if(!volume)stop();report();}
 return {unlock,advance,resume,reset,stop,setMuted,setVolume,status};
}
