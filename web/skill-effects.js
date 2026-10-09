import {swordProfiles,swordFallbackSVG} from './sword-vfx.js';
// Presentation proposals only. No hit counts, damage or skill rules are assigned by this file.
const sword=[
 ['slash',-22,1,'낮고 넓은 횡베기'],['thrust',0,1,'한 점으로 모이는 직선 찌르기'],
 ['shield',0,1,'낮은 위치의 작은 가드'],['shield',0,2,'겹쳐지는 두 겹 방어막'],
 ['counter',-35,1,'방어 섬광 후 즉각 역베기'],['dash',-10,1,'낮은 발목 궤적과 짧은 스텝'],
 ['parry',25,1,'칼끝에서 비껴가는 불꽃'],['slash',-28,2,'서로 반대 방향으로 두 번 교차'],
 ['thrust',-12,1,'길게 뻗는 가는 검끝'],['focus',0,1,'가느다란 조준점 뒤 정밀 타격'],
 ['slash',65,1,'위에서 아래로 떨어지는 굵은 검격'],['shield',20,3,'검이 맞물리는 각진 가드'],
 ['thrust',18,2,'방패 외곽을 지나 틈으로 파고드는 궤적'],['counter',25,2,'뒤로 빠지는 잔상 뒤 반격'],
 ['petal',-30,1,'붉은 꽃잎을 닮은 곡선 궤적'],['dash',25,2,'차가운 색의 부채꼴 발놀림'],
 ['counter',150,3,'아래에서 위로 치솟는 역베기'],['dash',-45,3,'측면 잔상 뒤 사선 검격'],
 ['slash',-25,3,'세 방향 검격이 차례로 교차'],['break',70,1,'무거운 내려치기와 퍼지는 균열'],
 ['focus',15,2,'작은 빛점이 리듬을 타며 모임'],['thrust',-28,3,'별빛 꼬리를 남기는 강한 찌르기'],
 ['shield',0,4,'넓게 둘러싸는 원형 보호 궤적'],['dash',-65,4,'은색 깃털 같은 잔상과 급접근'],
 ['break',-20,2,'붉은 쐐기와 방사형 파열'],['slash',0,4,'화면을 빠르게 가로지르는 한 줄'],
 ['counter',-75,4,'물결처럼 돌아 나오는 반격'],['slash',35,5,'방향을 바꾸며 이어지는 긴 검로'],
 ['focus',-15,3,'큰 원이 좁혀진 뒤 한 점의 검광'],['star',-35,1,'별을 가르는 긴 검선과 별빛 파편']
];
const spells=[
 ['orb',0,1,'작은 화염탄이 날아가 터짐'],['orb',0,2,'물구슬과 둥근 물방울 파문'],
 ['veil',15,1,'얇고 흐르는 바람 장막'],['bolt',10,1,'손끝 크기의 짧은 전격'],
 ['mist',-10,1,'시야를 가리는 얇은 그림자'],['mark',0,1,'대상 위에 남는 빛의 표식'],
 ['ring',0,1,'작은 불꽃 고리가 퍼짐'],['shield',0,1,'투명한 수막이 자리 잡음'],
 ['dash',-15,1,'발밑을 스치는 바람 잔상'],['ring',25,2,'전류가 원형으로 순환'],
 ['mist',20,2,'윤곽이 겹쳐 보이는 그림자'],['burst',0,1,'짧게 피어나는 눈부신 빛'],
 ['trail',-25,1,'휘어진 경로에 불꽃이 남음'],['spear',-25,1,'결정 모양 얼음창과 파편'],
 ['spear',10,2,'가는 바람 화살과 회오리 꼬리'],['chain',20,1,'갈라지며 이어지는 푸른 전격'],
 ['mist',-25,3,'넓고 짙은 먹빛 안개'],['shield',0,2,'금빛 테두리의 보호막'],
 ['burst',20,2,'안에서 밖으로 터지는 화염'],['vortex',0,1,'회전하는 둥근 수막'],
 ['cage',-15,1,'칼날 같은 기류가 영역을 둘러쌈'],['spear',-55,3,'번개 모양의 긴 관통 궤적'],
 ['cage',0,2,'빛을 흡수하는 어두운 외곽'],['wave',0,1,'넓게 퍼지는 해돋이 파장'],
 ['wall',0,1,'세로로 솟아오르는 붉은 방벽'],['mirror',0,1,'반사면과 굴절되는 물결'],
 ['vortex',-25,2,'여러 겹이 감기는 폭풍 나선'],['burst',30,3,'넓은 전격 파열과 뻗는 가지'],
 ['corridor',-15,1,'깊이 겹쳐지는 그림자 회랑'],['orb',0,3,'응축된 큰 광탄과 긴 꼬리'],
 ['rain',-20,1,'위에서 차례로 떨어지는 붉은 불꽃'],['wave',15,2,'양옆에서 밀려드는 큰 물결'],
 ['split',-30,1,'양쪽으로 갈라지는 기류'],['crystal',20,1,'전격 결정이 응축된 뒤 폭발'],
 ['moon',0,1,'검은 달을 감싸는 그림자 장막'],['beam',0,1,'좁고 긴 직선 광선'],
 ['ring',0,3,'여러 겹으로 넓어지는 고온 화염장'],['wall',0,2,'깊은 푸른빛의 두꺼운 방벽'],
 ['eye',0,1,'회오리가 중심의 한 점으로 모임'],['bolt',0,4,'위에서 떨어지는 굵고 긴 낙뢰']
];
const nonDamage=new Set(['skill_swd_003','skill_swd_004','skill_swd_006','skill_swd_007','skill_swd_009','skill_swd_010','skill_swd_012','skill_swd_016','skill_swd_021','skill_swd_023','skill_swd_024','skill_swd_029','spell_003','spell_005','spell_006','spell_008','spell_009','spell_010','spell_011','spell_017','spell_018','spell_020','spell_021','spell_023','spell_025','spell_026','spell_029','spell_032','spell_035','spell_038','spell_039']);
export const effectProfiles=Object.fromEntries([...sword.map((v,i)=>['skill_swd_'+String(i+1).padStart(3,'0'),v]),...spells.map((v,i)=>['spell_'+String(i+1).padStart(3,'0'),v])].map(([id,[shape,angle,variant,description]])=>[id,{id,shape,angle,variant,description,illustrativeDamage:!nonDamage.has(id)}]));
for(const [i,description] of ["넓게 휘어지는 초승달 검광과 짧은 타격 불꽃","검끝이 한 점에서 번쩍이는 가늘고 긴 찌르기 잔상","낮은 자세를 드러내는 작은 은빛 가드 잔광","두 겹의 은빛 가드가 순간 펼쳐짐","가드 직후 짧고 빠르게 돌아 나오는 역베기","발밑에 짧게 겹치는 부드러운 스텝 잔상","비스듬히 흘리는 검광과 작은 금속 불꽃","서로 엇갈리는 두 검광이 시간차로 교차","가늘게 뻗는 검끝의 은빛 잔상","작은 은빛 기운이 칼끝의 한 점으로 모임","굵은 사선 검광이 내리꽂히고 불꽃이 퍼짐","무기 접점에서 짧게 부딪치는 금속 섬광","가는 찌르기 두 잔상이 틈을 향해 응축","먼저 멀어지는 검광 뒤 짧은 퇴각 베기","장미빛 두 곡선 검광이 엇갈림","차가운 은빛 세 곡선이 가볍게 겹치는 검무 잔상","아래에서 치솟는 역방향 검광","상대 근처에 짧게 나타나는 비스듬한 검광","세 번의 호흡을 표현하는 시간차 검로","넓고 묵직한 내려베기와 퍼지는 타격 불꽃","흐르는 세 검로가 약한 은빛으로 호흡함","칼끝의 응축 후 길게 번쩍이는 유성 같은 검광","아군을 감싸는 낮고 넓은 은빛 보호 궤적","은매 깃처럼 짧게 겹치는 기습 발놀림 잔상","굵은 장미빛 돌파 검광과 순간 타격 섬광","길게 남기지 않는 한 번의 날카로운 일섬","물결처럼 휘어져 돌아 나오는 두 반격 잔상","각도를 바꾸며 이어지는 네 검로 잔상","작고 조용한 은빛 윤곽이 좁혀지는 검리 연출","한 번의 긴 검광과 별빛 같은 타격 파편"].entries())effectProfiles['skill_swd_'+String(i+1).padStart(3,'0')].description=description;
export const elementColors={fire:'#ff965b',water:'#8adfff',wind:'#b0f7d5',electricity:'#beaaff',darkness:'#aa85d5',light:'#fff3b4'};
export function skillEffectSVG(p){
 if(swordProfiles[p.id])return swordFallbackSVG(swordProfiles[p.id]);
 const v=p.variant,a=p.angle,stroke='stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"',paths=[];
 const path=(d,width=5,extra='')=>`<path d="${d}" ${stroke} stroke-width="${width}" fill="none" ${extra}/>`;
 const circle=(r,extra='')=>`<circle cx="200" cy="250" r="${r}" ${stroke} stroke-width="4" fill="none" ${extra}/>`;
 const slash=(angle,i=0)=>`<g transform="rotate(${angle} 200 250)" class="stroke-part" style="--order:${i}">${path('M35 310 Q170 150 360 180 Q190 200 75 330',12)}${path('M40 305 Q170 155 355 180',3,'stroke="#fff"')}</g>`;
 switch(p.shape){
 case 'slash': for(let i=0;i<(v===4?1:Math.min(v,4));i++)paths.push(slash(a+i*78,i));break;
 case 'petal':paths.push(slash(a),...[-1,1].map(n=>path(`M200 270 Q${200+n*160} 90 ${200+n*110} 290 Q200 340 200 270`,6)));break;
 case 'star':paths.push(slash(a),path('M200 140L218 215L285 250L218 270L200 345L182 270L115 250L182 215Z',3));break;
 case 'thrust':case 'spear':paths.push(path(`M200 470V${180-v*12}L${175-v*4} 260 M200 ${180-v*12}L${225+v*4} 260`,12),path('M95 480L175 270 M305 480L225 270',3));if(p.shape==='spear')paths.push(path('M200 170L245 245L200 310L155 245Z',4));break;
 case 'shield': paths.push(v===4?circle(165):path(`M200 ${140-v*8}L${295+v*6} 190V285Q290 345 200 390Q110 345 105 285V190Z`,6),circle(110+v*8),path('M200 195V335 M135 250H265',2));break;
 case 'counter':paths.push(`<g class="guard-part">${circle(80+v*8)}</g>`,slash(a,1));break;
 case 'parry':paths.push(path('M75 165L290 330 M115 345L315 150',7),path('M180 220L160 180 M230 260L290 270 M220 220L255 180',5));break;
 case 'dash': for(let i=0;i<v+2;i++){const x=45+i*310/(v+1);paths.push(path(`M${x} 440Q${(x+200)/2} 330 200 ${230-i*10}`,4+i,'opacity=".65"'));}break;
 case 'focus':paths.push(circle(140-v*12),circle(55+v*4),path('M200 120V200 M200 300V380 M70 250H150 M250 250H330',3));break;
 case 'break':paths.push(slash(a),path(`M200 250L150 295L175 320L90 410 M200 250L265 310L250 340L330 420 M200 250L200 390`,4+v));break;
 case 'orb':paths.push(`<circle cx="200" cy="250" r="${35+v*18}" fill="currentColor" opacity=".35"/>`,circle(35+v*18),circle(20),path('M100 430L170 315 M300 430L230 315',5));break;
 case 'ring': for(let i=0;i<v+1;i++)paths.push(circle(60+i*34,`class="stroke-part" style="--order:${i}"`));break;
 case 'veil':case 'wall':case 'mirror': for(let i=0;i<4+v;i++)paths.push(path(`M${80+i*42} 120Q${40+i*42} 240 ${90+i*42} 380`,p.shape==='wall'?12:4));if(p.shape==='mirror')paths.push(path('M105 140H305V360H105Z',5));break;
 case 'bolt':case 'chain': paths.push(path(`M${160-v*8} 80L230 170L175 225L250 285L170 410`,4+v*3));if(p.shape==='chain'||v>2)paths.push(path('M210 200L295 160L270 250L350 295 M205 270L110 250L130 340L65 380',4));break;
 case 'mist': for(let i=0;i<4+v;i++)paths.push(`<ellipse cx="${95+(i%3)*85}" cy="${190+Math.floor(i/3)*85}" rx="${65+v*8}" ry="55" fill="currentColor" opacity=".28"/>`);break;
 case 'mark':paths.push(circle(65),path('M200 140V215 M200 285V360 M90 250H165 M235 250H310',5),path('M185 250L200 235L215 250L200 265Z',4));break;
 case 'burst': paths.push(circle(55+v*15));for(let i=0;i<8+v*2;i++){const angle=i*360/(8+v*2);paths.push(`<g transform="rotate(${angle} 200 250)">${path(`M200 150V${95-v*8}`,5)}</g>`);}break;
 case 'trail':paths.push(path('M200 480Q120 395 200 330T200 190',14),path('M220 480Q140 395 220 330T220 190',4));break;
 case 'vortex':for(let i=0;i<3+v;i++)paths.push(`<g transform="rotate(${i*70} 200 250)">${path('M200 130Q365 160 300 325Q235 420 120 300Q70 200 190 210',5)}</g>`);break;
 case 'cage':paths.push(circle(140),path(`M70 160L330 160L355 340L45 340Z`,5),path('M95 130V370 M150 100V400 M250 100V400 M305 130V370',3));break;
 case 'wave':for(let i=0;i<3+v;i++)paths.push(path(`M35 ${180+i*44}Q110 ${105+i*44} 200 ${180+i*44}T365 ${180+i*44}`,5+i));break;
 case 'corridor':for(let i=0;i<4;i++){const n=i*24;paths.push(path(`M${60+n} ${100+n}H${340-n}V${400-n}H${60+n}Z`,4));}break;
 case 'rain':for(let i=0;i<7;i++)paths.push(`<g class="stroke-part" style="--order:${i%3}">${path(`M${75+i*42} ${80+(i%3)*30}L${35+i*42} ${240+(i%3)*60}`,8)}</g>`);break;
 case 'split':paths.push(path('M180 110Q80 190 40 370 M220 110Q320 190 360 370',12),path('M170 120Q70 200 30 370 M230 120Q330 200 370 370',3));break;
 case 'crystal':paths.push(path('M200 100L290 200L270 330L200 400L115 295L110 200Z',5),path('M200 100V400 M110 200L270 330 M290 200L115 295',3));break;
 case 'moon':paths.push('<path d="M250 100A150 150 0 1 0 250 400A120 150 0 0 1 250 100" fill="currentColor" opacity=".5"/>',circle(160));break;
 case 'beam':paths.push(path('M200 500V190',20),path('M200 500V190',5,'stroke="#fff"'),path('M90 500L180 190 M310 500L220 190',3));break;
 case 'eye':paths.push(circle(135),circle(95),path('M45 250Q200 90 355 250Q200 410 45 250Z',5),circle(25));break;
 }
 return `<svg viewBox="0 0 400 500" aria-hidden="true"><g transform="rotate(${['slash','counter','star','petal','break'].includes(p.shape)?0:a} 200 250)">${paths.join('')}</g></svg>`;
}
