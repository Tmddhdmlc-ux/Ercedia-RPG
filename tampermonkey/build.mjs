import {minify} from 'terser';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import './map-factions-build.mjs';
import './intro-build.mjs';
import './economy-build.mjs';
import './catalog-build.mjs';
import './epic-build.mjs';
import './character-art-build.mjs';
import './quest-build.mjs';
import './engine-build.mjs';
import './world-build.mjs';
import './voice-build.mjs';
import './growth-build.mjs';
import './loot-build.mjs';
import './crafting-build.mjs';
import './relationship-build.mjs';
await import('./shop-build.mjs');
await import('./character-layout-build.mjs');
// Run after the other registries finish updating the shared asset list.
await import('./location-art-build.mjs');
await import('./dungeon-monster-art-build.mjs');
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
  for(const match of imports){const dependency=await link(path.resolve(path.dirname(file),match[2]));const names=match[1].split(',').map(name=>name.trim().replace(/\s+as\s+/,':')).join(',');source=source.replace(match[0],`const {${names}}=${dependency};`);}
  const exports=[...source.matchAll(/export\s+(?:async\s+)?(?:const|function|class)\s+(\w+)/g)].map(match=>match[1]);
  source=source.replace(/export\s+(?=async|const|function|class)/g,'');
  if(/^\s*(?:import|export)\b/m.test(source))throw Error(`Unsupported module syntax: ${file}`);
  output.push(`const ${id}=(()=>{\n${source}\nreturn {${exports.join(',')}};})();`);return id;
}
await link(path.join(root,'integration/game-entry.js'));
const css=await readFile(path.join(root,'web/style.css'),'utf8');
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="web/style.css">',`<style>${css}</style>`).replace('<script type="module" src="web/app.js"></script>','');
const script=await minify(output.join('\n'),{compress:false,mangle:true,format:{comments:false}});
if(!script.code)throw Error('Game bundle could not be compiled');
html=html.replace('</body>',`<script>/*__ERCEDIA_BOOTSTRAP__*/\n${script.code.replaceAll('</script','<\\/script')}</script></body>`);
html=html.replaceAll('\r\n','\n');
if(html.length>2000000)throw Error('UI exceeds the installed launcher update limit');
await writeFile(path.join(root,'integration/game.html'),html);
const version=JSON.parse(await readFile(path.join(root,'integration/version.json'),'utf8'));
const assets=JSON.parse(await readFile(path.join(root,'integration/assets.json'),'utf8'));
const assetHash=createHash('sha256');
for(const asset of assets){if(!/^assets\/[a-zA-Z0-9_./-]+\.png$/.test(asset)||asset.includes('..'))throw Error('Invalid asset path');assetHash.update(asset);assetHash.update(await readFile(path.join(root,asset)));}
const audioAssets=JSON.parse(await readFile(path.join(root,'integration/audio-assets.json'),'utf8'));
const audioHash=createHash('sha256');
for(const asset of audioAssets){if(!/^assets\/audio\/[a-zA-Z0-9_./-]+\.(?:ogg|mp3|wav)$/.test(asset)||asset.includes('..'))throw Error('Invalid audio path');audioHash.update(asset);audioHash.update(await readFile(path.join(root,asset)));}
await writeFile(path.join(root,'integration/update-manifest.json'),JSON.stringify({...version,audioDigest:audioHash.digest('hex'),assetDigest:assetHash.digest('hex'),entry:'integration/game.html',sha256:createHash('sha256').update(html).digest('hex')},null,2)+'\n');
const template=await readFile(path.join(root,'tampermonkey/host.template.js'),'utf8');
const reader=(await readFile(path.join(root,'web/response-json.js'),'utf8')).replace(/export\s+(?=function)/g,'');
const hostScript=template.replace('/*__RESPONSE_READER__*/',()=>reader);
const attachment=(await readFile(path.join(root,'web/settings-attachment.js'),'utf8')).replace(/export\s+(?=async|function)/g,'');
const handoff=(await readFile(path.join(root,'web/chat-handoff.js'),'utf8')).replace(/export\s+(?=function)/g,'');
const releaseState=(await readFile(path.join(root,'web/release-state.js'),'utf8')).replace(/export\s+(?=function)/g,'');
const launcher=hostScript.replace('/*__SETTINGS_ATTACHMENT__*/',()=>attachment).replace('/*__CHAT_HANDOFF__*/',()=>handoff).replace('/*__RELEASE_STATE__*/',()=>releaseState);
await writeFile(path.join(root,'tampermonkey/ercedia-rpg.user.js'),launcher);
await writeFile(path.join(root,'tampermonkey/ercedia-rpg.meta.js'),launcher.slice(0,launcher.indexOf('// ==/UserScript==')+'// ==/UserScript=='.length)+'\n');
console.log(`Built game bundle and launcher (${Buffer.byteLength(launcher)} bytes)`);
