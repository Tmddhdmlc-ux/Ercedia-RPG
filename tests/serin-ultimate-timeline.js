export const ultimateDuration=5000;
export const ultimateImpact=3450;
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>1-(1-clamp(v))**3;
export function ultimateFrame(ms,reduced=false){const t=Math.max(0,Math.min(ultimateDuration,ms));
 const phase=t<450?'prepare':t<1450?'face':t<3450?'full':t<3900?'impact':t<ultimateDuration?'return':'done';
 const reveal=ease((t-1450)/520),exit=clamp((t-4200)/800),strike=clamp((t-ultimateImpact)/450);
 const faceOpacity=phase==='face'?Math.min(clamp((t-450)/100),clamp((1450-t)/100)):0;
 return {phase,time:t,fullOpacity:['full','impact','return'].includes(phase)?reveal*(1-exit):0,faceOpacity,
  faceOpen:reduced?1:ease((t-450)/260),facePan:reduced?0:clamp((t-450)/1000),
  zoom:reduced?1:phase==='full'?1.14-.1*ease((t-1450)/1100):phase==='impact'?1.04+strike*.025:1.065,
  flash:phase==='impact'?(reduced?.12:Math.max(0,1-(t-ultimateImpact)/160)):0,
  shake:!reduced&&phase==='impact'?Math.sin((t-ultimateImpact)*.065)*9*Math.max(0,1-(t-ultimateImpact)/300):0,
  nameOpacity:t>=1800&&t<4800?Math.min(ease((t-1800)/450),clamp((4800-t)/300)):0,
  nameShift:reduced?0:30*(1-ease((t-1800)/450)),
  letterbox:t<4200?ease(t/300)*.065:.065*(1-exit),
  charge:phase==='prepare'?Math.sin(clamp(t/450)*Math.PI):0,
  strike:phase==='impact'?strike:null,done:t===ultimateDuration};
}
