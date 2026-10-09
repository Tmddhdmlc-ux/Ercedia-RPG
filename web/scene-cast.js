import {characterVisual,artBase} from './character-art.js';
import {faceFit} from './face-fit.js';
export function castFrame(scene,index){
  const cast=scene?.cast||[],lines=scene?.dialogue||[],current=lines[index];
  const speaker=line=>line?.speaker_id||cast.find(p=>p.speaker===line?.speaker)?.id||null;
  const active=speaker(current);
  return cast.map(p=>{
    let emotion=p.emotion;
    for(const line of lines.slice(0,index+1))if(speaker(line)===p.id&&line.emotion)emotion=line.emotion;
    return {...p,emotion,active:p.id===active};
  });
}
export function mountSceneCast(state,{assetBase,onSelect}){
  const root=document.getElementById('scene-cast');
  const slots=Array.from({length:3},()=>{
    const slot=document.createElement('div'),canvas=document.createElement('div'),body=new Image(),face=new Image(),name=document.createElement('button');
    slot.className='cast-slot';canvas.className='cast-canvas';body.className='person cast-body';face.className='cast-face';name.className='cast-name';name.type='button';face.hidden=true;
    body.draggable=face.draggable=false;body.setAttribute('role','button');body.tabIndex=0;
    body.onload=()=>{body.classList.add('ready');slot.dataset.failed='false';face.hidden=slot.dataset.npcId!=='serin'||face.dataset.ready!=='true';};
    body.onerror=()=>{body.classList.remove('ready');slot.dataset.failed='true';face.hidden=true;};
    face.onload=()=>{face.dataset.ready='true';face.hidden=slot.dataset.npcId!=='serin'||!body.classList.contains('ready');};face.onerror=()=>{face.dataset.ready='false';face.hidden=true;};
    const select=event=>{event.stopPropagation();onSelect(slot.dataset.npcId,event);};
    body.onclick=name.onclick=select;body.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(event);}};
    canvas.append(body,face);slot.append(canvas,name);root.append(slot);return {slot,canvas,body,face,name};
  });
  return {hide(){root.hidden=true;},render(){
    const frame=castFrame(state.scene,state.sceneIndex);root.hidden=!frame.length||!state.character;root.dataset.count=frame.length;
    slots.forEach((s,i)=>{
      const p=frame[i];s.slot.hidden=!p;if(!p)return;
      s.slot.dataset.npcId=p.id;s.slot.dataset.active=String(p.active);s.name.textContent=p.speaker+(p.active?' · 대화 중':'');
      s.body.dataset.npcId=p.id;
      s.body.setAttribute('aria-label',`${p.speaker} 초상화 · 메뉴 열기`);s.body.alt=p.speaker+' 스탠딩';
      const art=characterVisual(p.id,p.outfit,p.emotion);
      if(!art){s.body.hidden=true;s.slot.dataset.failed='true';s.face.hidden=true;return;}
      s.body.hidden=false;const base=artBase(assetBase),url=base+art.path;
      if(s.body.getAttribute('src')!==url){s.body.classList.remove('ready');s.slot.dataset.failed='false';s.body.src=url;}
      s.canvas.dataset.kind=art.kind;
      if(p.id==='serin'){
        const fit=faceFit[p.outfit];s.face.style.left=fit.x/1024*100+'%';s.face.style.top=fit.y/1536*100+'%';s.face.style.width=fit.size/1024*100+'%';
        const faceURL=base+`assets/characters/main/serin/faces/${p.emotion}.png`;
        if(s.face.getAttribute('src')!==faceURL){s.face.hidden=true;s.face.dataset.ready='false';s.face.src=faceURL;}
      }else s.face.hidden=true;
    });
  }};
}
