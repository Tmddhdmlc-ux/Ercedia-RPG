import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Small build-only linker for this repo's named-import ES modules. No eval or remote runtime imports.
const modules=new Map(),output=[];
async function link(file){
  if(modules.has(file))return modules.get(file);
  const id=`module${modules.size}`;modules.set(file,id);
  let source=await readFile(file,'utf8');
  const sideEffects=[...source.matchAll(/import\s*'([^']+)';/g)];
  for(const match of sideEffects){await link(path.resolve(path.dirname(file),match[1]));source=source.replace(match[0],'');}
  const imports=[...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)';/g)];
  for(const match of imports){const dependency=await link(path.resolve(path.dirname(file),match[2]));source=source.replace(match[0],`const {${match[1]}}=${dependency};`);}
  const exports=[...source.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)].map(match=>match[1]);
  source=source.replace(/export\s+(?=const|function|class)/g,'');
  if(/^\s*(?:import|export)\b/m.test(source))throw Error(`Unsupported module syntax: ${file}`);
  output.push(`const ${id}=(()=>{\n${source}\nreturn {${exports.join(',')}};})();`);return id;
}
await link(path.join(root,'integration/game-entry.js'));
const css=await readFile(path.join(root,'web/style.css'),'utf8');
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="web/style.css">',`<style>${css}</style>`).replace('<script type="module" src="web/app.js"></script>','');
html=html.replace('</body>',`<script>/*__ERCEDIA_BOOTSTRAP__*/\n${output.join('\n').replaceAll('</script','<\\/script')}</script></body>`);
html=html.replaceAll('\r\n','\n');
await writeFile(path.join(root,'integration/game.html'),html);
const version=JSON.parse(await readFile(path.join(root,'integration/version.json'),'utf8'));
const assets=JSON.parse(await readFile(path.join(root,'integration/assets.json'),'utf8'));
const assetHash=createHash('sha256');
for(const asset of assets){if(!/^assets\/[a-zA-Z0-9_./-]+\.png$/.test(asset)||asset.includes('..'))throw Error('Invalid asset path');assetHash.update(asset);assetHash.update(await readFile(path.join(root,asset)));}
await writeFile(path.join(root,'integration/update-manifest.json'),JSON.stringify({...version,assetDigest:assetHash.digest('hex'),entry:'integration/game.html',sha256:createHash('sha256').update(html).digest('hex')},null,2)+'\n');
const template=await readFile(path.join(root,'tampermonkey/host.template.js'),'utf8');
const script=template;
await writeFile(path.join(root,'tampermonkey/ercedia-rpg.user.js'),script);
console.log(`Built game bundle and stable launcher (${Buffer.byteLength(script)} bytes)`);
