export const ultimateDuration=3800;
export const ultimateImpact=2400;
export function ultimateFrame(ms,reduced=false){const t=Math.max(0,Math.min(ultimateDuration,ms));
 const phase=t<350?'prepare':t<1100?'face':t<2400?'full':t<2750?'impact':t<ultimateDuration?'return':'done';
 const u=Math.max(0,Math.min(1,(t-1100)/1300));
 return {phase,fullOpacity:phase==='full'?Math.min(1,(t-1100)/140):phase==='impact'?1:phase==='return'?Math.max(0,1-(t-2750)/700):0,faceOpacity:phase==='face'?Math.min(1,(t-350)/110,(1100-t)/120):0,zoom:reduced?1:1.02+u*.07,flash:phase==='impact'?(reduced ? .16 :Math.max(0,1-(t-ultimateImpact)/270)):0,shake:!reduced&&phase==='impact'?Math.sin((t-ultimateImpact)*.08)*7*Math.max(0,1-(t-ultimateImpact)/250):0,done:t===ultimateDuration};
}
