import {mapData} from './map-data.js';
import {lordships} from './lordship-data.js';
import {factionLocations} from './faction-data.js';

// Only public map facts and people explicitly present in the current scene.
export function dialogueGlossary(scene=null){
  const terms=new Map();
  const add=(name,description)=>{if(name&&description&&!terms.has(name))terms.set(name,{name,description});};
  add('에르세디아','북부 미개척지와 중남부 인간 문명권, 주변 군도가 있는 대륙.');
  for(const [name,description] of [['벨로아','서부 왕국. 평야와 농경지, 기사·기병 문화가 발달한 인간 국가.'],['드라켄','동부 왕국. 고원·산맥과 마나 광산, 마법 연구가 특징인 인간 국가.'],['루메린','남부 왕국. 해안과 항구를 중심으로 해상 무역이 발달한 인간 국가.']]){
    add(name+' 왕국',description);add(name,description);
  }
  for(const p of mapData.locations){
    if(p.kind!=='lordship')continue;
    const l=lordships[p.id];
    add(p.label,`${p.kingdom} 왕국의 영주령. 영주: ${p.lord}. ${l?.terrain||''}`);
    add(p.lord,`${p.label}의 현직 영주. 소속: ${p.kingdom} 왕국.`);
  }
  for(const p of factionLocations){
    add(p.name,`${p.group}. ${p.detail}${p.leader?' 대표 인물: '+p.leader+'.':''}`);
    add(p.group,`${p.detail}${p.leader?' 대표 인물: '+p.leader+'.':''}`);
    if(p.leader)add(p.leader,`${p.group}의 공개 대표 인물.`);
  }
  for(const p of scene?.cast||[scene?.npc].filter(Boolean)){
    add(p.speaker,p.id==='serin'?'세린. 현재 장면에 등장한 베이직 나이트.':`현재 장면의 대화 참가자.${p.profile?.affiliation?' 소속: '+p.profile.affiliation+'.':''}`);
  }
  return [...terms.values()];
}

export function splitDialogueTerms(text,terms){
  const byName=new Map(terms.filter(t=>t.name&&t.description).map(t=>[t.name,t]));
  if(!byName.size)return [{text}];
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp([...byName.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|'),'gu');
  const parts=[];let end=0;
  for(const match of text.matchAll(pattern)){
    // Prevent a name from highlighting inside a longer unrelated word.
    if(match.index>0&&/[\p{L}\p{N}_]/u.test(text[match.index-1]))continue;
    if(/[A-Za-z0-9_]/.test(text[match.index+match[0].length]||''))continue;
    if(match.index>end)parts.push({text:text.slice(end,match.index)});
    parts.push({text:match[0],term:byName.get(match[0])});end=match.index+match[0].length;
  }
  if(end<text.length)parts.push({text:text.slice(end)});
  return parts.length?parts:[{text}];
}

export function renderDialogueTerms(element,text,scene=null){
  const doc=element.ownerDocument;
  // Desktop enhancement only; mobile dialogue rendering stays unchanged.
  if(!doc?.defaultView?.matchMedia?.('(hover: hover) and (pointer: fine)').matches){element.textContent=text;return;}
  element.replaceChildren();
  for(const part of splitDialogueTerms(text,dialogueGlossary(scene))){
    if(!part.term){element.append(doc.createTextNode(part.text));continue;}
    const word=doc.createElement('span');word.className='dialogue-term';word.textContent=part.text;
    word.tabIndex=0;word.dataset.description=part.term.description;word.setAttribute('aria-label',part.term.name+' — '+part.term.description);
    element.append(word);
  }
}

export function mountDialogueGlossary(element){
  const doc=element.ownerDocument,win=doc.defaultView;
  const tip=doc.createElement('div');tip.id='dialogue-term-tooltip';tip.className='dialogue-term-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;
  (element.closest('.game')||doc.body).append(tip);
  let active=null;
  const hide=()=>{active?.removeAttribute('aria-describedby');active=null;tip.hidden=true;};
  const show=word=>{
    hide();if(!word?.classList.contains('dialogue-term'))return;
    active=word;tip.textContent=word.dataset.description;tip.hidden=false;word.setAttribute('aria-describedby',tip.id);
    const b=word.getBoundingClientRect(),width=tip.offsetWidth,height=tip.offsetHeight;
    tip.style.left=Math.max(8,Math.min(win.innerWidth-width-8,b.left))+'px';
    tip.style.top=Math.max(8,b.top-height-10>=8?b.top-height-10:Math.min(win.innerHeight-height-8,b.bottom+10))+'px';
  };
  element.addEventListener('mouseover',e=>show(e.target.closest?.('.dialogue-term')));
  element.addEventListener('mouseout',hide);
  element.addEventListener('focusin',e=>show(e.target));element.addEventListener('focusout',hide);
  doc.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  win.addEventListener('resize',hide);doc.addEventListener('scroll',hide,true);
  new win.MutationObserver(hide).observe(element,{childList:true});
}
