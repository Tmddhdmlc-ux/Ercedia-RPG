import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.png':'image/png','.json':'application/json; charset=utf-8'};
const port = Number(process.env.PORT || 4173);
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root,'.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root,file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(p=>p.startsWith('.')) || !types[path.extname(file)]) { res.writeHead(403).end('Forbidden'); return; }
    const body = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff',...(['.ogg','.mp3','.wav'].includes(path.extname(file))?{'Access-Control-Allow-Origin':'*'}:{})}).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port,'127.0.0.1',()=>console.log(`Ercedia RPG: http://localhost:${port}`));
