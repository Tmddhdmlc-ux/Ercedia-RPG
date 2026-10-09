import {voiceBanks,npcVoiceDefaults} from './voice-data.js';
import {castFrame} from './scene-cast.js';
export function normalizeVoicePreferences(raw={}){
  const banks={};for(const [id,bank] of Object.entries(raw.banks||{}).slice(0,256))if(Object.hasOwn(npcVoiceDefaults,id)&&voiceBanks[bank])banks[id]=bank;
  return {enabled:raw.enabled!==false,volume:Number.isFinite(raw.volume)?Math.max(0,Math.min(1,raw.volume)):.55,banks};
}
export function dialogueReaction(scene,index,preferences={}){
  const line=scene?.dialogue?.[index];if(!line||/^(나레이션|내레이션|narrator)$/i.test(line.speaker||'')||scene.battle)return null;
  const actor=scene.cast?castFrame(scene,index).find(p=>p.active):scene.npc;
  if(!actor||(line.speaker_id?line.speaker_id!==actor.id:line.speaker!==actor.speaker))return null;
  const bank=preferences.banks?.[actor.id]||npcVoiceDefaults[actor.id];if(!voiceBanks[bank])return null;
  let emotion=actor.emotion||'base';
  if(!scene.cast)for(const d of scene.dialogue.slice(0,index+1))if((d.speaker_id?d.speaker_id===actor.id:d.speaker===actor.speaker)&&d.emotion)emotion=d.emotion;
  const path=voiceBanks[bank].cues[emotion];if(!path)return null;
  return {id:actor.id,speaker:actor.speaker,bank,emotion,path,key:JSON.stringify([scene.scene_id||scene.id||scene,index,line,actor.id,bank,emotion])};
}
export function createVoiceAudio({assetBase='',contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url),onStatus=()=>{}}={}){
  let ctx,ready=null,revision=0,source=null,enabled=true,volume=.55,last=null;const cache=new Map();
  function stop(){revision++;if(source){try{source.stop();}catch{}source.disconnect();source=null;}onStatus({playing:false});}
  function unlock(){if(!ready)try{ctx=contextFactory();ready=Promise.resolve(ctx.resume()).then(()=>true).catch(()=>{ready=null;return false;});}catch{return Promise.resolve(false);}return ready;}
  async function play(cue){
    if(cue?.key===last)return false;last=cue?.key;stop();if(!cue||!enabled||!ready)return false;const ticket=revision;
    try{
      if(!await ready)return false;
      if(!cache.has(cue.path))cache.set(cue.path,(async()=>{const r=await fetchAudio(assetBase+cue.path);if(!r.ok)throw Error('Voice load failed');return ctx.decodeAudioData(await r.arrayBuffer());})().catch(e=>{cache.delete(cue.path);throw e;}));
      const buffer=await cache.get(cue.path);if(ticket!==revision||!enabled)return false;
      source=ctx.createBufferSource();source.buffer=buffer;const gain=ctx.createGain(),active=source;gain.gain.value=volume;source.connect(gain);gain.connect(ctx.destination);
      source.onended=()=>{active.disconnect();gain.disconnect();if(source===active){source=null;onStatus({playing:false});}};source.start();onStatus({playing:true,...cue});return true;
    }catch{if(ticket===revision)onStatus({playing:false,error:true});return false;}
  }
  function configure(p){enabled=p.enabled;volume=p.volume;if(!enabled)stop();}
  return {play,stop,unlock,configure};
}
export function mountVoiceAudio(root,{state,assetBase='',persist=()=>{},getScene=()=>state.scene,getIndex=()=>state.sceneIndex}={}){
  let current=null;const preferences=()=>normalizeVoicePreferences(state.uiPreferences?.voice);
  const audio=createVoiceAudio({assetBase,onStatus:s=>{root.dataset.voicePlaying=String(s.playing);root.dataset.voiceBank=s.playing?s.bank:'';root.dataset.voiceEmotion=s.playing?s.emotion:'';status.textContent=s.error?'음성을 불러오지 못했어요.':s.playing?`${s.speaker} · ${voiceBanks[s.bank].label}`:'표정에 맞춰 짧은 리액션이 재생됩니다.';}});
  const details=document.createElement('details'),summary=document.createElement('summary'),panel=document.createElement('div'),button=document.createElement('button'),select=document.createElement('select'),volume=document.createElement('input'),status=document.createElement('span');
  details.className='music-controls';panel.className='music-settings';summary.textContent='성우 리액션';button.type='button';select.setAttribute('aria-label','현재 화자 음색');
  for(const [id,label] of [['auto','기본 음색'],...Object.entries(voiceBanks).map(([id,b])=>[id,b.label])]){const option=document.createElement('option');option.value=id;option.textContent=label;select.append(option);}
  const label=document.createElement('label');label.textContent='성우 음량 ';volume.type='range';volume.min='0';volume.max='100';volume.setAttribute('aria-label','성우 음량');label.append(volume);status.setAttribute('role','status');status.textContent='표정에 맞춰 짧은 리액션이 재생됩니다.';
  panel.append(button,select,label,status);details.append(summary,panel);root.querySelector('.tabs')?.append(details);
  const blocked=()=>document.hidden||state.page!=='story'||root.dataset.title==='active'||root.dataset.battle==='active'||['black','map'].includes(root.dataset.introPhase);
  function refresh(){const p=preferences();audio.configure(p);button.textContent=p.enabled?'성우 끄기':'성우 켜기';volume.value=String(Math.round(p.volume*100));select.disabled=!current;select.value=current?(p.banks[current.id]||'auto'):'auto';select.title=current?current.speaker+'의 음색':'NPC 대사에서 선택하세요.';}
  function sync(){current=dialogueReaction(getScene(),getIndex(),preferences());refresh();if(blocked()){audio.stop();return;}void audio.play(current);}
  function save(p){state.uiPreferences={...state.uiPreferences,voice:p};persist();refresh();}
  button.onclick=()=>{const p=preferences();p.enabled=!p.enabled;save(p);};volume.oninput=()=>{const p=preferences();p.volume=Number(volume.value)/100;save(p);};
  select.onchange=()=>{if(!current)return;const p=preferences();if(select.value==='auto')delete p.banks[current.id];else p.banks[current.id]=select.value;save(p);sync();};
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{if(e.isTrusted)void audio.unlock();},{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();});
  new MutationObserver(()=>{if(blocked())audio.stop();}).observe(root,{attributes:true,attributeFilter:['data-title','data-battle','data-page','data-intro-phase']});
  refresh();return {sync,stop:audio.stop};
}
