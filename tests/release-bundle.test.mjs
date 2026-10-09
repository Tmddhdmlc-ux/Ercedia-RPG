import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
test('published bundle fits existing launchers, matches manifest digest and retains a valid bootstrap script',()=>{
 const html=readFileSync(new URL('../integration/game.html',import.meta.url),'utf8'),manifest=JSON.parse(readFileSync(new URL('../integration/update-manifest.json',import.meta.url),'utf8'));
 assert.ok(html.length<=2000000,'installed launcher rejects oversized updates');assert.equal(createHash('sha256').update(html).digest('hex'),manifest.sha256);assert.equal(html.split('/*__ERCEDIA_BOOTSTRAP__*/').length,2);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
});
