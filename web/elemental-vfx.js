// Original code-created VFX, isolated from combat rules. Canvas sprites are cached, not generated each frame.
export const elementalSamples=[
 {id:'spell_002',element:'water',form:'water-orb',description:'상대 주변의 물방울이 응축 → 순간 압축 → 넓은 물보라와 거품이 터집니다.',damage:24},
 {id:'spell_014',element:'water',form:'ice-spear',description:'상공에서 얼음창이 맺힌 뒤 사선으로 급강하하고 날카로운 결정 파편이 튑니다.',damage:24},
 {id:'spell_001',element:'fire',form:'fire-orb',description:'상대 근처에서 응축된 불덩이가 곡선을 그리며 급가속 → 꽃잎 모양 화염 폭발.',damage:24},
 {id:'spell_031',element:'fire',form:'fire-rain',description:'높이가 다른 불꽃들이 빠르게 낙하 → 지면에서 화염 기둥과 불티가 번집니다.',damage:24},
 {id:'spell_015',element:'wind',form:'wind-arrow',description:'상대 주변 기류가 활처럼 휘어짐 → 날카로운 곡선 궤적이 빠르게 관통합니다.',damage:24},
 {id:'spell_027',element:'wind',form:'wind-vortex',description:'지면의 먼지가 모이고 굵은 나선 기류가 급격히 솟아 상대를 둘러쌉니다.',damage:24},
 {id:'spell_016',element:'electricity',form:'lightning-chain',description:'푸른 전류가 상대 주변에서 갈라져 이어지고 가는 전격이 남습니다.',damage:24},
 {id:'spell_040',element:'electricity',form:'lightning-strike',description:'상공의 응축점에서 굵은 낙뢰가 내려오고 주변으로 전격 가지가 뻗습니다.',damage:24},
 {id:'spell_012',element:'light',form:'light-burst',description:'짧게 압축되는 별빛 → 날카로운 섬광 → 잔광과 황금 파편이 오래 남습니다.',damage:0},
 {id:'spell_036',element:'light',form:'light-beam',description:'상공의 빛이 가는 사선 광선으로 순간 관통하고 지면에 황금 빛이 번집니다.',damage:24},
 {id:'spell_017',element:'darkness',form:'dark-mist',description:'짙은 검은 안개가 상대 주변을 감싸고 보라색 잔광이 흐릅니다.',damage:0},
 {id:'spell_035',element:'darkness',form:'dark-moon',description:'화면 앞에 검은 달과 어둠의 고리가 펼쳐지고 보라색 입자가 회전합니다.',damage:0}
];
export const palettes={water:['#60bfff','#a3edff','#e5fbff'],fire:['#ff5a20','#ffbc4a','#fff0b2'],wind:['#58d6b0','#b2ffdc','#ecfff7'],electricity:['#7974ff','#7ecfff','#f2f4ff'],light:['#ffbe43','#ffe89c','#fffdf0'],darkness:['#47236e','#9869d8','#d4a8fa']};
const tau=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const revisedElements=new Set(['water','fire','wind','light']);
export function sampleTiming(sample,revised=true){return revised?(revisedElements.has(sample.element)?{duration:2600,impact:sample.form==='fire-rain'?.34:sample.form==='wind-vortex'?.32:.27,charge:.08}:{duration:sample.element==='electricity'?2200:2400,impact:sample.element==='electricity'?.25:.28,charge:.08}):{duration:3600,impact:.42,charge:.18};}
function seeded(id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};}
export function createElementalRenderer(canvas,{createCanvas=()=>document.createElement('canvas')}={}){
 const ctx=canvas.getContext('2d'),textures=new Map(),populations=new Map();let w=1000,h=600,ratio=1;
 const particles=id=>{if(!populations.has(id)){const rand=seeded(id);populations.set(id,Array.from({length:96},()=>({angle:rand()*tau,speed:35+rand()*190,size:2+rand()*7,phase:rand()*tau,life:.55+rand()*.45,x:rand(),y:rand()})));}return populations.get(id);};
 function texture(color){if(!textures.has(color)){const c=createCanvas();c.width=c.height=96;const s=c.getContext('2d'),g=s.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,color);g.addColorStop(.17,color);g.addColorStop(1,color+'00');s.fillStyle=g;s.fillRect(0,0,96,96);textures.set(color,c);}return textures.get(color);}
 function dot(x,y,r,color,alpha=1,mode='lighter'){if(r<=0||alpha<=0)return;ctx.globalCompositeOperation=mode;ctx.globalAlpha=clamp(alpha);ctx.drawImage(texture(color),x-r,y-r,r*2,r*2);}
 function line(points,color,width,alpha=1,glow=true){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(alpha);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(glow){ctx.strokeStyle=color;ctx.lineWidth=width*3;ctx.globalAlpha=clamp(alpha*.18);ctx.stroke();}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=clamp(alpha);ctx.stroke();}
 function ring(x,y,rx,ry,color,alpha,width=2,rotation=0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),rotation,0,tau);ctx.stroke();}
 function polygon(points,color,alpha){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(alpha);ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
 function bolt(x,y,endX,endY,seed,color,alpha,width){const points=[[x,y]];for(let i=1;i<13;i++){const u=i/12;points.push([x+(endX-x)*u+Math.sin(i*7+seed)*22*Math.sin(u*Math.PI),y+(endY-y)*u]);}line(points,color,width,alpha);line(points,'#ffffff',Math.max(1,width*.25),alpha*.8,false);return points;}
 function resize(width,height,dpr=1){w=Math.max(1,width);h=Math.max(1,height);ratio=Math.min(1.5,Math.max(1,dpr));canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
 function clear(){ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);}
 function ribbon(points,width,color,alpha){const left=[],right=[];for(let i=0;i<points.length;i++){const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after[0]-before[0],dy=after[1]-before[1],len=Math.hypot(dx,dy)||1,thickness=width*Math.sin((i+.5)/points.length*Math.PI);left.push([points[i][0]-dy/len*thickness,points[i][1]+dx/len*thickness]);right.push([points[i][0]+dy/len*thickness,points[i][1]-dx/len*thickness]);}polygon([...left,...right.reverse()],color,alpha);}
 function revisedEffect(sample,t,p,c,x,y,s){
  const timing=sampleTiming(sample),hit=t>=timing.impact,pre=clamp((t-.06)/(timing.impact-.06)),u=pre**3,q=clamp((t-timing.impact)/(1-timing.impact)),expand=1-(1-q)**3,fade=clamp((1-t)/.26),form=sample.form,ground=y+130*s;
  if(t<.06)return;
  if(form==='water-orb'){
   if(!hit){for(const a of p.slice(0,24)){const r=(150*(1-u)+14)*s,angle=a.angle+pre*3,px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.65;dot(px,py,(6+a.size)*s,c[1],.7);ring(px,py,5*s,7*s,c[2],.7,1);}dot(x,y,(15+pre*30)*s,c[0],.35);}
   else{dot(x,y,115*s*(1-q),c[1],fade*.5);for(let i=0;i<14;i++){const angle=i*tau/14,dist=(45+expand*110)*s,points=[[x,y],[x+Math.cos(angle-.12)*dist*.7,y+Math.sin(angle-.12)*dist*.65],[x+Math.cos(angle)*dist,y+Math.sin(angle)*dist*.75-q*20*s],[x+Math.cos(angle+.12)*dist*.65,y+Math.sin(angle+.12)*dist*.65]];polygon(points,c[1],fade*(1-q)*.48);}for(const a of p.slice(0,72)){const dist=expand*a.speed*s,px=x+Math.cos(a.angle)*dist,py=y+Math.sin(a.angle)*dist*.65+q*q*110*s;dot(px,py,a.size*s*.6,c[2],fade*.8);if(a.size>6)ring(px,py,a.size*s,a.size*s*.7,c[1],fade*.7,1);}for(let i=0;i<3;i++)ring(x,ground,(55+expand*150+i*15)*s,(12+expand*26+i*3)*s,c[1],fade*.65,2);}
  }
  if(form==='ice-spear'){
   if(!hit){const px=x+115*(1-u)*s,py=y-210*(1-u)*s,len=(50+pre*45)*s;polygon([[px-20*s,py-len],[px+27*s,py-15*s],[px,py+len],[px-12*s,py]],c[1],pre);line([[px-17*s,py-len],[px,py+len]],c[2],3*s,pre);line([[px+55*s,py-105*s],[px+18*s,py-35*s]],c[1],2*s,pre*.5);}
   else{dot(x,y,85*s,c[1],fade*(1-q)*.5);for(const a of p.slice(0,48)){const dist=expand*a.speed*s,px=x+Math.cos(a.angle)*dist,py=y+Math.sin(a.angle)*dist*.65+q*q*110*s,r=(3+a.size)*s;polygon([[px-r,py-r*1.8],[px+r*.8,py],[px,py+r*2]],a.size>5?c[2]:c[1],fade*.7);}for(let i=0;i<7;i++){const angle=i*tau/7;line([[x,y],[x+Math.cos(angle)*85*s,y+Math.sin(angle)*60*s]],c[1],2,fade*(1-q));}}
  }
  if(form==='fire-orb'){
   if(!hit){const px=x+(115*(1-u)+Math.sin(pre*Math.PI)*65)*s,py=y-(95*(1-u)+Math.sin(pre*Math.PI)*90)*s,r=(18+pre*20)*s;const trail=[];for(let i=0;i<16;i++){const v=clamp(pre-i*.018),e=v**3;trail.push([x+(115*(1-e)+Math.sin(v*Math.PI)*65)*s,y-(95*(1-e)+Math.sin(v*Math.PI)*90)*s]);}ribbon(trail,12*s,c[0],pre*.65);dot(px,py,r*2,c[0],.7);dot(px,py,r,c[1],.9);dot(px,py,r*.4,c[2],1);}
   else{dot(x,y,(80+expand*75)*s,c[0],fade*(1-q)*.4);dot(x,y,55*s,c[2],fade*(1-q)*.8);for(let i=0;i<12;i++){const angle=i*tau/12,r=(65+expand*105)*s;polygon([[x,y],[x+Math.cos(angle-.18)*r*.5,y+Math.sin(angle-.18)*r*.5],[x+Math.cos(angle)*r,y+Math.sin(angle)*r-q*35*s],[x+Math.cos(angle+.2)*r*.55,y+Math.sin(angle+.2)*r*.55]],i%2?c[0]:c[1],fade*(1-q)*.6);}for(const a of p){const dist=expand*a.speed*s;dot(x+Math.cos(a.angle)*dist,y+Math.sin(a.angle)*dist-q*75*s,a.size*s*.6,c[1],fade*.75);}for(const a of p.slice(0,20))dot(x+(a.x-.5)*175*s,y-q*110*s+(a.y-.5)*75*s,(20+q*40)*s,'#302b32',fade*.15,'source-over');}
  }
  if(form==='fire-rain'){
   for(const a of p.slice(0,18)){const birth=.09+a.x*.2,flight=clamp((t-birth)/.17),px=x+(a.x-.5)*310*s;if(t>=birth&&flight<1){const py=-80+(ground+80)*flight**2;line([[px+20*s,py-95*s],[px,py]],c[0],12*s,.6);line([[px+10*s,py-50*s],[px,py]],c[2],3*s,.9);dot(px,py,19*s,c[1],.8);}if(flight>=1){const age=clamp((t-birth-.17)/.45),f=(1-age)*fade,height=(55+Math.sin(age*Math.PI)*85)*s;polygon([[px-22*s,ground],[px-12*s,ground-height*.6],[px+4*s,ground-height],[px+18*s,ground-height*.3],[px+25*s,ground]],c[0],f*.55);dot(px,ground-20*s,25*s,c[1],f*.5);}}
   if(hit){ring(x,ground,160*s,34*s,c[0],fade*.45,3);for(const a of p.slice(0,45))dot(x+(a.x-.5)*310*s,ground-expand*a.speed*s,3*s,c[1],fade*.65);}
  }
  if(form==='wind-arrow'){
   const head=hit?1:u,points=[];for(let i=0;i<42;i++){const v=i/41*head;points.push([x+Math.sin(v*Math.PI)*145*s,y+(1-v)*95*s-Math.sin(v*Math.PI)*80*s]);}ribbon(points,13*s,c[1],fade*.45);line(points,c[2],2*s,fade*.7);if(!hit){const end=points.at(-1);dot(end[0],end[1],18*s,c[2],pre*.6);}
   else{for(let k=0;k<3;k++){const arc=[];for(let i=0;i<35;i++){const a=-1.1+i/34*3.4;arc.push([x+Math.cos(a)*(90+expand*65+k*12)*s,y+Math.sin(a)*(50+expand*30)*s+k*12*s]);}ribbon(arc,(5-k)*s,c[k],fade*(1-q)*.55);}for(const a of p.slice(0,35))dot(x+Math.cos(a.angle)*expand*a.speed*s,y+Math.sin(a.angle)*expand*a.speed*s*.4,2*s,c[2],fade*.5);}
  }
  if(form==='wind-vortex'){
   const power=clamp((t-.08)/.21)*fade,spin=t*26,base=ground+15*s;ring(x,base,(80+pre*50)*s,25*s,c[0],power*.4,3);for(let k=0;k<4;k++){const points=[];for(let i=0;i<80;i++){const v=i/79,angle=v*tau*2+spin+k*tau/4,r=(140-v*90)*s;points.push([x+Math.cos(angle)*r,base-v*275*s+Math.sin(angle)*r*.15]);}ribbon(points,7*s,c[k%3],power*.28);line(points,c[2],1*s,power*.3,false);}for(const a of p.slice(0,50)){const v=(a.y+t*.8)%1,angle=a.angle+spin,r=(145-v*75)*s;dot(x+Math.cos(angle)*r,base-v*255*s,3*s,c[1],power*.6);}
  }
  if(form==='light-burst'){
   if(!hit){ring(x,y,(45-30*pre)*s,(45-30*pre)*s,c[1],pre*.7,2);line([[x-35*s,y],[x+35*s,y]],c[2],2*s,pre*.8);line([[x,y-35*s],[x,y+35*s]],c[2],2*s,pre*.8);}
   else{const flash=clamp(1-q*7);dot(x,y,110*s,c[2],flash*.8);for(let i=0;i<8;i++){const a=i*tau/8,len=(55+expand*125)*(i%2?.55:1)*s;polygon([[x+Math.cos(a-.12)*9*s,y+Math.sin(a-.12)*9*s],[x+Math.cos(a)*len,y+Math.sin(a)*len],[x+Math.cos(a+.12)*9*s,y+Math.sin(a+.12)*9*s]],c[2],fade*(1-q)*.6);}ring(x,y,(30+expand*175)*s,(30+expand*175)*s,c[1],fade*.65,2);for(const a of p.slice(0,55)){const dist=expand*a.speed*s;dot(x+Math.cos(a.angle)*dist,y+Math.sin(a.angle)*dist,a.size*s*.5,c[1],fade*.5);}}
  }
  if(form==='light-beam'){
   const source=[x-125*s,-30],alpha=hit?fade*clamp(1-q*2):pre*.2;line([source,[x,y]],c[0],18*s,alpha*.25);line([source,[x,y]],c[1],6*s,alpha);line([source,[x,y]],c[2],2*s,alpha);
   if(hit){dot(x,y,65*s,c[1],fade*(1-q)*.5);ring(x,ground,(40+expand*105)*s,(10+expand*20)*s,c[1],fade*.6,2);line([[x-55*s,y-15*s],[x+55*s,y+15*s]],c[2],2*s,fade*(1-q));for(const a of p.slice(0,55)){const dist=expand*a.speed*s;dot(x+Math.cos(a.angle)*dist,y+Math.sin(a.angle)*dist+q*55*s,a.size*s*.5,c[1],fade*.6);}}
  }
 }
 function draw(sample,t,{reducedMotion=false,revised=true,targetX=w*.5,targetY=h*.43,intensity=1}={}){
  if(revised&&revisedElements.has(sample.element)){clear();if(t<=0||t>=1)return;revisedEffect(sample,t,particles(sample.id),palettes[sample.element],targetX,targetY,Math.min(w/1000,h/600)*intensity);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';return;}
  if(revised){const hit=sampleTiming(sample).impact;t=t<hit?t/hit*.42:.42+(t-hit)/(1-hit)*.58;}
  clear();if(t<=0||t>=1)return;const p=particles(sample.id),c=palettes[sample.element],x=targetX,y=targetY,s=Math.min(w/1000,h/600)*intensity,impact=.42,q=clamp((t-impact)/.58),travel=clamp((t-.18)/.24),fade=clamp((1-t)/.25),hit=t>=impact,form=sample.form;
  // All attacks originate on the camera's center axis, never on a left-side player slot.
  const py=h*.73+(y-h*.73)*travel,r=(95-65*travel)*s;
  if(t<impact){const charge=Math.sin(clamp(t/.22)*Math.PI)*.8;dot(x,h*.7,80*s,c[0],charge*.25);ring(x,h*.7,60*s,18*s,c[1],charge*.7,2);if(t<.18)return;}
  const time=reducedMotion?0:t;
  if(form==='fire-orb'||form==='fire-rain'){
   if(!hit&&form==='fire-orb'){dot(x,py,r*1.8,c[0],.6);dot(x,py,r,c[1],.95);dot(x,py,r*.5,c[2],1);for(const a of p.slice(0,32)){const angle=a.angle+time*12;dot(x+Math.cos(angle)*r*.55,py+Math.sin(angle)*r*.7,r*.32,c[0],.7);}}
   if(form==='fire-rain'){for(const a of p.slice(0,15)){const delay=a.x*.18,u=clamp((t-.18-delay)/.28),px=x+(a.x-.5)*290*s;if(u>0&&u<1){const yy=-60+(y+65*s)*u;line([[px,yy-65*s],[px,yy]],c[1],5*s,.8);dot(px,yy,21*s,c[0],.9);}}}
   if(hit){dot(x,y,160*s*(.45+q),c[0],fade*(1-q)*.5);dot(x,y,65*s*(1+q),c[2],fade*(1-q));for(const a of p){const age=q*a.life,dist=age*a.speed*s;dot(x+Math.cos(a.angle)*dist,y+Math.sin(a.angle)*dist-age*55*s,a.size*s*(1-age),a.size>6?c[0]:c[1],fade*(1-age));}for(const a of p.slice(0,18))dot(x+(a.x-.5)*190*s,y-70*q*s+(a.y-.5)*65*s,(20+q*35)*s,'#302b32',fade*.12,'source-over');}
  }
  if(form==='water-orb'){
   const xx=x,yy=hit?y:py,rr=hit?(50+q*100)*s:r;dot(xx,yy,rr*1.5,c[0],fade*.3);ring(xx,yy,rr,rr,c[1],fade*.9,3);dot(xx-rr*.2,yy-rr*.25,rr*.4,c[2],fade*.7);
   if(hit){for(let i=0;i<4;i++)ring(x,y+45*s,(45+q*160+i*16)*s,(13+q*45+i*5)*s,c[1],fade*(1-i*.18),2);for(const a of p.slice(0,65)){const dist=q*a.speed*s;dot(x+Math.cos(a.angle)*dist,y+Math.sin(a.angle)*dist*.7+q*q*60*s,a.size*s,c[a.size>5?1:2],fade*.8);}}
  }
  if(form==='ice-spear'){
   if(!hit){const yy=py,len=(125-70*travel)*s;polygon([[x,yy-len],[x+22*s,yy],[x,yy+len*.5],[x-22*s,yy]],c[1],.8);line([[x,yy-len],[x,yy+len*.5]],c[2],3*s);dot(x,yy,60*s,c[0],.2);}
   if(hit){dot(x,y,105*s,c[0],fade*.35);for(const a of p.slice(0,38)){const dist=q*a.speed*s,px=x+Math.cos(a.angle)*dist,yy=y+Math.sin(a.angle)*dist+q*q*65*s,r=(4+a.size)*s;polygon([[px,yy-r*2],[px+r*.6,yy],[px-r*.4,yy+r]],a.size>5?c[2]:c[1],fade*.8);}ring(x,y,130*q*s,55*q*s,c[1],fade,2);}
  }
  if(form==='wind-arrow'||form==='wind-vortex'){
   if(!hit&&form==='wind-arrow'){line([[x,py+80*s],[x,py-40*s]],c[2],4*s);line([[x-22*s,py+10*s],[x,py-40*s],[x+22*s,py+10*s]],c[1],3*s);for(let i=0;i<3;i++)ring(x,py+25*i*s,25*s,8*s,c[1],.5,2);}
   if(hit||form==='wind-vortex'){const strength=form==='wind-vortex'?clamp((t-.2)/.18)*fade:fade,spread=form==='wind-vortex'?1:1+q*.6;dot(x,y,125*s,c[0],strength*.15);for(let i=0;i<7;i++){const points=[];for(let j=0;j<=45;j++){const angle=j/45*tau+time*10+i*.5,rx=(55+i*12)*s*spread;points.push([x+Math.cos(angle)*rx,y+(i-3)*19*s+Math.sin(angle)*rx*.28]);}line(points,c[i%3],i%2?1.5:3,strength*.5);}for(const a of p.slice(0,40)){const angle=a.angle+time*8;dot(x+Math.cos(angle)*125*s,y+Math.sin(angle)*55*s-(t-.4)*35*s,3*s,c[2],strength*.6);}}
  }
  if(form==='lightning-chain'||form==='lightning-strike'){
   if(hit){const seed=Math.floor(time*10),alpha=fade*(.65+.25*Math.sin(q*Math.PI));dot(x,y,120*s,c[0],alpha*.22);if(form==='lightning-strike'){const main=bolt(x,-20,x,y,seed,c[1],alpha,7*s);for(let i=3;i<10;i+=2)bolt(main[i][0],main[i][1],x+(i%4===1?-1:1)*100*s,y+(i-6)*30*s,seed+i,c[0],alpha*.65,2*s);dot(x,y,38*s,c[2],alpha);}else{for(let i=0;i<4;i++){const angle=i*tau/4+time*2;bolt(x,y,x+Math.cos(angle)*135*s,y+Math.sin(angle)*110*s,seed+i,c[1],alpha,3*s);}ring(x,y,90*s,110*s,c[0],alpha*.6,2);}for(const a of p.slice(0,35))dot(x+Math.cos(a.angle)*q*a.speed*s,y+Math.sin(a.angle)*q*a.speed*s,3*s,c[2],fade*.7);}
  }
  if(form==='light-beam'||form==='light-burst'){
   if(hit){if(form==='light-beam'){polygon([[x-55*s,h*.85],[x-8*s,y],[x+8*s,y],[x+55*s,h*.85]],c[0],fade*.3);polygon([[x-16*s,h*.85],[x-3*s,y],[x+3*s,y],[x+16*s,h*.85]],c[2],fade*.9);dot(x,y,90*s,c[1],fade*.55);}else{dot(x,y,100*s*(1-q),c[2],fade*.9);for(let i=0;i<4;i++)ring(x,y,(30+q*210+i*12)*s,(30+q*210+i*12)*s,c[i%3],fade*(1-i*.18),2);}
   for(const a of p.slice(0,60)){const dist=q*a.speed*s,px=x+Math.cos(a.angle)*dist,yy=y+Math.sin(a.angle)*dist;dot(px,yy,a.size*s,c[1],fade*.65);if(a.size>6){line([[px-6*s,yy],[px+6*s,yy]],c[2],1,fade);line([[px,yy-6*s],[px,yy+6*s]],c[2],1,fade);}}}
  }
  if(form==='dark-mist'||form==='dark-moon'){
   const strength=clamp((t-.18)/.25)*fade,yy=form==='dark-moon'?h*.52:y;
   for(const a of p.slice(0,46)){const angle=a.angle+time*.6,rx=(40+a.x*130)*s,ry=(30+a.y*90)*s;dot(x+Math.cos(angle)*rx,yy+Math.sin(angle)*ry,55*s,'#100c1c',strength*.5,'source-over');dot(x+Math.cos(angle)*rx,yy+Math.sin(angle)*ry,32*s,c[0],strength*.08);}
   if(form==='dark-moon'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=strength*.85;ctx.fillStyle='#080411';ctx.beginPath();ctx.arc(x,yy,92*s,0,tau);ctx.fill();ring(x,yy,98*s,98*s,c[1],strength,4);ring(x,yy,115*s,35*s,c[0],strength*.8,3,time*.7);}
   for(const a of p.slice(0,48)){const angle=a.angle+time*2,rx=(80+a.x*90)*s;dot(x+Math.cos(angle)*rx,yy+Math.sin(angle)*rx*.65,3*s,c[1],strength*.65);}
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 }
 return {resize,clear,draw,cacheStats:()=>({textures:textures.size,populations:populations.size})};
}
