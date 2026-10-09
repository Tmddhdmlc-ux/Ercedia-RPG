export const musicTracks=Object.fromEntries([
  ['title','타이틀 · 에르세디아의 서막'],
  ['village','마을 · 솔브린의 아침'],['night','밤 · 솔브린의 달빛'],['battle','전투 · 칼날의 공방'],
  ['border','국경 · 경계의 깃발'],['royal','왕실 · 황금의 알현'],['farEast','극동 · 먼 하늘의 잔향'],
  ['unexplored','미탐색 · 지도 밖의 길'],['boss','보스 · 압도하는 왕좌']
].map(([id,name])=>[id,{name,path:`assets/audio/music/${id}_v1.mp3`}]));
export function sceneMusic({battle=false,title=false,background='',place='',time=''}={}){
  if(title)return 'title';
  if(battle&&!title)return 'battle';
  if(!title){
    if(background==='IMG-SHARED-05'||/국경|검문소/.test(place))return 'border';
    if(background==='IMG-SHARED-09'||/국왕실|왕실|왕궁|알현실/.test(place))return 'royal';
    if(/극동/.test(place))return 'farEast';
    if(/미탐색|미개척|미탐사/.test(place))return 'unexplored';
  }
  const hour=String(time).match(/(?:^|\s)(\d{1,2}):\d{2}/);
  return /밤|심야|자정|새벽|night/i.test(time)||(hour&&(Number(hour[1])>=18||Number(hour[1])<6))?'night':'village';
}
export function createBackgroundMusic({tracks=musicTracks,initialVolume=.22,assetBase='',onStatus=()=>{},contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url)}={}){
  let ctx,master,enabled=false,desired=Object.keys(tracks)[0],active=null,volume=initialVolume,error=false,loading=false,revision=0,activation=0;
  const buffers=new Map(),loads=new Map(),voices=new Set();
  const status=()=>({enabled,desired,active,volume,error,loading});
  const report=()=>onStatus(status());
  function retire(fade=.8){const time=ctx?.currentTime||0;for(const voice of voices){voice.retired=true;voice.gain.gain.cancelScheduledValues(time);voice.gain.gain.setValueAtTime(voice.gain.gain.value,time);voice.gain.gain.linearRampToValueAtTime(0,time+fade);try{voice.source.stop(time+fade+.02);}catch{}}active=null;}
  async function load(name){
    if(buffers.has(name))return buffers.get(name);
    if(!loads.has(name))loads.set(name,(async()=>{const response=await fetchAudio(assetBase+tracks[name].path);if(!response.ok)throw Error('Music load failed');const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(buffer.duration<3)throw Error('Music too short');buffers.set(name,buffer);return buffer;})().catch(error=>{loads.delete(name);throw error;}));
    return loads.get(name);
  }
  async function select(name){
    if(!tracks[name])return false;desired=name;error=false;if(enabled&&active===name){report();return true;}const ticket=++revision;
    if(!enabled){report();return true;}if(active===name){report();return true;}
    loading=true;report();
    try{
      const buffer=await load(name);if(!enabled||ticket!==revision)return false;
      loading=false;retire();active=name;const overlap=1.2,step=buffer.duration-overlap;let next=ctx.currentTime;
      function schedule(){
        if(!enabled||ticket!==revision||active!==name)return;
        const source=ctx.createBufferSource(),gain=ctx.createGain(),time=Math.max(next,ctx.currentTime);next=time+step;
        source.buffer=buffer;source.connect(gain);gain.connect(master);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(1,time+overlap);gain.gain.setValueAtTime(1,time+step);gain.gain.linearRampToValueAtTime(0,time+buffer.duration);
        const voice={source,gain,retired:false};voices.add(voice);source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();if(!voice.retired)schedule();};source.start(time);
      }
      // Keep one whole track scheduled ahead; loop crossfades do not depend on short timers.
      schedule();schedule();report();return true;
    }catch{if(ticket===revision){error=true;loading=false;report();}return false;}
  }
  async function enable(){
    const ticket=++activation;
    try{if(!ctx){ctx=contextFactory();master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination);}await ctx.resume();if(ticket!==activation)return false;enabled=true;return await select(desired);}catch{error=true;report();return false;}
  }
  function pause(){activation++;enabled=false;loading=false;revision++;retire(.25);report();}
  function setVolume(value){volume=Math.max(0,Math.min(.7,Number(value)||0));if(master)master.gain.value=volume;report();}
  return {select,enable,pause,setVolume,status};
}
export function mountBackgroundMusic(root,{assetBase='',getScene=()=>({}),storage,audioFactory=createBackgroundMusic}={}){
  const controls=[];let mode='auto',wanted=true,saved={};
  try{saved=JSON.parse(storage?.getItem('ercedia.bgm.preferences')||'{}');}catch{}
  if(saved.enabled===false)wanted=false;
  if(saved.mode==='auto'||musicTracks[saved.mode])mode=saved.mode;
  function persist(){try{storage?.setItem('ercedia.bgm.preferences',JSON.stringify({enabled:wanted,mode,volume:music.status().volume}));}catch{}}
  const music=audioFactory({assetBase,onStatus:s=>{root.dataset.musicTrack=s.active||'';root.dataset.musicEnabled=String(s.enabled);for(const c of controls){c.summary.textContent=s.error?'BGM 다시 시도':s.loading?'BGM 준비 중':s.enabled&&s.volume===0?'BGM 음소거':s.enabled?'BGM · '+musicTracks[s.active||s.desired].name.split(' · ')[0]:'BGM 끔';c.button.textContent=s.enabled?'BGM 끄기':'BGM 켜기';c.volume.value=String(Math.round(s.volume*100));c.select.value=mode;}}});
  function sync(){void music.select(mode==='auto'?sceneMusic({...getScene(),battle:root.dataset.battle==='active',title:root.dataset.title==='active'}):mode);}
  for(const host of [root.querySelector('.title-content'),root.querySelector('.tabs')]){
    if(!host)continue;const details=document.createElement('details'),summary=document.createElement('summary'),panel=document.createElement('div'),button=document.createElement('button'),select=document.createElement('select'),volume=document.createElement('input');details.className='music-controls';panel.className='music-settings';summary.textContent='BGM 끔';button.type='button';button.textContent='BGM 켜기';
    select.setAttribute('aria-label','BGM 선택');for(const [value,text] of [['auto','장면에 맞게 자동'],...Object.entries(musicTracks).map(([id,t])=>[id,t.name])]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
    const label=document.createElement('label');label.textContent='BGM 음량 ';volume.type='range';volume.min='0';volume.max='70';volume.value='22';volume.step='2';volume.setAttribute('aria-label','BGM 음량');label.append(volume);
    panel.append(button,select,label);details.append(summary,panel);host.append(details);controls.push({summary,button,select,volume});
    button.onclick=()=>{wanted=!music.status().enabled;if(wanted)void music.enable();else music.pause();persist();};select.onchange=()=>{mode=select.value;sync();persist();};volume.oninput=()=>{music.setVolume(Number(volume.value)/100);persist();};
  }
  if(Number.isFinite(saved.volume))music.setVolume(saved.volume);
  function activate(event){if(!event.isTrusted||event.target.closest?.('.music-controls'))return;if(wanted&&(!music.status().enabled||music.status().error)&&!music.status().loading)void music.enable();}
  document.addEventListener('pointerdown',activate,{capture:true});document.addEventListener('keydown',activate,{capture:true});document.addEventListener('click',activate,{capture:true});
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-battle','data-title']});sync();return {...music,sync};
}
