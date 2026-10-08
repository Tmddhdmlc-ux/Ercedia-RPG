"""Use the actual VN HTML, CSS and modules in an isolated, in-memory QA page."""
from produce_books import ROOT
source = (ROOT/'index.html').read_text(encoding='utf-8')
setup = '''<base href="/"><script>
window.__ERCEDIA_CONFIG__={assetBase:location.origin+'/'};
let qaSave=JSON.stringify({version:1,player:{name:'이미지 검수'},layouts:{armor:{scale:260,x:68,y:-120},casual:{scale:260,x:68,y:-120},nightwear:{scale:260,x:68,y:-120}}});
window.__ERCEDIA_STORAGE__={getItem(){return qaSave},setItem(k,v){qaSave=v},removeItem(){qaSave=null}};
window.addEventListener('load',()=>{
 const bar=document.createElement('div');bar.style='position:fixed;top:0;left:0;right:0;z-index:99999;padding:8px;background:#17242d;color:white';
 bar.innerHTML='<label>실제 VN 구성요소 이미지 검수 <select id="qa-background"><option value="assets/backgrounds/regions/W1/overview.png">영주령 전경</option><option value="assets/backgrounds/facilities/FAC-E2-01/interior.png">시설 내부</option><option value="assets/backgrounds/shared/01.png">공용 여관</option><option value="assets/backgrounds/shared/12.png">전투 결과 배경</option></select></label> <label><input id="qa-overlay" type="checkbox">전투 전환 효과</label>';
 document.body.prepend(bar);
 const bg=document.getElementById('background');
 const select=document.getElementById('qa-background');
 select.onchange=()=>{bg.src=select.value;bg.alt='제작 배경 검수 샘플';};select.onchange();
 const overlay=document.createElement('img');overlay.src='assets/backgrounds/shared/11.png';overlay.alt='투명 전투 전환 효과';overlay.style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:2';overlay.hidden=true;document.getElementById('stage').append(overlay);
 document.getElementById('qa-overlay').onchange=e=>overlay.hidden=!e.target.checked;
});</script>'''
source=source.replace('<head>','<head>'+setup,1)
(ROOT/'artifacts/art-production/vn-sample.html').write_text(source,encoding='utf-8')
print('Saved actual VN QA page; production HTML and user saves unchanged.')
