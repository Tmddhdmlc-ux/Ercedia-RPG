import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const plan=JSON.parse(readFileSync('assets/characters/monsters/dungeon/production-plan.json','utf8'));
const dungeons=JSON.parse(readFileSync('locations/dungeon_layouts.json','utf8')).dungeons;
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const groups=dungeons.map(d=>`<section><h2>${esc(d.name)}</h2><div class="pair">${plan.entries.filter(p=>p.dungeon_id===d.id).map(p=>{
  if(!existsSync(p.path))throw Error('Missing portrait '+p.id);
  return `<figure><a href="../${p.path}"><img loading="lazy" src="../${p.path}" alt="${esc(p.name)}"></a><figcaption><strong>${esc(p.name)}</strong><span>${p.role==='boss'?'보스':'정예'} · ${esc(p.rank)}</span></figcaption></figure>`;
}).join('')}</div></section>`).join('\n');
writeFileSync('tests/dungeon-monster-gallery.html',`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>에르세디아 · 던전 마수 원화</title><style>*{box-sizing:border-box}body{background:#171c25;color:#f4eee4;font:16px system-ui;margin:0;padding:32px}main{max-width:1100px;margin:auto}h1{font-size:28px}p,figcaption span{color:#bfc6d2}h2{font-size:20px;margin-top:32px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0;background:#263040;border:1px solid #465269;border-radius:16px;overflow:hidden}img{width:100%;height:360px;object-fit:contain;padding:14px;background:radial-gradient(ellipse,#46566d,#242e3f)}figcaption{display:flex;justify-content:space-between;gap:12px;padding:18px}@media(max-width:600px){body{padding:16px}.pair{grid-template-columns:1fr}img{height:300px}}</style><main><h1>에르세디아 · 던전 정예와 보스 52종</h1><p>26개 던전의 전용 마수 원화. 이미지를 누르면 원본 PNG를 볼 수 있습니다.</p>${groups}</main></html>\n`);
console.log('Saved 52-portrait gallery.');
