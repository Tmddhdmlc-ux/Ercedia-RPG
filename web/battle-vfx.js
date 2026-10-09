import {swordProfiles,swordTiming,createSwordRenderer} from './sword-vfx.js';
import {createElementalRenderer,palettes,sampleTiming} from './elemental-vfx.js';
import {effectProfiles,skillEffectSVG} from './skill-effects.js';
import {engineData} from './engine-data.js';
// A visual family plus each skill's own contour, angle and variant. No mechanical adjudication.
const magicFamilies=['fire-orb','water-orb','wind-vortex','lightning-chain','dark-mist','light-burst','fire-rain','water-orb','wind-arrow','lightning-chain','dark-mist','light-burst','fire-orb','ice-spear','wind-arrow','lightning-chain','dark-mist','light-burst','fire-orb','water-orb','wind-vortex','lightning-strike','dark-mist','light-burst','fire-rain','water-orb','wind-vortex','lightning-chain','dark-mist','light-beam','fire-rain','water-orb','wind-vortex','lightning-strike','dark-moon','light-beam','fire-rain','ice-spear','wind-vortex','lightning-strike'];
const aliases={electric:'electricity',dark:'darkness'},fallback={water:'water-orb',fire:'fire-orb',wind:'wind-arrow',electricity:'lightning-strike',darkness:'dark-mist',light:'light-beam'};
export function battleEffectProfile(event){const book=engineData.books.find(b=>b.skill_id===event.skill_id),profile=effectProfiles[event.skill_id],element=aliases[event.element]||event.element||book?.element;
 const isMagic=event.kind==='magic'||book?.category==='spellbook';
 if(isMagic&&palettes[element]){const n=Number((event.skill_id||'').replace('spell_',''));return {id:event.skill_id||'generic-'+element,element,form:book?magicFamilies[n-1]:fallback[element],shape:profile||effectProfiles.spell_001,intensity:book?.rarity==='에픽'?1.2:book?.rarity==='유니크'?1.1:.9,magic:true};}
 return {id:event.skill_id||event.kind,shape:profile||effectProfiles[event.kind==='unique'?'skill_swd_030':event.kind==='defend'?'skill_swd_003':event.kind==='counter'?'skill_swd_005':'skill_swd_001'],sword:swordProfiles[event.skill_id]||swordProfiles[event.kind==='unique'?'skill_swd_030':event.kind==='defend'?'skill_swd_004':event.kind==='counter'?'skill_swd_005':'skill_swd_001'],magic:false};}
export function battleEffectTiming(event){const profile=battleEffectProfile(event);if(profile.magic)return sampleTiming(profile);if(event.skill_id&&profile.sword)return swordTiming(profile.sword);return {duration:event.kind==='unique'?2200:event.skill_id?1500:event.result==='critical'?1300:1000,impact:.4,charge:.08};}
export function mountBattleVFX(stage){
 const canvas=document.createElement('canvas'),vector=document.createElement('div');canvas.className='battle-vfx-canvas';vector.className='battle-vfx-vector';canvas.setAttribute('aria-hidden','true');vector.setAttribute('aria-hidden','true');stage.append(canvas,vector);
 let renderer=null,swordRenderer=null,profile=null,w=1000,h=600,x=500,y=258,event=null,target=null,foreground=false,signature='';
 try{if(canvas.getContext?.('2d')){renderer=createElementalRenderer(canvas);swordRenderer=createSwordRenderer(canvas);}}catch{/* Keep vector effects if Canvas is unavailable. */}
 function resize(){const rect=stage.getBoundingClientRect?.();w=rect?.width||1000;h=rect?.height||600;const next=w+':'+h;if(next!==signature){signature=next;renderer?.resize(w,h,globalThis.devicePixelRatio||1);swordRenderer?.resize(w,h,globalThis.devicePixelRatio||1);}
  const r=target?.getBoundingClientRect?.();x=r&&rect?r.left-rect.left+r.width*.5:w*.5;y=r&&rect?r.top-rect.top+r.height*.43:h*(foreground ? .62 : .43);vector.style.left=(x-180)+'px';vector.style.top=(y-200)+'px';}
 function clear(){renderer?.clear();vector.style.opacity=0;canvas.hidden=true;vector.hidden=true;}
 function start(e,node,front=false){event=e;target=node;foreground=front;profile=battleEffectProfile(e);resize();const shape=e.result==='block'||e.kind==='defend'?effectProfiles.skill_swd_004:profile.shape;vector.innerHTML=skillEffectSVG(shape);vector.style.color=profile.magic?palettes[profile.element][1]:profile.sword.color;canvas.hidden=false;vector.hidden=false;vector.style.opacity=0;}
 function draw(t){if(!profile)return;resize();const hit=battleEffectTiming(event).impact,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A missed or fully blocked attack does not produce a successful elemental explosion.
  const success=event.result!=='dodge'&&!(event.result==='block'&&event.damage===0);
  if(profile.magic&&success)renderer?.draw(profile,reduced?(t<hit?0:t<.9?.6:0):t,{targetX:x,targetY:y,intensity:profile.intensity});else if(!profile.magic&&event.result!=='dodge'&&swordRenderer){const blade=event.result==='block'||event.kind==='defend'?swordProfiles.skill_swd_004:profile.sword,bladeHit=swordTiming(blade).impact,visualTime=t<hit?t/hit*bladeHit:bladeHit+(t-hit)/(1-hit)*(1-bladeHit);swordRenderer.draw(blade,visualTime,{targetX:x,targetY:y,reducedMotion:reduced});}else renderer?.clear();
  const q=Math.max(0,(t-hit)/(1-hit)),visible=t>=hit&&t<.94;vector.style.opacity=visible?Math.min(1,q/.08,Math.max(0,(.94-t)/.25))*(profile.magic ? .55 : 1):0;
  for(const part of vector.querySelectorAll?.('.stroke-part')||[]){const order=Number(part.style.getPropertyValue('--order')||0),u=q-order*.14;part.style.opacity=reduced?1:u<0?0:Math.min(1,u/.07,Math.max(0,(.5-u)/.2));}
  vector.style.transform=reduced?'none':`scale(${.75+q*.45})`;if(event.result==='dodge'||(!profile.magic&&swordRenderer))vector.style.opacity=0;
 }
 clear();return {start,draw,clear};
}
