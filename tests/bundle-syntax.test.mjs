import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
test('published integration script parses and matches manifest hash',()=>{const html=fs.readFileSync(new URL('../integration/game.html',import.meta.url),'utf8'),manifest=JSON.parse(fs.readFileSync(new URL('../integration/update-manifest.json',import.meta.url)));const start=html.indexOf('/*__ERCEDIA_BOOTSTRAP__*/'),end=html.lastIndexOf('</script>');assert.ok(start>=0&&end>start);assert.doesNotThrow(()=>new vm.Script(html.slice(start,end)));assert.equal(crypto.createHash('sha256').update(html).digest('hex'),manifest.sha256);});
