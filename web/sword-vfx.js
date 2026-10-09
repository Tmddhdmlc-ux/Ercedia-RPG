// Original target-local blade trails, inspired by real-time ribbon VFX. Visuals only.
// The number of visual trails is not a new damage event or a combat hit calculation.
const specs=[
 ['cut',-18,1,'#ffe5bd'],['pierce',0,1,'#dcefff'],['guard',0,1,'#dce8f3'],['guard',0,2,'#deebff'],
 ['counter',-38,1,'#fff0ca'],['step',0,1,'#c9d9e7'],['parry',28,1,'#fff2cb'],['cut',-25,2,'#ffead0'],
 ['reach',0,1,'#e3f0ff'],['focus',0,1,'#eaf5ff'],['heavy',72,1,'#ffe7be'],['clash',35,1,'#fff2d0'],
 ['pierce',-16,2,'#f0f4ff'],['retreat',22,1,'#dceaff'],['rose',-30,2,'#ff91a2'],['dance',0,3,'#b7e6f4'],
 ['counter',145,2,'#fff1d6'],['side',-55,1,'#d9f0ff'],['combo',-28,3,'#ffd8a1'],['heavy',83,2,'#ffd29a'],
 ['rhythm',0,3,'#dcefff'],['meteor',-20,1,'#d7e8ff'],['protect',0,1,'#d6edff'],['feather',-55,2,'#edf8ff'],
 ['break',-15,2,'#ff9aa4'],['flash',-8,1,'#e8fff7'],['wave',-68,2,'#c1e4ff'],['flow',32,4,'#dbeaff'],
 ['read',0,1,'#e7e3ff'],['star',-38,1,'#e5ecff']
];
export const swordProfiles=Object.fromEntries(specs.map(([form,angle,count,color],i)=>{const id='skill_swd_'+String(i+1).padStart(3,'0');return [id,{id,form,angle,count,color}];}));
const clamp=x=>Math.max(0,Math.min(1,x));
const support=new Set(['guard','step','reach','focus','clash','dance','rhythm','protect','feather','read','parry']);
export function swordTiming(p){return {duration:p.form==='flash'?1000:p.form==='meteor'?2000:p.form==='star'?1900:p.count>=3?1800:1450,impact:p.form==='meteor' ? .48 : p.form==='flash' ? .25 : .32,charge:.08};}
function cutPoints(angle,progress,wide=false){const r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),out=[];
 for(let i=0;i<=30;i++){const u=i/30,t=-2.55+u*2.6*clamp(progress),x=Math.cos(t)*(wide?190:165),y=Math.sin(t)*(wide?90:65);out.push([200+x*c-y*s,250+x*s+y*c,Math.sin(Math.PI*u)*(wide?21:14)]);}return out;}
