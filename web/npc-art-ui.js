import {characterVisual,artBase} from './character-art.js';
import {mountCharacterFit} from './character-layout.js';
export function mountNPCArt({assetBase,status}){
  const image=new Image();image.className='person npc-standing';image.hidden=true;image.draggable=false;
  document.getElementById('characters').append(image);
  const sizing=mountCharacterFit(document.getElementById('characters'),[image]);
  let active=null,failed=false;
  image.onload=()=>{image.classList.add('ready');failed=false;status.textContent=active.name+' · '+active.emotion;};
  image.onerror=()=>{image.classList.remove('ready');failed=true;status.textContent=active.name+' · 원화 로드 실패';};
  return {image,hide(){image.hidden=true;},render(npc,visible){
    const art=characterVisual(npc.id,npc.outfit,npc.emotion);if(!art){image.hidden=true;return;}
    active={name:npc.speaker,emotion:art.emotion};image.hidden=!visible;image.alt=npc.speaker+(art.kind==='monster'?' 마수 초상화':' 전신 스탠딩');
    image.classList.toggle('npc-monster',art.kind==='monster');
    sizing.set(npc.id,art);
    const url=artBase(assetBase)+art.path;
    if(image.getAttribute('src')!==url){image.classList.remove('ready');image.src=url;status.textContent=npc.speaker+' · 원화 로딩 중';}
    else status.textContent=npc.speaker+(failed?' · 원화 로드 실패':' · '+art.emotion);
  }};
}
