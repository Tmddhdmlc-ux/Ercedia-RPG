// External licensed samples (CC0 / CC BY 4.0; see skills/CREDITS.md). Audio is presentation only and never changes combat data.
import {skillAudioProfiles,skillSamplePaths} from './skill-audio-profiles.js';
import {monsterSamplePaths} from './voice-data.js';
import {monsterCombatPath} from './monster-audio.js';
export const impactSamples={
  hit:['starninjas/sword_3','starninjas/sword_4','starninjas/sword_6'],
  critical:['starninjas/sword_1','starninjas/sword_2'],
  block:['kenney/impactMetal_medium_000','kenney/impactMetal_medium_001'],
  dodge:['kenney/knifeSlice','kenney/knifeSlice2'],
  magicHit:['kenney/impactPunch_medium_000','kenney/impactPunch_medium_001','kenney/impactPunch_medium_002'],
  magicCritical:['kenney/impactPunch_heavy_000','kenney/impactPunch_heavy_001']
};
export function impactCue(event){
  if(!['attack','counter','magic','unique','defend'].includes(event.kind))return null;
  if(event.result==='dodge')return 'dodge';
  if(event.result==='block'||event.kind==='defend')return 'block';
  if(!(event.damage>0))return null;
  if(event.kind==='magic')return event.result==='critical'?'magicCritical':'magicHit';
  return event.result==='critical'?'critical':'hit';
}
export function createBattleAudio({assetBase='',onStatus=()=>{},contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url),storage=()=>window.localStorage}={}){
  let ctx,master,loading,ready=false,unlocked=false,muted=false,volume=.65,error=false,played=0,lastCue=null,monsterPlayed=0,lastMonsterCue=null;
  const buffers=new Map(),sampleGain=new Map(),voices=new Set(),cursor={};
  try{const saved=JSON.parse(storage().getItem('ercedia-impact-audio')||'null');if(saved){muted=saved.muted===true;if(Number.isFinite(saved.volume))volume=Math.max(0,Math.min(1,saved.volume));}}catch{}
  const status=()=>({ready,unlocked,muted,volume,error,played,lastCue,monsterPlayed,lastMonsterCue,active:voices.size});
  const report=()=>onStatus(status());
  function save(){try{storage().setItem('ercedia-impact-audio',JSON.stringify({muted,volume}));}catch{}}
  function stop(){for(const source of voices){try{source.stop();}catch{}source.disconnect();}voices.clear();}
  async function unlock(){
    try{
      if(!ctx){ctx=contextFactory();master=ctx.createGain();const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.08;master.connect(limiter);limiter.connect(ctx.destination);master.gain.value=muted?0:volume;}
      // Resume immediately in the trusted click; no delayed impacts are queued.
      await ctx.resume();unlocked=ctx.state==='running';
      if(!loading){error=false;loading=Promise.all([...new Set([...Object.values(impactSamples).flat(),...skillSamplePaths,...monsterSamplePaths])].map(async name=>{
        if(buffers.has(name))return;
        const response=await fetchAudio(assetBase+(name.startsWith('assets/')?name:'assets/audio/'+name+'.ogg'));
        if(!response.ok)throw Error('Audio load failed');
        const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
        if(name.startsWith('assets/audio/skills/')&&buffer.getChannelData){let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const value of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(value));sampleGain.set(name,peak>.001?Math.min(3,.7/peak):1);}
        buffers.set(name,buffer);
      })).then(()=>{ready=true;error=false;report();}).catch(()=>{loading=null;error=true;report();});}
      report();await loading;return ready&&unlocked;
    }catch{error=true;report();return false;}
  }
  function play(event,phase='impact'){
    const profile=skillAudioProfiles[event.skill_id],eligible=['attack','counter','magic','unique','defend'].includes(event.kind);
    const layers=event.monsterSample?[{path:event.monsterSample,gain:.65,rate:1,delay:0}]:eligible&&profile&&(phase==='cast'||!['dodge','block'].includes(event.result))?profile[phase]:null;
    const cue=event.monsterSample?'monster:'+event.result:layers?event.skill_id+':'+phase:phase==='impact'?impactCue(event):null;
    if(!cue||!ready||muted||volume===0||ctx?.state!=='running')return false;
    const choices=impactSamples[cue]||[],index=choices.length?(cursor[cue]||0)%choices.length:0;cursor[cue]=index+1;
    while(voices.size>=4){const oldest=voices.values().next().value;oldest.stop();oldest.disconnect();voices.delete(oldest);}
    const sources=[],nodes=[];let remaining=0,closed=false;
    const voice={stop(){for(const s of sources){try{s.stop();}catch{}}},disconnect(){if(closed)return;closed=true;for(const n of [...sources,...nodes])n.disconnect();voices.delete(voice);}};
    voices.add(voice);
    function track(source){sources.push(source);remaining++;source.onended=()=>{if(--remaining===0)voice.disconnect();};return source;}
    function gainNode(amount){const gain=ctx.createGain();gain.gain.value=amount;nodes.push(gain);gain.connect(master);return gain;}
    function sample(name,amount,rate=1,delay=0,cutoff=0,length){
      amount*=sampleGain.get(name)||1;
      const source=track(ctx.createBufferSource()),gain=gainNode(amount);source.buffer=buffers.get(name);source.playbackRate.value=rate;
      if(cutoff){const filter=ctx.createBiquadFilter();filter.type='highpass';filter.frequency.value=cutoff;nodes.push(filter);source.connect(filter);filter.connect(gain);}else source.connect(gain);
      const time=ctx.currentTime+delay,duration=Math.min(length||source.buffer.duration,source.buffer.duration);
      gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(amount,time+.008);gain.gain.setValueAtTime(amount,time+Math.max(.008,duration/rate-.035));gain.gain.linearRampToValueAtTime(0,time+duration/rate);
      source.start(time,0,duration);
    }
    function tone(type,from,to,amount,length,delay=0){
      const source=track(ctx.createOscillator()),gain=gainNode(0),time=ctx.currentTime+delay;source.type=type;
      source.frequency.setValueAtTime(from,time);source.frequency.exponentialRampToValueAtTime(to,time+length);
      gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(amount,time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
      source.connect(gain);source.start(time);source.stop(time+length+.01);
    }
    if(layers){for(const l of layers)sample(l.path,l.gain,l.rate,l.delay,0,l.length);}
    else if(cue==='hit'||cue==='critical'){
      const critical=cue==='critical',name=choices[index];
      // Faster blade, cutting-air accent and pitched shimmer make a fantasy game slash.
      sample(name,critical?.70:.62,critical?1.12:1.35,0,critical?280:500);
      sample(impactSamples.dodge[index%2],critical?.32:.24,critical?1.45:1.8,0,1100,.18);
      sample(name,critical?.15:.09,1.65,critical?.075:.045,1600,.20);
      tone('triangle',critical?2300:1900,critical?850:1100,critical?.07:.045,critical?.14:.085);
      if(critical)tone('sine',110,46,.16,.15);
    }else sample(choices[index],cue==='block'?.58:cue==='dodge'?.6:.82);
    played++;lastCue=cue;if(event.monsterSample){monsterPlayed++;lastMonsterCue=event.result;}report();return true;
  }
  function setMuted(value){muted=!!value;if(muted)stop();if(master)master.gain.value=muted?0:volume;save();report();}
  function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.value=muted?0:volume;if(volume===0)stop();save();report();}
  function playMonster(participant,phase){const path=monsterCombatPath(participant,phase);return path?play({monsterSample:path,result:phase}):false;}
  return {unlock,play,playMonster,stop,setMuted,setVolume,status};
}
export function mountBattleAudio(controls,assetBase){
  const button=document.createElement('button'),label=document.createElement('label'),slider=document.createElement('input'),note=document.createElement('span');
  button.type='button';button.id='battle-sound';slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.id='battle-volume';slider.setAttribute('aria-label','타격음 음량');
  label.style.whiteSpace='nowrap';label.textContent='전투음 ';label.append(slider);note.id='battle-audio-status';note.setAttribute('role','status');note.style.fontSize='12px';
  const audio=createBattleAudio({assetBase,onStatus:s=>{note.dataset.played=String(s.played);note.dataset.cue=s.lastCue||'';note.dataset.monsterPlayed=String(s.monsterPlayed);note.dataset.monsterCue=s.lastMonsterCue||'';button.textContent=s.muted?'소리 켜기':s.unlocked?'소리 끄기':'소리 켜기';button.setAttribute('aria-pressed',String(s.unlocked&&!s.muted));slider.value=String(Math.round(s.volume*100));note.textContent=s.error?'음원 로드 실패 · 다시 켜기':s.ready?(s.muted?'음소거':'전투음 준비됨'):s.unlocked?'음원 준비 중':'클릭하면 타격음이 켜집니다';}});
  slider.value=String(Math.round(audio.status().volume*100));button.textContent='소리 켜기';note.textContent='클릭하면 타격음이 켜집니다';
  button.onclick=async()=>{const s=audio.status();if(s.unlocked&&!s.muted&&!s.error){audio.setMuted(true);return;}audio.setMuted(false);await audio.unlock();};
  slider.oninput=()=>audio.setVolume(Number(slider.value)/100);
  const credit=document.createElement('details'),summary=document.createElement('summary'),sources=document.createElement('span');summary.textContent='효과음 출처';sources.innerHTML='<a href="https://opengameart.org/node/138619" target="_blank" rel="noopener">8 Magic Attacks · leohpaz</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> (재생 시 길이·음높이·믹스 조정) / <a href="https://opengameart.org/node/86018" target="_blank" rel="noopener">rubberduck</a> · <a href="https://opengameart.org/content/magic-spell-sfx" target="_blank" rel="noopener">JaggedStone</a> · Kenney · StarNinjas (CC0)';credit.append(summary,sources);controls.append(button,label,note,credit);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();});
  return audio;
}
