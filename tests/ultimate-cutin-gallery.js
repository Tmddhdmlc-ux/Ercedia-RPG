'use strict';
(async()=>{
const plan=await fetch('../characters/ultimate_cutin_plan.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
const entries=plan.characters.filter(c=>c.versions?.some(v=>['expert','hyper','circle3','circle6'].includes(v.tier)));
const labels={expert:'익스퍼트',hyper:'하이퍼',circle3:'3서클',circle6:'6서클'};
const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};
function render(){
const needle=document.querySelector('#query').value.trim().toLowerCase(),kind=document.querySelector('#kind').value,ready=document.querySelector('#ready').checked;
const out=document.querySelector('#gallery');out.replaceChildren();
for(const c of entries){
const k=c.versions.some(v=>v.tier==='expert')?'knight':'mage';
if(kind&&kind!==k||needle&&!((c.name+' '+c.id).toLowerCase().includes(needle))||ready&&!c.versions.some(v=>v.image))continue;
const card=el('section');card.className='pair';card.append(el('h2',c.name+' · '+c.id),el('p',c.ability_name||''));
const grid=el('div');grid.className='images';
for(const v of c.versions){
const f=el('figure');
if(v.image){const a=el('a');a.href='../'+v.image;a.target='_blank';a.rel='noopener';const im=el('img');im.src=a.href;im.alt=c.name+' '+labels[v.tier];im.loading='lazy';a.append(im);f.append(a);}
else {const p=el('div','제작 대기');p.className='pending';f.append(p);}
const cap=el('figcaption',labels[v.tier]||v.tier);cap.append(el('small',v.scope==='future_hypothetical'?'미래 경지 시안 · 현재 미습득':'현재 경지 기반 시안'));f.append(cap);
if(v.image)f.append(el('small',v.user_approved?'기존 승인 원화':'원화 검수 대기'));
const detail=el('details'),summary=el('summary','동작 설정');detail.append(summary,el('p',v.design?.action||''));f.append(detail);grid.append(f);
}card.append(grid);out.append(card);}
}
const made=entries.reduce((n,c)=>n+c.versions.filter(v=>v.image).length,0);
document.querySelector('#summary').textContent=entries.length+'명 · '+made+'/'+entries.length*2+'장 저장';
for(const id of ['query','kind','ready'])document.getElementById(id).addEventListener('input',render);render();
})().catch(e=>{document.querySelector('#summary').textContent='원화 목록을 불러오지 못했습니다: '+e.message;});