export function swordFrame(p,t){const hit=swordTiming(p).impact,q=(t-hit)/(1-hit),trails=[],rings=[],specks=[];
 if(t<hit){if(['focus','reach','read','meteor'].includes(p.form))rings.push({r:18+55*(1-t/hit),alpha:.2});return {trails,rings,specks,flash:0,support:support.has(p.form)};}
 if(t>=1)return {trails,rings,specks,flash:0,support:support.has(p.form)};
 const isSupport=support.has(p.form),max=isSupport?p.count:Math.min(p.count,4);
 for(let i=0;i<max;i++){const u=q-i*.15,fade=clamp((.55-u)/.25);if(u<0||!fade)continue;
  const progress=clamp(u/.1),alpha=clamp(u/.018)*fade;
  if(['pierce','meteor','reach'].includes(p.form)){
   const length=p.form==='meteor'?185:130,pts=[];for(let n=0;n<=24;n++){const v=n/24,yy=250+(v-.5)*length*2*progress,xx=200+(yy-250)*Math.sin(p.angle*Math.PI/180);pts.push([xx,yy,Math.sin(Math.PI*v)*(p.form==='meteor'?10:5)]);}trails.push({points:pts,alpha,order:i});
  }else if(['guard','protect','read','focus'].includes(p.form)){rings.push({r:(p.form==='protect'?110:65)+i*18+progress*8,alpha:alpha*.55});
  }else{const a=p.angle+(p.form==='combo'||p.form==='cut'?i*78:p.form==='flow'?i*53:p.form==='dance'?i*110:i*24);const points=cutPoints(a,progress,['heavy','break','star'].includes(p.form));if(p.form==='flash')for(const point of points)point[2]*=.4;trails.push({points,alpha:isSupport?alpha*.45:alpha,order:i});}
 }
 const flash=isSupport?0:clamp((.15-q)/.15);
 if(q>=0&&q<.68){for(let i=0;i<(isSupport?8:24);i++){const a=i*2.399+Number(p.id.slice(-3))*.39,r=12+q*(100+(i%5)*42),len=(isSupport?5:12)*(1-q);specks.push({x:200+Math.cos(a)*r,y:250+Math.sin(a)*r*.7,dx:Math.cos(a)*len,dy:Math.sin(a)*len,alpha:clamp((.68-q)/.5)});}}
 return {trails,rings,specks,flash,support:isSupport};
}
export function swordFallbackSVG(p){const f=swordFrame(p,.48);return `<svg viewBox="0 0 400 500" aria-hidden="true"><g>${f.trails.map((trail,i)=>`<path class="stroke-part" style="--order:${i}" d="${trail.points.map(([x,y],n)=>(n?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ')}" fill="none" stroke="currentColor" stroke-width="${p.form==='meteor'?8:5}" stroke-linecap="round"/>`).join('')}${f.rings.map(r=>`<ellipse cx="200" cy="250" rx="${r.r}" ry="${r.r*.65}" fill="none" stroke="currentColor" stroke-width="2"/>`).join('')}${f.specks.map(s=>`<path d="M${s.x} ${s.y}l${s.dx} ${s.dy}" stroke="currentColor" stroke-width="2"/>`).join('')}</g></svg>`;}
export function createSwordRenderer(canvas){const ctx=canvas.getContext('2d');let w=1000,h=600,dpr=1;
 function resize(width,height,ratio=1){w=width;h=height;dpr=Math.min(1.5,ratio);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 function clear(){ctx.clearRect(0,0,w,h);}
 function draw(p,t,{targetX=w*.5,targetY=h*.43,reducedMotion=false}={}){clear();if(t<0||t>=1)return;const f=swordFrame(p,reducedMotion?(t<swordTiming(p).impact?0:.48):t),scale=Math.min(w/850,h/540),xy=(x,y)=>[targetX+(x-200)*scale,targetY+(y-250)*scale];ctx.globalCompositeOperation='lighter';
  function ribbon(points,alpha,core=false){ctx.globalAlpha=alpha;ctx.fillStyle=core?'#fffaf0':p.color;ctx.shadowColor=p.color;ctx.shadowBlur=core?0:14;ctx.beginPath();for(let n=0;n<points.length;n++){const [x,y,width]=points[n],[nx,ny]=points[Math.min(n+1,points.length-1)],a=Math.atan2(ny-y,nx-x)+Math.PI/2,v=width*(core ? .2 : 1),pos=xy(x+Math.cos(a)*v,y+Math.sin(a)*v);n?ctx.lineTo(...pos):ctx.moveTo(...pos);}for(let n=points.length-1;n>=0;n--){const [x,y,width]=points[n],[nx,ny]=points[Math.min(n+1,points.length-1)],a=Math.atan2(ny-y,nx-x)+Math.PI/2,v=width*(core ? .2 : 1);ctx.lineTo(...xy(x-Math.cos(a)*v,y-Math.sin(a)*v));}ctx.closePath();ctx.fill();}
  for(const trail of f.trails){ribbon(trail.points,trail.alpha*.6);ribbon(trail.points,trail.alpha,true);}
  ctx.shadowBlur=0;ctx.strokeStyle=p.color;ctx.lineWidth=2*scale;for(const r of f.rings){ctx.globalAlpha=r.alpha;ctx.beginPath();ctx.ellipse(targetX,targetY,r.r*scale,r.r*.65*scale,0,0,Math.PI*2);ctx.stroke();}
  for(const s of f.specks){ctx.globalAlpha=s.alpha;ctx.beginPath();ctx.moveTo(...xy(s.x,s.y));ctx.lineTo(...xy(s.x+s.dx,s.y+s.dy));ctx.stroke();}
  if(f.flash){ctx.globalAlpha=f.flash;ctx.fillStyle='#fff4d9';ctx.beginPath();ctx.ellipse(targetX,targetY,(4+f.flash*9)*scale,(8+f.flash*20)*scale,p.angle*Math.PI/180,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 }
 return {resize,clear,draw};
}
